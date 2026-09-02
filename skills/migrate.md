---
name: migrate
description: Use when an adopted project should move existing folders or documents toward POM canonical roots, with approval and lint verification before and after.
---

# Skill - migrate

## When To Use

- POM was adopted with `pom.config.json` mapping the existing structure, and the team now wants some roots (docs, decisions, tasks, analysis, wiki, tests) moved to the canonical layout.
- Two structures coexist (for example `doc/` and `docs/`, or ADRs split between folders) and one should win.
- A folder move is requested and references, links, config, hooks, or CI depend on the current paths.

Not for: first adoption (`adopt`, which never moves anything), config-only remapping (`config`), or repositories owned by an external upstream (`ownership.mode: external_overlay` forbids structural changes).

## Canonical Prompt

`prompts/37-migrate-structure.md`

## Key Rules

- A mapping in `pom.config.json` is often enough; migrate only when the move buys something the mapping cannot (one convention, simpler tooling, fewer broken links).
- Every move is approved explicitly and recorded: an Open Discussion for the options, a Decision Record when the structure change is consequential.
- Baseline first: lint and tests before the move, with counts, so the after state can be compared.
- One module per commit, moved with `git mv`, followed by the reference updates that module needs: `pom.config.json` roots, relative links, generated indexes, the pre-commit hook (`npm run pom:init -- --profile refresh`), CI paths.
- Existing tests move only with the approval the config requires (`tests.requireApprovalBeforeMigratingExistingTests`).
- Never mix a migration with feature work in the same branch or commit.
- `PROJECT_STATE.md` and the wiki log record what moved and why.

## Memory Impact

`migrate` changes where memory lives without changing what it says. Links, indexes, and config must point to the new places before the migration is called complete.

## Output

- inventory of current roots against canonical roots and the decision per module (keep, move, split);
- approval reference (Open Discussion or ADR);
- baseline and post-migration lint and test results;
- commits, one per module, with the references updated;
- remaining open points (external links, tooling outside the repository).
