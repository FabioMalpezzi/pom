---
name: adopt
description: Use this skill to introduce POM into an existing project without breaking its current structure — mapping existing folders, docs, tests, and decisions before proposing any changes.
---

# Skill - adopt

## When To Use

- Existing project.
- Need to introduce POM without breaking local conventions.
- Existing docs, source, tests, wiki, analysis, task plans, or decision structures.
- Cloned repository owned by someone else, where POM should be local understanding memory rather than project governance.

## Canonical Prompt

`prompts/02-adopt-existing-project.md`

## Quick Start

If the project has Node.js available, the installer handles the mapping automatically:

```bash
node bootstrap-pom.mjs --profile adopt
# or, if pom/ is already installed:
npm run pom:init
```

Use this skill when you need guided adoption, want to review the mapping before applying it, or the project does not use npm.

If ownership is unclear, ask before configuring POM:

```text
What is your relationship to this repository: owned, team, or external_overlay?
```

For `external_overlay`, read `pom/specs/SPEC-0004-external-project-overlay.md` and keep POM local to the operator's understanding of the project.

## Key Rules

- Detect the real structure first.
- Map existing structures in `pom.config.json` before proposing migrations.
- Ask whether to adapt to the existing structure or use/adapt POM.
- Do not move files without approval.
- Configure `pom.config.json` according to approved choices.
- In `external_overlay`, do not govern upstream `docs/`, `tests/`, ADRs, source layout, release process, or PR contents.
- In `external_overlay`, keep overlay work on its own branch or worktree and transfer only selected non-POM changes to any contribution branch.

## Config

Read `pom.config.json` if it exists. The mapping to POM must respect or explicitly update `decisions`, `documentation`, `source`, `tests`, `taskPlans`, `wiki`, `analysis`, `mockups`, and `handoff`.

Also read `ownership.mode` when present:

- `owned`: POM can propose project governance when useful.
- `team`: preserve existing conventions unless the user explicitly approves a change.
- `external_overlay`: POM governs local understanding only; preserve upstream structures and keep overlay artifacts out of upstream contributions.

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
