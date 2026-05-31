---
experiment: schema-loop-guard-timeout
run: 2
date: 2026-05-31
criteria: criteria.md
---

# Run 2 Validation — Complete First Rule Set

## Purpose

Close the run-1 blocking coverage gaps and add the SPEC-0007 candidate
plus target implementation guidance.

## Added Coverage

| Artifact | Result | Notes |
|---|---|---|
| `broken-fixtures/loop-guard.broken-E065-cause-target.yaml` | FAIL with E065 | Covers unknown cause-specific exhaustion targets. |
| `examples/loop-guard-unused-override-warning.yaml` | PASS WITH WARNINGS, W060 | Proves an unused cause-specific override is warning-level, not error-level. |
| `tests/workflow-validator/integration/test-temporal-primitives.mjs` | 20 passed, 0 failed | Makes the H6/H7 validator behavior part of `npm run pom:test`. |
| `specs/SPEC-0007-loop-guard-timeout.md` | Draft candidate written | Records requirements, validator rules, out-of-scope boundaries, and verification criteria. |
| `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md` | Updated | Adds Pattern A/B/C guidance for target-owned counters and timers. |

## Calibrated Rule Coverage After Run 2

Run 2 covers the complete first rule set:

- valid combined `loop_guard` + `timeout` example passes with 0 warnings;
- valid unused cause-specific override emits W060 without failing;
- E061: `loop_guard` requires at least one bound;
- E062: `loop_guard.max_visits` is an integer >= 1;
- E063: `loop_guard.max_duration` rejects ambiguous bare `m`;
- E064: `loop_guard.on_exhaustion` is required and references a declared state;
- E065: cause-specific exhaustion targets reference declared states;
- E071: `timeout.duration` rejects ambiguous bare `m`;
- E072: `timeout.on_timeout` references a declared state;
- E073: one state cannot declare both `loop_guard` and `timeout`;
- W060: unused cause-specific override remains a warning.

## Blocking Open Points After Run 2

- None known in the calibrated rule set.

## Notes

The validator still does not enforce runtime behavior. It checks static
shape, duration grammar, declared targets, and reachability. Target code
owns timer/counter enforcement, consistent with the criteria.
