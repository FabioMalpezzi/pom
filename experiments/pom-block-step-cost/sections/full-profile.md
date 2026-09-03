# Project Operating Memory

This project uses **POM - Project Operating Memory** to keep current knowledge, decisions, tasks, mockups, code, and documentation aligned. If available, read `pom/WIKI_METHOD.md` as the LLM Wiki reference and keep only project-specific rules in the target's agent instruction files.

## Language Policy

POM is documented in English for portability. When applying POM to this project, use the project/user language for conversation and generated artifacts unless the user asks otherwise.

## Global Posture

Keep this block for identity, source authority, safety, and always-on operating posture. Rules that apply to only one kind of work live in `pom/skills/` as skill procedures, each pointing to its canonical prompt, templates, and verification.

In a target project, `pom/` is the POM Source (it may contain `.git`, `README.md`, `AGENTS.MD`, `package.json`). The error case is POM Source files (`WIKI_METHOD.md`, `prompts/`, `skills/`, `templates/`, `scripts/install-pom.ts`) at the target root beside project files. A root with only `pom/`, agent instructions, `package.json`, `pom-update.mjs`, `pom.config.json`, and optional agent folders is a day-zero project: read `pom.config.json`, report that project memory has not started, and create no memory folders unless the active profile enables them or current work needs them. Do not scaffold technical implementation for a day-zero project without approval.

## Source Authority

There is no single source of truth. Each question has its best-qualified source: code and tests for current behavior; `wiki/` for current knowledge; the configured decisions root for rationale; `analysis/` for supporting analysis; Open Discussion for unresolved discussion; `mockups/` for intended experience; `docs/` for shareable documentation; `PROJECT_STATE.md` or the current plan for restart context. If sources diverge, surface it and propose reconciliation. Before editing a governed artifact, check whether it is editable, approval-required, generated, or historical; if the right document is unclear, write the smallest approved Open Discussion or analysis note before creating specs, ADRs, folders, or code.

## Project Rules Source

Rules this project needs and no source in it states - local conventions, non-functional requirements such as security and performance, and what must not happen without a decision - are declared in `PROJECT_RULES.md`. POM injects them as the `Project Rules` section at the end of this block, so edit that file: everything between the POM markers is regenerated on every install and update. When the section is absent, the project has not declared any.

## Agent Work Principles

- Before non-trivial edits, state the goal, assumptions, success criteria, and shortest verification loop when not already explicit.
- Keep execution surgical: simple code, no speculative abstractions, goal-critical files only, tools for repeatable transforms, the model for judgment calls.
- Read before adding helpers; surface conflicts instead of blending patterns; fail loudly on skipped records, hidden errors, or uncertainty; compact long work into durable memory.

## Evidence Discipline

- Do not say work is done, verified, safe, clean, or complete unless this turn includes a concrete tool call or current-turn source read that proves it. If the check was not run, say what remains unverified.
- In long, resumed, interrupted, or compacted sessions, re-read the relevant files from disk before summarizing content, behavior, status, or decisions.
- Ground material causal, descriptive, comparative, and structural claims in code, tests, configuration, or documentation read this turn, or label the statement an inference.
- Do not build a narrative from a single clue; when evidence is partial, state the gap.

## Git

POM requires Git for history, rollback, and comparison. Check `git status` before structural changes or experiments; initialize Git before applying POM structurally if absent (the installer does this); do not create a nested repository inside a larger worktree without approval; leave fine-grained history to Git and do not add manual changelogs unless requested. For POM commands, run `npm run pom:help`.

## Adoption Profile

Read `pom.config.json` before applying POM conventions, before creating, moving, or judging governed artifacts, and before editing project sources. This is the one place that states the rule; skills and prompts only point here. If it has an `adoption` section, respect it:

- `disabled` means POM must not create or require that module (for example, do not create `wiki/`, ADRs, or task-plan files for a disabled module even when the request is tempting);
- `optional` means ask before creating the module unless immediate project work clearly requires it;
- `enabled` means the module is part of the active project method and should be maintained.

