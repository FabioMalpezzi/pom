---
name: check
description: Use this skill to verify a completed phase, workstream, or task — including goal-backward check, scenario tests, thesis/antithesis validation, and consistency with specs, ADRs, and wiki.
---

# Skill - check

## When To Use

- Verification of a completed phase, workstream, or task.
- Review before closing work.
- Check tests, lint, consistency, and risks.

## Canonical Prompt

`prompts/06-review-task-phase.md`

## Key Rules

- Do not limit the review to the file diff.
- Start with goal-backward check: is the declared goal actually achieved, not just the steps executed?
- Verify real user scenarios when possible.
- For tech work, check at least 2 positive scenario tests and 1 error/misuse test.
- For non-tech work, check thesis/antithesis validation — every antithesis must be confuted.
- Verification is mandatory and automatic when marking Complete — the agent does not ask, it verifies.
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
