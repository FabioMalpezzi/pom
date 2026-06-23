---
name: config
description: Use when creating or updating pom.config.json for adoption, roots, lint, wiki, decisions, tasks, tests, docs, analysis, or mockups.
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

The wiki directory is also configurable through `wiki.root` (default `wiki`). Set it when the wiki lives outside the conventional location — for example nested under a documentation root such as `doc/tech/wiki`. The wiki lint and the docs-source lint (which excludes the wiki root from official-document section checks) honor `wiki.root`, so a wiki nested under the documentation root is not mistaken for official documentation. The lint regenerates the reader at the configured root automatically; to render a relocated wiki manually, pass the flags `npm run pom:wiki:render -- --source <wiki.root> --out <wiki.root>/_site`.

The config may include `skillUsage` and `promptUsage` sections when the project intentionally tracks workflow usage. Do not reset these counters unless explicitly requested.

## Enabling Workflows

Workflow modeling through `skills/workflow.md` and SPEC-0006 is opt-in
and disabled by default. The workflow skill routes here when workflow
support is not enabled, so this is the canonical place to turn it on.

Add or update a top-level `workflows` section in `pom.config.json`. It is
not an `adoption` key; it sits alongside sections such as `handoff`:

```json
"workflows": {
  "enabled": true,
  "root": "workflows/",
  "generatedRoot": "workflows/generated/",
  "namingConvention": "snake_case"
}
```

- `enabled`: `true` activates the workflow skill and `pom:workflow:*`
  scripts. `false` or an absent section leaves workflow support off.
- `root`: directory for hand-authored workflow YAML models.
- `generatedRoot`: directory for derived reports, diagrams, and
  scenarios. Do not hand-edit generated files there.
- `namingConvention`: naming convention for workflow and state names.

Then complete activation:

1. Create `root` and `generatedRoot` if they do not exist.
2. Install the `js-yaml` dependency with `npm install` in the POM root
   or project root. Workflow scripts use `js-yaml`; if it is missing,
   they exit with an actionable `[pom:workflow]` message instead of a raw
   module-resolution stack trace.
3. Verify the chain with
   `npm run pom:workflow:lint <workflow-or-pipeline>.yaml`.

`POM_CONFIG_TEMPLATE.json` ships this section with `enabled: false`, so
new projects have the shape available without reading SPEC-0006 first.

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
