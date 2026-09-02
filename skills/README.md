---
name: pom-skill-catalog
description: Catalog of POM workflows and their canonical prompts. Use as an internal routing reference, not as an invokable workflow.
disable-model-invocation: true
---

# POM Skills

POM skills are short operational cards derived from prompts in `prompts/`. They give the main workflows short names and point to the canonical prompt and relevant templates; they do not replace prompts.

Each card carries a YAML frontmatter block with `name` and `description`. The POM Source is a skill-only Pi package (`pi.skills` in `package.json` registers this folder), and other harnesses with skill discovery read the same fields. In every harness the description is only a trigger: read the card and its linked prompt before acting.

`using-pom` is the bootstrap/router skill. It routes from this catalog. Harness integration (session-start contract, instruction targets, tool mapping, smoke prompts) lives in `prompts/references/agent-harnesses.md`.

## Configuration

The rule "read `pom.config.json` before applying POM conventions or touching governed artifacts" is stated once, in the installed POM section (`templates/agents/00-core.md`, Adoption Profile). This catalog only adds what routing needs from the config:

- `ownership.mode` decides posture: `owned` (POM may become project governance), `team` (preserve existing conventions unless the user approves changes), `external_overlay` (local understanding memory only; never govern upstream docs, tests, source layout, release process, or PR contents). If it is missing or `unknown`, clarify it before making structural assumptions.
- Roots, patterns, taxonomies, template overrides, severities, and handoff rules live in the config; the `config` skill and `prompts/08-create-pom-config.md` document the fields. For existing projects, map current folders in config first; migration is a later explicit decision.
- If a skill proposes a convention that differs from `pom.config.json`, ask for confirmation before proceeding and update the config if approved.

For new POM-owned analysis/task/test material, the portable default is:

```text
analysis/<analysis-or-workstream>/<analysis>.md
tasks/<analysis-or-workstream>/P<priority-or-phase>/<task>.md
tests/<analysis-or-workstream-or-module>/{e2e,integration,fixtures,evidence}
```

## Available Skills

The `Use` column is the routing signal: match the request against it, then read the card and its prompt. This is the only complete routing table; the installed POM section and `prompts/32-using-pom.md` carry the key routes only.

| Skill | Use | Prompt |
|---|---|---|
| `using-pom` | bootstrap a POM-aware session and route to the right skill | `prompts/32-using-pom.md` |
| `clarify` | clarify ambiguous work before creating memory or changing method | `prompts/20-clarify-pom-work.md` |
| `seed` | start POM on a new project | `prompts/01-bootstrap-new-project.md` |
| `adopt` | adopt POM in an existing project | `prompts/02-adopt-existing-project.md` |
| `pulse` | create or update `PROJECT_STATE.md`; resume after a pause, a restart-context change, or a changed current state | `prompts/03-create-project-state.md` |
| `plan` | turn specs/ADRs into verifiable tasks | `prompts/05-create-task-plan-from-spec.md` |
| `check` | verify that completed work is really done: goal achieved, tests, lint, consistency, risks | `prompts/06-review-task-phase.md` |
| `handoff` | close a session by updating memory and status | `prompts/07-update-project-after-work.md` |
| `reader-notes` | process human Project Reader notes through source-backed edits and outcome recording | `prompts/26-process-reader-notes.md` |
| `diagnose` | debug failing or confusing POM workflows with a focused feedback loop | `prompts/22-diagnose-pom-problem.md` |
| `root-cause` | investigate Target Project bugs, test failures, build failures, and unexpected behavior before fixes | `prompts/34-root-cause-debugging.md` |
| `mcp-interface` | design, audit, reshape, or verify MCP interfaces for agent ergonomics | `prompts/35-mcp-interface.md` |
| `zero-tech-debt` | reshape a scoped change around the intended product and architecture end state | `prompts/23-zero-tech-debt.md` |
| `challenge` | run adversarial thesis/antithesis review before accepting or completing non-code work | `prompts/24-challenge-antithesis.md` |
| `config` | create or update `pom.config.json`; set or revise governance, lint, decision records, mock manifests, and agent rules beyond the installer | `prompts/08-create-pom-config.md`, `prompts/04-create-doc-governance.md` |
| `spike` | manage temporary experiments and their promotion decision (`adopt`, `refine`, or `reject`), including the Git branch/worktree choice for risky or exploratory work | `prompts/09-run-temporary-experiment.md` |
| `wiki` | build, query, check, or maintain the wiki | `prompts/10-build-wiki.md`, `prompts/11-review-stale-wiki.md`, `prompts/13-query-wiki.md`, `prompts/14-lint-wiki.md` |
| `method` | change POM itself in `extend`, `improve`, or `prune` mode; start in `prune` when the change may add method weight | `prompts/12-extend-pom.md`, `prompts/25-self-improvement-loop.md`, `prompts/21-prune-pom-method.md` |
| `status` | classify document type and choose the least misleading status | `prompts/15-classify-document-status.md` |
| `defer` | park important work without implementing it | `prompts/16-defer-work.md` |
| `sync` | refresh an existing POM installation or align source POM changes with a target project's `pom/`; also for a dirty `pom/`, a submodule update, or a vendored copy | `prompts/17-sync-pom-framework.md` |
| `finish-branch` | finish branch, PR, merge, keep, discard, or cleanup decisions | `prompts/33-finish-branch.md` |
| `release` | close a numbered version: changelog, version references, checksums, tag, memory updates | `prompts/36-release.md` |
| `migrate` | move an adopted project's folders toward canonical roots with approval and lint before and after | `prompts/37-migrate-structure.md` |
| `tandem` | coordinate two coding agents on multi-turn work as controller and executor (`setup`, `run`, `close`), with a fixed verdict contract, a per-task cycle cap, and escalation to the user | `prompts/38-tandem.md` |
| `reconcile` | classify and resolve a divergence between a source and project memory | `prompts/19-reconcile-memory.md` |
| `validate` | audit governed memory read-only after significant actions: project state, wiki, task status, decisions, orphans | `prompts/18-post-action-validator.md` |
| `workflow` | design, validate, diagram, scenarios, and implement domain workflows declared as YAML state models | `prompts/27-workflow-modeling.md` |
| `loop-goal` | define-criteria, audit, criteria-scenarios, conclude for opt-in agent loop/goal experiments in Target Projects; the contract is the `## Criteria` section of `EXPERIMENT.md`, modeling and implementation guidance go through `workflow`; when to use vs `workflow` -> `ADR-0003` | `prompts/28-loop-goal-define-criteria.md`, `prompts/29-loop-goal-audit.md`, `prompts/30-loop-goal-scenarios.md`, `prompts/31-loop-goal-conclude.md` |

## Renamed Or Merged Skills

Since 0.3.0: `guard` is part of `config` (governance setup beyond the installer); `help` is gone, because `using-pom` routes from this catalog; `extend`, `improve`, and `prune` are the three modes of `method`. Requests that name the old skills route to these.

## Rule

"What POM skill should I use?" is answered from the table above by `using-pom`; there is no separate skill for it.

When a request matches a skill, the agent must read the skill card and then the linked canonical prompt.

The agent should also state the selected skill and reason in the conversation, for example:

```text
Using `pom/skills/defer.md` because this work is being preserved without implementation.
```

If no skill fits the case, adapt the closest prompt only after checking README, AGENTS, `PROJECT_STATE.md`, and `pom.config.json`.
