---
name: finish-branch
description: Use when completed code, experiment, or branch work needs merge, PR, keep, discard, or cleanup handling.
---

# Skill - finish-branch

## When To Use

- Implementation work is complete and the branch needs a delivery decision.
- An experiment branch has been evaluated and should be discarded, kept, or handed to `spike` for approved consolidation.
- A worktree or temporary branch may need cleanup after merge, PR creation, or discard.
- The user asks how to close, merge, publish, or clean up branch work.

## Canonical Prompt

`prompts/33-finish-branch.md`

## Key Rules

- Run fresh verification before claiming the work is ready to merge, publish, or discard.
- Read `pom.config.json` before choosing options; `external_overlay` projects require explicit approval before push, PR, or upstream-facing changes.
- Present a small option set: merge locally, push/create PR, keep as-is, or discard.
- Never discard work, delete a branch, remove a worktree, or force-push without explicit confirmation.
- If the branch is an experiment or contains `experiments/` artifacts, use `skills/spike.md` before promoting anything into stable source.
- Do not clean up harness-owned worktrees; only remove worktrees whose provenance is clear and approved.

## Output

- current branch/worktree state;
- verification evidence;
- chosen delivery or cleanup option;
- commands run and resulting branch/PR state;
- any remaining manual step or risk.
