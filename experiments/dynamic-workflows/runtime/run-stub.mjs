#!/usr/bin/env node
//
// run-stub.mjs — esecutore deterministico di workflow POM per l'esperimento
// dynamic-workflows. Esegue un workflow YAML (Pattern A: transition table
// piatta) con passi-agente STUB DETERMINISTICI: ogni stato "ha successo" e
// emette l'evento happy-path. Nessun LLM, nessuna rete: riproducibile.
//
// Scopo: dimostrare se lo schema POM può ESPRIMERE E PILOTARE la struttura
// del Dynamic Workflow. Il runner segue UN cammino alla volta (la transition
// table è deterministica): è proprio questa la lente con cui si vede dove il
// parallelismo e il fan-out dinamico non sono rappresentabili.
//
// Uso:
//   node run-stub.mjs <workflow.yaml> [--n N] [--events e1,e2,...] [--max 1000]
//
// --n N      : per i modelli che tentano un fan-out, quante istanze il modello
//              riesce davvero a generare (lo riporta esplicitamente).
// --events   : sequenza di eventi forzata in caso di ambiguità (più transizioni
//              dallo stesso stato); default = prima transizione uscente.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, isAbsolute, join, dirname } from 'node:path';
import yaml from 'js-yaml';

function load(pathSpec, baseDir) {
  const abs = isAbsolute(pathSpec) ? pathSpec : resolve(baseDir, pathSpec);
  if (!existsSync(abs)) throw new Error(`workflow non trovato: ${abs}`);
  const wf = yaml.load(readFileSync(abs, 'utf8'));
  return { wf, dir: dirname(abs) };
}

function isFinal(wf, name) {
  return !!wf.states.find((s) => s.name === name)?.is_final;
}

function outgoing(wf, state) {
  return (wf.transitions ?? []).filter((t) => t.from === state);
}

