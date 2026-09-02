# TASK-0001 - Lint taskPlans Mapping

## Status

Complete

## Origin

| Type | Reference |
|---|---|
| Config | `templates/POM_CONFIG_TEMPLATE.json` |
| Script | `scripts/lint-doc-governance.ts` |
| Prompt | `prompts/08-create-pom-config.md` |
| Skill | `skills/config.md` |

## Objective

Make `scripts/lint-doc-governance.ts` understand the `taskPlans` configuration so POM can validate task-plan locations without assuming `tasks/` for every project.

## Assumptions And Success Criteria

Assumptions:

- Task plans are Markdown files under one configurable root; a regex on the repository-relative path selects them.
- Required sections are read from the configured task template (`##` headings), so localized templates work without code changes.
- Existing projects must not be forced to move task plans: defaults stay conservative and objective rules only produce errors.

Success criteria:

- `taskPlans.root`, `taskPlans.taskPathPattern`, `taskPlans.indexPath`, and `taskPlans.requireTemplateSections` are read from `pom.config.json` and validated.
- A project with task plans outside `tasks/` lints clean with the right configuration.
- Missing template sections are reported only when `requireTemplateSections` is true.

## Placement

| Level | Value |
|---|---|
| Phase | Framework governance |
| Workstream | Lint/config mapping |
| Task | Validate configurable task-plan roots |

## Steps

- [x] Add `taskPlans` to the lint config type and default config.
- [x] Merge `taskPlans.root`, `taskPlans.taskPathPattern`, optional `taskPlans.recommendedPath`, optional `taskPlans.namespaceConvention`, `taskPlans.indexPath`, and `taskPlans.requireTemplateSections` from `pom.config.json`.
- [x] Merge `analysis.root`, optional `analysis.recommendedPath`, and optional `analysis.namespaceConvention` from `pom.config.json` for namespace guidance.
- [x] Validate task-plan files under `taskPlans.root` when `adoption.tasks` is `light` or `structured`.
- [x] If `requireTemplateSections=true`, check task files against `templates/TASK_PLAN_TEMPLATE.md`.
- [x] Ensure lint never assumes `tasks/` when a project maps task plans elsewhere.
- [x] Optionally generate or validate a task index only if the behavior is explicit and safe.
- [x] Add/update an example config showing a non-root task-plan location.

## Verification

A task cannot be marked Complete without passing the completion verification gate. This verification is mandatory and automatic.

### Step 0 — Goal-backward check

- [x] What must be TRUE for the objective to be met?
  - The lint reads the `taskPlans` block from `pom.config.json` instead of assuming `tasks/`.
  - Required task sections come from the configured template, not from a hard-coded list.
  - A non-default task root lints clean and gets its own generated index.
- [x] For each truth, what must EXIST?
  - `scripts/lib/lint-config.ts` merges and validates `taskPlans.root`, `taskPlans.taskPathPattern`, `taskPlans.indexPath`, and `taskPlans.requireTemplateSections`.
  - `scripts/lib/lint-context.ts` derives `requiredTaskPlanSections` from `templatePaths.taskPlan`; `scripts/lib/lint-tasks.ts` applies the pattern, the index path, and the section check.
  - `examples/pom-config-existing-adr-root.json` shows the block for an existing project.

### Scenario tests

- [x] Positive case: `tests/completion-verification/integration/test-lint-completion-verification.mjs`, Scenario 5 "localized templates and configured indexes work": a task plan under `tasks/area/P0/` checked against a localized task template with `requireTemplateSections: true` produces no `task-required-section` finding and is linked from the configured `tasks/TASKS_INDEX.md`.
- [x] Positive case: `tests/spec-0001/integration/test-modular-assembly.mjs`, Scenario 6 "docs lint skips specialized governance roots under docs/": `taskPlans.root` set to `docs/tasks` with its own index path lints with exit code zero.
- [x] Error/misuse case: `tests/doc-governance/integration/test-lint-rules.mjs`, scenario "task plans (lint-tasks.ts)": a task plan without a Status section and one with a placeholder status both produce the `task-status` warning, and a task plan missing a template section with `requireTemplateSections: true` produces the `task-required-section` error.
- [x] Tests run and pass: `node scripts/run-tests.mjs` (the three files above report 0 failed).

### Cross-cutting checks

- [x] `npm run pom:lint` on this repository, with `taskPlans.requireTemplateSections: true`, reports `task-required-section` for a task plan missing a template section; the same path is now asserted by the committed test above.
- [x] No security or privacy surface: the change reads repository-local Markdown and JSON only.

## Test Structure

| Item | Value |
|---|---|
| Existing test structure | Integration tests under `tests/<area>/integration/` |
| Chosen structure | existing |
| E2E test path | none |
| Fixture path | temporary projects created inside the integration tests |
| Evidence path | none |

## User Use Cases

- As a maintainer of an existing project, I want to keep my task plans where they already are, so that adopting POM does not force a migration.
- Positive case 1: a project with task plans under `docs/tasks/` maps that root and gets a generated `docs/tasks/TASKS_INDEX.md`.
- Positive case 2: a project with a localized task template maps it in `templates.taskPlan` and its task plans pass the section check.
- Handled-error case: a task plan without a Status section receives a `task-status` warning instead of a hard failure; a missing template section is an error only when `requireTemplateSections` is true.

## Risks And Privacy/Security

| Risk | Mitigation |
|---|---|
| Lint becomes too strict for existing projects | Keep defaults conservative and use warnings for adoption gaps |
| Task index generation overwrites hand-written files | Generate only when explicit, or validate-only at first |

## Outcome

Lint fully supports configurable `taskPlans` root, path pattern, index path, and template section enforcement. The example config `examples/pom-config-existing-adr-root.json` demonstrates a non-default task-plan location.

## Done Criteria

- [x] Steps completed
- [x] Verifications run
- [x] README/prompts updated if behavior changes
