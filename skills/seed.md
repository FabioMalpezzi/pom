---
name: seed
description: Use this skill to set up POM from scratch on a new or empty project — creating the minimal structure, agent rules, and optional wiki and config.
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
node bootstrap-pom.mjs --profile minimal
# or, if pom/ is already installed:
npm run pom:init
```

Use this skill when you need guided setup, want to review the structure before creating files, or the project does not use npm.

## Main Templates

- `pom/templates/AGENTS_POM_SECTION_TEMPLATE.md`
- `pom/templates/POM_CONFIG_TEMPLATE.json`
- `pom/templates/WIKI_INDEX_TEMPLATE.md`
- `pom/templates/WIKI_LOG_TEMPLATE.md`
- `pom/templates/PROJECT_STATE_TEMPLATE.md`

## Config

Create or adapt `pom.config.json` according to project preferences. Do not apply POM docs/source/tests conventions without reflecting them in config.

For new projects, use the template namespace convention unless the user chooses another structure:

```text
analysis/<analysis-or-workstream>/<analysis>.md
tasks/<analysis-or-workstream>/P<priority-or-phase>/<task>.md
tests/<analysis-or-workstream-or-module>/{e2e,integration,fixtures,evidence}
```

If a module is disabled in `adoption`, do not create that folder. If a module is optional, create it only when the current work needs it or the user approves it.

## Output

- approved minimal structure;
- agent rules;
- optional `pom.config.json` with analysis/task/test namespace guidance;
- wiki index/log when enabled;
- lint/tests run when available.
