---
name: spike
description: Use when running temporary exploratory work that must stay isolated until evaluated.
---

# Skill - spike

## When To Use

- Temporary experiment.
- Technical or functional spike.
- Risky or exploratory one-shot work with temporary notes, including LLM model trials, libraries, APIs, quick benchmarks, or focused refactors.
- External repository evaluation.
- Market research or project analysis that is not mature yet.

## Canonical Prompt

`prompts/09-run-temporary-experiment.md`

## Key Rules

- Isolate with branch `exp/<topic>`, `/tmp`, or `experiments/<topic>/`.
- Prefer a Git worktree on `exp/<topic>` when the experiment is risky, broad, dependency-heavy, or likely to dirty many stable files.
- For one-shot work: branch `exp/<topic>` if risky, `experiments/<topic>/` only for notes/proofs/reports, `/tmp` for disposable scripts.
- For focused refactors, prefer `exp/refactor-<topic>` or `experiments/refactor-<topic>/`.
- Keep trial dependencies, environment variables, service config, generated output, and external repositories outside the stable project unless adoption is approved.
- Stable source must not import from `experiments/`; use project tooling to exclude or forbid experiment paths where practical.
- Approved final code belongs in the real codebase, not in `experiments/`.
- Do not contaminate stable codebase or documentation.
- Do not import heavy artifacts without approval.
- Consolidate only after evaluation, preferably by selective cherry-pick, clean reimplementation, or moving specific approved artifacts.

## Git Isolation

- Run `git status` before choosing the isolation mode.
- Detect whether the current checkout is already isolated before creating anything:
  - compare `git rev-parse --git-dir` with `git rev-parse --git-common-dir`;
  - if they differ, check `git rev-parse --show-superproject-working-tree` so a submodule is not mistaken for a disposable worktree.
- Prefer a harness-native worktree/workspace feature when the coding environment provides one.
- Use a manual Git worktree only when no native feature is available and the user approves the location.
- For project-local worktrees, prefer `.worktrees/<topic>` or an existing configured worktree root, and verify that the root is ignored before adding a worktree.
- Run the shortest useful baseline verification before experimenting when the project has tests or lint. If the baseline already fails, record it as pre-existing before continuing.
- Leave experiment branches and worktrees in place until evaluation decides discard, consolidation, or follow-up. Use `skills/finish-branch.md` when the branch/worktree needs merge, PR, keep, discard, or cleanup handling.

## Config

Read `pom.config.json` before proposing consolidation into analysis, wiki, docs, source, or tests. If the experiment requires a new convention, propose a config update too.

## Output

- experiment result;
- discard or consolidation decision;
- optional synthesis in `analysis/`;
- optional wiki/spec/ADR/task-plan update.
