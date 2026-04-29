# Skill - seed

## When To Use

- New project.
- Empty or newly created repository.
- Request to set up POM from scratch.

## Canonical Prompt

`prompts/01-bootstrap-new-project.md`

## Main Templates

- `pom/templates/AGENTS_POM_SECTION_TEMPLATE.md`
- `pom/templates/POM_CONFIG_TEMPLATE.json`
- `pom/templates/WIKI_INDEX_TEMPLATE.md`
- `pom/templates/WIKI_LOG_TEMPLATE.md`
- `pom/templates/PROJECT_STATE_TEMPLATE.md`

## Config

Create or adapt `pom.config.json` according to project preferences. Do not apply POM docs/source/tests conventions without reflecting them in config.

## Output

- approved minimal structure;
- agent rules;
- optional `pom.config.json`;
- wiki index/log when enabled;
- lint/tests run when available.
