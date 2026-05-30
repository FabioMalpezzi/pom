---
experiment: agent-loop-fsm
hypothesis: H1
artifact: workflows-candidate/agent-orchestrator.yaml
iteration: 1
date: 2026-05-30
pattern: ReAct minimal (Reason, Act, Observe)
---

# Fit classification — agent-orchestrator (iter 1, ReAct minimal)

Each state and transition of the modeled workflow is classified as one of:

- **`clean`**: maps one-to-one to a POM primitive without compromise. The model captures the domain meaning faithfully.
- **`adapted`**: maps to a POM primitive but requires a small reformulation (e.g., renaming, splitting one domain concept into two states, or merging two domain concepts into one event). The model still captures the meaning, with documented adjustment.
- **`forced`**: the POM primitive distorts the domain meaning (lossy fit). The model would mislead a reader about what the agent actually does. This is the failure mode H1 must avoid.

## Classification — states (6 total)

| State | Fit | Note |
|---|---|---|
| `idle` | clean | Standard pre-loop quiescent state. Maps directly to a POM non-final state with one outgoing event (`goal_received`). |
| `reasoning` | clean | ReAct pattern's "thought" stage. Maps to a POM state with two domain-meaningful exits (`plan_ready` → act, `goal_already_met` → done). No structural compromise. |
| `acting` | clean | ReAct pattern's "action" stage. Maps to a POM state with two outcomes (`action_done`, `action_error`). |
| `observing` | clean | ReAct pattern's "observation" stage. The loop point: either `loop_continue` back to reasoning or `goal_met` to done. |
| `done` | clean | Terminal success. Standard POM `is_final: true`. |
| `failed` | clean | Terminal failure. Standard POM `is_final: true`. |

**Stati clean fit: 6/6 (100%).** **Stati forced fit: 0.**

## Classification — transitions (7 total)

| Transition | Fit | Note |
|---|---|---|
| `idle → reasoning` on `goal_received` | clean | Standard event-driven start. |
| `reasoning → acting` on `plan_ready` | clean | Standard event-driven transition. |
| `reasoning → done` on `goal_already_met` | clean | ReAct allows early termination from the thought stage when no action is needed. POM supports multiple terminal exits from a non-final state without compromise. |
| `acting → observing` on `action_done` | clean | Standard event-driven success path. |
| `acting → failed` on `action_error` | clean | Standard event-driven failure path. |
| `observing → reasoning` on `loop_continue` | clean | The agent loop edge. POM allows self-cycling subgraphs via a transition to a non-final ancestor. No primitive missing. |
| `observing → done` on `goal_met` | clean | Standard event-driven success path. |

**Transizioni clean fit: 7/7 (100%).** **Transizioni forced fit: 0.**

## What is intentionally NOT modeled in iter 1

These items are deferred to later hypotheses of `agent-loop-fsm` and are explicitly out of scope for H1 (see `criteria-experiment-1-h1.md`):

- **Bounded loop**: there is no upper bound on the number of `loop_continue` cycles. The agent could spin forever. The bound is the subject of **H6 `loop_guard`** (already in backlog as a planned schema extension); H1 does not require it.
- **Per-state timeout**: no time bound on the `reasoning` step (LLM that thinks too long) or on `acting` (action that hangs). Subject of **H7 `timeout`**.
- **Bounded retry on action error**: `action_error` exits directly to `failed` without a retry. A real agent typically retries N times before giving up. Subject of **H3 (retry bounded via self-transition)**.
- **Internal sub-steps of reasoning** (planner / critic / tool-selector): collapsed into a single `reasoning` state. Decomposition is potentially the subject of **H4 (goal lifecycle workflow autonomo)** if a deeper modeling is needed.

## Gate results (iter 1)

| Gate | Strumento | Esito |
|---|---|---|
| Validator pass | `node scripts/lint-workflows.mjs` | **PASS** — 0 errors, 0 warnings (after fixing one YAML quoting issue on the metadata reference field). |
| Mermaid generated and parseable | `scripts/to-mermaid.mjs` + `mmdc` | **PASS** — `.mmd` produced (516 B), SVG rendered (~31 KB). Both in `evidence/mermaid/`. |
| Schema extensions outside backlog | diff vs SPEC-0006 | **PASS** — 0 extensions required. |
| Forced-fit states in design note | this file | **PASS** — 0 forced fit. |

## Iter 2 — Goal Lifecycle pattern

Artifact: `workflows-candidate/agent-orchestrator-goal-lifecycle.yaml`. Pattern: Receive Goal → Planning → Executing → Reflecting → Done/Failed (with `reflecting → planning` replan loop). Structurally richer than ReAct: separates planning from execution, centralizes the replan/abort decision in `reflecting`.

### Classification — states (6 total)

