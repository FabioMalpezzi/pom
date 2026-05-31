---
experiment: schema-loop-guard-timeout
run: 1
date: 2026-05-31
criteria: criteria.md
---

# Run 1 Validation — H6/H7 Baseline Calibration

## Purpose

Calibrate the first measurable rule list for the H6 `loop_guard` and H7
`timeout` primitives, using one valid combined example and focused
broken fixtures.

## Valid Example

| File | Result | Notes |
|---|---|---|
| `examples/loop-guard-timeout.yaml` | PASS, 0 warnings | Exercises `loop_guard`, `timeout`, cause-specific exhaustion exits, unambiguous durations, and implicit reachability from temporal exits. |

## Broken Fixtures

| Fixture | Expected rule | Result |
|---|---|---|
| `broken-fixtures/loop-guard.broken-E061-empty.yaml` | E061 | PASS: expected error emitted |
| `broken-fixtures/loop-guard.broken-E062-max-visits.yaml` | E062 | PASS: expected error emitted |
| `broken-fixtures/duration.broken-E063-ambiguous-m.yaml` | E063 | PASS: expected error emitted |
| `broken-fixtures/loop-guard.broken-E064-missing-target.yaml` | E064 | PASS: expected error emitted |
| `broken-fixtures/timeout.broken-E071-duration.yaml` | E071 | PASS: expected error emitted |
| `broken-fixtures/timeout.broken-E072-target.yaml` | E072 | PASS: expected error emitted |
| `broken-fixtures/state.broken-E073-loop-guard-timeout.yaml` | E073 | PASS: expected error emitted |

## Calibrated Rule Coverage Baseline

Run 1 establishes 8 covered checks:

- valid combined `loop_guard` + `timeout` example passes with 0 warnings;
- E061: `loop_guard` requires at least one bound;
- E062: `loop_guard.max_visits` is an integer >= 1;
- E063: `loop_guard.max_duration` rejects ambiguous bare `m`;
- E064: `loop_guard.on_exhaustion` is required and references a declared state;
- E071: `timeout.duration` rejects ambiguous bare `m`;
- E072: `timeout.on_timeout` references a declared state;
- E073: one state cannot declare both `loop_guard` and `timeout`.

Run 1 also added one calibrated semantic rule: temporal exits declared by
`loop_guard` and `timeout` count as implicit reachability targets, so
valid exhaustion or timeout terminals do not raise W001.

## Blocking Open Points After Run 1

- E065 for cause-specific `loop_guard` exits is implemented but not yet
  covered by a dedicated fixture.
- W060 for cause-specific exits without the corresponding bound is
  implemented but not yet covered by a dedicated fixture.
- SPEC-0007 candidate text does not exist yet.
- Pattern A/B/C implementation guidance has not been updated yet.
