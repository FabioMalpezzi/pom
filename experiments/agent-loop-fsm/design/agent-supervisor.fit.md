---
experiment: agent-loop-fsm
hypothesis: H4
artifact: workflows-candidate/agent-supervisor.yaml
iteration: 1
date: 2026-05-30
pattern: Supervisor with goal-lifecycle as autonomous sub-workflow
---

# Fit classification — agent-supervisor (H4 iter 1)

## States (5)

| State | Fit | Note |
|---|---|---|
| `idle` | clean | Initial state. |
| `handling_goal` | clean | Carries the `invoke:` block on `agent-orchestrator-goal-lifecycle.yaml` with `on_completion` dispatch on `done` and `failed`. The state-invoke primitive maps directly. |
| `acknowledging` | clean | Post-success state. |
| `escalating` | clean | Post-failure state. |
| `stopped` | clean | Terminal. |

**5/5 clean fit.**

## Transitions (6)

All six transitions map to event-driven primitives. The two transitions out of `handling_goal` are triggered by the events emitted by the invoke's `on_completion` dispatch (`goal_completed`, `goal_failed`). POM expresses this without compromise.

**6/6 clean fit.**

## Gate results

| Gate | Esito |
|---|---|
| Validator pass (caller) | PASS (0/0 after one path fix) |
| Mermaid + mmdc | PASS |
| Invoke + on_completion | PASS — 1 invoke with 2 on_completion entries (`done → goal_completed`, `failed → goal_failed`) |
| Sub-workflow referenced exists and is valid | PASS — file is sibling, already validated by H1 iter 2 |

## What H4 confirms

The goal-lifecycle workflow modeled in H1 iter 2 (`agent-orchestrator-goal-lifecycle.yaml`) is **autonomous** in the POM sense:

- it stands alone as a valid workflow (already validated in H1);
- it can be invoked from another workflow via the state-invoke primitive without modification;
- its two terminal states (`done`, `failed`) participate in the on_completion dispatch of the caller, which then proceeds along its own logic.

This is the classic "child workflow as reusable subroutine" pattern, already stress-tested in `experiments/workflow-modeling/` round 2. H4 inherits that validation and confirms it specifically for the agent goal-lifecycle case.

## One issue caught and fixed in this iteration

The first run of the lint failed with `E031` because the `invoke.workflow` path was specified as `workflows-candidate/agent-orchestrator-goal-lifecycle.yaml` (project-relative), whereas the validator resolves the path **relative to the caller file**. Fixed by using the bare filename, since the sub-workflow is a sibling.

This is a workflow-modeling design choice already established in round 2: paths in `invoke.workflow` are caller-relative, not project-relative. Worth recording because it is the kind of small detail that costs an iteration when you forget it.

## Verdict on H4

**CONFIRMED.** The goal-lifecycle workflow is invokable as an autonomous sub-workflow with no schema growth. The state-invoke primitive and the on_completion dispatch primitive carry the burden; H4 is essentially a re-confirmation of round 2 of `workflow-modeling` specialized for the agent goal-lifecycle case.

## Signal

| Iter | Pattern | clean states | clean transitions | overall |
|---|---|---|---|---|
| 1 | supervisor + invoke | 5/5 | 6/6 | **100%** |

Loop exits via "Raggiunto". Budget used: ~6 min of 30 min cap (one wasted iteration on the path fix).
