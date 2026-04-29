# Prompt - Review Task Phase

Use this prompt to verify a completed phase, workstream, or task.

```text
Verify the indicated phase/workstream/task.

Do not limit the review to checking that files changed.

You must verify:
- completed tasks against the plan;
- missing steps;
- tests or lint run;
- consistency with spec/ADR/wiki;
- introduced contradictions;
- functional gaps;
- security/privacy risks;
- real user cases covered or not covered;
- documentation updated;
- needed but missing ADR decisions.

For implementation tasks:
- run available tests;
- verify real user cases when possible;
- for E2E or user-flow tests, check at least 2 positive user cases and at least 1 handled-error user case, unless there is a documented blocker;
- verify that tests are in the project's approved structure; if you find a structure different from the POM proposal, report the divergence and ask whether to adapt or migrate;
- report regressions or gaps.

For documentation tasks:
- run documentation lint if available;
- perform focused critical analysis;
- report ambiguities, open decisions, and risks.

Output:
- result: passed / passed with warnings / failed;
- evidence;
- issues found;
- required follow-up;
- plan update proposal if needed.
```
