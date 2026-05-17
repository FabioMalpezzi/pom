# POM Skills

POM skills are short operational cards derived from prompts in `prompts/`.

Purpose:

- make the main workflows recognizable with short names;
- help the agent choose the correct prompt;
- prepare for a future conversion into runtime skills without losing project transparency.

Skills do not replace prompts. Each skill points to the canonical prompt and relevant templates.

Each skill file includes a YAML frontmatter block with `name` and `description` fields. Agents that support skill discovery can use this to invoke skills automatically when the user's request matches the description. Agents that do not support frontmatter continue to read the `## When To Use` section as before.

## Configuration

Before applying a skill, read `pom.config.json` when present.

The config defines project-specific conventions, including:

- repository ownership and operating posture (`ownership`);
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

If `ownership.mode` is missing or `unknown`, clarify it before making structural assumptions:

- `owned`: POM may become part of project governance.
- `team`: POM should preserve existing conventions unless the user approves changes.
- `external_overlay`: POM is local understanding memory only and must not govern upstream docs, tests, source layout, release process, or PR contents.

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
| `clarify` | clarify ambiguous work before creating memory or changing method | `prompts/20-clarify-pom-work.md` |
| `seed` | start POM on a new project | `prompts/01-bootstrap-new-project.md` |
| `adopt` | adopt POM in an existing project | `prompts/02-adopt-existing-project.md` |
| `pulse` | create or update `PROJECT_STATE.md` | `prompts/03-create-project-state.md` |
| `guard` | set governance, lint, and decisions | `prompts/04-create-doc-governance.md` |
| `plan` | turn specs/ADRs into verifiable tasks | `prompts/05-create-task-plan-from-spec.md` |
| `check` | verify a phase, workstream, or task | `prompts/06-review-task-phase.md` |
| `handoff` | close a session by updating memory and status | `prompts/07-update-project-after-work.md` |
| `diagnose` | debug failing or confusing POM workflows with a focused feedback loop | `prompts/22-diagnose-pom-problem.md` |
| `zero-tech-debt` | reshape a scoped change around the intended product and architecture end state | `prompts/23-zero-tech-debt.md` |
| `config` | create or update `pom.config.json` | `prompts/08-create-pom-config.md` |
| `spike` | manage temporary experiments and consolidation | `prompts/09-run-temporary-experiment.md` |
| `wiki` | build, query, check, or maintain the wiki | `prompts/10-build-wiki.md`, `prompts/11-review-stale-wiki.md`, `prompts/13-query-wiki.md`, `prompts/14-lint-wiki.md` |
| `extend` | extend POM with config, templates, prompts, skills, or lint | `prompts/12-extend-pom.md` |
| `prune` | simplify, merge, demote, delete, or config-gate POM method bloat | `prompts/21-prune-pom-method.md` |
| `status` | classify document type and choose the least misleading status | `prompts/15-classify-document-status.md` |
| `defer` | park important work without implementing it | `prompts/16-defer-work.md` |
| `sync` | refresh an existing POM installation or align source POM changes with a target project's `pom/` | `prompts/17-sync-pom-framework.md` |
| `reconcile` | classify and resolve a divergence between a source and project memory | `prompts/19-reconcile-memory.md` |
| `validate` | audit POM governance after significant actions | `prompts/18-post-action-validator.md` |

## Rule

When a request matches a skill, the agent must read the skill card and then the linked canonical prompt.

The agent should also state the selected skill and reason in the conversation, for example:

```text
Using `pom/skills/defer.md` because this work is being preserved without implementation.
```

If no skill fits the case, adapt the closest prompt only after checking README, AGENTS, `PROJECT_STATE.md`, and `pom.config.json`.
