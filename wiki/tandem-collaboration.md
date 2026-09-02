---
navTitle: Tandem
---

# Tandem Collaboration

## Summary

A tandem is a multi-turn collaboration between two coding agents: an
**executor** that writes the code and a **controller** that reviews it,
with a **coordinator** carrying assignments, deliverables, and findings
between them through `scripts/tandem.mjs` (`npm run pom:tandem`). The
review follows a fixed contract, each task has a cycle cap, and a stuck
task becomes an escalation to the user instead of a fourth rewrite. This
page is a human reading guide to the `tandem` skill: what it is, when it
pays off, how the pieces fit, and what a run looks like.

## Current State

The `tandem` skill (`skills/tandem.md`, `prompts/38-tandem.md`) is
installed in Target Projects together with the script and the brief
template. Claude Code, Pi, and Codex are interchangeable in every seat:
whichever agent runs the skill coordinates, and the other two take the
roles. The controller works in its own Git worktree, synchronised with
the deliverable under review and reset afterwards, and the script
verifies after every review that the executor workspace is untouched.
The collaboration's memory is `BRIEF.md` (goal, roles, rules, tasks,
outcome; shape in `templates/TANDEM_BRIEF_TEMPLATE.md`), `LEDGER.md` (one
line per turn), and `turns/` (message sent and full reply, one file per
call) under `collaboration/<slug>/`, plus the persistent sessions of the
backends. `init` writes a `.gitignore` that keeps the controller
worktree, the session files, and `turns/` out of Git (`send`, `review`,
and `respond` warn when that rule is missing); `init --track-turns`
versions the turns on purpose, `BRIEF.md` and `LEDGER.md` stay tracked.
These files are the restart point for a new coordinator.

Use a tandem when a piece of work spans several turns and deserves a
reviewer that did not write it, especially when that reviewer can be a
different LLM. Do not use it for a single-turn review of an existing diff
(`check` or `challenge`), for a Target Project bug hunt (`root-cause`), or
in place of a measurable experiment with a criteria contract
(`loop-goal`; a tandem may still run inside one).

## Details

### Three roles, three symmetric backends

- The **coordinator** runs the skill and the script: writes the brief
  with the user, sends the difference each turn, reads the exit codes,
  escalates. It never edits project files and never takes a role.
- The **executor** is the only agent that writes project files, in the
  project root on the collaboration branch, and answers every finding
  with `FIXED` or `DISPUTED`.
- The **controller** returns a verdict with findings; it may run tests,
  builds, and scripts in its own worktree, never produces the
  deliverable, never touches the executor's files.

A backend is `claude`, `pi`, or `codex`, optionally with a model
(`--controller pi:<model>`). Prefer a different LLM for the controller: a
controller running the executor's own model tends to agree with it.
Separate sessions of the same model are the minimum separation; the
script warns and records `model_diversity: different | same` in the
brief, it does not refuse.

### Persistent sessions keep the context

Each role keeps one non-interactive session in its backend, created on
the first call and resumed afterwards, so the coordinator sends only the
delta of each turn and never replays history:

| Backend | First call | Later calls |
|---|---|---|
| Pi | `pi -p --session-dir <dir> --session-id <id> "<msg>"` | same command; Pi resumes by id |
| Codex | `codex exec -s workspace-write -C <cwd> --json -o <file> "<msg>"` | `codex exec ... resume <thread> "<msg>"`, thread id captured from the first reply |
| Claude Code | `claude -p --session-id <uuid> ... "<msg>"` | `claude -p --resume <uuid> ... "<msg>"` |

Claude roles run with shell, read, and edit tools pre-allowed, because
print mode denies any tool that is not allowed up front. When a session
is lost (Claude answers "already in use" or "No conversation found", Codex
returns no thread id, the Pi session file is missing) the script exits
`1`, records the event in the ledger, and leaves the message unsent; the
coordinator runs `session reset --topic <slug> --role <role>` and re-sends
the current assignment with the brief context the role needs; the script
never retries into a fresh session on its own.

### The controller's own worktree

At `init` the script creates a Git worktree for the controller, by
default `collaboration/<slug>/.controller-worktree/`
(`--controller-worktree <path>` moves it outside the project root; a path
inside the root but outside the tandem folder is refused). `--setup
"<command>"` runs once there, at `init` and at `init --reopen`, for
dependencies and builds; ignored files such as `node_modules` survive
every reset, which is what makes the setup worth running once.

