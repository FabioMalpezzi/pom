---
name: pom-tandem
description: Use when two coding agents should build and review multi-turn work as controller and executor, with a third agent coordinating the exchange through the tandem script.
---

# Skill - tandem

## When To Use

- A piece of work spans several turns and deserves a reviewer that did not write it: one agent implements (**executor**), a second agent judges the result (**controller**), and the agent running this skill (**coordinator**) carries assignments, deliverables, and findings between them.
- The team wants the review to come from a different LLM than the one implementing, or at least from a separate session, with a fixed verdict contract instead of free-form comments.
- Claude, Pi, and Codex are interchangeable in every seat: whichever runs this skill coordinates, and the other two take the roles.

Not for: a single-turn review of an existing diff (`check` or `challenge`), a Target Project bug hunt (`root-cause`), or a measurable experiment that needs a criteria contract (`loop-goal`; a tandem may still run inside it).

## Roles

- **Coordinator**: runs the skill and the script. Writes the brief with the user, sends the difference each turn, reads exit codes, escalates. Never edits project files and never takes a role in the same tandem.
- **Controller**: reviews each deliverable and returns `VERDICT` plus `FINDINGS`. Works in its own Git worktree, synchronized by the script with the deliverable under review (a commit or a patch of the executor's working tree); there it may run tests, builds, and scripts and write scratch files. It never produces the deliverable and never touches the executor's workspace: the script resets the controller worktree after each review and verifies the executor workspace is unchanged.
- **Executor**: the only agent that writes project files, in one workspace on the collaboration branch. Answers every finding with `FIXED` or `DISPUTED`.

## Modes

Pass the mode as the first instruction. All three follow `prompts/38-tandem.md`.

| Mode | Purpose | Script commands |
|---|---|---|
| `setup` | Agree objective, flat task list, backends and models, cycle cap, optional phase labels and phase budget; get the brief accepted. | `npm run pom:tandem -- init --topic <slug> --controller <backend>[:<model>] --executor <backend>[:<model>] [--cap 4] [--phase-budget N]`, then `task add --topic <slug> --id <id> --title <title> [--phase <label>]` |
| `run` | Per task: `send` the assignment to the executor, `review` the deliverable, `respond` with the findings, `review` again, until `APPROVE` or the cap. | `send`, `review`, `respond`, `status` |
| `close` | Record the outcome, what enters the project, open points, and escalations. | `close --topic <slug>` |

Exit codes: `0` ok; `2` non-conforming response (repeat the turn with the contract quoted); `3` cycle cap or phase budget reached (escalate, do not raise the cap); `4` controller must not modify the executor workspace (stop and report).

## Key Rules

- The controller never produces the deliverable and never modifies the executor's workspace. This is guaranteed by construction: the script gives the controller its own worktree, synchronizes it at every `review`, resets it afterwards, and exits `4` if the executor workspace differs from what was sent.
- The coordinator does not write project files and does not take a role in the tandem it coordinates.
- The coordinator relays every controller verdict with its findings, and every executor response, verbatim in its own chat before acting on it. The user sees what the coordinator writes, not the script output, so a review nobody can read is a review nobody can check.
- Prefer a different LLM for the controller when available; separate sessions of the same model are the minimum separation. A controller with the executor's own model tends to agree with the executor. The script warns and records `model_diversity: different | same` in the brief; it does not refuse.
- Tasks are a flat list. Phase label and phase budget are optional. The cycle cap (default 4) is per task; when it is reached without agreement the tandem does not move to the next task: it records both positions and escalates to the user.
- One workspace per executor and one branch dedicated to the collaboration. The coordinator sends only the difference (assignment, deliverable, findings), never the whole history. Memory lives in the backends' persistent sessions and in the collaboration's `BRIEF.md`, `LEDGER.md`, and `turns/`, which are also the restart point when a session is lost.
- Review contract, fixed: `VERDICT: APPROVE|REVISE` followed by numbered `FINDINGS:`, each with severity `blocking|minor`, location, defect, and expected evidence. Response contract, fixed: `F<n>: FIXED <what changed and its evidence>` or `F<n>: DISPUTED <evidence>`. A blocking finding disputed without evidence does not close the cycle.
- When the tandem is an experiment, closure uses the `## Outcome` section of `templates/EXPERIMENT_TEMPLATE.md` (technical verdict, then the user's promotion decision). Otherwise closure is recorded in the brief and, when the restart context changes, in `PROJECT_STATE.md`.

## Memory Impact

`BRIEF.md`, `LEDGER.md`, and `turns/` are the Operating Memory of one collaboration: they let a new coordinator resume from the last approved task without replaying sessions. The ledger belongs to one topic, receives one line per turn, and stops growing at `close`; it is bounded by the per-task cap. The `turns/` files carry the full responses and are the heavy part: keep them for the life of the collaboration and for reading it afterwards, and by default `init` writes a `.gitignore` in the collaboration folder that keeps `turns/` (with the controller worktree and the session files) out of Git, and `send`, `review`, and `respond` warn when that rule is missing; `init --track-turns` versions them on purpose. `BRIEF.md` and `LEDGER.md` stay tracked. What the project keeps durably is the accepted deliverable on the branch, the brief with its closure record, and any decision or state change it caused.

## Output

- accepted brief: objective, tasks, roles with backend and model, cap, budget, `model_diversity`;
- per task: number of cycles, final verdict, unresolved disputed findings;
- escalations raised and how the user resolved them;
- closure record and the branch state handed to `finish-branch`.
