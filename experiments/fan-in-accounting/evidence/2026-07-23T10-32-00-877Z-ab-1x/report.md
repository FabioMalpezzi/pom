# Fan-in accounting prompt A/B report

Run: `2026-07-23T10-32-00-877Z-ab-1x`

| Variant | Completed | Scenario pass rate | Check pass rate |
|---|---:|---:|---:|
| baseline | 8/8 | 12.5% | 57.7% |
| candidate | 8/8 | 37.5% | 73.1% |

Candidate check-rate delta: **15.4 percentage points**.

## Gate

- PASS — noDroppedRuns
- FAIL — candidateCheckRateAtLeast090
- PASS — targetedImprovementAtLeast010

## Scenario outcomes

- baseline/independent-data-work/rep-1: FAIL; failed checks: no-false-edge
- baseline/shared-write-conflict/rep-1: FAIL; failed checks: not-a-data-edge
- baseline/shared-api-capacity/rep-1: FAIL; failed checks: bounded-concurrency
- baseline/hierarchical-fan-in/rep-1: FAIL; failed checks: hierarchical-reduction, batches, identity-provenance, reconcile-layers
- baseline/balanced-missing-duplicate/rep-1: FAIL; failed checks: count-insufficient
- baseline/quorum-vs-completeness/rep-1: FAIL; failed checks: separate-completeness
- baseline/ambiguous-partial-policy/rep-1: FAIL; failed checks: do-not-invent, ask-policy
- baseline/ordinary-workflow-regression/rep-1: PASS; failed checks: none
- candidate/independent-data-work/rep-1: PASS; failed checks: none
- candidate/shared-write-conflict/rep-1: FAIL; failed checks: not-a-data-edge
- candidate/shared-api-capacity/rep-1: PASS; failed checks: none
- candidate/hierarchical-fan-in/rep-1: FAIL; failed checks: reconcile-layers
- candidate/balanced-missing-duplicate/rep-1: FAIL; failed checks: count-insufficient
- candidate/quorum-vs-completeness/rep-1: PASS; failed checks: none
- candidate/ambiguous-partial-policy/rep-1: FAIL; failed checks: do-not-invent, ask-policy
- candidate/ordinary-workflow-regression/rep-1: FAIL; failed checks: ordinary-fsm, no-forced-dynamic