At every `review` (and every `send` to the controller) the script takes
a fingerprint of the executor workspace, synchronises the worktree with
the executor's `HEAD` commit plus a patch of any uncommitted changes
(`turns/NNN-controller-<task>.patch`, untracked files copied), runs the
controller call, saves whatever the controller changed in its worktree as
`turns/NNN-controller-<task>.left.patch` (noted in the ledger as
"controller left changes in its worktree (discarded)"), resets the
worktree, and takes the fingerprint again: if the executor workspace
differs it exits `4`, listing the changed paths. The fingerprint covers tracked and untracked files by content and
Git-ignored files by size and modification time (`*.log` and `*.pid`
under ignored folders and every `collaboration/` folder excluded), and it
runs even when the backend call fails. `--guard-ignore <glob>`
(repeatable, saved in the brief) keeps paths that change on their own,
such as a dev server log, out of the guard; it applies to ignored and
untracked paths only, tracked files stay guarded whatever the glob.

### The cycle per task

Tasks are a flat list added with `task add`, each with an optional phase
label and a `--done "<criteria>"` definition of done that travels with
every review. Per task: `send --role executor --task <id> --message
"<assignment>"` (or `--message-file`) carries the assignment, the
definition of done, and the constraints, nothing from earlier tasks
unless this one depends on it; `review --task <id> --deliverable
<path-or-ref>` gives the controller the definition of done, the
deliverable, and the revision it was synchronised to; on `REVISE`,
`respond --task <id>` hands the last findings to the executor, which
answers in the response contract and applies fixes; then `review` again,
until `APPROVE` or the cap.

Each `REVISE` counts one cycle; the cap (default 4) is per task. When it
is reached the task becomes `escalated`, the script exits `3`, and the
tandem does not move on: the coordinator brings both positions to the
user, whose decision goes into the ledger with `note`, not into the code.
An optional `--phase-budget N` is a stop rule per phase label: every
cycle consumes one unit, at zero the task becomes `stalled`. Raising the
cap while a task is stuck defeats its purpose.

### The two contracts

The controller's reply must start with the verdict:

```text
VERDICT: APPROVE|REVISE
FINDINGS:
1. blocking|minor | <location> | <what is wrong> | <evidence that would satisfy you>
2. ...
```

The verdict is the first non-empty line (Markdown emphasis tolerated); a
verdict after a preamble, or two different verdicts in one reply, is
non-conforming. The executor answers every finding on its own line:

```text
F<n>: FIXED <what changed and its evidence>
F<n>: DISPUTED <evidence>
```

A reply without any `F<n>:` line, or a blocking finding disputed without
evidence (fewer than twelve letters or digits), does not close the cycle.
The texts of both contracts live in `scripts/lib/tandem-contract.mjs`,
so the script and the skill say the same thing.

### Exit codes

| Code | Meaning | What the coordinator does |
|---|---|---|
| `0` | Turn accepted and recorded. | Continue. |
| `1` | Usage error, backend error, timeout (`POM_TANDEM_TIMEOUT_MS`), or a lost session. | Read the message; for a lost session, `session reset` and re-send. |
| `2` | Non-conforming reply: no valid first-line verdict, two verdicts, an empty reply, no `F<n>:` lines, a blocking finding disputed without evidence. State unchanged. | Repeat the turn quoting the contract; escalate if it happens again. |
| `3` | Cycle cap or phase budget reached without `APPROVE`. | Stop the task and escalate with both positions. Do not raise the cap. |
| `4` | The executor workspace changed while the controller was reviewing. | Stop the tandem and report the listed paths; the user decides. |

### Human-coordinated variant

The user can coordinate from the chat instead of a third agent. The
agent of the current session takes one role, executor or controller, and
the other role runs through the script as usual. For the role held by the
session agent, `send` and `respond` are not used: the user hands
assignments and findings over in the chat, the executor's `F<n>` answers
go into the `--deliverable` text of the next `review`, and decisions are
written to the ledger with `note`. Isolation does not change: in the
executor seat the session agent writes only in the project root; in the
controller seat it only reads and runs tests, and the user runs `review`
so that the verdict passes through the contract.

### How a review is read

