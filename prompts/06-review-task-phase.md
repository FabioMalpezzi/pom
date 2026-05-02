# Prompt - Review Task Phase

Use this prompt to verify a completed phase, workstream, or task.

```text
Verify the indicated phase/workstream/task.

Do not limit the review to checking that files changed.

You must verify:
- goal-backward check first: is the declared goal/objective actually achieved, not just the steps executed?
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
- verify that scenario tests exist and cover real user use cases the spec/task generates or is involved in;
- verify at least 2 positive scenario tests and at least 1 error/misuse scenario test exist and pass;
- verify that tests are in the project's approved structure; if you find a structure different from the POM proposal, report the divergence and ask whether to adapt or migrate;
- report regressions or gaps;
- if scenario tests are missing, the task cannot be marked Complete — report as failed.

For documentation/non-code tasks:
- run documentation lint if available;
- verify that semantic validation (thesis/antithesis) has been performed;
- verify at least 1 thesis proves the spec/ADR is valid based on use cases it generates or is involved in;
- verify at least 1 antithesis (incorrect or improper usage) has been confuted;
- if any antithesis is not confuted, the task cannot be marked Complete — report as failed;
- perform focused critical analysis;
- report ambiguities, open decisions, and risks.

For both types:
- if verification is documented as not possible, accept "Complete with exceptions" only if the reason is explicit and credible; report as passed with warnings.

Verification agent:
- when the environment supports it, the completion verification should be performed by a separate agent or fresh context, not by the agent that did the work;
- when a separate agent is not available, the working agent must re-read the relevant files from disk instead of relying on session memory.

Output:
- result: passed / passed with warnings / failed;
- evidence;
- issues found;
- required follow-up;
- plan update proposal if needed.
```
