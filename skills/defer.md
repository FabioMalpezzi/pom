# Skill - defer

## When To Use

- Work should be preserved but not implemented now.
- A partial task must be split into completed baseline and future scope.
- The user says to park, defer, postpone, or put work aside.

## Canonical Prompt

`prompts/16-defer-work.md`

## Related Skill

Use `skills/status.md` first when the status or document type is unclear.

## Main Templates

- `templates/SPEC_TEMPLATE.md`
- `templates/TASK_PLAN_TEMPLATE.md`
- `templates/PROJECT_STATE_TEMPLATE.md`

## Rules

- Set `Status: Deferred`.
- Do not change application code.
- Separate implemented baseline from deferred scope.
- Update indexes and `PROJECT_STATE.md` only when the restart context changes.
- Run `npm run pom:lint` when available and fix findings before closing.

## Output

- deferred spec/task/wiki update;
- index updates when present;
- lint result;
- clear reactivation criteria.
