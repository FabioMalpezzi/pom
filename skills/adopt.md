# Skill - adopt

## When To Use

- Existing project.
- Need to introduce POM without breaking local conventions.
- Existing docs, source, tests, wiki, or decision structures.

## Canonical Prompt

`prompts/02-adopt-existing-project.md`

## Key Rules

- Detect the real structure first.
- Map existing structures in `pom.config.json` before proposing migrations.
- Ask whether to adapt to the existing structure or use/adapt POM.
- Do not move files without approval.
- Configure `pom.config.json` according to approved choices.

## Config

Read `pom.config.json` if it exists. The mapping to POM must respect or explicitly update `decisions`, `documentation`, `source`, `tests`, `wiki`, `analysis`, `mockups`, and `handoff`.

## Output

- mapping from existing structure to POM;
- highlighted conflicts/ambiguities;
- approved minimal changes;
- lint run if available.
