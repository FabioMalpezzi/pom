# Fan-in accounting prompt A/B report

Run: `2026-07-23T10-44-30-362Z-ab-1x`

| Variant | Completed | Scenario pass rate | Check pass rate |
|---|---:|---:|---:|
| baseline | 8/8 | 25.0% | 63.0% |
| candidate | 8/8 | 25.0% | 74.1% |

Candidate check-rate delta: **11.1 percentage points**.

## Gate

- PASS — noDroppedRuns
- FAIL — candidateCheckRateAtLeast090
- PASS — targetedImprovementAtLeast010

## Scenario outcomes

- baseline/independent-data-work/rep-1: FAIL; failed checks: no-false-edge
- baseline/shared-write-conflict/rep-1: FAIL; failed checks: not-a-data-edge
- baseline/shared-api-capacity/rep-1: FAIL; failed checks: bounded-concurrency
- baseline/hierarchical-fan-in/rep-1: FAIL; failed checks: hierarchical-reduction, batches, identity-provenance, reconcile-layers, one-batch-handle
- baseline/balanced-missing-duplicate/rep-1: FAIL; failed checks: refuse-complete
- baseline/quorum-vs-completeness/rep-1: FAIL; failed checks: separate-completeness
- baseline/ambiguous-partial-policy/rep-1: PASS; failed checks: none
- baseline/ordinary-workflow-regression/rep-1: PASS; failed checks: none
- candidate/independent-data-work/rep-1: FAIL; failed checks: no-false-edge
- candidate/shared-write-conflict/rep-1: FAIL; failed checks: not-a-data-edge
- candidate/shared-api-capacity/rep-1: PASS; failed checks: none
- candidate/hierarchical-fan-in/rep-1: FAIL; failed checks: reconcile-layers, one-batch-handle
- candidate/balanced-missing-duplicate/rep-1: FAIL; failed checks: count-insufficient
- candidate/quorum-vs-completeness/rep-1: FAIL; failed checks: quorum-readiness
- candidate/ambiguous-partial-policy/rep-1: FAIL; failed checks: do-not-invent
- candidate/ordinary-workflow-regression/rep-1: PASS; failed checks: none
