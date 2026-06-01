# Spec - Workflow Control-Plane Verification

| Field | Value |
|---|---|
| Date | 2026-06-01 |
| Status | Draft |
| Area | method / workflow modeling |
| Summary | Strengthen POM workflow validation with stricter static checks and a finite control-plane model checker, without claiming target runtime or business-domain correctness. |

## Purpose

Define the next implementation step for POM workflow validation:

- Level 1: stronger static properties inside `pom:workflow:lint`;
- Level 2: finite model checking over the POM workflow control plane.

The goal is to make workflow YAML harder to misuse and more useful to a
coding agent, while keeping the correctness claim precise. POM validates
finite control-plane properties. It does not prove target runtime
correctness, guard semantics, data-plane behavior, or business-domain
truth.

## Context

SPEC-0006 introduced workflow modeling as a source-authoritative YAML
artifact for finite-state workflows. SPEC-0007 added `loop_guard` and
`timeout`. ADR-0004 accepted Dynamic Workflow as a deterministic
control-plane/data-plane split: POM records launch, await, timeout,
lifecycle, and compensation boundaries; the target project owns actual
workers, queues, timers, cancellation mechanics, persistence, and human
task execution.

The current validator already checks schema shape, declared references,
basic graph reachability, temporal primitive shape, and Dynamic Workflow
handle lifecycle rules E080-E089. It does not yet make all useful
control-plane properties explicit, and it does not run a separate finite
model-checking pass.

This spec defines that next step.

## Correctness Boundary

The validator must use precise claims:

| Claim | In Scope |
|---|---|
| YAML is syntactically readable. | Yes. |
| YAML conforms to the POM workflow schema and implemented static invariants. | Yes. |
| The finite POM control plane satisfies declared graph and handle-lifecycle properties. | Yes, after Level 2 implementation. |
| The workflow is mathematically correct in the strong sense. | No. |
| The target runtime implements timers, workers, cancellation, queues, and persistence correctly. | No. |
| Guards and business rules are semantically true for the domain. | No. |
| Every real-world execution of a target system satisfies business intent. | No. |

Required wording for documentation and reports:

> POM validates finite control-plane properties. It does not prove target
> runtime correctness or business-domain truth.

## Requirements

| ID | Requirement | Priority | Source |
|---|---|---|---|
| R1 | Add stricter static checks to `pom:workflow:lint` before introducing a model checker. | Must | Validation planning |
| R2 | Keep stronger static checks deterministic and explainable through Error/Warning codes and suggested fixes. | Must | Agent usability |
| R3 | Validate `await.join`, `await.k`, `await.on_timeout`, and timeout wake-up transitions. | Must | Dynamic Workflow contract |
| R4 | Treat reachable non-final dead ends as stronger findings when they are not explicit waits or documented terminal-like holds. | Must | Control-plane safety |
| R5 | Build a reusable normalized control-plane graph so lint and model checking do not duplicate path logic. | Must | Maintainability |
| R6 | Implement finite model checking over abstract states, not target runtime instances. | Must | No-runtime POM boundary |
| R7 | Include active handles in the abstract state for Dynamic Workflow checks. | Must | ADR-0004 |
| R8 | Report counterexamples as concrete paths through workflow states. | Must | Agent usability |
| R9 | Keep Level 2 behind an explicit flag until behavior is calibrated on existing examples. | Should | Adoption safety |
| R10 | Add broken fixtures and integration tests for every new Error/Warning property. | Must | Completion Verification Gate |
| R11 | Document that guard bodies, data values, and runtime execution are outside the model checker. | Must | Correctness boundary |

## Level 1 - Stronger Static Checks

Level 1 extends the current validator without adding a separate model
checker. These checks are local or graph-static and can run by default as
part of `pom:workflow:lint`.

### Candidate Rules

| Code | Severity | Check |
|---|---|---|
| E090 | Error | `await.join`, when present, must be `all`, `quorum`, or `first`. |
| E091 | Error | `await.k` is required when `await.join` is `quorum`. |
| E092 | Error | `await.k` must be an integer from 1 to the number of `await.handles`. |
| E093 | Error | `await.on_timeout`, when present, must reference a declared event. |
| E094 | Error | If `await.on_timeout` is declared, the awaiting state must have an outgoing transition for that event. |
| E095 | Error or Warning after calibration | A reachable non-final state has no outgoing transition and no explicit waiting/timeout/lifecycle construct explaining the hold. |
| E096 | Error | `react`, when implemented, must reference handles active on the reachable path being observed. |
| W090 | Warning | A final state is declared but unreachable. |
| W091 | Warning | No final state is reachable from `initial_state`. |

Calibration rule: if an existing valid fixture intentionally violates a
candidate Error, either the fixture must become explicit about its
intent or the rule must be downgraded to Warning before promotion.

## Level 2 - Finite Control-Plane Model Checking

Level 2 introduces a finite abstract-state exploration pass. It should
initially run behind an explicit flag:

```bash
npm run pom:workflow:lint -- workflows/<name>.yaml --formal
```

The flag name may change during implementation, but the behavior must
stay opt-in until test fixtures and existing examples prove that the
rules are calibrated.

### Abstract State

The model checker explores states shaped like:

