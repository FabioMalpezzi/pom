# POM Skills

POM skills are short operational cards derived from prompts in `prompts/`.

Purpose:

- make the main workflows recognizable with short names;
- help the agent choose the correct prompt;
- prepare for a future conversion into runtime skills without losing project transparency.

Skills do not replace prompts. Each skill points to the canonical prompt and relevant templates.

## Configuration

Before applying a skill, read `pom.config.json` when present.

The config defines project-specific conventions, including:

- decisions/ADR roots and patterns (`decisions`);
- documentation roots (`documentation`);
- source roots (`source`);
- analysis roots, recommended paths, and namespace conventions (`analysis`);
- task-plan roots, patterns, recommended paths, and namespace conventions (`taskPlans`);
- test structure, recommended paths, and namespace conventions (`tests`);
- wiki taxonomies;
- mockup package roots and reconciliation search;
- warning severity;
- handoff rules for `PROJECT_STATE.md`.

For existing projects, prefer mapping current folders and file patterns in config before proposing a migration to POM's canonical examples.

If a skill proposes a convention that differs from `pom.config.json`, ask for confirmation before proceeding and update the config if approved.

For new POM-owned analysis/task/test material, the portable default is:

```text
analysis/<analysis-or-workstream>/<analysis>.md
tasks/<analysis-or-workstream>/P<priority-or-phase>/<task>.md
tests/<analysis-or-workstream-or-module>/{e2e,integration,fixtures,evidence}
```

Existing project structures should be mapped first, not moved by default.

## Available Skills

| Skill | Use | Prompt |
|---|---|---|
| `help` | choose and explain POM skills | `skills/README.md` |
| `seed` | start POM on a new project | `prompts/01-bootstrap-new-project.md` |
| `adopt` | adopt POM in an existing project | `prompts/02-adopt-existing-project.md` |
| `pulse` | create or update `PROJECT_STATE.md` | `prompts/03-create-project-state.md` |
| `guard` | set governance, lint, and decisions | `prompts/04-create-doc-governance.md` |
| `plan` | turn specs/ADRs into verifiable tasks | `prompts/05-create-task-plan-from-spec.md` |
| `check` | verify a phase, workstream, or task | `prompts/06-review-task-phase.md` |
| `handoff` | close a session by updating memory and status | `prompts/07-update-project-after-work.md` |
| `config` | create or update `pom.config.json` | `pom/prompts/08-create-pom-config.md` |
| `spike` | manage temporary experiments and consolidation | `prompts/09-run-temporary-experiment.md` |
| `wiki` | build, query, check, or maintain the wiki | `prompts/10-build-wiki.md`, `prompts/11-review-stale-wiki.md`, `prompts/13-query-wiki.md`, `prompts/14-lint-wiki.md` |
| `extend` | extend POM with config, templates, prompts, skills, or lint | `prompts/12-extend-pom.md` |

## Rule

When a request matches a skill, the agent must read the skill card and then the linked canonical prompt.

If no skill fits the case, adapt the closest prompt only after checking README, AGENTS, `PROJECT_STATE.md`, and `pom.config.json`.
