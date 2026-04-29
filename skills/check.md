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

Read `pom.config.json` to know approved test/docs/source roots and which warnings should be treated as errors.

## Output

- result;
- evidence;
- issues;
- follow-up.
