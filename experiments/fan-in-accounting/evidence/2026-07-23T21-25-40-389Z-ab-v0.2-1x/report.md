# Fan-in accounting prompt A/B report

Run: `2026-07-23T21-25-40-389Z-ab-v0.2-1x`

| Variant | Completed | Scenario pass rate | Check pass rate |
|---|---:|---:|---:|
| baseline | 8/8 | 37.5% | 81.5% |

## Scenario outcomes

- baseline/independent-data-work/rep-1: FAIL; failed checks: no-false-edge
- baseline/shared-write-conflict/rep-1: FAIL; failed checks: coordination
- baseline/shared-api-capacity/rep-1: PASS; failed checks: none
- baseline/hierarchical-fan-in/rep-1: FAIL; failed checks: hierarchical-reduction
- baseline/balanced-missing-duplicate/rep-1: PASS; failed checks: none
- baseline/quorum-vs-completeness/rep-1: PASS; failed checks: none
- baseline/ambiguous-partial-policy/rep-1: FAIL; failed checks: request-policy-decision
- baseline/ordinary-workflow-regression/rep-1: FAIL; failed checks: no-forced-dynamic
