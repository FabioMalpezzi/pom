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
- For one-shot work: branch `exp/<topic>` if risky, `experiments/<topic>/` only for notes/proofs/reports, `/tmp` for disposable scripts.
- For focused refactors, prefer `exp/refactor-<topic>` or `experiments/refactor-<topic>/`.
- Approved final code belongs in the real codebase, not in `experiments/`.
- Do not contaminate stable codebase or documentation.
- Do not import heavy artifacts without approval.
- Consolidate only after evaluation.

## Config

Read `pom.config.json` before proposing consolidation into analysis, wiki, docs, source, or tests. If the experiment requires a new convention, propose a config update too.

## Output

- experiment result;
- discard or consolidation decision;
- optional synthesis in `analysis/`;
- optional wiki/spec/ADR/task-plan update.
