#!/usr/bin/env python3
"""dynamic_workflow.py — esecutore di RIFERIMENTO del contratto Dynamic Workflow
per POM (vedi design/CONTRACT.md). Semplice nella struttura, completo nelle
funzionalità. NON è il runtime canonico di POM: è un riferimento estensibile
che un progetto target adatta.

Punto di estensione: la classe `Executor` (il data plane). Lo stub esegue le
istanze in sequenza, deterministico; un'implementazione reale le parallelizza
(thread/async/processi) e gestisce timeout/cancel fisici.

Uso: python dynamic_workflow.py <workflow.yaml> [--n N] [--timeout h1,h2]
     [--cancel-at STATE] [--suspend-at STATE] [--early K]
"""
from __future__ import annotations
import os
import sys
from dataclasses import dataclass, field
from typing import Protocol
import yaml


def load_workflow(path_spec: str, base_dir: str):
    abs_path = path_spec if os.path.isabs(path_spec) else os.path.join(base_dir, path_spec)
    if not os.path.exists(abs_path):
        raise FileNotFoundError(f"workflow non trovato: {abs_path}")
    with open(abs_path, encoding="utf-8") as f:
        wf = yaml.safe_load(f)
    return wf, os.path.dirname(abs_path)


def is_final(wf, name):
    return any(s.get("name") == name and s.get("is_final") for s in wf["states"])


def outgoing(wf, name):
    return [t for t in wf.get("transitions", []) if t.get("from") == name]


@dataclass
class Signals:
    n: int = 1
    timed_out: list[str] = field(default_factory=list)
    cancel_at: str | None = None
    suspend_at: str | None = None
    early_at: int = 0


@dataclass
class RunResult:
    terminal: str
    trace: list[str]
    leaves: int


class Executor(Protocol):
    """Data plane PLUGGABLE: esegue n istanze del leaf, ritorna i terminali."""
    def run_batch(self, leaf_path: str, base_dir: str, n: int, sig: Signals) -> list[dict]: ...


