# Project Operating Memory

This project uses **POM - Project Operating Memory** to keep current knowledge, decisions, tasks, mockups, code, and documentation aligned.

## Origin

POM's wiki model is inspired by Andrej Karpathy's **LLM Wiki** pattern:

```text
https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
```

The pattern is used as a conceptual reference. Operating rules, templates, and local adaptations are part of the project's POM method.

If available, read `pom/WIKI_METHOD.md` as the LLM Wiki reference copy and keep only project-specific rules in the target project's agent instruction files.

## Language Policy

POM is documented in English for portability. When applying POM to this project, use the project/user language for conversation and generated artifacts unless the user asks otherwise.

## Principle

There is no single source of truth for everything. Each domain has its own authoritative source:

| Question | Authoritative Source |
|---|---|
| What does the system currently do? | code and tests, when present |
| What do we currently know about the project? | `wiki/` |
| Why did we decide this? | `decisions/` |
| What analysis supports or challenges a choice? | `analysis/` |
| What does the intended experience show? | `mockups/`, when present |
| What can be shared as official documentation? | `docs/`, when present |
| Where do I restart after a pause? | `PROJECT_STATE.md` or current plan |

If sources diverge, do not hide the divergence: surface it, analyze it, and propose a decision or reconciliation.

## Git And History

POM requires Git for history, rollback, and comparison between versions.

Rules:

- check `git status` before structural changes or experiments;
- if the project is not under Git, propose `git init` before applying POM structurally;
- leave fine-grained history of specs, ADRs, wiki pages, and code to Git;
- do not add manual changelogs to specs/ADRs unless explicitly requested;
- after structural changes, run available lint/tests and create a descriptive commit if required by the workflow.

## Branching Policy

Specs, task plans, ADRs, wiki pages, and other documentation can be committed
directly to the main branch. They are governed documents, not executable code,
and do not risk breaking the build.

Create a feature branch (`feat/<topic>`) only when the first task plan step
modifies executable code, configuration, prompts consumed at runtime, or test
fixtures. The branch isolates changes that could break the build or alter
runtime behavior.

Summary:

| Artifact | Branch needed? |
|---|---|
| Spec, task plan, ADR, wiki page, analysis | No — commit on main |
| Source code, runtime config, prompts, test fixtures | Yes — feature branch |
| Experiment or spike | Yes — `exp/<topic>` or temporary branch |

## ADR And Specs

Specs are living documents: edit them directly and let Git keep fine-grained history.

ADRs represent decisions. If a decision changes substantially, create a new ADR that replaces or supersedes the previous one. Do not retroactively rewrite an approved decision except for minor corrections.

## Temporary Experiments

For experiments, research, spikes, external repository trials, or immature analysis, use `pom/prompts/09-run-temporary-experiment.md`.

Rules:

- prefer branch `exp/<topic>`, `/tmp`, or `experiments/<topic>/` depending on the case;
- do not contaminate stable codebase, wiki, specs, or docs before evaluation;
- do not import heavy artifacts or external repositories without approval;
- at the end, propose consolidation: discard, synthesis in `analysis/`, wiki/spec update, new ADR, or task plan.

## Persistent Wiki

The wiki is persistent and cumulative memory, not a temporary research output.

Rules:

- keep the wiki as the current synthesis of the project;
- keep decision rationale history in `decisions/`;
- update `wiki/index.md` when wiki pages are added or changed;
- update `wiki/log.md` when the wiki changes materially;
- create new wiki pages when an answer, analysis, or synthesis becomes reusable knowledge;
- check missing links, contradictions, stale claims, and orphan pages.

For wiki creation or maintenance, use `pom/skills/wiki.md`:

- `build`: initial wiki creation;
- `stale`: changed file -> wiki pages that cite it -> stale candidates;
- `query`: answer from wiki pages and optionally archive useful answers;
- `lint`: lightweight wiki health report.

## Operating Cycle

```text
Inputs / Code / Mockups / Analysis / Conversation
        -> Wiki
        -> Decisions
        -> Delivery Plan
        -> Docs
        -> Project State
```

