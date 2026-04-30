# Skill - adopt

## When To Use

- Existing project.
- Need to introduce POM without breaking local conventions.
- Existing docs, source, tests, wiki, analysis, task plans, or decision structures.

## Canonical Prompt

`prompts/02-adopt-existing-project.md`

## Key Rules

- Detect the real structure first.
- Map existing structures in `pom.config.json` before proposing migrations.
- Ask whether to adapt to the existing structure or use/adapt POM.
- Do not move files without approval.
- Configure `pom.config.json` according to approved choices.

## Config

Read `pom.config.json` if it exists. The mapping to POM must respect or explicitly update `decisions`, `documentation`, `source`, `tests`, `taskPlans`, `wiki`, `analysis`, `mockups`, and `handoff`.

For new POM-owned analysis/task/test material, prefer a shared namespace:

```text
analysis/<analysis-or-workstream>/<analysis>.md
tasks/<analysis-or-workstream>/P<priority-or-phase>/<task>.md
tests/<analysis-or-workstream-or-module>/{e2e,integration,fixtures,evidence}
```

Preserve imported or service-local structures unless the user explicitly approves a migration. Record approved exceptions in `pom.config.json` through roots, recommended paths, namespace conventions, or project notes.

## Output

- mapping from existing structure to POM;
- highlighted conflicts/ambiguities;
- approved minimal changes;
- configured analysis/task/test namespace guidance;
- lint run if available.