class Engine:
    """Control plane: FSM sincrona e deterministica."""

    def __init__(self, executor: Executor, log=lambda s: None):
        self.executor = executor
        self.log = log
        self.in_flight: list[dict] = []

    @staticmethod
    def with_stub(log=lambda s: None) -> "Engine":
        engine = Engine(None, log)  # type: ignore

        class _Stub:
            def run_batch(self, leaf, base_dir, n, sig):
                out = []
                child_sig = Signals(n=sig.n, timed_out=sig.timed_out)  # i segnali del padre non scendono qui
                for _ in range(n):
                    r = engine.run(leaf, base_dir, child_sig, silent=True)
                    out.append({"terminal": r.terminal, "leaves": r.leaves or 1})
                return out

        engine.executor = _Stub()
        return engine

    def snapshot(self, state, context):
        return {"state": state, "context": context, "in_flight": list(self.in_flight)}

    def restore(self, snap):
        self.in_flight = list(snap["in_flight"])
        return snap["state"]

    def run(self, path, base_dir=None, sig: Signals | None = None, silent=False) -> RunResult:
        base_dir = base_dir or os.getcwd()
        sig = sig or Signals()
        wf, wf_dir = load_workflow(path, base_dir)
        log = (lambda s: None) if silent else self.log
        trace: list[str] = []
        visits: dict[str, int] = {}
        in_flight = self.in_flight = []
        n = sig.n
        leaves = 0
        state = wf["initial_state"]
        steps = 0

        while not is_final(wf, state) and steps < 100000:
            steps += 1
            so = next(s for s in wf["states"] if s["name"] == state)
            trace.append(state)
            visits[state] = visits.get(state, 0) + 1
            log(f"@ {wf['workflow']}:{state}")

            # --- canale di controllo: cancel ---
            if sig.cancel_at == state:
                log(f"» cancel in '{state}'")
                for u in reversed(wf.get("compensation", [])):
                    log(f"  · compenso: {u['undo']}")
                for b in in_flight:
                    log(f"  ↓ propago cancel a '{b['handle']}' ({b['workflow']})")
                    try:
                        c, _ = load_workflow(b["workflow"], wf_dir)
                        for u in reversed(c.get("compensation", [])):
                            log(f"    · figlia compensa: {u['undo']}")
                    except Exception:
                        pass
                return RunResult("cancelled", trace + ["cancelled"], leaves)
            if sig.suspend_at == state:
                log(f"» suspend '{state}': snapshot+congela, propago; resume: restore e riprendo (reversibile)")

            # --- fan_out_launch: lancio non bloccante ---
            if "fan_out_launch" in so:
                fl = so["fan_out_launch"]
                in_flight.append({"handle": fl["handle"], "workflow": fl["workflow"], "n": n})
                log(f"» LANCIO non bloccante: '{fl['handle']}' = {n}× '{fl['workflow']}', proseguo")
                outs = outgoing(wf, state)
                if not outs:
                    break
                state = outs[0]["to"]
                continue

            # --- await: attesa bloccante con join policy + timeout ---
            if "await" in so:
                a = so["await"]
                want = a.get("handles") or ([a["handle"]] if a.get("handle") else [])
                ready = [h for h in want if h not in sig.timed_out]
                join = a.get("join", "all")
                need = len(want) if join == "all" else 1 if join == "first" else a.get("k", len(want))
                if len(ready) < need and a.get("on_timeout"):
                    log(f"» TIMEOUT (join {join}, {len(ready)}/{need}) → on_timeout='{a['on_timeout']}'")
                    t = next((x for x in outgoing(wf, state) if x["event"] == a["on_timeout"]), None)
                    if not t:
                        break
                    state = t["to"]
                    continue
                to_run = ready if join == "all" else ready[:need]
                for h in to_run:
                    b = next((x for x in in_flight if x["handle"] == h), None)
                    if not b:
                        continue
                    res = self.executor.run_batch(b["workflow"], wf_dir, b["n"], sig)
                    leaves += sum(r["leaves"] for r in res)
                    extra = f" {need}/{len(want)}" if join == "quorum" else ""
                    log(f"» ATTESA (join {join}{extra}) → '{h}': {b['n']}× '{b['workflow']}'")
                outs = [x for x in outgoing(wf, state) if x["event"] != a.get("on_timeout")] or outgoing(wf, state)
                if not outs:
                    break
                state = outs[0]["to"]
                continue

            # --- react: attesa reattiva con early-exit ---
            if "react" in so:
                r = so["react"]
                c = visits[state]
                ev = r["on_early"] if (sig.early_at and c >= sig.early_at) else r["on_each"] if c < n else r["on_done"]
                tag = " → uscita anticipata" if ev == r["on_early"] else " → esaurito" if ev == r["on_done"] else ""
                log(f"» REATTIVO: completamento {c}{tag}")
                t = next((x for x in outgoing(wf, state) if x["event"] == ev), None)
                if not t:
                    break
                state = t["to"]
                continue

            # --- state-invoke: sub-workflow sincrono singolo ---
            if "invoke" in so:
                inv = so["invoke"]
                child = self.run(inv["workflow"], wf_dir, Signals(n=sig.n, timed_out=sig.timed_out), silent)
                leaves += child.leaves or 1
                disp = next((c for c in inv.get("on_completion", []) if c["terminal_state"] == child.terminal), None)
                if not disp:
                    break
                t = next((x for x in outgoing(wf, state) if x["event"] == disp["next_event"]), None)
                if not t:
                    break
                state = t["to"]
                continue

            # --- transizione normale (con lancio su transizione opzionale) ---
            outs = outgoing(wf, state)
            if not outs:
                break
            chosen = outs[0]
            self_t = next((o for o in outs if o["to"] == state), None)
            exit_t = next((o for o in outs if o["to"] != state), None)
            if self_t and exit_t:
                chosen = self_t if visits[state] < n else exit_t  # counted loop / join
            if "launch" in chosen:
                lc = chosen["launch"]
                in_flight.append({"handle": lc["handle"], "workflow": lc["workflow"], "n": n})
                log(f"» LANCIO su transizione: '{lc['handle']}'")
            state = chosen["to"]

        return RunResult(state, trace, leaves)


def main():
    argv = sys.argv[1:]
    if not argv:
        print("uso: python dynamic_workflow.py <wf.yaml> [--n N] [--timeout h1,h2] [--cancel-at S] [--suspend-at S] [--early K]")
        sys.exit(2)
    file = argv[0]

    def opt(flag, default=None):
        return argv[argv.index(flag) + 1] if flag in argv else default

    sig = Signals(
        n=int(opt("--n", "1")),
        timed_out=[h for h in (opt("--timeout", "") or "").split(",") if h],
        cancel_at=opt("--cancel-at"),
        suspend_at=opt("--suspend-at"),
        early_at=int(opt("--early", "0") or "0"),
    )
    engine = Engine.with_stub(log=print)
    r = engine.run(file, os.getcwd(), sig)
    print(f"# terminal: {r.terminal}\n# foglie eseguite (data plane): {r.leaves}")


if __name__ == "__main__":
    main()
