# TASK-0001 - Lint taskPlans Mapping

## Origin

| Type | Reference |
|---|---|
| Config | `templates/POM_CONFIG_TEMPLATE.json` |
| Script | `scripts/lint-doc-governance.ts` |
| Prompt | `prompts/08-create-pom-config.md` |
| Skill | `skills/config.md` |

## Objective

Make `scripts/lint-doc-governance.ts` understand the `taskPlans` configuration so POM can validate task-plan locations without assuming `tasks/` for every project.

## Placement

| Level | Value |
|---|---|
| Phase | Framework governance |
| Workstream | Lint/config mapping |
| Task | Validate configurable task-plan roots |

## Steps

- [ ] Add `taskPlans` to the lint config type and default config.
- [ ] Merge `taskPlans.root`, `taskPlans.taskPathPattern`, optional `taskPlans.recommendedPath`, optional `taskPlans.namespaceConvention`, `taskPlans.indexPath`, and `taskPlans.requireTemplateSections` from `pom.config.json`.
- [ ] Merge `analysis.root`, optional `analysis.recommendedPath`, and optional `analysis.namespaceConvention` from `pom.config.json` for namespace guidance.
- [ ] Validate task-plan files under `taskPlans.root` when `adoption.tasks` is `light` or `structured`.
- [ ] If `requireTemplateSections=true`, check task files against `templates/TASK_PLAN_TEMPLATE.md`.
- [ ] Ensure lint never assumes `tasks/` when a project maps task plans elsewhere.
- [ ] Optionally generate or validate a task index only if the behavior is explicit and safe.
- [ ] Add/update an example config showing a non-root task-plan location.

## Verification

- [ ] `npm run pom:lint` passes in `/Users/fabio/WA/pom`.
- [ ] A sample config with `taskPlans.root = "tasks"` and `recommendedPath = "tasks/<analysis-or-workstream>/P<priority-or-phase>/<task>.md"` is accepted.
- [ ] A sample config with a different root, for example `docs/delivery/tasks`, is accepted.
- [ ] Missing or malformed task plans produce warnings, not hard failures, unless the rule is objective.

## Risks And Privacy/Security

| Risk | Mitigation |
|---|---|
| Lint becomes too strict for existing projects | Keep defaults conservative and use warnings for adoption gaps |
| Task index generation overwrites hand-written files | Generate only when explicit, or validate-only at first |

## Outcome

To be completed when the lint supports `taskPlans` directly.

## Done Criteria

- [ ] Steps completed
- [ ] Verifications run
- [ ] README/prompts updated if behavior changes
