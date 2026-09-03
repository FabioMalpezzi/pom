---
name: seed
description: Use when setting up POM from scratch in a new or empty project.
---

# Skill - seed

## When To Use

- New project.
- Empty or newly created repository.
- Request to set up POM from scratch.

## Canonical Prompt

`prompts/01-bootstrap-new-project.md`

## Quick Start

If the project has Node.js available, the installer handles most of this automatically:

```bash
node bootstrap-pom.mjs --preset minimal
# or, if pom/ is already installed:
npm run pom:init -- --preset minimal
```

Use this skill when you need guided setup, want to review the structure before creating files, or the project does not use npm.

If only the installed POM baseline exists in the project root, treat the project as day zero. `pom/` may be a full POM Source checkout with its own `.git`; that is normal. Create project memory only when the active adoption profile enables it or the first real work needs it.

## Main Templates

- `pom/templates/AGENTS_POM_SECTION_TEMPLATE.md`
- `pom/templates/POM_CONFIG_TEMPLATE.json`
- `pom/templates/WIKI_INDEX_TEMPLATE.md`
- `pom/templates/WIKI_LOG_TEMPLATE.md`
- `pom/templates/PROJECT_STATE_TEMPLATE.md`
- `pom/templates/PROJECT_RULES_TEMPLATE.md`

## Config

Create or adapt `pom.config.json` according to project preferences. Do not apply POM docs/source/tests conventions without reflecting them in config.

For new projects, use the template namespace convention unless the user chooses another structure:

```text
analysis/<analysis-or-workstream>/<analysis>.md
tasks/<analysis-or-workstream>/P<priority-or-phase>/<task>.md
tests/<analysis-or-workstream-or-module>/{e2e,integration,fixtures,evidence}
```

If a module is disabled in `adoption`, do not create that folder. If a module is optional, create it only when the current work needs it or the user approves it.

## Project Rules

The installer seeds `PROJECT_RULES.md` at the project root and injects it into the generated POM section. Ask the user for the conventions, non-functional requirements, and prohibitions an agent cannot derive from the code, write them there, and rerun the refresh. Leave the file untouched rather than filling it with a repository overview: only project-specific instructions belong in the always-loaded block.

## Output

- approved minimal structure;
- agent rules;
- `PROJECT_RULES.md` declared with the user, or explicitly left empty;
- optional `pom.config.json` with analysis/task/test namespace guidance;
- wiki index/log when enabled;
- lint/tests run when available.
