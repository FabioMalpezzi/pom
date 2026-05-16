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

If the right document is unclear, optimize for the next safe step: write the smallest useful note where the next reader or agent will need it before acting.

## Git And History

POM requires Git for history, rollback, and comparison between versions.

Rules:

- check `git status` before structural changes or experiments;
- if the project is not under Git, propose `git init` before applying POM structurally;
- leave fine-grained history of specs, ADRs, wiki pages, and code to Git;
- do not add manual changelogs to specs/ADRs unless explicitly requested;
- after structural changes, run available lint/tests and create a descriptive commit if required by the workflow.

## Operating Cycle

```text
Inputs / Code / Mockups / Analysis / Conversation
        -> Wiki
        -> Decisions
        -> Delivery Plan
        -> Docs
        -> Project State
```

## POM Commands

If the target project has `package.json`, use these commands when available:

```text
npm run pom:init   # install or refresh the POM section and package scripts
npm run pom:update # update pom/ safely; if it stops, read pom/skills/sync.md
npm run pom:help   # show POM commands and skills index (non-interactive, always exits)
npm run pom:lint   # run POM documentation governance checks
```

`pom:init` must update only the delimited POM section in every existing supported target agent instruction file or rule folder. If none exists, it creates `AGENTS.md`. It must not copy `pom/AGENTS.MD` into the target project.

`pom:help` is a lightweight command guide. When run in an interactive terminal it may offer to launch common commands such as refresh, lint, or skill reference display. When run in non-interactive contexts it prints the command guide and exits.

`pom:lint` is project-specific and optional. If it is not configured, state that automatic POM checks are not active.

## Adoption Profile

Read `pom.config.json` before applying POM conventions. If it contains an `adoption` section, respect it:

- `disabled` means POM must not create or require that module;
- `optional` means ask before creating the module unless immediate project work clearly requires it;
- `enabled` means the module is part of the active project method and should be maintained.
