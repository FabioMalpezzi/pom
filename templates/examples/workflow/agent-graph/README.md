# Workflow examples — agent graph pattern family

Canonical POM workflow examples for **agent-shaped** graphs: processes whose work is produced by agents, run in parallel, or re-entered by a runtime. They differ from the loop/goal examples in the sibling folder because they do not model the shape of a single controller. They model the three places where a graph of agents breaks quietly:

- who judges the produced work, and on what context;
- what starts a cycle and what closes it;
- where parallel workers do their work, and what happens when they contradict each other.

For classic domain workflows (ticket lifecycle, document approval, spec evolution) see the parent folder `templates/examples/workflow/`. For the structural patterns of a single iterating agent see `templates/examples/workflow/loop-goal/`.

## Catalogue

| File | What it shows | Constructs |
|---|---|---|
| `security-sweep.yaml` | One agent per file hunts for missing authorization checks; a fan-in guard decides whether the report may be published. Shows why that guard must declare its evidence, and why the timeout branch must cancel the batch instead of walking away from it. | `fan_out_launch`, `await` with `join: all` and a timeout, `cancel_handles`, `guards[].evidence` with `independent_context: true`, the three fan-out decisions recorded in `open_points` |
| `file-audit.yaml` | The child workflow launched for each file. Deliberately small: two terminals, both accounted for in the batch manifest. | distinct success and failure terminals |
| `nightly-test-repair.yaml` | A nightly agent repairs the red suite until it passes or the bound is spent. Shows the difference between a managed loop and "keep trying". | `loop_guard`, `guards[].evidence` with `source: deterministic`, a complete `runtime_loop` block |

## What happens when you remove the declarations

These are *positive* examples: all of them validate at zero errors and zero warnings. Their teaching value shows when you delete a line.

- Remove the `evidence` block from the `findings_confirmed` guard in `security-sweep.yaml` → **W006**, because a single decision covers everything an entire fan-out produced and the model does not say who takes it.
- Change that evidence to `source: model_judgment` without `independent_context: true` → **W005**, meaning the verifier may share the context of whoever produced the work.
- Remove `feedback` and `escalation` from the `runtime_loop` of `nightly-test-repair.yaml` → **W007** and **W008**: the next cycle restarts without knowing what went wrong, and when the bound is spent the run has no owner.
- Route `sweep_timed_out` straight to `abandoned`, skipping `cancelling` → **E089**, because the workflow would close while workers are still active.

The fixtures demonstrating each of these cases live in `tests/workflow-validator/fixtures/` and are covered by `tests/workflow-validator/integration/test-verification-and-runtime-loop.mjs`.

## Verification

All three files validate with `pom:workflow:lint` at **zero errors and zero warnings**, and the test suite is what keeps that true over time: `tests/workflow-validator/integration/test-verification-and-runtime-loop.mjs` lints them on every `pom:test` run.

## Provenance

Modeled on 2026-07-26 together with the introduction of `guards[].evidence`, `runtime_loop`, `metadata.provenance`, and the three mandatory fan-out questions. The cases are not invented: the security sweep is the canonical shape of a fan-out with a verifier, and the shared-workspace failure has a public precedent in Bun's Zig-to-Rust port. Context and rationale in `wiki/agent-graph-patterns.md` and in the `wiki/log.md` entry of the same date.

A note on the `provenance` field: both examples declare `speculative`, because they are teaching models rather than transcripts of a process observed in production. That is exactly the intended use of the field.
