# Tandem Brief - <topic>

| Field | Value |
|---|---|
| Topic | <topic> |
| Date | <YYYY-MM-DD> |
| Status | open / closed |
| Folder | collaboration/<topic> |
| Per-task cap | <cap> review cycles |
| Phase budget | <phase budget> |
| Model diversity | <model diversity> |

`pom:tandem init` fills the angle-bracket placeholders of this template; `task add` and `close` rewrite the Tasks and Outcome sections. Everything else is yours to edit.

## Goal

Describe what the pair must deliver and how the coordinator will recognise that it is done. One paragraph; the tasks below carry the detail.

## Roles

| Role | Backend | Model | Workspace | Mode |
|---|---|---|---|---|
| Controller | <controller backend> | <controller model> | `<controller worktree>` (own Git worktree, reset after every review) | executes tests, builds, scripts; never edits the executor workspace |
| Executor | <executor backend> | <executor model> | project root | the only writer of the deliverable |
| Coordinator | the person who runs the skill | - | - | routes messages and decides; never takes a role |

Model diversity: `<model diversity>`. When both roles share backend and model, independence relies on separate sessions only; a different model is preferred when context and availability allow it.

## Rules

- The controller never modifies the executor workspace. It reviews in its own Git worktree, synchronised to the executor's revision before each review and reset afterwards; the script exits 4 and records the event in the ledger when the executor workspace differs after a review.
- The executor is the only writer of the deliverable and answers every finding with `F<n>: FIXED` or `F<n>: DISPUTED`.
- Each task has a cap of <cap> review cycles (`VERDICT: REVISE` increments the counter). When the cap is reached the task becomes `escalated`: the coordinator brings both positions to the user, who decides.
- Phase budget: <phase budget>. When declared, every review cycle consumes one unit; at zero the task becomes `stalled` and the coordinator stops the pair.
- A controller reply without a `VERDICT:` line is `indeterminate`: it counts for nothing and the coordinator asks again.
- Every backend call is saved under `turns/` and recorded in `LEDGER.md`; nothing is decided outside those files.

## Tasks

| Id | Title | Phase | Status | Cycles |
|---|---|---|---|---|
| - | (no task yet) | - | - | - |

## Outcome

Written by `pom:tandem close`: the verdict per task, what enters the project, open points. Promotion into the project remains a decision of the user.