// Esegue un workflow sincrono seguendo l'happy-path deterministico.
// Ritorna { terminal, trace, invokeCount } dove invokeCount conta i
// sub-workflow realmente invocati (per misurare il fan-out effettivo).
function run(wf, dir, opts, depth = 0) {
  const trace = [];
  const visits = new Map();
  const inFlight = []; // batch lanciati e affidati all'esterno, non ancora attesi
  let invokeCount = 0;
  let state = wf.initial_state;
  let steps = 0;
  const indent = '  '.repeat(depth);

  while (!isFinal(wf, state) && steps < opts.max) {
    steps++;
    const stateObj = wf.states.find((s) => s.name === state);
    trace.push(state);
    visits.set(state, (visits.get(state) ?? 0) + 1);
    opts.log(`${indent}@ ${wf.workflow}:${state}`);

    // CONTROL SIGNAL: cancel propagato (canale di controllo della
    // composizione). Arriva dal caller; la FSM compensa il lavoro fatto
    // (blocco `compensation`, saga di undo), propaga il cancel alle figlie
    // attive, e termina in `cancelled` (terminale standard del lifecycle).
    if (opts.cancelAt === state) {
      opts.log(`${indent}» SEGNALE DI CONTROLLO 'cancel' ricevuto in '${state}'`);
      if (Array.isArray(wf.compensation)) {
        for (const step of [...wf.compensation].reverse()) {
          opts.log(`${indent}  · compenso (undo): ${step.undo ?? step}`);
        }
      }
      for (const b of inFlight) {
        opts.log(`${indent}  ↓ propago 'cancel' alla figlia attiva '${b.handle}' (${b.workflow})`);
        try {
          const { wf: child } = load(b.workflow, dir);
          if (Array.isArray(child.compensation)) {
            for (const step of [...child.compensation].reverse()) opts.log(`${indent}    · la figlia compensa: ${step.undo ?? step}`);
          }
        } catch { /* figlia non caricabile: ignora nel sim */ }
      }
      const hasCancelled = wf.states.some((s) => s.name === 'cancelled' && s.is_final);
      state = hasCancelled ? 'cancelled' : state;
      trace.push('cancelled');
      opts.log(`${indent}# terminato in 'cancelled'${hasCancelled ? '' : ' (terminale standard implicito)'}`);
      return { terminal: 'cancelled', trace, invokeCount };
    }
    // suspend/resume: lifecycle (H5), non stati di dominio. Si loggano come
    // snapshot/restore propagati, senza alterare il cammino: la FSM riprende
    // esattamente da dov'era. Dimostra che NON vanno modellati stato per stato.
    if (opts.suspendAt === state) {
      opts.log(`${indent}» SEGNALE 'suspend' in '${state}': snapshot dello stato+context, congelo e propago alle ${inFlight.length} figlie attive`);
      opts.log(`${indent}» 'resume': restore dallo snapshot, riprendo da '${state}' (reversibile, nessun lavoro perso)`);
    }

    // fan_out_launch: LANCIO non bloccante. La FSM affida all'esecutore
    // esterno N istanze del leaf e prosegue SUBITO — così può lanciare
    // altri batch / altre FSM prima di fermarsi ad attendere.
    if (stateObj?.fan_out_launch) {
      const fl = stateObj.fan_out_launch;
      inFlight.push({ handle: fl.handle, workflow: fl.workflow, over: fl.over, n: opts.n });
      opts.log(`${indent}» LANCIO (non bloccante): batch '${fl.handle}' = ${opts.n}× '${fl.workflow}' affidato all'esecutore esterno; la FSM PROSEGUE`);
      const outsL = outgoing(wf, state);
      if (outsL.length === 0) { opts.log(`${indent}! lancio senza transizione`); break; }
      state = outsL[0].to;
      continue;
    }

    // await: ATTESA bloccante. SOLO qui la FSM si ferma, finché l'esterno
    // segnala che i batch lanciati sono pronti. L'esterno esegue ora i leaf
    // (simulazione del parallelo) e ritorna l'aggregato (join).
    if (stateObj?.await) {
      const a = stateObj.await;
      const wantRaw = a.handles ?? a.handle;
      const want = Array.isArray(wantRaw) ? wantRaw : [wantRaw];
      const ready = want.filter((h) => !(opts.timeout ?? []).includes(h));
      const timedOut = want.filter((h) => (opts.timeout ?? []).includes(h));
      // Join policy: all = tutti; first/race = 1; quorum = k di n. La FSM si
      // risveglia via on_timeout (H7) SOLO se la soglia non è raggiunta —
      // un batch lento non blocca se quorum/first è già soddisfatto.
      const join = a.join ?? 'all';
      const need = join === 'all' ? want.length : join === 'first' ? 1 : (a.k ?? want.length);
      const satisfied = ready.length >= need;
      if (!satisfied && a.on_timeout) {
        opts.log(`${indent}» TIMEOUT (join: ${join}, pronti ${ready.length}/${need}, in timeout [${timedOut.join(', ')}]); la FSM si risveglia via on_timeout='${a.on_timeout}'`);
        const tt = outgoing(wf, state).find((o) => o.event === a.on_timeout);
        if (!tt) { opts.log(`${indent}! on_timeout '${a.on_timeout}' senza transizione`); break; }
        state = tt.to;
        continue;
      }
      const silent = { ...opts, log: () => {} };
      const toRun = join === 'all' ? ready : ready.slice(0, need);
      for (const h of toRun) {
        const batch = inFlight.find((b) => b.handle === h);
        if (!batch) { opts.log(`${indent}! attesa di un batch mai lanciato: ${h}`); continue; }
        let term = null;
        let nested = 0;
        const { wf: child, dir: childDir } = load(batch.workflow, dir);
        for (let k = 0; k < batch.n; k++) { const r = run(child, childDir, silent, depth + 1); term = r.terminal; invokeCount++; nested += r.invokeCount; }
        invokeCount += nested;
        opts.log(`${indent}» ATTESA (join: ${join}${join === 'quorum' ? ` ${need}/${want.length}` : ''}) → batch '${h}': ${batch.n}× '${child.workflow}' → '${term}'${nested ? ` (+${nested} foglie annidate dal fan-out interno)` : ''}`);
      }
      if (timedOut.length && satisfied) {
        opts.log(`${indent}  · soglia raggiunta: ignorati ${timedOut.length} batch lenti [${timedOut.join(', ')}]`);
      }
      const outsA = outgoing(wf, state).find((o) => o.event !== a.on_timeout) ?? outgoing(wf, state)[0];
      if (!outsA) { opts.log(`${indent}! attesa senza transizione`); break; }
      state = outsA.to;
      continue;
    }

    // react: ATTESA REATTIVA (on_each). La FSM reagisce a OGNI completamento
    // (uno stream di eventi) e può uscire in anticipo. È il counted-join
    // (Struttura 3) con early-exit: deterministico nei guard, asincrono solo
    // nel timing degli eventi. --early K simula l'uscita anticipata al K-esimo.
    if (stateObj?.react) {
      const r = stateObj.react;
      const c = visits.get(state) ?? 1;
      let ev;
      if (opts.early > 0 && c >= opts.early) {
        ev = r.on_early;
        opts.log(`${indent}» REATTIVO: al completamento #${c} la FSM decide l'uscita anticipata (on_early='${ev}')`);
      } else if (c < opts.n) {
        ev = r.on_each;
        opts.log(`${indent}» REATTIVO: completamento ${c}/${opts.n} ricevuto, la FSM valuta e prosegue`);
      } else {
        ev = r.on_done;
        opts.log(`${indent}» REATTIVO: ricevuti tutti gli ${opts.n}, raccolta esaurita (on_done='${ev}')`);
      }
      const tt = outgoing(wf, state).find((o) => o.event === ev);
      if (!tt) { opts.log(`${indent}! react: evento '${ev}' senza transizione`); break; }
      state = tt.to;
      continue;
    }

    // state-invoke: UN sub-workflow sincrono (la FSM interna attende).
    if (stateObj?.invoke) {
      const inv = stateObj.invoke;
      const { wf: child, dir: childDir } = load(inv.workflow, dir);
      invokeCount++;
      const childRes = run(child, childDir, opts, depth + 1);
      invokeCount += childRes.invokeCount;
      const childTerminal = childRes.terminal;
      const disp = (inv.on_completion ?? []).find(
        (c) => c.terminal_state === childTerminal
      );
      if (!disp) {
        opts.log(`${indent}! invoke completò in '${childTerminal}' ma nessun on_completion lo gestisce`);
        break;
      }
      const ev = disp.next_event;
      const cands = outgoing(wf, state).filter((x) => x.event === ev);
      if (cands.length === 0) { opts.log(`${indent}! next_event '${ev}' senza transizione`); break; }
      // counted invoke loop: self = ri-lancia un altro task, exit = finito.
      let t = cands[0];
      const selfC = cands.find((o) => o.to === state);
      const exitC = cands.find((o) => o.to !== state);
      if (selfC && exitC) {
        const c = visits.get(state) ?? 1;
        t = c < opts.n ? selfC : exitC;
        if (t === selfC) opts.log(`${indent}  · fan-out: lanciato ${c}/${opts.n}`);
      }
      state = t.to;
      continue;
    }

    const outs = outgoing(wf, state);
    if (outs.length === 0) { opts.log(`${indent}! dead-end in '${state}'`); break; }

    // happy-path. Caso speciale "join contato": se da questo stato c'è una
    // self-transition e un'uscita, fa N giri su sé stesso (un giro per task
    // raccolto) e poi esce. Modella deterministicamente il guard counter
    // received==N senza valutare i guard. Altrimenti usa --events o la prima.
    let chosen = outs[0];
    const self = outs.find((o) => o.to === state);
    const exit = outs.find((o) => o.to !== state);
    if (self && exit) {
      const c = visits.get(state) ?? 1;
      chosen = c < opts.n ? self : exit;
      if (chosen === self) opts.log(`${indent}  · join: raccolto ${c}/${opts.n}`);
    } else if (outs.length > 1 && opts.events.length > 0) {
      const want = opts.events.find((e) => outs.some((o) => o.event === e));
      if (want) chosen = outs.find((o) => o.event === want);
    }
    // Variante B: il lancio è un effetto della transizione (campo `launch`),
    // non uno stato dedicato. Additivo: il validator ignora `launch`.
    if (chosen.launch) {
      inFlight.push({ handle: chosen.launch.handle, workflow: chosen.launch.workflow, over: chosen.launch.over, n: opts.n });
      opts.log(`${indent}» LANCIO (su transizione, non bloccante): batch '${chosen.launch.handle}' = ${opts.n}× '${chosen.launch.workflow}'`);
    }
    state = chosen.to;
  }

  return { terminal: state, trace, invokeCount };
}

