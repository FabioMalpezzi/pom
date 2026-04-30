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

## Output

- `pom.config.json` consistent with the project;
- base POM rules separated from project-specific rules;
- lint run and result;
- mapped roots and conventions explained for decisions/docs/source/tests/task plans/wiki/analysis/mockups/handoff.
