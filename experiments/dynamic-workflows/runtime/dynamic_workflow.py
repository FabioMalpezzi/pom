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
from copy import deepcopy
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


def choose_transition(candidates, visits, n):
    if not candidates:
        return None
    more_pending = next((t for t in candidates if t.get("guard") == "more_pending"), None)
    all_dispatched = next((t for t in candidates if t.get("guard") == "all_dispatched"), None)
    if more_pending and all_dispatched:
        return more_pending if visits < n else all_dispatched
    self_t = next((t for t in candidates if t.get("to") == candidates[0].get("from")), None)
    exit_t = next((t for t in candidates if t.get("to") != candidates[0].get("from")), None)
    if self_t and exit_t:
        return self_t if visits < n else exit_t
    return candidates[0]


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


class Persistence(Protocol):
    def save_snapshot(self, key: str, snapshot: dict) -> None: ...
    def load_snapshot(self, key: str) -> dict | None: ...


class MemoryPersistence:
    def __init__(self):
        self.snapshots: dict[str, dict] = {}

    def save_snapshot(self, key: str, snapshot: dict) -> None:
        self.snapshots[key] = deepcopy(snapshot)

    def load_snapshot(self, key: str) -> dict | None:
        snap = self.snapshots.get(key)
        return deepcopy(snap) if snap is not None else None


class Executor(Protocol):
    """Data plane PLUGGABLE: launch/await/control su batch esterni."""
    def launch_batch(self, batch: dict, base_dir: str, sig: Signals) -> None: ...
    def await_batch(self, batch: dict, base_dir: str, sig: Signals) -> list[dict]: ...
    def cancel_batch(self, batch: dict, base_dir: str, sig: Signals) -> None: ...
    def detach_batch(self, batch: dict, base_dir: str, sig: Signals) -> None: ...
    def suspend_batch(self, batch: dict, base_dir: str, sig: Signals) -> dict: ...
    def resume_batch(self, batch: dict, base_dir: str, sig: Signals) -> None: ...


