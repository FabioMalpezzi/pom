# Skill - check

## When To Use

- Verification of a completed phase, workstream, or task.
- Review before closing work.
- Check tests, lint, consistency, and risks.

## Canonical Prompt

`prompts/06-review-task-phase.md`

## Key Rules

- Do not limit the review to the file diff.
- Verify real user scenarios when possible.
- For E2E, check 2 positive cases and 1 handled-error case when applicable.
- Report contradictions, gaps, and security/privacy risks.

## Config

Read `pom.config.json` to know approved analysis/task/test/docs/source roots and which warnings should be treated as errors.

For analysis/task/test artifacts, verify that either:

- they follow the configured namespace convention, for example `analysis/<analysis-or-workstream>/...`, `tasks/<analysis-or-workstream>/P<priority-or-phase>/...`, and `tests/<analysis-or-workstream-or-module>/...`; or
- they intentionally follow an existing service/framework structure recorded in config or local project rules.

Do not request folder moves as part of verification unless the task explicitly includes migration.

## Output

- result;
- evidence;
- issues;
- namespace/config consistency notes;
- follow-up.
