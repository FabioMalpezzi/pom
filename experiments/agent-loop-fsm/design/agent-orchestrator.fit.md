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

## Signal — clean fit count

| Iteration | clean fit states | total states | clean fit transitions | total transitions | % overall |
|---|---|---|---|---|---|
| **iter 1** (baseline calibrativa) | 6 | 6 | 7 | 7 | **100%** |

The signal is at the success threshold already in iter 1 on the ReAct minimal pattern. This means H1 is provisionally confirmed on ReAct minimal, but the breadth of the conclusion is limited: the criterion of generalization ("any AI agent") is not yet covered by a single pattern test.

## Provisional verdict (iter 1)

On the **ReAct minimal** pattern (Reason → Act → Observe with single-step reasoning and no internal retry), the POM workflow schema accommodates the agent control flow with **100% clean fit**, **zero schema extensions outside the agent-loop-fsm backlog**, and **zero forced-fit lossy mappings**. The loop edge (observing → reasoning), which is the structural heart of the agentic paradigm, is expressed by a standard event-driven transition without any new primitive.

This is a strong but **narrow** confirmation: it only covers ReAct minimal. To strengthen the H1 verdict to "generic AI agent", iter 2+ should test the same schema against at least one more canonical pattern (Goal Lifecycle, OODA, or a real-world agent reference) and confirm clean fit is preserved. Until then, the loop's success condition (100% clean fit) is met for this pattern but the experiment's objective (generic AI agent) is not fully demonstrated.

## Next iteration proposal

- Either: add a second workflow `agent-orchestrator-goal-lifecycle.yaml` modeling the Goal Lifecycle pattern (Receive → Plan → Execute → Reflect → Done/Failed) and re-run the same classification. If still 100% clean fit, the H1 generalization broadens.
- Or: declare H1 confirmed narrowly on ReAct minimal in the iter 1 verdict, and open H2 directly.

Decision deferred to user.