class Engine:
    """Control plane: FSM sincrona e deterministica."""

    def __init__(self, executor: Executor, log=lambda s: None, persistence: Persistence | None = None):
        self.executor = executor
        self.log = log
        self.persistence = persistence or MemoryPersistence()
        self.in_flight: list[dict] = []

    @staticmethod
    def with_stub(log=lambda s: None) -> "Engine":
        launched: dict[str, list[dict]] = {}
        engine = Engine(None, log)  # type: ignore

        class _Stub:
            def launch_batch(self, batch, base_dir, sig):
                out = []
                child_sig = Signals(n=sig.n, timed_out=sig.timed_out)  # i segnali del padre non scendono qui
                for _ in range(batch["n"]):
                    child_engine = Engine.with_stub()
                    r = child_engine.run(batch["workflow"], base_dir, child_sig, silent=True)
                    out.append({"terminal": r.terminal, "leaves": r.leaves or 1})
                launched[batch["handle"]] = out
                log(f"  · data-plane launch '{batch['handle']}': {batch['n']}× '{batch['workflow']}'")

            def await_batch(self, batch, base_dir, sig):
                if batch["handle"] not in launched:
                    raise RuntimeError(f"batch non lanciato: {batch['handle']}")
                return launched.pop(batch["handle"])

            def cancel_batch(self, batch, base_dir, sig):
                log(f"  ↓ propago cancel a '{batch['handle']}' ({batch['workflow']})")
                launched.pop(batch["handle"], None)
                try:
                    child, _ = load_workflow(batch["workflow"], base_dir)
                    for u in reversed(child.get("compensation", [])):
                        log(f"    · figlia compensa: {u['undo']}")
                except Exception:
                    pass

            def detach_batch(self, batch, base_dir, sig):
                log(f"  ↓ propago detach a '{batch['handle']}' ({batch['workflow']})")
                launched.pop(batch["handle"], None)

            def suspend_batch(self, batch, base_dir, sig):
                log(f"  ↓ propago suspend a '{batch['handle']}' ({batch['workflow']})")
                log(f"    · figlia sospesa: {batch['handle']}")
                return {**batch, "suspended": True}

            def resume_batch(self, batch, base_dir, sig):
                log(f"  ↓ propago resume a '{batch['handle']}' ({batch['workflow']})")
                log(f"    · figlia ripresa: {batch['handle']}")

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
                while in_flight:
                    self.executor.cancel_batch(in_flight.pop(0), wf_dir, sig)
                return RunResult("cancelled", trace + ["cancelled"], leaves)
            if sig.suspend_at == state:
                log(f"» suspend '{state}': snapshot+congela, propago; resume: restore e riprendo (reversibile)")
                key = f"{wf['workflow']}:{state}"
                in_flight = [self.executor.suspend_batch(b, wf_dir, sig) for b in in_flight]
                self.in_flight = in_flight
                self.persistence.save_snapshot(key, self.snapshot(state, {}))
                log(f"  · snapshot salvato dopo suspend figlie: {key}")
                restored = self.persistence.load_snapshot(key)
                if restored:
                    state = self.restore(restored)
                    in_flight = self.in_flight
                    log(f"  · snapshot ripristinato: {key}")
                for b in in_flight:
                    self.executor.resume_batch(b, wf_dir, sig)

            # --- fan_out_launch: lancio non bloccante ---
            if "fan_out_launch" in so:
                fl = so["fan_out_launch"]
                batch = {"handle": fl["handle"], "workflow": fl["workflow"], "n": n}
                in_flight.append(batch)
                self.executor.launch_batch(batch, wf_dir, sig)
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
                    t = choose_transition([x for x in outgoing(wf, state) if x["event"] == a["on_timeout"]], visits[state], n)
                    if not t:
                        break
                    state = t["to"]
                    continue
                to_run = ready if join == "all" else ready[:need]
                for h in to_run:
                    b = self._resolve_handle(in_flight, h)
                    res = self.executor.await_batch(b, wf_dir, sig)
                    leaves += sum(r["leaves"] for r in res)
                    extra = f" {need}/{len(want)}" if join == "quorum" else ""
                    log(f"» ATTESA (join {join}{extra}) → '{h}': {b['n']}× '{b['workflow']}'")
                t = choose_transition([x for x in outgoing(wf, state) if x["event"] != a.get("on_timeout")], visits[state], n)
                if not t:
                    break
                state = t["to"]
                continue

            if "cancel_handles" in so:
                for h in so["cancel_handles"]:
                    self.executor.cancel_batch(self._resolve_handle(in_flight, h), wf_dir, sig)

            if "detach_handles" in so:
                for h in so["detach_handles"]:
                    self.executor.detach_batch(self._resolve_handle(in_flight, h), wf_dir, sig)

            # --- react: attesa reattiva con early-exit ---
            if "react" in so:
                r = so["react"]
                c = visits[state]
                ev = r["on_early"] if (sig.early_at and c >= sig.early_at) else r["on_each"] if c < n else r["on_done"]
                tag = " → uscita anticipata" if ev == r["on_early"] else " → esaurito" if ev == r["on_done"] else ""
                log(f"» REATTIVO: completamento {c}{tag}")
                t = choose_transition([x for x in outgoing(wf, state) if x["event"] == ev], visits[state], n)
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
                t = choose_transition([x for x in outgoing(wf, state) if x["event"] == disp["next_event"]], visits[state], n)
                if not t:
                    break
                state = t["to"]
                continue

            # --- transizione normale (con lancio su transizione opzionale) ---
            chosen = choose_transition(outgoing(wf, state), visits[state], n)
            if not chosen:
                break
            if "launch" in chosen:
                lc = chosen["launch"]
                batch = {"handle": lc["handle"], "workflow": lc["workflow"], "n": n}
                in_flight.append(batch)
                self.executor.launch_batch(batch, wf_dir, sig)
                log(f"» LANCIO su transizione: '{lc['handle']}'")
            state = chosen["to"]

        if is_final(wf, state) and in_flight:
            handles = ",".join(b["handle"] for b in in_flight)
            raise RuntimeError(f"terminale '{state}' raggiunto con handle attivi: {handles}")
        return RunResult(state, trace, leaves)

    def _resolve_handle(self, in_flight, handle):
        for i, batch in enumerate(in_flight):
            if batch["handle"] == handle:
                return in_flight.pop(i)
        raise RuntimeError(f"handle attivo non trovato: {handle}")

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
