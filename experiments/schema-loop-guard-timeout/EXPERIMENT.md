# Experiment — Schema Primitives For `loop_guard` And `timeout`

| Field | Value |
|---|---|
| Date | 2026-05-31 |
| Status | Closed — Adopted |
| Branch / Path | `exp/schema-loop-guard-timeout` target branch; `experiments/schema-loop-guard-timeout/` |
| Area | workflow modeling / schema extension |
| Expected output | SPEC-0007 candidate for `loop_guard` and `timeout` |

## Purpose

Define and validate two workflow-schema primitives that were delegated
from `experiments/agent-loop-fsm/`: `loop_guard` for bounded loops and
`timeout` for bounded state residence.

The experiment must decide whether the two primitives are small
additive extensions to SPEC-0006, what validator rules they require, and
how generated implementation guidance should translate them into target
code without making POM a runtime.

## Context

`agent-loop-fsm` confirmed that current POM workflows can model agent
loops, retry, goal lifecycle, and suspend/restore with existing
primitives plus target-code enforcement. It also showed that two
recurring concepts deserve schema-level expression:

- H6 `loop_guard`: a bound on a loop as a whole, by visits and/or
  cumulative duration.
- H7 `timeout`: a bound on residence in a single non-loop state.

Dynamic Workflow work added another concrete need: `await.timeout` uses
the same timeout vocabulary, and retry after timeout aligns with
`loop_guard`.

## Starting Contract From Previous Evidence

### `loop_guard`

Candidate shape on a looping state:

```yaml
states:
  - name: planning
    loop_guard:
      max_visits: 5
      max_duration: 10min
      on_exhaustion: planning_failed
      on_visits_exhausted: too_many_attempts
      on_duration_exhausted: planning_timed_out
```

Initial constraints inherited from `agent-loop-fsm`:

- At least one of `max_visits` or `max_duration` must exist.
- `max_visits` is an integer greater than or equal to 1.
- `max_duration` uses an unambiguous duration format: `<N>s`,
  `<N>min`, `<N>h`, `<N>d`, or ISO 8601 duration. Bare `m` is rejected.
- `on_exhaustion` is required as a common fallback.
- Cause-specific exits are optional overrides.
- Cause-specific exits for absent dimensions should be warnings, not
  errors.
- Visit and duration counters reset when the loop is entered from
  outside and accumulate across self-transitions.
- Duration semantics use wall-clock time across suspend/restore unless
  a future primitive explicitly says otherwise.

### `timeout`

Candidate shape on a non-loop state:

```yaml
states:
  - name: waiting_human_review
    timeout:
      duration: 24h
      on_timeout: review_auto_escalated
```

Initial constraints inherited from `agent-loop-fsm`:

- `duration` uses the same unambiguous duration grammar as
  `loop_guard.max_duration`.
- `on_timeout` references a declared state.
- `timeout` is distinct from `loop_guard`: it bounds state residence,
  not repeated visits through a loop.

## Hypotheses To Freeze

These are not frozen criteria yet. They are the starting hypotheses for
the `define-criteria` conversation.

| ID | Candidate hypothesis |
|---|---|
| H6 | `loop_guard` can be added to SPEC-0006 as a small schema extension with validator rules and implementation guidance, without adding runtime ownership to POM. |
| H7 | `timeout` can be added to SPEC-0006 as a small schema extension sharing duration grammar with `loop_guard`, while staying semantically distinct from loop bounding. |

## Required Evidence

The criteria conversation should decide exact gates and signals, but the
experiment should probably need at least:

- validator examples that pass for valid `loop_guard` and `timeout`;
- broken fixtures for missing exits, invalid durations, unknown targets,
  and empty guards;
- at least one combined workflow using both primitives;
- implementation-guidance notes for Pattern A/B/C target code;
- an adversarial conclusion that checks whether either primitive leaks
  runtime responsibility into POM.

## Out Of Scope

- Implementing a durable scheduler in POM.
- Defining active-time-only duration semantics.
- Native parallelism, dynamic fan-out execution, or target queue
  mechanics.
- Migrating existing workflow YAML files to use the new primitives
  before the spec is accepted.

## Next Step

Run `skills/loop-goal.md` in `define-criteria` mode, using
`prompts/28-loop-goal-define-criteria.md`, and write the frozen criteria
under `experiments/schema-loop-guard-timeout/design/`.

Do not implement validator rules until those criteria are accepted.

## Evaluation

The first criteria round was accepted on 2026-05-31. Two implementation
cycles then produced:

- validator rules E060-E073 and W060 in `scripts/lint-workflows.mjs`;
- one valid combined example and one warning-level example;
- eight broken fixtures covering invalid H6/H7 shapes;
- integration coverage in `tests/workflow-validator/integration/test-temporal-primitives.mjs`;
- a SPEC-0007 candidate in `specs/SPEC-0007-loop-guard-timeout.md`;
- Pattern A/B/C implementation guidance in `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md`.

The adversarial evaluation in
`design/evaluation-experiment-1-h6-h7.md` recommended **Adopt**. The user
accepted adoption on 2026-05-31, closing the experiment.