## Restart Context (PROJECT_STATE.md)

`PROJECT_STATE.md` is the minimum restart memory for the user and the next AI agent. Its purpose is to answer "from where do I pick up?", not to record that a session has ended. Update it when the restart context has actually changed.

It must include:

- current state;
- latest relevant decisions or commits;
- recommended next actions;
- open decisions;
- risks or blockers;
- files to read when resuming;
- what not to do without new approval.

Most commits do not need a `PROJECT_STATE.md` update. Update it when method, governance, priorities, lint, task plans, wiki, or decisions changed in a way that the next session would otherwise see incorrectly. Tiny edits with no restart impact do not need it.

## POM Commands

If the target project has `package.json`, use these commands when available:

```text
npm run pom:init   # install or refresh the POM section and package scripts
npm run pom:help   # show POM commands and skills index (non-interactive, always exits)
npm run pom:lint   # run POM documentation governance checks
```

`pom:init` must update only the delimited POM section in every existing supported target agent instruction file or rule folder. If none exists, it creates `AGENTS.md`. It must not copy `pom/AGENTS.MD` into the target project.

`pom:help` prints the command reference and skill index. It is non-interactive and always exits immediately — safe to call from agents and scripts.

`pom:lint` is project-specific and optional. If it is not configured, state that automatic POM checks are not active.

## Adoption Profile

Read `pom.config.json` before applying POM conventions. If it contains an `adoption` section, respect it:

- `profile`: `minimal`, `wiki`, `decisions`, `full`, `adopt`, `refresh`, or `custom`;
- `wiki`: `enabled` or `disabled`;
- `decisions`: `enabled` or `disabled`;
- `analysis`: `enabled`, `optional`, or `disabled`;
- `docs`: `enabled`, `optional`, or `disabled`;
- `mockups`: `enabled` or `disabled`;
- `planning`: `light` or `structured`;
- `tasks`: `light` or `structured`;
- `tests`: `disabled`, `existing`, or `pom`.

Semantics:

- `disabled` means POM must not create or require that module;
- if a disabled module's folder already exists, lint may still check it to prevent silent decay;
- `optional` means ask before creating the module unless immediate project work clearly requires it;
- `enabled` means the module is part of the active project method and should be maintained.

## POM Lint Workflow

When POM is installed and `package.json` exposes `pom:lint`, run:

```bash
npm run pom:lint
```

Run it:

- after changes to `wiki/`, `decisions/`, `docs/`, `analysis/`, `mockups/`, `PROJECT_STATE.md`, `pom.config.json`, or POM templates;
- before committing documentation/governance changes;
- after applying fixes suggested by a previous POM lint run.

If the command is missing, state that automatic POM checks are not configured and use the relevant POM skill/prompt manually.

## Pre-commit Hook

If `pom:init` installed the POM pre-commit hook, commits run `npm run pom:lint`.

If `PROJECT_STATE.md` exists and governed project-memory files are staged, the hook prints a non-blocking reminder. The reminder is informational: most commits do not need a `PROJECT_STATE.md` update, and the hook never updates `PROJECT_STATE.md` automatically.

Update `PROJECT_STATE.md` only when one of these applies:

- an ADR changes substantially;
- a spec changes substantially;
- roadmap, priority, dependency, or current plan changes;
- an important task or phase is closed;
- a relevant risk, blocker, or open decision is introduced;
- the user explicitly asks for a handoff or restart-status update.

Typos, regenerated indexes, link-only fixes, or changes that do not affect how the next session should restart do not need it.

## Templates

Before creating governed documents, read and use the relevant template in `pom/templates/`.

If the project has customized or localized templates configured in `pom.config.json.templates`, use those project templates instead of the defaults in `pom/templates/`.

Do not customize files directly under `pom/` for project-specific needs. POM updates may overwrite them or create Git conflicts. Put project-owned templates outside `pom/`, for example in `project-templates/` or `templates/`, and map them in `pom.config.json.templates`.

## Suggested Document Statuses

