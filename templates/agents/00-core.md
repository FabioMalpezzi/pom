# Project Operating Memory

This project uses **POM - Project Operating Memory** to keep current knowledge, decisions, tasks, mockups, code, and documentation aligned.

## Origin

POM's wiki model is inspired by Andrej Karpathy's **LLM Wiki** pattern: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f. The pattern is used as a conceptual reference. Operating rules, templates, and local adaptations are part of the project's POM method.

If available, read `pom/WIKI_METHOD.md` as the LLM Wiki reference copy and keep only project-specific rules in the target project's agent instruction files.

## Language Policy

POM is documented in English for portability. When applying POM to this project, use the project/user language for conversation and generated artifacts unless the user asks otherwise.

## Global Rules And Skills

Keep this global instruction block for identity, communication, source authority, safety, and always-on operating posture.

If a rule applies only to one kind of work, treat it as a skill procedure instead of a global rule. Use `pom/skills/` to decide what POM can do and when to apply it. A skill then points to the canonical prompt, templates, and verification for that workflow.

## Installed Layout

In a target project, `pom/` is the POM Source. It may contain `.git`, `README.md`, `AGENTS.MD`, `bootstrap-pom.mjs`, and `package.json`; that is normal for a Git-managed install.
The error case is POM Source files at the target root, for example `WIKI_METHOD.md`, `prompts/`, `skills/`, `templates/`, and `scripts/install-pom.ts` beside project files. If the root has only `pom/`, `AGENTS.md`, `package.json`, `pom-update.mjs`, `pom.config.json`, and optional agent folders, treat it as a day-zero project. Read `pom.config.json`, report that project memory has not started yet, and create no `PROJECT_STATE.md`, `CURRENT_PLAN.md`, `tasks/`, `analysis/`, `docs/`, `wiki/`, or configured decisions root unless the active profile enables them or current work needs them.

If a day-zero project has no application infrastructure yet, do not choose or scaffold the technical implementation. Ask how the user wants to realize the project, or write an approved Open Discussion/analysis note for alternatives, before selecting source layout, package manager, runtime/framework, database, authentication, deployment, or test framework.

## Principle

There is no single source of truth for everything. Each domain has its own authoritative source:

| Question | Authoritative Source |
|---|---|
| What does the system currently do? | code and tests, when present |
| What do we currently know about the project? | `wiki/` |
| Why did we decide this? | configured decisions root (`decisions.root`, default `decisions/`) |
| What analysis supports or challenges a choice? | `analysis/` |
| What is still desiderata, hypotheses, or unresolved discussion? | Open Discussion or `analysis/`, not implementation authority |
| What does the intended experience show? | `mockups/`, when present |
| What can be shared as official documentation? | `docs/`, when present |
| Where do I restart after a pause? | `PROJECT_STATE.md` or current plan |

If sources diverge, do not hide the divergence: surface it, analyze it, and propose a decision or reconciliation.

Before editing governed artifacts, check whether they are editable, approval-required, generated, or historical. If the right document is unclear, treat notes/desiderata as input and write the smallest approved Open Discussion or analysis note before creating specs, ADRs, folders, or code.

## Agent Work Principles

- Before non-trivial edits, state the goal, assumptions, success criteria, and shortest verification loop when they are not already explicit.
- Keep execution surgical and deterministic: simple code, no speculative abstractions, goal-critical files only, tools or code for repeatable transforms, and the model for judgment calls.
- Read before adding helpers; surface conflicts instead of blending patterns; fail loudly on skipped records, hidden errors, or uncertainty; compact long work into durable memory.

## Git And History

POM requires Git for history, rollback, and comparison between versions.

Rules:

- check `git status` before structural changes or experiments;
- if the project is not under Git, initialize Git before applying POM structurally; the installer does this automatically during setup;
- if this project is a subdirectory inside a larger Git worktree, do not create a nested repository without approval;
- leave fine-grained history of specs, ADRs, wiki pages, and code to Git;
- do not add manual changelogs to specs/ADRs unless explicitly requested;
- after structural changes, run available lint/tests and create a descriptive commit if required by the workflow.

## POM Commands

If the target project has `package.json`, use these commands when available:

```text
npm run pom:init   # install or refresh the POM section and package scripts
npm run pom:update # update pom/ safely; if it stops, read pom/skills/sync.md
npm run pom:help   # show POM commands and skills index (non-interactive, always exits)
npm run pom:lint   # run POM documentation governance checks
```

`pom:init` must update only the delimited POM section in every existing supported target agent instruction file or rule folder. If none exists, it creates `AGENTS.md`. It must not copy `pom/AGENTS.MD` into the target project.
Use `npm run pom:init -- --preset owned`, `--preset team`, `--preset overlay`, or `--preset minimal` for normal install/reconfiguration. Use `--profile` and `--ownership` only for explicit advanced changes.
`pom:update` updates the installed POM framework and refreshes generated sections. It must not change adoption profile or ownership mode.
`pom:help` prints the command reference and skill index. It is non-interactive and always exits immediately — safe to call from agents and scripts.
`pom:lint` is project-specific and optional. If it is not configured, state that automatic POM checks are not active.

## Adoption Profile

Read `pom.config.json` before applying POM conventions. If it contains an `adoption` section, respect it:

- `disabled` means POM must not create or require that module;
- `optional` means ask before creating the module unless immediate project work clearly requires it;
- `enabled` means the module is part of the active project method and should be maintained.