| State | Fit | Note |
|---|---|---|
| `receive_goal` | clean | Initial gate stage; standard non-final state with two domain exits (`goal_validated`, `goal_invalid`). |
| `planning` | clean | Computes a multi-step plan; two domain exits (`plan_ready`, `plan_failed`). |
| `executing` | clean | Executes the next plan step; two outcomes both route to `reflecting`, centralizing the decision. POM supports multiple transitions from one state to the same target with different events. |
| `reflecting` | clean | The decision hub: three domain exits (`continue` → planning replan loop, `goal_met` → done, `impossible` → failed). POM event-driven transitions express this fan-out with no compromise. |
| `done` | clean | Terminal success, `is_final: true`. |
| `failed` | clean | Terminal failure, `is_final: true`. |

**Stati clean fit: 6/6 (100%).** **Stati forced fit: 0.**

### Classification — transitions (9 total)

| Transition | Fit | Note |
|---|---|---|
| `receive_goal → planning` on `goal_validated` | clean | Standard event-driven start. |
| `receive_goal → failed` on `goal_invalid` | clean | Early failure path. |
| `planning → executing` on `plan_ready` | clean | Standard event-driven transition. |
| `planning → failed` on `plan_failed` | clean | Planning gives up. |
| `executing → reflecting` on `step_done` | clean | Success path of a step. |
| `executing → reflecting` on `step_error` | clean | Error path of a step. POM allows two distinct events from the same source to converge on the same target — no synthetic state needed. |
| `reflecting → planning` on `continue` | clean | The replan loop edge — structurally analogous to the ReAct loop, but at the plan level instead of the step level. |
| `reflecting → done` on `goal_met` | clean | Successful termination. |
| `reflecting → failed` on `impossible` | clean | Reflective failure. |

**Transizioni clean fit: 9/9 (100%).** **Transizioni forced fit: 0.**

### What iter 2 specifically stresses vs iter 1

- **Centralized post-step decision hub** (`reflecting` with three out-edges): tests whether POM handles a state with more than two domain-meaningful exits without forcing a split.
- **Two events converging on the same target** (`step_done` and `step_error` both → `reflecting`): tests convergence without synthetic intermediate states.
- **Loop at a higher abstraction level** (`reflecting → planning` is a *replan* loop, not a reason-step loop): tests whether POM treats the loop as structural, regardless of what it loops over.
- **Two distinct failure paths** (`goal_invalid`, `plan_failed`, `impossible`): tests whether multiple terminal exits compose without compromise.

All four stress tests passed without any schema gap.

## Signal — clean fit count

| Iteration | Pattern | clean fit states | total states | clean fit transitions | total transitions | % overall |
|---|---|---|---|---|---|---|
| **iter 1** (calibrativa) | ReAct minimal | 6 | 6 | 7 | 7 | **100%** |
| **iter 2** | Goal Lifecycle | 6 | 6 | 9 | 9 | **100%** |

The signal stays at the success threshold across two structurally heterogeneous patterns. The signal is **not** trending downward, and no forced-fit states appeared between iter 1 and iter 2 — both stall and regression triggers of the `loop_guard` are clear.

## Final verdict (after iter 2)

H1 — "the control flow of a generic AI agent can be modeled via POM workflow without introducing excessive complexity, admitting only the backlog primitives (H6 `loop_guard`, H7 `timeout`) as documented extensions" — is **CONFIRMED**.

Evidence:

- **Two structurally heterogeneous agentic patterns** modeled in the same POM workflow schema with 100% clean fit each (ReAct minimal: 6 states / 7 transitions; Goal Lifecycle: 6 states / 9 transitions).
- **Zero schema extensions** required outside the agent-loop-fsm backlog.
- **Zero forced-fit lossy mappings** in either iteration.
- The **loop edge** — structural heart of agentic control flow — expressed by a standard event-driven transition in both patterns, at two different abstraction levels (step-level loop in ReAct, replan-level loop in Goal Lifecycle).
- All four gates (validator, Mermaid, schema-extensions, forced-fit) green at the end of iter 2.

Scope of the conclusion: confirmed on two canonical patterns (ReAct minimal, Goal Lifecycle); not tested on OODA (deferred as marginal-return), not tested on multi-agent or async patterns (out of scope per `criteria-experiment-1-h1.md`).

Items the experiment **did not** address but that the schema clearly needs for production agents (and that are already in the agent-loop-fsm backlog): bounded loop (H6 `loop_guard`), per-state timeout (H7 `timeout`), bounded retry as self-transition (H3). H1 confirms that the *structural* schema is sufficient; H3/H6/H7 will cover the *safety bounds* on top of it.

## Budget used

Cumulative time on H1: ≈12 minutes of the 2h budget (≈10% used). Two iterations consumed, eight available. Loop exits cleanly via the "Raggiunto" condition of `criteria-experiment-1-h1.md`.
