# Structured fan-in contract model comparison

Run: `2026-07-23T19-18-11-310Z-structured-v0.8-1x`

| Model | First-pass valid | After one repair | Repaired | Dropped |
|---|---:|---:|---:|---:|
| gpt-5.4-mini | 6/8 (75.0%) | 8/8 (100.0%) | 2 | 0 |
| gpt-5.4 | 7/8 (87.5%) | 8/8 (100.0%) | 1 | 0 |

## Outcomes

- gpt-5.4-mini/independent-data-work/rep-1: first=PASS, final=PASS
- gpt-5.4-mini/shared-write-conflict/rep-1: first=FAIL, final=PASS
- gpt-5.4-mini/shared-api-capacity/rep-1: first=PASS, final=PASS
- gpt-5.4-mini/hierarchical-fan-in/rep-1: first=PASS, final=PASS
- gpt-5.4-mini/balanced-missing-duplicate/rep-1: first=PASS, final=PASS
- gpt-5.4-mini/quorum-vs-completeness/rep-1: first=FAIL, final=PASS
- gpt-5.4-mini/ambiguous-partial-policy/rep-1: first=PASS, final=PASS
- gpt-5.4-mini/ordinary-workflow-regression/rep-1: first=PASS, final=PASS
- gpt-5.4/independent-data-work/rep-1: first=PASS, final=PASS
- gpt-5.4/shared-write-conflict/rep-1: first=PASS, final=PASS
- gpt-5.4/shared-api-capacity/rep-1: first=PASS, final=PASS
- gpt-5.4/hierarchical-fan-in/rep-1: first=PASS, final=PASS
- gpt-5.4/balanced-missing-duplicate/rep-1: first=PASS, final=PASS
- gpt-5.4/quorum-vs-completeness/rep-1: first=FAIL, final=PASS
- gpt-5.4/ambiguous-partial-policy/rep-1: first=PASS, final=PASS
- gpt-5.4/ordinary-workflow-regression/rep-1: first=PASS, final=PASS
