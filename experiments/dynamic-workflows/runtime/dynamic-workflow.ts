// dynamic-workflow.ts — esecutore di RIFERIMENTO del contratto Dynamic Workflow
// per POM (vedi design/CONTRACT.md). Semplice nella struttura, completo nelle
// funzionalità. NON è il runtime canonico di POM: è un riferimento estensibile
// che un progetto target adatta.
//
// Il punto di estensione è l'interfaccia `Executor` (il data plane): qui lo
// stub esegue le istanze in sequenza in modo deterministico; un'implementazione
// reale le parallelizza (thread/async/processi) e gestisce timeout/cancel fisici.
//
// Uso: tsx dynamic-workflow.ts <workflow.yaml> [--n N] [--timeout h1,h2]
//      [--cancel-at STATE] [--suspend-at STATE] [--early K]

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, isAbsolute } from 'node:path';
import yaml from 'js-yaml';

// ---------- Tipi del contratto ----------
type Json = Record<string, any>;
interface FanOut { workflow: string; over?: string; handle: string; }
interface Await { handles?: string[]; handle?: string; join?: 'all' | 'quorum' | 'first'; k?: number; timeout?: string; on_timeout?: string; }
interface React { on_each: string; on_early: string; on_done: string; }
interface State { name: string; is_final?: boolean; invoke?: Json; fan_out_launch?: FanOut; await?: Await; react?: React; cancel_handles?: string[]; detach_handles?: string[]; }
interface Transition { from: string; to: string; event: string; guard?: string; launch?: FanOut; }
interface Workflow { workflow: string; initial_state: string; states: State[]; transitions: Transition[]; compensation?: { undo: string }[]; }

// ---------- Segnali di controllo (un host reale li collega a eventi) ----------
export interface Signals { n?: number; timedOut?: string[]; cancelAt?: string; suspendAt?: string; earlyAt?: number; }

export interface RunResult { terminal: string; trace: string[]; leaves: number; }

// ---------- Esecutore esterno = data plane (PLUGGABLE) ----------
export interface Executor {
  // Esegue `n` istanze del workflow-foglia e ne restituisce i terminali.
  // Stub: sequenziale e deterministico. Reale: parallelo.
  runBatch(leafPath: string, baseDir: string, n: number, sig: Signals): { terminal: string; leaves: number }[];
}

function loadWorkflow(pathSpec: string, baseDir: string): { wf: Workflow; dir: string } {
  const abs = isAbsolute(pathSpec) ? pathSpec : resolve(baseDir, pathSpec);
  if (!existsSync(abs)) throw new Error(`workflow non trovato: ${abs}`);
  const wf = yaml.load(readFileSync(abs, 'utf8')) as Workflow;
  return { wf, dir: dirname(abs) };
}

const isFinal = (wf: Workflow, s: string) => !!wf.states.find((x) => x.name === s)?.is_final;
const outgoing = (wf: Workflow, s: string) => (wf.transitions ?? []).filter((t) => t.from === s);

// ---------- Engine = control plane (FSM sincrona, deterministica) ----------
export class Engine {
  private executor: Executor;
  public log: (s: string) => void;

  constructor(executor: Executor, log: (s: string) => void = () => {}) {
    this.executor = executor;
    this.log = log;
  }

  // Lo stub di default usa lo stesso Engine per eseguire le foglie (gestisce il nesting).
  static withStub(log: (s: string) => void = () => {}): Engine {
    const engine = new Engine({ runBatch: (leaf, dir, n, sig) => {
      const out: { terminal: string; leaves: number }[] = [];
      for (let i = 0; i < n; i++) { const r = engine.run(leaf, dir, { ...sig, cancelAt: undefined, suspendAt: undefined }, true); out.push({ terminal: r.terminal, leaves: r.leaves || 1 }); }
      return out;
    } }, log);
    return engine;
  }

  private inFlight: { handle: string; workflow: string; n: number }[] = [];

  snapshot(state: string, context: Json) { return { state, context, inFlight: [...this.inFlight] }; }
  restore(snap: { state: string; context: Json; inFlight: any[] }) { this.inFlight = [...snap.inFlight]; return snap.state; }

  private resolveHandle(inFlight: { handle: string; workflow: string; n: number }[], handle: string) {
    const idx = inFlight.findIndex((x) => x.handle === handle);
    if (idx < 0) throw new Error(`handle attivo non trovato: ${handle}`);
    return inFlight.splice(idx, 1)[0];
  }

  private propagateHandleSignal(signal: 'cancel' | 'detach', batch: { handle: string; workflow: string; n: number }, dir: string, log: (s: string) => void) {
    log(`  ↓ propago ${signal} a '${batch.handle}' (${batch.workflow})`);
    if (signal !== 'cancel') return;
    try {
      const { wf: child } = loadWorkflow(batch.workflow, dir);
      for (const u of [...(child.compensation ?? [])].reverse()) log(`    · figlia compensa: ${u.undo}`);
    } catch {}
  }

