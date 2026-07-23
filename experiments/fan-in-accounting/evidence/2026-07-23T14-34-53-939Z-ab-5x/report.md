# Fan-in accounting prompt A/B report

Run: `2026-07-23T14-34-53-939Z-ab-5x`

| Variant | Completed | Scenario pass rate | Check pass rate |
|---|---:|---:|---:|
| baseline | 40/40 | 35.0% | 67.4% |
| candidate | 40/40 | 50.0% | 83.7% |

Candidate check-rate delta: **16.3 percentage points**.

## Gate

- PASS — noDroppedRuns
- FAIL — candidateCheckRateAtLeast090
- PASS — targetedImprovementAtLeast010

## Scenario outcomes

- baseline/independent-data-work/rep-1: FAIL; failed checks: no-false-edge
- baseline/independent-data-work/rep-2: FAIL; failed checks: no-false-edge
- baseline/independent-data-work/rep-3: PASS; failed checks: none
- baseline/independent-data-work/rep-4: FAIL; failed checks: no-false-edge
- baseline/independent-data-work/rep-5: FAIL; failed checks: no-false-edge
- baseline/shared-write-conflict/rep-1: FAIL; failed checks: not-a-data-edge
- baseline/shared-write-conflict/rep-2: PASS; failed checks: none
- baseline/shared-write-conflict/rep-3: FAIL; failed checks: coordination, not-a-data-edge
- baseline/shared-write-conflict/rep-4: FAIL; failed checks: not-a-data-edge
- baseline/shared-write-conflict/rep-5: FAIL; failed checks: not-a-data-edge
- baseline/shared-api-capacity/rep-1: FAIL; failed checks: bounded-concurrency
- baseline/shared-api-capacity/rep-2: FAIL; failed checks: bounded-concurrency
- baseline/shared-api-capacity/rep-3: PASS; failed checks: none
- baseline/shared-api-capacity/rep-4: PASS; failed checks: none
- baseline/shared-api-capacity/rep-5: PASS; failed checks: none
- baseline/hierarchical-fan-in/rep-1: FAIL; failed checks: hierarchical-reduction, identity-provenance, reconcile-layers, one-batch-handle
- baseline/hierarchical-fan-in/rep-2: FAIL; failed checks: hierarchical-reduction, batches, identity-provenance, reconcile-layers, one-batch-handle
- baseline/hierarchical-fan-in/rep-3: FAIL; failed checks: hierarchical-reduction, identity-provenance, reconcile-layers, one-batch-handle
- baseline/hierarchical-fan-in/rep-4: FAIL; failed checks: hierarchical-reduction, identity-provenance, reconcile-layers, one-batch-handle
- baseline/hierarchical-fan-in/rep-5: FAIL; failed checks: hierarchical-reduction, batches, identity-provenance, reconcile-layers, one-batch-handle
- baseline/balanced-missing-duplicate/rep-1: PASS; failed checks: none
- baseline/balanced-missing-duplicate/rep-2: FAIL; failed checks: count-insufficient
- baseline/balanced-missing-duplicate/rep-3: PASS; failed checks: none
- baseline/balanced-missing-duplicate/rep-4: FAIL; failed checks: count-insufficient
- baseline/balanced-missing-duplicate/rep-5: FAIL; failed checks: count-insufficient
- baseline/quorum-vs-completeness/rep-1: FAIL; failed checks: separate-completeness
- baseline/quorum-vs-completeness/rep-2: FAIL; failed checks: separate-completeness
- baseline/quorum-vs-completeness/rep-3: FAIL; failed checks: separate-completeness
- baseline/quorum-vs-completeness/rep-4: FAIL; failed checks: separate-completeness
- baseline/quorum-vs-completeness/rep-5: FAIL; failed checks: separate-completeness
- baseline/ambiguous-partial-policy/rep-1: PASS; failed checks: none
- baseline/ambiguous-partial-policy/rep-2: FAIL; failed checks: do-not-invent
- baseline/ambiguous-partial-policy/rep-3: FAIL; failed checks: request-policy-decision
- baseline/ambiguous-partial-policy/rep-4: FAIL; failed checks: do-not-invent
- baseline/ambiguous-partial-policy/rep-5: PASS; failed checks: none
- baseline/ordinary-workflow-regression/rep-1: PASS; failed checks: none
- baseline/ordinary-workflow-regression/rep-2: PASS; failed checks: none
- baseline/ordinary-workflow-regression/rep-3: PASS; failed checks: none
- baseline/ordinary-workflow-regression/rep-4: PASS; failed checks: none
- baseline/ordinary-workflow-regression/rep-5: PASS; failed checks: none
- candidate/independent-data-work/rep-1: PASS; failed checks: none
- candidate/independent-data-work/rep-2: FAIL; failed checks: parallel, no-false-edge
- candidate/independent-data-work/rep-3: PASS; failed checks: none
- candidate/independent-data-work/rep-4: FAIL; failed checks: no-false-edge
- candidate/independent-data-work/rep-5: PASS; failed checks: none
- candidate/shared-write-conflict/rep-1: FAIL; failed checks: not-a-data-edge
- candidate/shared-write-conflict/rep-2: FAIL; failed checks: not-a-data-edge
- candidate/shared-write-conflict/rep-3: FAIL; failed checks: not-a-data-edge
- candidate/shared-write-conflict/rep-4: FAIL; failed checks: not-a-data-edge
- candidate/shared-write-conflict/rep-5: FAIL; failed checks: coordination, not-a-data-edge
- candidate/shared-api-capacity/rep-1: FAIL; failed checks: bounded-concurrency
- candidate/shared-api-capacity/rep-2: PASS; failed checks: none
- candidate/shared-api-capacity/rep-3: PASS; failed checks: none
- candidate/shared-api-capacity/rep-4: PASS; failed checks: none
- candidate/shared-api-capacity/rep-5: PASS; failed checks: none
- candidate/hierarchical-fan-in/rep-1: FAIL; failed checks: reconcile-layers
- candidate/hierarchical-fan-in/rep-2: FAIL; failed checks: reconcile-layers
- candidate/hierarchical-fan-in/rep-3: FAIL; failed checks: one-batch-handle
- candidate/hierarchical-fan-in/rep-4: FAIL; failed checks: reconcile-layers
- candidate/hierarchical-fan-in/rep-5: FAIL; failed checks: one-batch-handle
- candidate/balanced-missing-duplicate/rep-1: FAIL; failed checks: count-insufficient
- candidate/balanced-missing-duplicate/rep-2: PASS; failed checks: none
- candidate/balanced-missing-duplicate/rep-3: FAIL; failed checks: count-insufficient
- candidate/balanced-missing-duplicate/rep-4: PASS; failed checks: none
- candidate/balanced-missing-duplicate/rep-5: PASS; failed checks: none
- candidate/quorum-vs-completeness/rep-1: FAIL; failed checks: separate-completeness
- candidate/quorum-vs-completeness/rep-2: PASS; failed checks: none
- candidate/quorum-vs-completeness/rep-3: PASS; failed checks: none
- candidate/quorum-vs-completeness/rep-4: PASS; failed checks: none
- candidate/quorum-vs-completeness/rep-5: FAIL; failed checks: quorum-readiness
- candidate/ambiguous-partial-policy/rep-1: FAIL; failed checks: do-not-invent
- candidate/ambiguous-partial-policy/rep-2: FAIL; failed checks: do-not-invent
- candidate/ambiguous-partial-policy/rep-3: PASS; failed checks: none
- candidate/ambiguous-partial-policy/rep-4: PASS; failed checks: none
- candidate/ambiguous-partial-policy/rep-5: FAIL; failed checks: do-not-invent
- candidate/ordinary-workflow-regression/rep-1: PASS; failed checks: none
- candidate/ordinary-workflow-regression/rep-2: PASS; failed checks: none
- candidate/ordinary-workflow-regression/rep-3: PASS; failed checks: none
- candidate/ordinary-workflow-regression/rep-4: PASS; failed checks: none
- candidate/ordinary-workflow-regression/rep-5: PASS; failed checks: none