The user sees what the coordinator writes, not the script output. The
script prints every reply between `=== <role> reply | task <id> | <turn
file> ===` and `=== end of <role> reply ===`, and the coordinator quotes
the verdict with its findings, and every executor response, verbatim in
its chat before acting on them. Afterwards the same text is in the turn
file named in the delimiter and the verdict is one line in `LEDGER.md`;
`status --topic <slug>` shows roles, `model_diversity`, the task table
with cycles, cap, phase budget, and escalated tasks; `close` writes the
`## Outcome` section of the brief: one row per task with final verdict
and cycles, what enters the project (a user decision, the script only
records verdicts), and the open points.

### A complete example

Taken from a real run on 2026-09-02 in a scratch project: Claude Code
coordinated, Codex executed, Pi controlled (default models of each tool),
cap 3. The replies below are the controller's and executor's own words,
copied from the `turns/` files.

```bash
git switch -c collab/slugify
npm run pom:tandem -- init --topic slugify --controller pi --executor codex --cap 3
npm run pom:tandem -- task add --topic slugify --id T1 \
  --title "Add slugify(text) in src/slugify.mjs with unit tests in tests/slugify.test.mjs runnable with npm test"
npm run pom:tandem -- send --topic slugify --role executor --task T1 --message-file assignment-T1.md
```

The assignment spelled out the rules: lower-case, diacritics
transliterated to ASCII, runs of non-alphanumerics collapsed to one dash,
no leading or trailing dash, empty or non-string input returns an empty
string, tests with `node:test`. The executor answered:

```text
Created:
- src/slugify.mjs
- tests/slugify.test.mjs
- tests/index.js — compatibility entry point for the existing test script.
Test command: `npm test`
Result: 5 tests passed, 0 failed; exit code 0.
```

```bash
npm run pom:tandem -- review --topic slugify --task T1 \
  --deliverable "Files: src/slugify.mjs, tests/slugify.test.mjs, tests/index.js. Executor ran npm test: 5 passed. Verify the rules from the task and run the tests yourself in your worktree."
```

The controller ran the tests in its worktree, read the code, and found a
gap the executor's own tests could not see:

```text
VERDICT: REVISE
FINDINGS:
1. blocking | src/slugify.mjs:7-10; tests/slugify.test.mjs:6-8 | Transliteration only strips decomposable combining marks; letters such as `ł`, `ø`, and `æ` are discarded or replaced by dashes (`Łódź` → `odz`, `smørrebrød` → `sm-rrebr-d`). The five existing tests pass but do not cover this gap. | Add representative non-decomposing Latin-letter tests and make them pass with expected transliterations such as `lodz` and `smorrebrod`.
```

```bash
npm run pom:tandem -- respond --topic slugify --task T1
```

The executor fixed the code in its workspace and answered in the response
contract:

```text
F1: FIXED Added explicit ASCII mappings for non-decomposing Latin letters, including `ł`, `ø`, and `æ`, in `src/slugify.mjs`; added regression tests for `Łódź`, `smørrebrød`, and `Æsop` in `tests/slugify.test.mjs`. Both focused tests and `npm test` pass: 6 passed, 0 failed.
```

The second `review`, on the updated working tree, closed the task:

```text
VERDICT: APPROVE
FINDINGS:
1. minor | location: none | No remaining issues; all original rules and added transliteration cases are covered. | Evidence satisfied: `npm test` passes all 6 tests.
```

`status` showed T1 `approved` with 1 cycle out of 3; `close --topic slugify`
wrote the Outcome and removed the controller worktree. The same run,
inverted (Pi coordinating, Claude controlling, Codex executing), approved a
second task in one cycle; a third run with the session agent as executor
and Pi as controller needed one `REVISE` on whitespace handling before its
`APPROVE`.

## Sources

| Source | Use |
|---|---|
| `skills/tandem.md` | Skill card: when to use, roles, modes, key rules, human-coordinated variant, memory impact. |
| `prompts/38-tandem.md` | Canonical procedure: preconditions, setup, procedure per task, exit codes, escalation, resuming, closure. |
| `templates/TANDEM_BRIEF_TEMPLATE.md` | Shape of `BRIEF.md`: fields, roles, rules, tasks, outcome. |
| `scripts/tandem.mjs` | The command line, the exit codes, the worktree synchronisation and workspace guard. |
| `scripts/lib/tandem-contract.mjs` | The review and response contracts and their parsers. |
| `scripts/lib/tandem-backends.mjs` | How each backend creates and resumes its session. |
| `scripts/lib/tandem-state.mjs` | Layout of the collaboration folder and its Git ignore rules. |

## Related Links

- [[skills-and-prompts]]
- [[experiments-and-extension]]
- [[loop-goal-workflow-tutorial]]