| Status | Meaning | Use when |
|---|---|---|
| Waiting | Waiting for something or someone | Blocked by external input |
| Blocked | Cannot proceed because of a concrete impediment | Missing dependency or error |
| Deferred | Deliberately postponed | Decided to do it later |
| Planned | Expected but not started yet | In the active plan |
| Backlog | Future candidate, not yet planned | Parked idea or need |
| Draft | Still being written or reviewed | Spec or task not consolidated |
| Accepted | Approved decision | ADR, not an operational task |

| Document | Template |
|---|---|
| AGENTS / agent instructions section | `pom/templates/AGENTS_POM_SECTION_TEMPLATE.md` |
| wiki page | `pom/templates/WIKI_PAGE_TEMPLATE.md` |
| wiki index | `pom/templates/WIKI_INDEX_TEMPLATE.md` |
| wiki log | `pom/templates/WIKI_LOG_TEMPLATE.md` |
| decision | `pom/templates/ADR_TEMPLATE.md` |
| task plan | `pom/templates/TASK_PLAN_TEMPLATE.md` |
| current plan / short roadmap | `pom/templates/CURRENT_PLAN_TEMPLATE.md` |
| spec | `pom/templates/SPEC_TEMPLATE.md` |
| versioned experiment | `pom/templates/EXPERIMENT_TEMPLATE.md` |
| official documentation | `pom/templates/DOC_TEMPLATE.md` |
| mock manifest | `pom/templates/MOCK_MANIFEST_TEMPLATE.md` |
| reconciliation | `pom/templates/RECONCILIATION_TEMPLATE.md` |
| project state | `pom/templates/PROJECT_STATE_TEMPLATE.md` |

If a template does not fit the concrete case, propose a template update first. Do not silently invent a parallel structure.

## POM Skills

If `pom/skills/` exists, use it as the operating index for POM workflows. Each skill points to a canonical prompt in `pom/prompts/` and relevant templates.

Rules:

- read the skill card first when the request matches a skill;
- explicitly state which POM skill is being used and why, so the workflow is visible in the conversation;
- read `pom.config.json` before applying conventions for docs, source, tests, wiki, analysis, or handoff;
- then read the linked canonical prompt;
- do not treat a skill as a replacement for prompts or templates;
- if no suitable skill exists, use POM prompts directly and propose a new skill only if the workflow becomes recurring.

Common entry points:

| Need | Skill |
|---|---|
| Query, build, or maintain wiki memory | `pom/skills/wiki.md` |
| Classify or set document status | `pom/skills/status.md` |
| Defer or park future work | `pom/skills/defer.md` |
| Sync POM framework changes into this project | `pom/skills/sync.md` |
| Validate governance after significant work | `pom/skills/validate.md` |

### Skill Usage Tracking

When you read a skill card, update `pom.config.json` under `skillUsage`:

- if the skill entry does not exist, create it with `count: 1` and `lastUsed` set to the current ISO timestamp;
- if the skill entry exists, increment `count` by 1 and update `lastUsed`.

Example:

```json
{
  "skillUsage": {
    "wiki": { "count": 3, "lastUsed": "2026-05-01T18:30:00Z" },
    "plan": { "count": 1, "lastUsed": "2026-05-01T14:00:00Z" }
  }
}
```

The key is the skill filename without extension (e.g., `wiki` for `pom/skills/wiki.md`).

### Prompt Usage Tracking

When you read a canonical prompt from `pom/prompts/`, update `pom.config.json` under `promptUsage` with the same structure:

- if the prompt entry does not exist, create it with `count: 1` and `lastUsed`;
- if the prompt entry exists, increment `count` by 1 and update `lastUsed`.

The key is the prompt filename without extension (e.g., `09-run-temporary-experiment` for `pom/prompts/09-run-temporary-experiment.md`).

## Planning

Use this logical hierarchy for planned work (it organizes work, not folders):

```text
Roadmap
  -> Phase          (closes with acceptance review)
    -> Workstream   (closes with cross-functional E2E / user-flow tests)
      -> Task       (closes with integration tests / single-feature E2E)
        -> Step     (closes with atomic verification: unit test, lint, check)
```

