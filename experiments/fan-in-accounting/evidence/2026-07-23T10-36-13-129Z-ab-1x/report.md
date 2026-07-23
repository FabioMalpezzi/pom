# Fan-in accounting prompt A/B report

Run: `2026-07-23T10-36-13-129Z-ab-1x`

| Variant | Completed | Scenario pass rate | Check pass rate |
|---|---:|---:|---:|
| baseline | 8/8 | 50.0% | 70.4% |
| candidate | 8/8 | 37.5% | 81.5% |

Candidate check-rate delta: **11.1 percentage points**.

## Gate

- PASS — noDroppedRuns
- FAIL — candidateCheckRateAtLeast090
- PASS — targetedImprovementAtLeast010

## Scenario outcomes

- baseline/independent-data-work/rep-1: FAIL; failed checks: no-false-edge
- baseline/shared-write-conflict/rep-1: FAIL; failed checks: not-a-data-edge
- baseline/shared-api-capacity/rep-1: PASS; failed checks: none
- baseline/hierarchical-fan-in/rep-1: FAIL; failed checks: hierarchical-reduction, batches, identity-provenance, reconcile-layers, one-batch-handle
- baseline/balanced-missing-duplicate/rep-1: PASS; failed checks: none
- baseline/quorum-vs-completeness/rep-1: FAIL; failed checks: separate-completeness
- baseline/ambiguous-partial-policy/rep-1: PASS; failed checks: none
- baseline/ordinary-workflow-regression/rep-1: PASS; failed checks: none
- candidate/independent-data-work/rep-1: FAIL; failed checks: no-false-edge
- candidate/shared-write-conflict/rep-1: FAIL; failed checks: coordination
- candidate/shared-api-capacity/rep-1: PASS; failed checks: none
- candidate/hierarchical-fan-in/rep-1: FAIL; failed checks: one-batch-handle
- candidate/balanced-missing-duplicate/rep-1: PASS; failed checks: none
- candidate/quorum-vs-completeness/rep-1: FAIL; failed checks: separate-completeness
- candidate/ambiguous-partial-policy/rep-1: FAIL; failed checks: do-not-invent
- candidate/ordinary-workflow-regression/rep-1: PASS; failed checks: none