```text
{
  state: "<workflow-state-name>",
  active_handles: ["<handle-name>", "..."],
  consumed_handles: ["<handle-name>", "..."],
  detached_handles: ["<handle-name>", "..."],
  path: ["state_a", "state_b", "..."]
}
```

The state may grow if implementation needs timeout markers, reaction
markers, or compensation markers. It must not include target runtime
objects, real timers, queue records, or data-plane payloads.

### Graph Construction

Add a reusable module:

```text
scripts/workflow-control-plane-graph.mjs
```

Responsibilities:

- normalize states, transitions, terminal flags, and outgoing edges;
- include implicit exits from `loop_guard`, `timeout`, and
  `await.on_timeout`;
- represent Dynamic Workflow launch, await, cancel, and detach effects;
- preserve source locations for diagnostics;
- expose a stable graph API to both lint and model-checking code.

### Model Checker

Add either a new internal module:

```text
scripts/workflow-model-check.mjs
```

or an equivalent internal module called by `scripts/lint-workflows.mjs`.

The checker must verify at least:

| Property | Required Behavior |
|---|---|
| Eventual terminal or explicit wait | Every reachable abstract state must either be final, have successors, or be an explicit waiting state. |
| No control-plane deadlock | A reachable non-final non-waiting abstract state with no successors must fail. |
| No terminal active handles | No final abstract state may contain active handles. |
| Explicit handle lifecycle | Every launched handle must be awaited, cancelled, or detached on every terminal path. |
| No impossible await/cancel/detach | A path cannot await, cancel, or detach a handle that is not active on that path. |
| Bounded exploration | Cycles must be detected by abstract-state identity, not by raw path length. |

Counterexamples must be reported as paths, for example:

```text
launch_a -> launch_b -> wait_a -> done
```

When relevant, the report must include active handles and launch origin.

## Out Of Scope

- Full mathematical proof of business correctness.
- Guard expression evaluation or type-level data validation.
- Target runtime verification.
- Real timer, scheduler, queue, worker, thread, process, or human-task
  semantics.
- Formal export to TLA+, Alloy, NuSMV, SPIN, or another external model
  checker.
- Native parallel states, asynchronous transitions, or fork/join inside
  the FSM.

## Implementation Plan

### Phase 1 - Static Checks

- Add rules E090-E095 and W090-W091 to `scripts/lint-workflows.mjs`.
- Add suggested fixes in `scripts/workflow-error-help.mjs`.
- Add broken fixtures under `experiments/dynamic-workflows/broken-fixtures/`
  or a more general `tests/workflow-validator/fixtures/` location.
- Add integration coverage in `tests/workflow-validator/integration/`.
- Run `npm run pom:workflow:lint` against existing workflow examples and
  calibrate Error vs Warning severity.

### Phase 2 - Graph Module

- Extract graph normalization from existing validator code where
  practical.
- Keep the public shape small and documented in code comments.
- Preserve source locations for diagnostics.
- Ensure existing lint behavior remains unchanged unless new rules are
  intentionally enabled.

### Phase 3 - Formal Flag

- Add a `--formal` flag to `scripts/lint-workflows.mjs`.
- Call the model-checking module after ordinary lint succeeds enough to
  build a reliable graph.
- Return normal validator reports with Error/Warning sections, not a
  separate output format.
- Add tests for positive models and counterexample-producing models.

### Phase 4 - Documentation And Agent Guidance

- Update SPEC-0006 implementation status.
- Update `skills/workflow.md` and `prompts/27-workflow-modeling.md`.
- Update `docs/POM_GUIDE.en.html` and `docs/POM_GUIDE.it.html`.
- Update wiki current specs after implementation status changes.

## Completion Verification

This spec cannot move beyond Draft until implementation has executable
evidence.

### Step 0 - Goal-Backward Check

- [ ] Documentation states the correctness boundary without overclaiming.
- [ ] Level 1 checks catch malformed join, quorum, timeout, and
  reachable dead-end scenarios.
- [ ] Level 2 explores finite control-plane states and reports concrete
  counterexample paths.
- [ ] Existing valid workflow examples either pass or produce calibrated
  warnings with clear rationale.
- [ ] Reports remain actionable for a coding agent.

### Required Scenario Tests

- [ ] Positive scenario: a valid Dynamic Workflow with selective await
  and explicit detach passes Level 1 and Level 2.
- [ ] Positive scenario: a valid quorum await with coherent `k` passes.
- [ ] Error scenario: `join: quorum` without `k` fails.
- [ ] Error scenario: `k` greater than `await.handles.length` fails.
- [ ] Error scenario: `await.on_timeout` references no declared event.
- [ ] Error scenario: timeout event is declared but no outgoing
  transition handles it.
- [ ] Error scenario: a reachable non-final deadlock produces a concrete
  counterexample path.
- [ ] Error scenario: a final state is reachable with active handles.
- [ ] Regression scenario: `npm run pom:test` passes.

### Semantic Validation

- [ ] Thesis: the finite control-plane checker materially strengthens
  workflow YAML reliability without making POM a runtime.
- [ ] Antithesis: the feature may create a false impression of full
  mathematical correctness.
- [ ] Confutation: documentation, report wording, and spec boundaries
  consistently limit the claim to finite control-plane properties.

### Exception

Exception reason: _none_
