# Structured fan-in contract model comparison

Run: `2026-07-23T19-58-05-578Z-structured-v0.9-5x`

| Model | First-pass valid | After one repair | Repaired | Dropped |
|---|---:|---:|---:|---:|
| gpt-5.4-mini | 35/40 (87.5%) | 38/40 (95.0%) | 3 | 0 |
| gpt-5.4 | 36/40 (90.0%) | 40/40 (100.0%) | 4 | 0 |

## Outcomes

- gpt-5.4-mini/independent-data-work/rep-1: first=PASS, final=PASS
- gpt-5.4-mini/independent-data-work/rep-2: first=PASS, final=PASS
- gpt-5.4-mini/independent-data-work/rep-3: first=PASS, final=PASS
- gpt-5.4-mini/independent-data-work/rep-4: first=PASS, final=PASS
- gpt-5.4-mini/independent-data-work/rep-5: first=PASS, final=PASS
- gpt-5.4-mini/shared-write-conflict/rep-1: first=PASS, final=PASS
- gpt-5.4-mini/shared-write-conflict/rep-2: first=PASS, final=PASS
- gpt-5.4-mini/shared-write-conflict/rep-3: first=PASS, final=PASS
- gpt-5.4-mini/shared-write-conflict/rep-4: first=PASS, final=PASS
- gpt-5.4-mini/shared-write-conflict/rep-5: first=PASS, final=PASS
- gpt-5.4-mini/shared-api-capacity/rep-1: first=PASS, final=PASS
- gpt-5.4-mini/shared-api-capacity/rep-2: first=PASS, final=PASS
- gpt-5.4-mini/shared-api-capacity/rep-3: first=PASS, final=PASS
- gpt-5.4-mini/shared-api-capacity/rep-4: first=PASS, final=PASS
- gpt-5.4-mini/shared-api-capacity/rep-5: first=PASS, final=PASS
- gpt-5.4-mini/hierarchical-fan-in/rep-1: first=PASS, final=PASS
- gpt-5.4-mini/hierarchical-fan-in/rep-2: first=PASS, final=PASS
- gpt-5.4-mini/hierarchical-fan-in/rep-3: first=PASS, final=PASS
- gpt-5.4-mini/hierarchical-fan-in/rep-4: first=PASS, final=PASS
- gpt-5.4-mini/hierarchical-fan-in/rep-5: first=PASS, final=PASS
- gpt-5.4-mini/balanced-missing-duplicate/rep-1: first=PASS, final=PASS
- gpt-5.4-mini/balanced-missing-duplicate/rep-2: first=PASS, final=PASS
- gpt-5.4-mini/balanced-missing-duplicate/rep-3: first=PASS, final=PASS
- gpt-5.4-mini/balanced-missing-duplicate/rep-4: first=PASS, final=PASS
- gpt-5.4-mini/balanced-missing-duplicate/rep-5: first=PASS, final=PASS
- gpt-5.4-mini/quorum-vs-completeness/rep-1: first=FAIL, final=PASS
- gpt-5.4-mini/quorum-vs-completeness/rep-2: first=FAIL, final=PASS
- gpt-5.4-mini/quorum-vs-completeness/rep-3: first=FAIL, final=FAIL; errors=open_points: missing entry for open duplicate_policy
- gpt-5.4-mini/quorum-vs-completeness/rep-4: first=FAIL, final=PASS
- gpt-5.4-mini/quorum-vs-completeness/rep-5: first=FAIL, final=FAIL; errors=dynamic.await.eligible_statuses: successful_outcomes permits only succeeded | dynamic.await.eligible_statuses: expected exactly succeeded
- gpt-5.4-mini/ambiguous-partial-policy/rep-1: first=PASS, final=PASS
- gpt-5.4-mini/ambiguous-partial-policy/rep-2: first=PASS, final=PASS
- gpt-5.4-mini/ambiguous-partial-policy/rep-3: first=PASS, final=PASS
- gpt-5.4-mini/ambiguous-partial-policy/rep-4: first=PASS, final=PASS
- gpt-5.4-mini/ambiguous-partial-policy/rep-5: first=PASS, final=PASS
- gpt-5.4-mini/ordinary-workflow-regression/rep-1: first=PASS, final=PASS
- gpt-5.4-mini/ordinary-workflow-regression/rep-2: first=PASS, final=PASS
- gpt-5.4-mini/ordinary-workflow-regression/rep-3: first=PASS, final=PASS
- gpt-5.4-mini/ordinary-workflow-regression/rep-4: first=PASS, final=PASS
- gpt-5.4-mini/ordinary-workflow-regression/rep-5: first=PASS, final=PASS
- gpt-5.4/independent-data-work/rep-1: first=PASS, final=PASS
- gpt-5.4/independent-data-work/rep-2: first=PASS, final=PASS
- gpt-5.4/independent-data-work/rep-3: first=PASS, final=PASS
- gpt-5.4/independent-data-work/rep-4: first=PASS, final=PASS
- gpt-5.4/independent-data-work/rep-5: first=PASS, final=PASS
- gpt-5.4/shared-write-conflict/rep-1: first=PASS, final=PASS
- gpt-5.4/shared-write-conflict/rep-2: first=PASS, final=PASS
- gpt-5.4/shared-write-conflict/rep-3: first=PASS, final=PASS
- gpt-5.4/shared-write-conflict/rep-4: first=PASS, final=PASS
- gpt-5.4/shared-write-conflict/rep-5: first=PASS, final=PASS
- gpt-5.4/shared-api-capacity/rep-1: first=PASS, final=PASS
- gpt-5.4/shared-api-capacity/rep-2: first=PASS, final=PASS
- gpt-5.4/shared-api-capacity/rep-3: first=PASS, final=PASS
- gpt-5.4/shared-api-capacity/rep-4: first=PASS, final=PASS
- gpt-5.4/shared-api-capacity/rep-5: first=PASS, final=PASS
- gpt-5.4/hierarchical-fan-in/rep-1: first=PASS, final=PASS
- gpt-5.4/hierarchical-fan-in/rep-2: first=PASS, final=PASS
- gpt-5.4/hierarchical-fan-in/rep-3: first=PASS, final=PASS
- gpt-5.4/hierarchical-fan-in/rep-4: first=PASS, final=PASS
- gpt-5.4/hierarchical-fan-in/rep-5: first=PASS, final=PASS
- gpt-5.4/balanced-missing-duplicate/rep-1: first=PASS, final=PASS
- gpt-5.4/balanced-missing-duplicate/rep-2: first=PASS, final=PASS
- gpt-5.4/balanced-missing-duplicate/rep-3: first=PASS, final=PASS
- gpt-5.4/balanced-missing-duplicate/rep-4: first=PASS, final=PASS
- gpt-5.4/balanced-missing-duplicate/rep-5: first=PASS, final=PASS
- gpt-5.4/quorum-vs-completeness/rep-1: first=FAIL, final=PASS
- gpt-5.4/quorum-vs-completeness/rep-2: first=PASS, final=PASS
- gpt-5.4/quorum-vs-completeness/rep-3: first=PASS, final=PASS
- gpt-5.4/quorum-vs-completeness/rep-4: first=PASS, final=PASS
- gpt-5.4/quorum-vs-completeness/rep-5: first=PASS, final=PASS
- gpt-5.4/ambiguous-partial-policy/rep-1: first=PASS, final=PASS
- gpt-5.4/ambiguous-partial-policy/rep-2: first=FAIL, final=PASS
- gpt-5.4/ambiguous-partial-policy/rep-3: first=PASS, final=PASS
- gpt-5.4/ambiguous-partial-policy/rep-4: first=FAIL, final=PASS
- gpt-5.4/ambiguous-partial-policy/rep-5: first=FAIL, final=PASS
- gpt-5.4/ordinary-workflow-regression/rep-1: first=PASS, final=PASS
- gpt-5.4/ordinary-workflow-regression/rep-2: first=PASS, final=PASS
- gpt-5.4/ordinary-workflow-regression/rep-3: first=PASS, final=PASS
- gpt-5.4/ordinary-workflow-regression/rep-4: first=PASS, final=PASS
- gpt-5.4/ordinary-workflow-regression/rep-5: first=PASS, final=PASS
