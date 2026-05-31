# Spec - Workflow `loop_guard` And `timeout`

| Field | Value |
|---|---|
| Date | 2026-05-31 |
| Status | Complete |
| Area | method / workflow modeling |
| Summary | Adds two bounded-time schema primitives to POM workflows: `loop_guard` for loops and `timeout` for non-loop state residence. |

## Purpose

Define two additive workflow-schema primitives that make bounded loops
and bounded state residence explicit while keeping POM out of runtime
ownership.

## Context

SPEC-0006 deliberately keeps POM workflow modeling small, synchronous,
and target-owned at runtime. The `agent-loop-fsm` experiment identified
two recurrent concepts that were expressible only through prose and
target-code convention:

- `loop_guard`: a bound on a loop as a whole, by visit count and/or
  elapsed wall-clock duration.
- `timeout`: a bound on residence in one non-loop state.

The `dynamic-workflows` experiment also uses timeout vocabulary in the
control-plane/data-plane contract, while leaving timers and scheduling
inside target infrastructure.

## Requirements

| ID | Requirement | Priority | Source |
|---|---|---|---|
| R1 | A state may declare `loop_guard` as a mapping. | Must | `experiments/schema-loop-guard-timeout/design/criteria.md` |
| R2 | `loop_guard` must declare at least one of `max_visits` or `max_duration`. | Must | H6 |
| R3 | `max_visits` must be an integer greater than or equal to 1. | Must | H6 |
| R4 | `max_duration` and `timeout.duration` must use `<N>s`, `<N>min`, `<N>h`, `<N>d`, or ISO 8601 duration; bare `m` is rejected. | Must | H6/H7 |
| R5 | `loop_guard.on_exhaustion` is required and must reference a declared state. | Must | H6 |
| R6 | `on_visits_exhausted` and `on_duration_exhausted` are optional cause-specific overrides and must reference declared states when present. | Must | H6 |
| R7 | A cause-specific override whose matching bound is absent is a warning, not an error. | Should | H6 |
| R8 | A state may declare `timeout` as a mapping with `duration` and `on_timeout`. | Must | H7 |
| R9 | `timeout.on_timeout` must reference a declared state. | Must | H7 |
| R10 | A state cannot declare both `loop_guard` and `timeout`. | Must | H6/H7 distinction |
| R11 | Temporal exits declared by `loop_guard` and `timeout` count as implicit reachability targets for W001. | Must | Run 1 calibration |
| R12 | The validator checks only static shape, duration grammar, declared targets, and documented coherence; target code owns timers, counters, scheduling, and event emission. | Must | POM no-runtime constraint |

## Schema Sketch

```yaml
states:
  - name: planning
    loop_guard:
      max_visits: 5
      max_duration: 10min
      on_exhaustion: planning_failed
      on_visits_exhausted: too_many_attempts
      on_duration_exhausted: planning_timed_out
  - name: waiting_human_review
    timeout:
      duration: 24h
      on_timeout: review_auto_escalated
```

## Validator Rules

| Code | Check |
|---|---|
| E060 | `loop_guard` must be a mapping when declared. |
| E061 | `loop_guard` must declare at least one bound: `max_visits` or `max_duration`. |
| E062 | `loop_guard.max_visits` must be an integer greater than or equal to 1. |
| E063 | `loop_guard.max_duration` must use an unambiguous duration. |
| E064 | `loop_guard.on_exhaustion` is required and must reference a declared state. |
| E065 | Cause-specific exhaustion targets must reference declared states. |
| E070 | `timeout` must be a mapping when declared. |
| E071 | `timeout.duration` is required and must use an unambiguous duration. |
| E072 | `timeout.on_timeout` is required and must reference a declared state. |
| E073 | A state cannot declare both `loop_guard` and `timeout`. |
| W060 | A cause-specific exhaustion target is declared for a bound dimension that is absent. |

## Out Of Scope

- Scheduler, timer service, queue, sleep, or runtime persistence inside POM.
- Active-time-only duration semantics.
- Native parallelism, dynamic fan-out execution, or target queue mechanics.
- Migrating existing canonical workflow examples before this spec is accepted.

## Impacts

| Area | Impact |
|---|---|
| Wiki | Current specs page should mention SPEC-0007 when accepted. |
| Decisions | No new ADR required unless runtime ownership boundary changes. |
| Docs | Workflow implementation guide needs Pattern A/B/C guidance. |
| Code | `scripts/lint-workflows.mjs` gains E060-E073 and W060. |

## Linked Tasks

- `experiments/schema-loop-guard-timeout/design/criteria.md`

## Completion Verification

This spec cannot be marked Complete without passing the completion verification gate. Verification is mandatory and automatic.

### Step 0 — Goal-backward check

- [x] `loop_guard` and `timeout` are distinct schema concepts.
- [x] Each accepted rule has at least one valid example or broken fixture.
- [x] The validator proves static coherence without owning runtime execution.
- [x] Implementation guidance explains target-owned enforcement.

### If this spec has code implementation

- [x] Positive scenario: valid combined `loop_guard` + `timeout` example passes with 0 warnings.
- [x] Positive scenario: a valid cause-specific override without matching bound passes with W060, not an error.
- [x] Error scenario: invalid duration grammar fails.
- [x] Error scenario: unknown temporal exit target fails.
- [x] Tests run and pass.

### Exception

Exception reason: _none_

## Sources And Decisions

- Source: `experiments/schema-loop-guard-timeout/EXPERIMENT.md`
- Source: `experiments/schema-loop-guard-timeout/design/criteria.md`
- Source: `experiments/schema-loop-guard-timeout/design/run-1-validation.md`
- Source: `experiments/schema-loop-guard-timeout/design/run-2-validation.md`
- Source: `experiments/schema-loop-guard-timeout/design/evaluation-experiment-1-h6-h7.md`
- ADR: `decisions/ADR-0004-dynamic-workflow-control-plane.md`

## Acceptance

- Accepted on: 2026-05-31
- Accepted by: user
- Evidence: `npm run pom:test` reported 168 passed, 0 failed; `npm run pom:lint` reported 0 errors and one known `docs-without-adr` warning.

## Evolution Rule

This spec is a living document. Incremental changes are tracked with
Git. If a change alters a structural decision, create or update a linked
ADR.
