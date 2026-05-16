---
name: config
description: Use this skill to create or update pom.config.json — configuring lint, adoption profile, and mappings for decisions, docs, source, tests, task plans, wiki, analysis, and mockups.
---

# Skill - config

## When To Use

- Create or update `pom.config.json`.
- Adapt lint to a new or existing project.
- Classify repository ownership before mapping POM modules.
- Reconcile decisions/docs/source/tests/task plans/wiki/analysis/mockups/handoff with local preferences.

## Canonical Prompt

`prompts/08-create-pom-config.md`

## Main Template

`pom/templates/POM_CONFIG_TEMPLATE.json`

## Config

This skill creates or updates `pom.config.json`. If the file exists, preserve local choices and propose only motivated changes.

Before mapping modules in an existing repository, set or confirm ownership:

- `owned`: the user can govern structure and conventions.
- `team`: the user can modify the repository, but existing conventions should be preserved unless explicitly changed.
- `external_overlay`: the repository belongs to an external upstream; POM is local understanding memory only.

For `external_overlay`, preserve upstream `docs/`, `tests/`, ADRs, source layout, agent instruction files, release process, and PR contents. Prefer disabling POM governance over upstream docs/tests and use local wiki/notes to understand the project.

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

The config includes `skillUsage` and `promptUsage` sections that are updated automatically by the agent when skills or prompts are read. Do not reset these counters unless explicitly requested.

## Template Localization

Use project-owned templates when the project needs documents in a language other than English or a different local document shape.

Workflow:

1. Copy only the needed templates from `pom/templates/` into a project-owned folder, for example `project-templates/`.
2. Translate or adapt headings and placeholder text while preserving the intended document structure.
3. Map the translated templates in `pom.config.json.templates`.
4. Run `npm run pom:lint` and fix configuration issues before changing governed documents.

Do not place translated or customized target-project templates under `pom/`, because framework updates may overwrite them or create conflicts.

## Output

- `pom.config.json` consistent with the project;
- `ownership.mode` set or explicitly left unknown;
- base POM rules separated from project-specific rules;
- analysis/task/test namespace convention stated or intentionally overridden;
- lint run and result;
- mapped roots and conventions explained for decisions/docs/source/tests/task plans/wiki/analysis/mockups/handoff.
