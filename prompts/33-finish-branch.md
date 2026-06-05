# Prompt - Finish Branch

Use this prompt when code, experiment, or branch work is ready for a delivery decision: merge locally, push and create a PR, keep as-is, or discard.

```text
I want to finish the current branch or worktree.

Before presenting options:
1. read `pom.config.json` when present and note `ownership.mode`;
2. read local agent or contribution instructions that govern branch, PR, or release flow;
3. inspect Git state:
   - `git status`;
   - current branch with `git branch --show-current`;
   - repository root with `git rev-parse --show-toplevel`;
   - worktree state with `git rev-parse --git-dir` and `git rev-parse --git-common-dir`;
   - submodule state with `git rev-parse --show-superproject-working-tree`;
4. identify the likely base branch from project instructions, remote default, `main`, or `master`. If uncertain, ask.
5. check whether this is an experiment branch (`exp/<topic>`) or contains `experiments/` artifacts.

Verification gate:
1. run the project's relevant test/lint/build commands before any success claim;
2. if governed POM memory changed significantly, run the POM completion/governance check that fits the work (`check`, then `validate` when appropriate);
3. if verification fails, stop and report the failing command and shortest next diagnostic step. Do not present merge or PR as ready.

Experiment guard:
- if the branch is experimental and the user wants promotion, route through `skills/spike.md` first;
- summarize what will be promoted, what stays experimental, and whether promotion should happen by selective cherry-pick, clean reimplementation, or moving approved artifacts;
- wait for approval before promotion.

Present options only after verification:

```text
Branch/worktree state:
- branch: <branch or detached HEAD>
- base: <base branch or unknown>
- worktree: <normal repo | linked worktree | harness-owned/unknown>
- verification: <commands and result>

What should happen next?

1. Merge locally into <base branch>
2. Push branch and create a Pull Request
3. Keep the branch/worktree as-is
4. Discard this branch/worktree
```

Rules for the options:
- `external_overlay` mode: do not merge, push, or create a PR unless the user explicitly asks for upstream-facing action.
- Detached HEAD: do not offer local merge unless a target branch is chosen.
- Dirty working tree: do not merge, push, or discard until the dirty files are explained and either committed, intentionally left, or explicitly abandoned.
- Untracked files: list them; do not delete them silently.

Option 1 - Merge locally:
1. confirm the base branch;
2. switch to the base branch and update it only if the user allows network/remotes;
3. merge the feature branch;
4. run verification again on the merged result;
5. delete the feature branch only after merge verification passes and the user agrees;
6. remove a linked worktree only if its provenance is clear and cleanup is approved.

Option 2 - Push and create PR:
1. push the branch only after approval when the remote action is not already requested;
2. create the PR using the project's standard tool and template when available;
3. include summary and test plan from fresh verification output;
4. keep the worktree alive for PR iteration unless the user asks otherwise.

Option 3 - Keep as-is:
1. report the branch, worktree path, verification status, and next suggested command;
2. update `PROJECT_STATE.md` only if this branch is part of the project restart context.

Option 4 - Discard:
1. show exactly what would be removed: branch name, commits not on base, worktree path, and untracked files if any;
2. require exact confirmation, for example `discard <branch-name>`;
3. do not force-delete or remove worktrees without that confirmation;
4. do not remove harness-owned worktrees. Use the harness exit/cleanup feature when available, or leave them in place.

Worktree cleanup rules:
- `git rev-parse --git-dir` different from `git rev-parse --git-common-dir` means a linked worktree unless the repository is a submodule;
- if `git rev-parse --show-superproject-working-tree` returns a path, treat the checkout as a submodule, not a disposable worktree;
- remove only worktrees under an approved project-local path such as `.worktrees/` or `worktrees/`, or another path explicitly chosen for this work;
- run `git worktree prune` only after a successful, approved worktree removal.

Output:
- branch/worktree state;
- verification commands and results;
- selected option;
- commands executed;
- final state;
- remaining manual steps or risks.
```
