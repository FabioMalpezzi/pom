# Workflow examples — loop/goal pattern family

Canonical POM workflow examples for the **loop/goal** pattern: agents that iterate `perceive → reason → act → observe` toward a goal, possibly with bounded retry and composition through sub-workflows. They differ from the other examples in `templates/examples/workflow/` because they model **structural agentic patterns**, not domain workflows.

## When to use them

- When an AI agent, or any agent-shaped controller, has to be modeled as an FSM in a target project.
- As the reference examples for the canonical `loop-goal` skill (`skills/loop-goal.md`).
- As fixtures for testing the validator, the Mermaid generator, the XState generator, and POM runtimes.

For classic domain workflows (ticket lifecycle, document approval, spec evolution, and so on) see the examples in the parent folder `templates/examples/workflow/`.

## Catalogue

| File | Pattern | Structural characteristics | Reference |
|---|---|---|---|
| `agent-orchestrator.yaml` | ReAct minimal (Yao et al., 2022) | 6 states, 7 transitions, loop edge `observing → reasoning`, 2 terminals (`done`, `failed`). A compact pattern with three active states: `reasoning / acting / observing`. | Experiment `agent-loop-fsm` H1 iter 1 |
| `agent-orchestrator-goal-lifecycle.yaml` | Goal Lifecycle (Plan-and-Solve, Reflexion) | 6 states, 9 transitions, replan loop `reflecting → planning`, two events converging on the same target (`step_done` / `step_error` → `reflecting`). Richer than ReAct: it separates planning from execution. | Experiment `agent-loop-fsm` H1 iter 2 |
| `agent-loop-table.yaml` | SPAO (Perception → Planning → Action → Observation) | 6 states, 7 transitions, flat transition table. No `invoke`, no composition, a single surface. | Experiment `agent-loop-fsm` H2 |
| `agent-retry-bounded.yaml` | Bounded retry through a guarded self-transition | 5 states, 5 transitions (one of them a self-transition), 2 mutually exclusive guards (`has_attempts_left`, `no_attempts_left`). The counter lives in `context`; H6 `loop_guard` would make it declarative. | Experiment `agent-loop-fsm` H3 |
| `agent-supervisor.yaml` | Supervisor plus autonomous sub-workflow | 5 states, 6 transitions, one `state-invoke` on `agent-orchestrator-goal-lifecycle.yaml` with `on_completion` dispatching on the child terminals. Two-level synchronous composition. | Experiment `agent-loop-fsm` H4 |
| `agent-iteration-record.yaml` | Iteration Record plus bounded verification | 8 states, 9 transitions, `loop_guard.max_visits: 50`, evidence-based verification before the decision, and an explicit failure when the record is unavailable. | Self-test of the Iteration Record extension |

## Criteria and evaluation examples

Two Markdown files show the experiment side of the `loop-goal` skill on a realistic case (bounded retry for flaky tool calls, the shape of `agent-retry-bounded.yaml`):

| File | What it shows |
|---|---|
| `EXAMPLE_CRITERIA.md` | A complete accepted criteria contract in the shape of the `## Criteria` section of `templates/EXPERIMENT_TEMPLATE.md`: system under test, observation boundary, gates, signals with threshold/target/trend, the four exits, budget, decision owner and date. It is what `prompts/28-loop-goal-define-criteria.md` freezes. |
| `EXAMPLE_EVALUATION.md` | The independent evaluation written against that contract by `prompts/31-loop-goal-conclude.md`, starting with the `loop-goal-evaluation` frontmatter (`evaluator`, `independent_context`, `criteria_path`, `criteria_commit`). Its `criteria_commit` is the real commit that froze `EXAMPLE_CRITERIA.md` in this repository. |

They are examples of shape and rigor, not fixtures for the workflow validator.

## Verification

Every workflow validates with `pom:workflow:lint` (0 errors, 0 warnings) and produces parsable Mermaid through `pom:workflow:mermaid` plus `mmdc`. Three of them (`agent-orchestrator`, `agent-orchestrator-goal-lifecycle`, `agent-supervisor`) compile correctly to XState v5 through `pom:workflow:xstate`.

## Provenance

Modeled during the `agent-loop-fsm` experiment, **closed on 2026-05-30** with all five planned hypotheses (H1–H5) confirmed at 100% clean fit. See `experiments/agent-loop-fsm/EXPERIMENT.md` for the context and `experiments/agent-loop-fsm/RESULTS.md` for the results. H6 and H7 were deliberately delegated to the separate `schema-loop-guard-timeout` experiment that produced SPEC-0007.

These examples were promoted to `templates/examples/workflow/loop-goal/` on 2026-05-30 and recorded at the time as an explicit exception to the rule that nothing reaches canonical paths before its originating experiment closes. That exception is now historical: the experiment is closed, and the skill that adopts these patterns, `skills/loop-goal.md`, is canonical.

Each workflow has a fit-classification design note in `experiments/agent-loop-fsm/design/<name>.fit.md`. `agent-loop-table.yaml` and `agent-supervisor.yaml` also have an automatically generated fit note (`*-auto.fit.md`), and `agent-supervisor.yaml` has an automatically generated set of test scenarios (`agent-supervisor.scenarios.md`) — all produced by the external runtime in `experiments/agent-loop-fsm/runtime-candidate/`.
