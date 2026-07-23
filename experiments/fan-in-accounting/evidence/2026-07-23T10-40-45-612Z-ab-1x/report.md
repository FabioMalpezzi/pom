# Fan-in accounting prompt A/B report

Run: `2026-07-23T10-40-45-612Z-ab-1x`

| Variant | Completed | Scenario pass rate | Check pass rate |
|---|---:|---:|---:|
| baseline | 8/8 | 37.5% | 66.7% |
| candidate | 8/8 | 62.5% | 85.2% |

Candidate check-rate delta: **18.5 percentage points**.

## Gate

- PASS — noDroppedRuns
- FAIL — candidateCheckRateAtLeast090
- PASS — targetedImprovementAtLeast010

## Scenario outcomes

- baseline/independent-data-work/rep-1: FAIL; failed checks: no-false-edge
- baseline/shared-write-conflict/rep-1: FAIL; failed checks: coordination, not-a-data-edge
- baseline/shared-api-capacity/rep-1: PASS; failed checks: none
- baseline/hierarchical-fan-in/rep-1: FAIL; failed checks: hierarchical-reduction, identity-provenance, reconcile-layers, one-batch-handle
- baseline/balanced-missing-duplicate/rep-1: FAIL; failed checks: count-insufficient
- baseline/quorum-vs-completeness/rep-1: FAIL; failed checks: separate-completeness
- baseline/ambiguous-partial-policy/rep-1: PASS; failed checks: none
- baseline/ordinary-workflow-regression/rep-1: PASS; failed checks: none
- candidate/independent-data-work/rep-1: FAIL; failed checks: no-false-edge
- candidate/shared-write-conflict/rep-1: PASS; failed checks: none
- candidate/shared-api-capacity/rep-1: PASS; failed checks: none
- candidate/hierarchical-fan-in/rep-1: FAIL; failed checks: one-batch-handle
- candidate/balanced-missing-duplicate/rep-1: PASS; failed checks: none
- candidate/quorum-vs-completeness/rep-1: FAIL; failed checks: quorum-readiness, separate-completeness
- candidate/ambiguous-partial-policy/rep-1: PASS; failed checks: none
- candidate/ordinary-workflow-regression/rep-1: PASS; failed checks: none