  run(path: string, baseDir = process.cwd(), sig: Signals = {}, silent = false): RunResult {
    const { wf, dir } = loadWorkflow(path, baseDir);
    const log = silent ? () => {} : this.log;
    const trace: string[] = [];
    const visits = new Map<string, number>();
    const inFlight = this.inFlight = [];
    const n = sig.n ?? 1;
    let leaves = 0;
    let state = wf.initial_state;

    for (let steps = 0; !isFinal(wf, state) && steps < 100000; steps++) {
      const so = wf.states.find((s) => s.name === state)!;
      trace.push(state);
      visits.set(state, (visits.get(state) ?? 0) + 1);
      log(`@ ${wf.workflow}:${state}`);

      // --- canale di controllo: cancel ---
      if (sig.cancelAt === state) {
        log(`» cancel in '${state}'`);
        for (const u of [...(wf.compensation ?? [])].reverse()) log(`  · compenso: ${u.undo}`);
        while (inFlight.length > 0) this.propagateHandleSignal('cancel', inFlight.shift()!, dir, log);
        return { terminal: 'cancelled', trace: [...trace, 'cancelled'], leaves };
      }
      if (sig.suspendAt === state) { log(`» suspend '${state}': snapshot+congela, propago; resume: restore e riprendo (reversibile)`); }

      // --- fan_out_launch: lancio non bloccante ---
      if (so.fan_out_launch) {
        const fl = so.fan_out_launch;
        inFlight.push({ handle: fl.handle, workflow: fl.workflow, n });
        log(`» LANCIO non bloccante: '${fl.handle}' = ${n}× '${fl.workflow}', proseguo`);
        const o = outgoing(wf, state); if (!o.length) break; state = o[0].to; continue;
      }

      // --- await: attesa bloccante con join policy + timeout ---
      if (so.await) {
        const a = so.await;
        const want = a.handles ?? (a.handle ? [a.handle] : []);
        const ready = want.filter((h) => !(sig.timedOut ?? []).includes(h));
        const join = a.join ?? 'all';
        const need = join === 'all' ? want.length : join === 'first' ? 1 : (a.k ?? want.length);
        if (ready.length < need && a.on_timeout) {
          log(`» TIMEOUT (join ${join}, ${ready.length}/${need}) → on_timeout='${a.on_timeout}'`);
          const t = outgoing(wf, state).find((x) => x.event === a.on_timeout); if (!t) break; state = t.to; continue;
        }
        for (const h of (join === 'all' ? ready : ready.slice(0, need))) {
          const b = this.resolveHandle(inFlight, h);
          const res = this.executor.runBatch(b.workflow, dir, b.n, sig);
          leaves += res.reduce((s, r) => s + r.leaves, 0);
          log(`» ATTESA (join ${join}${join === 'quorum' ? ` ${need}/${want.length}` : ''}) → '${h}': ${b.n}× '${b.workflow}'`);
        }
        const o = outgoing(wf, state).find((x) => x.event !== a.on_timeout) ?? outgoing(wf, state)[0]; if (!o) break; state = o.to; continue;
      }

      if (so.cancel_handles) {
        for (const h of so.cancel_handles) {
          const b = this.resolveHandle(inFlight, h);
          this.propagateHandleSignal('cancel', b, dir, log);
        }
      }

      if (so.detach_handles) {
        for (const h of so.detach_handles) {
          const b = this.resolveHandle(inFlight, h);
          this.propagateHandleSignal('detach', b, dir, log);
        }
      }

      // --- react: attesa reattiva con early-exit ---
      if (so.react) {
        const r = so.react; const c = visits.get(state)!;
        const ev = (sig.earlyAt && c >= sig.earlyAt) ? r.on_early : c < n ? r.on_each : r.on_done;
        log(`» REATTIVO: completamento ${c}${ev === r.on_early ? ' → uscita anticipata' : ev === r.on_done ? ' → esaurito' : ''}`);
        const t = outgoing(wf, state).find((x) => x.event === ev); if (!t) break; state = t.to; continue;
      }

      // --- state-invoke: sub-workflow sincrono singolo ---
      if (so.invoke) {
        const child = this.run(so.invoke.workflow, dir, { ...sig, cancelAt: undefined }, silent);
        leaves += child.leaves || 1;
        const disp = (so.invoke.on_completion ?? []).find((c: Json) => c.terminal_state === child.terminal);
        if (!disp) break;
        const t = outgoing(wf, state).find((x) => x.event === disp.next_event); if (!t) break; state = t.to; continue;
      }

      // --- transizione normale (con lancio su transizione opzionale) ---
      const outs = outgoing(wf, state); if (!outs.length) break;
      let chosen = outs[0];
      const self = outs.find((o) => o.to === state); const exit = outs.find((o) => o.to !== state);
      if (self && exit) chosen = (visits.get(state)! < n) ? self : exit; // counted loop / join
      if (chosen.launch) { inFlight.push({ handle: chosen.launch.handle, workflow: chosen.launch.workflow, n }); log(`» LANCIO su transizione: '${chosen.launch.handle}'`); }
      state = chosen.to;
    }
    if (isFinal(wf, state) && inFlight.length > 0) {
      throw new Error(`terminale '${state}' raggiunto con handle attivi: ${inFlight.map((x) => x.handle).join(',')}`);
    }
    return { terminal: state, trace, leaves };
  }
}

// ---------- CLI ----------
function main() {
  const a = process.argv.slice(2); const file = a[0];
  if (!file) { console.error('uso: tsx dynamic-workflow.ts <wf.yaml> [--n N] [--timeout h1,h2] [--cancel-at S] [--suspend-at S] [--early K]'); process.exit(2); }
  const opt = (f: string, d?: string) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : d; };
  const sig: Signals = {
    n: parseInt(opt('--n', '1')!, 10),
    timedOut: (opt('--timeout', '') || '').split(',').filter(Boolean),
    cancelAt: opt('--cancel-at'), suspendAt: opt('--suspend-at'),
    earlyAt: parseInt(opt('--early', '0')!, 10) || undefined,
  };
  const engine = Engine.withStub((s) => console.log(s));
  const r = engine.run(file, process.cwd(), sig);
  console.log(`# terminal: ${r.terminal}\n# foglie eseguite (data plane): ${r.leaves}`);
}
main();
