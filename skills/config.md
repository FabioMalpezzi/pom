# Skill - config

## When To Use

- Create or update `pom.config.json`.
- Adapt lint to a new or existing project.
- Reconcile decisions/docs/source/tests/task plans/wiki/analysis/mockups/handoff with local preferences.

## Canonical Prompt

`pom/prompts/08-create-pom-config.md`

## Main Template

`pom/templates/POM_CONFIG_TEMPLATE.json`

## Config

This skill creates or updates `pom.config.json`. If the file exists, preserve local choices and propose only motivated changes.

When configuring analysis, task plans, and tests, fill these fields when applicable:

- `analysis.root`, `analysis.recommendedPath`, `analysis.namespaceConvention`;
- `taskPlans.root`, `taskPlans.taskPathPattern`, `taskPlans.recommendedPath`, `taskPlans.namespaceConvention`, `taskPlans.indexPath`;
- `tests.root`, `tests.recommendedPath`, `tests.namespaceConvention`, `tests.recommendedLayout`, `tests.crossSystemDir`.

Default namespace guidance for new POM-owned material:

```text
analysis/<analysis-or-workstream>/<analysis>.md
tasks/<analysis-or-workstream>/P<priority-or-phase>/<task>.md
tests/<analysis-or-workstream-or-module>/{e2e,integration,fixtures,evidence}
```

Map existing project conventions first. Do not migrate existing analysis, task, or test folders just to match the defaults.

## Output

- `pom.config.json` consistent with the project;
- base POM rules separated from project-specific rules;
- analysis/task/test namespace convention stated or intentionally overridden;
- lint run and result;
- mapped roots and conventions explained for decisions/docs/source/tests/task plans/wiki/analysis/mockups/handoff.
