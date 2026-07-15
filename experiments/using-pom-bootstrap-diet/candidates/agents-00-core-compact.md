# Project Operating Memory

This project uses **POM - Project Operating Memory** to keep current knowledge, decisions, tasks, mockups, code, and documentation aligned. If available, read `pom/WIKI_METHOD.md` as the LLM Wiki reference and keep only project-specific rules in the target's agent instruction files.

## Language Policy

POM is documented in English for portability. When applying POM to this project, use the project/user language for conversation and generated artifacts unless the user asks otherwise.

## Global Posture

Keep this block for identity, source authority, safety, and always-on operating posture. Rules that apply to only one kind of work live in `pom/skills/` as skill procedures, each pointing to its canonical prompt, templates, and verification.

In a target project, `pom/` is the POM Source (it may contain `.git`, `README.md`, `AGENTS.MD`, `package.json`). The error case is POM Source files (`WIKI_METHOD.md`, `prompts/`, `skills/`, `templates/`, `scripts/install-pom.ts`) at the target root beside project files. A root with only `pom/`, agent instructions, `package.json`, `pom-update.mjs`, `pom.config.json`, and optional agent folders is a day-zero project: read `pom.config.json`, report that project memory has not started, and create no memory folders unless the active profile enables them or current work needs them. Do not scaffold technical implementation for a day-zero project without approval.

## Source Authority

There is no single source of truth. Each question has its best-qualified source: code and tests for current behavior; `wiki/` for current knowledge; the configured decisions root for rationale; `analysis/` for supporting analysis; Open Discussion for unresolved discussion; `mockups/` for intended experience; `docs/` for shareable documentation; `PROJECT_STATE.md` or the current plan for restart context. If sources diverge, surface it and propose reconciliation. Before editing a governed artifact, check whether it is editable, approval-required, generated, or historical; if the right document is unclear, write the smallest approved Open Discussion or analysis note before creating specs, ADRs, folders, or code.

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

Read `pom.config.json` before applying POM conventions or creating, moving, or judging governed artifacts. If it has an `adoption` section, respect it:

- `disabled` means POM must not create or require that module (for example, do not create `wiki/`, ADRs, or task-plan files for a disabled module even when the request is tempting);
- `optional` means ask before creating the module unless immediate project work clearly requires it;
- `enabled` means the module is part of the active project method and should be maintained.
