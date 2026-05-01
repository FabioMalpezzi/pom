# Skill - config

## When To Use

- Create or update `pom.config.json`.
- Adapt lint to a new or existing project.
- Reconcile docs/source/tests/wiki with local preferences.

## Canonical Prompt

`pom/prompts/08-create-pom-config.md`

## Main Template

`pom/templates/POM_CONFIG_TEMPLATE.json`

## Config

This skill creates or updates `pom.config.json`. If the file exists, preserve local choices and propose only motivated changes.

The config includes `skillUsage` and `promptUsage` sections that are updated automatically by the agent when skills or prompts are read. Do not reset these counters unless explicitly requested.

## Output

- `pom.config.json` consistent with the project;
- base POM rules separated from project-specific rules;
- lint run and result;
- tests/docs/source choices explained.