Verification happens at every level, not only at the bottom. Place E2E and user-flow tests at Task or Workstream level, not at Step level.

Every spec or decision that generates work must produce verifiable tasks. Every phase must close with concrete verification: user or technical tests for code, lint and critical analysis for documents.

## Completion Verification Rules

A spec, task, or ADR cannot be marked Complete without passing the completion verification gate. This gate is **mandatory and automatic**: when the agent marks work as Complete, it MUST execute the verification before closing. The agent does not ask whether to verify — it verifies.

### Verification procedure

1. **Goal-backward check (first):** before checking tests or theses, verify that the goal declared in the spec/task/ADR has been actually achieved. Ask: "What must be TRUE for this goal to be met?" then verify each truth against the actual artifacts. If the goal is not met, the work cannot be Complete regardless of checkbox status.

2. **Applicable verification gate (second):**

   **Technical work (specs/tasks with code):**
   - at least 2 positive scenario tests validating use cases the spec generates or is involved in;
   - at least 1 error/misuse scenario test (more is better) validating cases of incorrect or improper usage;
   - tests must run and pass before closing as Complete.

   **Non-technical work (specs/ADRs without code):**
   - at least 1 thesis: an argument or evidence that proves the spec/ADR is valid, based on use cases it generates or is involved in;
   - at least 1 antithesis: a case of incorrect or improper usage that is demonstrated to be false or inferior to the thesis (more is better);
   - the work cannot be marked Complete if any antithesis is not confuted.

3. **Governance check (third):** run `pom/skills/validate.md` to verify PROJECT_STATE, wiki, task status, decisions, and orphan artifacts.

### Who verifies

When the environment supports it (Claude Code sub-agents, Kiro hooks, multi-agent setups), the completion verification SHOULD be performed by a separate agent or a fresh context — not by the same agent that did the work. This avoids confirmation bias.

When a separate agent is not available, the working agent performs the verification but MUST re-read the relevant files from disk instead of relying on session memory.

### Exception handling

If verification is not possible, document the reason explicitly and close as "Complete with exceptions". Lint reports this as a warning. Silent omission of verification is not allowed.

Task-plan and analysis locations are configurable. When `pom.config.json.taskPlans.root` is `tasks`, the suggested task structure is `tasks/<analysis-or-workstream>/P<priority-or-phase>/<task>.md`. For new synthesis, prefer `analysis/<analysis-or-workstream>/<analysis>.md`. Use the same analysis/workstream namespace for related analysis, tasks, tests, fixtures, and evidence where practical. If another project stores task plans or analysis elsewhere, map those paths in `pom.config.json` instead of moving files by default.

## Test Convention

POM proposes this optional structure:

```text
tests/
  <analysis-or-workstream-or-module>/
    e2e/
    integration/
    fixtures/
    evidence/
  cross-system/
```

When tests or evidence validate a specific analysis/workstream, prefer the same namespace used by analysis and task plans, for example `analysis/governance-core/...`, `tasks/governance-core/P0/...`, and `tests/governance-core/...`.

Use it for E2E tests, integration tests, fixtures, and evidence when the project does not already have an established test convention. Unit tests may remain next to code if the framework expects that.

If an existing test structure differs, the agent must ask whether to adapt to the existing structure or introduce/adapt the POM proposal. Do not move existing tests without approval.

## Docs And Source Conventions

POM proposes `docs/` for official documentation and `src/` as the minimal source root for new projects, but it must not impose them on existing projects.

If the project already uses `doc/`, `docs/`, `apps/`, `packages/`, `services/`, `frontend/`, `backend/`, or other structures, ask whether to adapt to the existing structure or introduce/adapt the POM proposal. Do not move documents or source files without approval.

For existing projects, this mapping principle applies beyond docs and source: ADRs/decisions, task plans, tests, wiki, analysis, mockups, planning files, and handoff files should be mapped in `pom.config.json` or documented as approved local conventions before any migration is proposed.