## Persistent Wiki

The wiki is persistent and cumulative memory, not a temporary research output.

Rules:

- keep the wiki as the current synthesis of the project;
- keep decision rationale history in the configured decisions root (`decisions.root`, default `decisions/`);
- update `wiki/index.md` when wiki pages are added or changed;
- update `wiki/log.md` when the wiki changes materially;
- create new wiki pages when an answer, analysis, or synthesis becomes reusable knowledge;
- check missing links, contradictions, stale claims, and orphan pages;
- on a synthesis page (the overview above all), declare the sources it summarizes in frontmatter (`derivedFrom`) and the date you last re-read them (`verified`); when `pom:lint` reports `wiki-stale-synthesis`, re-read the changed source, update the page where the prose no longer holds, then set `verified` to today. Never bump the date without re-reading;
- do not restate by hand what has an authoritative source: use generated blocks (`<!-- pom:generated decisions -->`, `state`, `pages`) and let `pom:lint` fill them; never edit text between the markers.

For wiki creation or maintenance, use `pom/skills/wiki.md`:

- `build`: initial wiki creation;
- `stale`: changed file -> wiki pages that cite it -> stale candidates;
- `query`: answer from wiki pages and optionally archive useful answers;
- `lint`: lightweight wiki health report.

## ADR And Specs

Specs are living documents: edit them directly and let Git keep fine-grained history.

ADRs represent decisions. If a decision changes substantially, create a new ADR that replaces or supersedes the previous one. Do not retroactively rewrite an approved decision except for minor corrections.

Do not use ADRs for undecided alternatives. Use an Open Discussion or analysis note until the choice is explicit.

## Planning

Use this logical hierarchy only when the project needs structured planning:

```text
Roadmap
  -> Phase          (closes with acceptance review)
    -> Workstream   (closes with cross-functional E2E / user-flow tests)
      -> Task       (closes with integration tests / single-feature E2E)
        -> Step     (closes with atomic verification: unit test, lint, check)
```

Verification happens at every level, not only at the bottom. Place E2E and user-flow tests at Task or Workstream level, not at Step level. Small projects use the short form `Task -> Step`; use `Roadmap` only for multi-phase direction or coordination across several streams.

Every spec or decision that generates work must produce verifiable tasks. For significant steps, run the shortest relevant checkpoint before dependent work continues.

Use `pom/skills/plan.md` to create task plans and `pom/skills/check.md` before closing a phase, task, spec, or decision.

## Completion Verification Rules

A spec, task, or ADR cannot be marked Complete or Accepted without passing the completion verification gate. This is a closure rule, not a general chat rule: apply it when closing governed work.

Use `pom/skills/check.md` for the full procedure. The invariant is:

- start with a goal-backward check;
- for technical work, verify real positive and misuse scenarios and run the checks;
- for non-technical work, prove the thesis and confute the antithesis;
- document explicit exceptions instead of silently skipping verification.

## Test Convention

POM proposes this optional structure when the project has no established test convention:

```text
tests/
  <analysis-or-workstream-or-module>/
    e2e/
    integration/
    fixtures/
    evidence/
  cross-system/
```

When tests or evidence validate a specific analysis/workstream, prefer the same namespace used by analysis and task plans. If an existing test structure differs, map it in `pom.config.json`; do not move tests without approval.

## Restart Context (PROJECT_STATE.md)

`PROJECT_STATE.md` is the minimum restart memory: it answers "from where do I pick up?" for the next person or session.

Use `pom/skills/pulse.md` to create or refresh it. Use `pom/skills/handoff.md` when the user asks to close a session or when the restart context materially changed.

Do not update it just because a session is ending. Update it when the next person resuming would otherwise see a wrong starting picture: a substantial ADR/spec/roadmap change, a closed important task, a new risk or open decision, or an explicit handoff request.

