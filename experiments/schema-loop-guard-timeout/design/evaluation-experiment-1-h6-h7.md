---
experiment: schema-loop-guard-timeout
evaluates: criteria.md
date: 2026-05-31
evaluator: independent-adversarial
verdict: confirmed
recommendation: Adopt
decision: Adopt
---

# Evaluation — H6/H7 `loop_guard` And `timeout`

## Evidence Examined

- Frozen criteria: `design/criteria.md`
- Run 1 calibration: `design/run-1-validation.md`
- Run 2 validation: `design/run-2-validation.md`
- Validator implementation: `scripts/lint-workflows.mjs`
- Integration test: `tests/workflow-validator/integration/test-temporal-primitives.mjs`
- Candidate spec: `specs/SPEC-0007-loop-guard-timeout.md`
- Implementation guidance: `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md`

## Verification Against Criteria

| Criterion | Expected | Observed | Adversarial check | Result |
|---|---|---|---|---|
| Gate: POM test suite | `npm run pom:test` exit 0 | 168 passed, 0 failed across 5 files | Added H6/H7 tests did not regress existing suites | Pass |
| Gate: governance lint | 0 errors; warnings explained | 0 errors; known `docs-without-adr` warning | Warning is unrelated to H6/H7 semantics and was present in this worktree pattern | Pass with known warning |
| Gate: H6/H7 validation | Valid examples pass; invalid fixtures fail with expected codes | Combined example PASS; warning example PASS WITH WARNINGS; fixtures fail with E061/E062/E063/E064/E065/E071/E072/E073 | Tried to find untested cause-specific routing; run 2 added E065 and W060 coverage | Pass |
| Signal: H6/H7 rule coverage | Coverage grows from run 2 until calibrated list complete | Run 1 covered 8 checks; run 2 covered E065 and W060 and added spec/guidance | No uncovered blocking rule remains in the calibrated list | Pass |
| Open point gate | No blocking open point in SPEC-0007 candidate | Duration grammar, semantic distinction, exhaustion routing, reachability, validator boundary, and implementation guidance are all recorded | Runtime execution remains target-owned and out of scope, not a blocker | Pass |

## Falsification Attempt

The criteria said the hypothesis is false if static validation of
`loop_guard` or `timeout` requires runtime ownership in POM, or if the
two primitives cannot be defined as distinguishable schema concepts.

I tried to falsify on both axes:

- **Runtime ownership**: the validator never simulates elapsed time,
  sleeps, schedules callbacks, persists counters, or emits timeout
  events. It checks shape, duration grammar, declared target states, and
  implicit reachability. Timer and counter enforcement remain in target
  code.
- **Distinguishability**: `loop_guard` is a loop-level bound with visit
  and duration dimensions plus exhaustion routing; `timeout` is a
  state-residence bound with one duration and one timeout target. E073
  rejects declaring both on the same state.

The falsification condition was not observed.

## Verdict

Confirmed. `loop_guard` and `timeout` can be added as distinct,
statically validable POM workflow schema primitives without introducing
runtime ownership in POM.

## Recommendation

Adopt the SPEC-0007 candidate after user confirmation, then update
current-state and wiki synthesis to treat H6/H7 as implemented schema
extensions rather than pending expected extensions.

## User Decision

Adopted by the user on 2026-05-31.

## Residual Risk

The validator is still documental and structural. It cannot prove target
code enforces counters or timers correctly, and it should not try to do
so. Target projects need scenario tests around their own runtime
implementation.
