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
interface BatchHandle { handle: string; workflow: string; n: number; suspended?: boolean; }
interface Snapshot { state: string; context: Json; inFlight: BatchHandle[]; }

// ---------- Segnali di controllo (un host reale li collega a eventi) ----------
export interface Signals { n?: number; timedOut?: string[]; cancelAt?: string; suspendAt?: string; earlyAt?: number; }

export interface RunResult { terminal: string; trace: string[]; leaves: number; }

export interface Persistence {
  saveSnapshot(key: string, snapshot: Snapshot): void;
  loadSnapshot(key: string): Snapshot | undefined;
}

export class MemoryPersistence implements Persistence {
  private snapshots = new Map<string, Snapshot>();
  saveSnapshot(key: string, snapshot: Snapshot) { this.snapshots.set(key, structuredClone(snapshot)); }
  loadSnapshot(key: string) {
    const snap = this.snapshots.get(key);
    return snap ? structuredClone(snap) : undefined;
  }
}

// ---------- Esecutore esterno = data plane (PLUGGABLE) ----------
export interface Executor {
  // Stub: sequenziale e deterministico. Reale: parallelo / code / processi.
  launchBatch(batch: BatchHandle, baseDir: string, sig: Signals): void;
  awaitBatch(batch: BatchHandle, baseDir: string, sig: Signals): { terminal: string; leaves: number }[];
  cancelBatch(batch: BatchHandle, baseDir: string, sig: Signals): void;
  detachBatch(batch: BatchHandle, baseDir: string, sig: Signals): void;
  suspendBatch(batch: BatchHandle, baseDir: string, sig: Signals): BatchHandle;
  resumeBatch(batch: BatchHandle, baseDir: string, sig: Signals): void;
}

function loadWorkflow(pathSpec: string, baseDir: string): { wf: Workflow; dir: string } {
  const abs = isAbsolute(pathSpec) ? pathSpec : resolve(baseDir, pathSpec);
  if (!existsSync(abs)) throw new Error(`workflow non trovato: ${abs}`);
  const wf = yaml.load(readFileSync(abs, 'utf8')) as Workflow;
  return { wf, dir: dirname(abs) };
}

const isFinal = (wf: Workflow, s: string) => !!wf.states.find((x) => x.name === s)?.is_final;
const outgoing = (wf: Workflow, s: string) => (wf.transitions ?? []).filter((t) => t.from === s);

function chooseTransition(candidates: Transition[], visits: number, n: number): Transition | undefined {
  if (candidates.length === 0) return undefined;
  const morePending = candidates.find((t) => t.guard === 'more_pending');
  const allDispatched = candidates.find((t) => t.guard === 'all_dispatched');
  if (morePending && allDispatched) return visits < n ? morePending : allDispatched;
  const self = candidates.find((o) => o.to === candidates[0].from);
  const exit = candidates.find((o) => o.to !== candidates[0].from);
  if (self && exit) return visits < n ? self : exit;
  return candidates[0];
}

// ---------- Engine = control plane (FSM sincrona, deterministica) ----------
export class Engine {
  private executor: Executor;
  private persistence: Persistence;
  public log: (s: string) => void;

  constructor(executor: Executor, log: (s: string) => void = () => {}, persistence: Persistence = new MemoryPersistence()) {
    this.executor = executor;
    this.persistence = persistence;
    this.log = log;
  }

  // Lo stub di default lancia le foglie subito e conserva i risultati per handle.
  static withStub(log: (s: string) => void = () => {}): Engine {
    const launched = new Map<string, { terminal: string; leaves: number }[]>();
    const executor: Executor = {
      launchBatch: (batch, dir, sig) => {
        const out: { terminal: string; leaves: number }[] = [];
        for (let i = 0; i < batch.n; i++) {
          const childEngine = Engine.withStub(() => {});
          const r = childEngine.run(batch.workflow, dir, { ...sig, cancelAt: undefined, suspendAt: undefined }, true);
          out.push({ terminal: r.terminal, leaves: r.leaves || 1 });
        }
        launched.set(batch.handle, out);
        log(`  · data-plane launch '${batch.handle}': ${batch.n}× '${batch.workflow}'`);
      },
      awaitBatch: (batch) => {
        const out = launched.get(batch.handle);
        if (!out) throw new Error(`batch non lanciato: ${batch.handle}`);
        launched.delete(batch.handle);
        return out;
      },
      cancelBatch: (batch, dir) => {
        log(`  ↓ propago cancel a '${batch.handle}' (${batch.workflow})`);
        launched.delete(batch.handle);
        try {
          const { wf: child } = loadWorkflow(batch.workflow, dir);
          for (const u of [...(child.compensation ?? [])].reverse()) log(`    · figlia compensa: ${u.undo}`);
        } catch {}
      },
      detachBatch: (batch) => {
        log(`  ↓ propago detach a '${batch.handle}' (${batch.workflow})`);
        launched.delete(batch.handle);
      },
      suspendBatch: (batch) => {
        log(`  ↓ propago suspend a '${batch.handle}' (${batch.workflow})`);
        log(`    · figlia sospesa: ${batch.handle}`);
        return { ...batch, suspended: true };
      },
      resumeBatch: (batch) => {
        log(`  ↓ propago resume a '${batch.handle}' (${batch.workflow})`);
        log(`    · figlia ripresa: ${batch.handle}`);
      },
    };
    const engine = new Engine(executor, log);
    return engine;
  }