function main() {
  const argv = process.argv.slice(2);
  const file = argv[0];
  if (!file) { console.error('uso: node run-stub.mjs <workflow.yaml> [--n N] [--events e1,e2] [--max 1000]'); process.exit(2); }
  const getOpt = (flag, def) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : def;
  };
  const N = parseInt(getOpt('--n', '3'), 10);
  const events = (getOpt('--events', '') || '').split(',').filter(Boolean);
  const timeout = (getOpt('--timeout', '') || '').split(',').filter(Boolean);
  const early = parseInt(getOpt('--early', '0'), 10);
  const cancelAt = getOpt('--cancel-at', null);
  const suspendAt = getOpt('--suspend-at', null);
  const max = parseInt(getOpt('--max', '1000'), 10);
  const logLines = [];
  const log = (s) => logLines.push(s);

  const { wf, dir } = load(file, process.cwd());
  log(`# run-stub: ${wf.workflow} (N=${N}${timeout.length ? `, timeout: ${timeout.join(',')}` : ''})`);
  const res = run(wf, dir, { n: N, events, max, log, timeout, early, cancelAt, suspendAt });
  log(`# terminal: ${res.terminal}`);
  log(`# stati visitati: ${res.trace.length}`);
  log(`# sub-workflow invocati (fan-out effettivo): ${res.invokeCount}`);
  console.log(logLines.join('\n'));
  process.exit(0);
}

main();
