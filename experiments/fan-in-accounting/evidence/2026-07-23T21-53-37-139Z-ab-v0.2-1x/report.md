# Fan-in accounting prompt A/B report

Run: `2026-07-23T21-53-37-139Z-ab-v0.2-1x`

| Variant | Completed | Scenario pass rate | Check pass rate |
|---|---:|---:|---:|
| baseline | 8/8 | 50.0% | 81.5% |

## Scenario outcomes

- baseline/independent-data-work/rep-1: PASS; failed checks: none
- baseline/shared-write-conflict/rep-1: PASS; failed checks: none
- baseline/shared-api-capacity/rep-1: PASS; failed checks: none
- baseline/hierarchical-fan-in/rep-1: PASS; failed checks: none
- baseline/balanced-missing-duplicate/rep-1: FAIL; failed checks: find-missing, count-insufficient
- baseline/quorum-vs-completeness/rep-1: FAIL; failed checks: quorum-readiness
- baseline/ambiguous-partial-policy/rep-1: FAIL; failed checks: do-not-invent
- baseline/ordinary-workflow-regression/rep-1: FAIL; failed checks: no-forced-dynamic