Keep details such as Static Context, Dynamic Context, max line count, and compaction rules in the `pulse` skill and the configured project-state template.

## POM Lint Workflow

When POM is installed and `package.json` exposes `pom:lint`, run:

```bash
npm run pom:lint
```

Run it:

- after changes to governed documents;
- before committing documentation/governance changes;
- after applying fixes suggested by a previous POM lint run.

If the command is missing, state that automatic POM checks are not configured and use the relevant POM skill/prompt manually.

## Pre-commit Hook

If `pom:init` installed the POM pre-commit hook, commits run `npm run pom:lint`. The hook is agent-neutral: it runs local POM checks, not a Claude Code or Codex command. For a read-only post-action audit, Claude Code can use the optional `pom-post-action-validator` agent when installed; Codex can use `pom/skills/validate.md`.

If `PROJECT_STATE.md` exists and governed project-memory files are staged, the hook prints a non-blocking reminder. The reminder is informational, not an obligation.

## Templates

Before creating a governed document, route through the relevant skill and template. Use `pom/skills/status.md` when the document type or status is unclear.

Use `pom/templates/OPEN_DISCUSSION_TEMPLATE.md` for desiderata, unresolved alternatives, and questions that are not yet specs, ADRs, task plans, or wiki synthesis.

If `pom.config.json.templates` points to customized or localized templates, use those project templates instead of the defaults in `pom/templates/`.

Do not customize files directly under `pom/` for project-specific needs. Put project-owned templates outside `pom/` and map them in `pom.config.json.templates`.

## Suggested Document Statuses

| Status | Meaning | Use when |
|---|---|---|
| Waiting | Waiting for something or someone | Blocked by external input |
| Blocked | Cannot proceed because of a concrete impediment | Missing dependency or error |
| Deferred | Deliberately postponed | Decided to do it later |
| Accepted | Approved decision | ADR, not an operational task |

If a template does not fit the concrete case, propose a template update first. Do not silently invent a parallel structure.

## POM Skills

`pom/skills/` is the operating index for POM workflows. Global instructions say who POM is and how to behave; skills say what POM can do and when to apply it.

Before the first POM-related action in a session, after compaction, or whenever the correct skill is unclear, read `pom/skills/using-pom.md`: it routes by intent, enforces the adoption guard above, and points to the selected skill card and canonical prompt. Route from the `pom/skills/README.md` catalog for anything not in the key routes below — do not route from memory alone.

Ordering that keeps routing safe:

- the `pom.config.json` read required by Adoption Profile above comes first;
- load the selected skill (read its card, then its linked prompt) before gathering evidence, editing, or claiming completion;
- state which POM skill is being used and why;
- for harness session-start behavior or tool mapping, read `pom/prompts/references/agent-harnesses.md`.

Key routes (read the skill card before acting; the full catalog with routing signals is `pom/skills/README.md`):

| Situation | Skill |
|---|---|
| Ambiguous POM request or unclear artifact/status | `clarify` |
| Existing project adoption; new or empty project | `adopt`; `seed` |
| Target Project bug, test/build failure, or unexpected behavior | `root-cause` |
| Design, audit, reshape, or verify an MCP server interface | `mcp-interface` |
| Park or postpone work without implementing | `defer` |
| Spec, ADR, or analysis must become verifiable work | `plan` |
| Verify a completed phase, task, spec, or ADR | `check` |
| Read-only governance audit after a significant POM action | `validate` |
| Wiki build, query, or maintenance | `wiki` |
| Restart, handoff, or current-state memory | `pulse` or `handoff` |
| Temporary experiment or risky Git worktree/branch | `spike` |
| Installed POM refresh, dirty `pom/`, or source/target alignment | `sync` |
| Two agents building and reviewing multi-turn work as controller and executor | `tandem` |
| Finish branch, PR, merge, keep, discard, or cleanup | `finish-branch` |
