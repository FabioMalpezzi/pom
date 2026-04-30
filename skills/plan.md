# Skill - plan

## When To Use

- A spec, ADR, or analysis generates work.
- Decisions must become verifiable tasks.
- Roadmap, phase, workstream, task, step, and verification must be structured.

## Canonical Prompt

`prompts/05-create-task-plan-from-spec.md`

## Main Template

`templates/TASK_PLAN_TEMPLATE.md`

## Related Skills

- Use `skills/status.md` first when the artifact might be a spec, ADR, wiki page, or deferred work instead of an executable task.
- Use `skills/defer.md` when the work should be preserved but not implemented now.

## Config

Read `pom.config.json` to respect analysis/task/test structure, source roots, official docs, and control severities before proposing verifications or paths.

Use these fields when present:

- `taskPlans.recommendedPath` for task file placement;
- `analysis.recommendedPath` for supporting analysis;
- `tests.recommendedPath` and `tests.namespaceConvention` for verification evidence.

Default namespace guidance:

```text
analysis/<analysis-or-workstream>/<analysis>.md
tasks/<analysis-or-workstream>/P<priority-or-phase>/<task>.md
tests/<analysis-or-workstream-or-module>/{e2e,integration,fixtures,evidence}
```

Keep service-local or framework-required tests in their existing locations unless the config or user says otherwise.

## Output

- verifiable task plan in the configured task-plan location;
- linked origin ADR/spec/wiki/analysis/mockup/stakeholder decision;
- user scenarios;
- expected tests, evidence, or lint in approved locations;
- done criteria.
