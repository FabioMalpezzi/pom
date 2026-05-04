---
name: guard
description: Use this skill to set up or update documentation governance — including lint configuration, decision records, mock manifests, and agent operating rules.
---

# Skill - guard

## When To Use

- Documentation governance must be set up.
- Lint, decisions, mock manifests, or agent rules must be configured.
- The project operating method changes.

## Canonical Prompt

`prompts/04-create-doc-governance.md`

## Quick Start

The installer sets up the pre-commit hook and package scripts automatically:

```bash
npm run pom:init
```

Use this skill when governance rules, lint configuration, or agent operating rules need to be reviewed or changed beyond what the installer covers.

## Main Templates

- `pom/templates/AGENTS_POM_SECTION_TEMPLATE.md`
- `pom/templates/POM_CONFIG_TEMPLATE.json`
- `pom/templates/ADR_TEMPLATE.md`
- `pom/templates/MOCK_MANIFEST_TEMPLATE.md`

## Config

Governance and lint must be consistent with `pom.config.json`. If a project rule changes, update the config before or together with the rule. For existing projects, encode approved mappings to current structures before proposing folder migrations.

## Output

- documented governance;
- lint/config when approved;
- updated agent rules;
- hook documented only after successful lint.
