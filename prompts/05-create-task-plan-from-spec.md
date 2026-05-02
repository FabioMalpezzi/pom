# Prompt - Create Task Plan From Spec Or ADR

Use this prompt to turn a spec, decision, or analysis into verifiable work.

```text
Read the indicated spec/ADR/analysis and create an operational task plan.

Before creating a task, classify the artifact:
- decision or boundary -> ADR;
- intended behavior without immediate implementation -> spec;
- reusable knowledge -> wiki;
- work to execute and verify -> task plan.

If the user explicitly wants to preserve work without implementing it, use
`prompts/16-defer-work.md` instead of creating an active task.

Use this logical hierarchy (it organizes work, not folders):

Roadmap
  -> Phase          (closes with acceptance review)
    -> Workstream   (closes with cross-functional E2E / user-flow tests)
      -> Task       (closes with integration tests / single-feature E2E)
        -> Step     (closes with atomic verification: unit test, lint, check)

Verification happens at every level, not only at the bottom. Place E2E and user-flow tests at Task or Workstream level, not at Step level.

For each task, include:
- status;
- origin: spec, ADR, wiki, analysis, mockup, stakeholder decision;
- objective;
- phase;
- workstream;
- concrete steps;
- verifications;
- real user scenarios where applicable;
- documentation checks when there is no code;
- security/privacy checks when relevant;
- done criteria.

Rules:
- do not create generic tasks that cannot be verified;
- do not create an active task for deliberately postponed work; mark it Deferred or use the defer workflow;
- every phase must close with concrete verification;
- a task or spec cannot be marked Complete without passing the completion verification gate:
  - first: goal-backward check — verify the declared objective is actually achieved, not just that steps were executed;
  - tasks with code: at least 2 positive scenario tests based on real user use cases + at least 1 error/misuse scenario test; tests must run and pass;
  - tasks without code: at least 1 thesis proving validity based on use cases + at least 1 antithesis (incorrect/improper usage) demonstrated false or inferior; cannot close if an antithesis is not confuted;
  - if verification is not possible, document the reason and close as "Complete with exceptions";
  - verification is mandatory and automatic: the agent executes it when marking Complete, without asking;
- if the work is documentation-only, include lint + critical analysis for contradictions, gaps, and security/privacy risks;
- if the work is implementation, include technical tests and a user scenario;
- if the project already has a test structure, use it only after identifying it; if it differs from the POM proposal, ask whether to adapt to the existing structure or use/adapt `tests/<analysis-or-workstream-or-module>/...`;
- if no test structure exists, propose `tests/<analysis-or-workstream-or-module>/{e2e,integration,fixtures,evidence}` and `tests/cross-system/`, without creating unnecessary empty folders;
- when `pom.config.json.taskPlans.recommendedPath` is present, follow it; otherwise prefer `tasks/<analysis-or-workstream>/P<priority-or-phase>/<task>.md` for new task plans;
- when creating new supporting analysis, follow `pom.config.json.analysis.recommendedPath` when present, otherwise prefer `analysis/<analysis-or-workstream>/<analysis>.md`;
- keep the analysis/workstream namespace congruent across related analysis, task plans, tests, fixtures, and evidence where practical.

Recommended output:
- `CURRENT_PLAN.md` or the configured current-plan equivalent for the short active focus;
- task files under `pom.config.json.taskPlans.root` when configured, following `taskPlans.recommendedPath` when present, otherwise `tasks/<analysis-or-workstream>/P<priority-or-phase>/<task>.md` or the approved project equivalent.

Do not modify an existing plan without highlighting what you are changing.
```