  private inFlight: BatchHandle[] = [];

  snapshot(state: string, context: Json): Snapshot { return { state, context, inFlight: [...this.inFlight] }; }
  restore(snap: Snapshot) { this.inFlight = [...snap.inFlight]; return snap.state; }

  private resolveHandle(inFlight: BatchHandle[], handle: string) {
    const idx = inFlight.findIndex((x) => x.handle === handle);
    if (idx < 0) throw new Error(`handle attivo non trovato: ${handle}`);
    return inFlight.splice(idx, 1)[0];
  }

  run(path: string, baseDir = process.cwd(), sig: Signals = {}, silent = false): RunResult {
    const { wf, dir } = loadWorkflow(path, baseDir);
    const log = silent ? () => {} : this.log;
    const trace: string[] = [];
    const visits = new Map<string, number>();
    let inFlight = this.inFlight = [];
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
        while (inFlight.length > 0) this.executor.cancelBatch(inFlight.shift()!, dir, sig);
        return { terminal: 'cancelled', trace: [...trace, 'cancelled'], leaves };
      }
      if (sig.suspendAt === state) {
        log(`» suspend '${state}': snapshot+congela, propago; resume: restore e riprendo (reversibile)`);
        const key = `${wf.workflow}:${state}`;
        inFlight = inFlight.map((b) => this.executor.suspendBatch(b, dir, sig));
        this.inFlight = inFlight;
        this.persistence.saveSnapshot(key, this.snapshot(state, {}));
        log(`  · snapshot salvato dopo suspend figlie: ${key}`);
        const restored = this.persistence.loadSnapshot(key);
        if (restored) {
          state = this.restore(restored);
          inFlight = this.inFlight;
          log(`  · snapshot ripristinato: ${key}`);
        }
        for (const b of inFlight) this.executor.resumeBatch(b, dir, sig);
      }

      // --- fan_out_launch: lancio non bloccante ---
      if (so.fan_out_launch) {
        const fl = so.fan_out_launch;
        const batch = { handle: fl.handle, workflow: fl.workflow, n };
        inFlight.push(batch);
        this.executor.launchBatch(batch, dir, sig);
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
          const t = chooseTransition(outgoing(wf, state).filter((x) => x.event === a.on_timeout), visits.get(state)!, n); if (!t) break; state = t.to; continue;
        }
        for (const h of (join === 'all' ? ready : ready.slice(0, need))) {
          const b = this.resolveHandle(inFlight, h);
          const res = this.executor.awaitBatch(b, dir, sig);
          leaves += res.reduce((s, r) => s + r.leaves, 0);
          log(`» ATTESA (join ${join}${join === 'quorum' ? ` ${need}/${want.length}` : ''}) → '${h}': ${b.n}× '${b.workflow}'`);
        }
        const o = chooseTransition(outgoing(wf, state).filter((x) => x.event !== a.on_timeout), visits.get(state)!, n); if (!o) break; state = o.to; continue;
      }

      if (so.cancel_handles) {
        for (const h of so.cancel_handles) {
          const b = this.resolveHandle(inFlight, h);
          this.executor.cancelBatch(b, dir, sig);
        }
      }

      if (so.detach_handles) {
        for (const h of so.detach_handles) {
          const b = this.resolveHandle(inFlight, h);
          this.executor.detachBatch(b, dir, sig);
        }
      }

      // --- react: attesa reattiva con early-exit ---
      if (so.react) {
        const r = so.react; const c = visits.get(state)!;
        const ev = (sig.earlyAt && c >= sig.earlyAt) ? r.on_early : c < n ? r.on_each : r.on_done;
        log(`» REATTIVO: completamento ${c}${ev === r.on_early ? ' → uscita anticipata' : ev === r.on_done ? ' → esaurito' : ''}`);
        const t = chooseTransition(outgoing(wf, state).filter((x) => x.event === ev), visits.get(state)!, n); if (!t) break; state = t.to; continue;
      }

      // --- state-invoke: sub-workflow sincrono singolo ---
      if (so.invoke) {
        const child = this.run(so.invoke.workflow, dir, { ...sig, cancelAt: undefined }, silent);
        leaves += child.leaves || 1;
        const disp = (so.invoke.on_completion ?? []).find((c: Json) => c.terminal_state === child.terminal);
        if (!disp) break;
        const t = chooseTransition(outgoing(wf, state).filter((x) => x.event === disp.next_event), visits.get(state)!, n); if (!t) break; state = t.to; continue;
      }

      // --- transizione normale (con lancio su transizione opzionale) ---
      const chosen = chooseTransition(outgoing(wf, state), visits.get(state)!, n); if (!chosen) break;
      if (chosen.launch) {
        const batch = { handle: chosen.launch.handle, workflow: chosen.launch.workflow, n };
        inFlight.push(batch);
        this.executor.launchBatch(batch, dir, sig);
        log(`» LANCIO su transizione: '${chosen.launch.handle}'`);
      }
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
if (process.argv[1]?.endsWith('dynamic-workflow.ts')) main();
