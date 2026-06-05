# Prompt - Using POM

Use this prompt as the bootstrap/router for POM-aware work. Its job is to make the coding agent load the right POM skill before acting and to respect the target project's adoption profile. For harness setup or tool mapping details, use `prompts/references/agent-harnesses.md`.

```text
I am using POM - Project Operating Memory.

Goal:
- choose the correct POM workflow before changing project memory or governed artifacts;
- keep Operating Memory aligned with the target project's current sources, decisions, config, and restart context;
- avoid creating artifacts for disabled modules.

Before any POM action:
1. locate POM:
   - if `pom/skills/using-pom.md` exists, this is an installed target project;
   - if `skills/using-pom.md` exists and this is the POM Source repository, use source-relative paths;
   - if neither exists, do not invent a POM workflow; use the installation guidance in the POM README.
2. read `pom.config.json` when present. If missing, state that project-specific adoption/profile checks are not configured.
3. read `pom/skills/README.md` or `skills/README.md` as the skill index.
4. route by intent, then read the selected skill card and its linked prompt before acting.
5. treat YAML frontmatter descriptions as triggers only. Do not follow a description as if it were the procedure.
6. respect disabled adoption modules:
   - if wiki is disabled, do not create `wiki/` or wiki pages unless the user explicitly enables it;
   - if decisions are disabled, do not create ADRs unless the user explicitly enables decisions;
   - if structured tasks are not enabled, do not create task-plan files unless current work clearly requires them and the user approves;
   - if docs, analysis, mockups, or tests are disabled, optional, or owned by the target project, preserve that posture.
7. respect Git and experiment discipline:
   - check `git status` before structural changes, broad edits, experiments, or source/target POM sync;
   - route temporary, risky, dependency-heavy, benchmark, refactor, or exploratory work to `spike`;
   - use `sync` for updating an installed `pom/`, POM submodule, vendored POM copy, or target project after source POM changes;
   - use `finish-branch` for merge, PR, keep, discard, or cleanup decisions after code, branch, or experiment work is verified;
   - use `root-cause` for Target Project bugs, test failures, build failures, performance problems, or unexpected behavior before proposing fixes;
   - do not promote files from `experiments/`, `/tmp`, or an `exp/<topic>` branch into stable source until the experiment has been evaluated and promotion is approved.

Session-start contract:
- if the harness has native skill, plugin, or hook support, load `using-pom` at session start;
- if the harness only has project instructions, those instructions must require reading `pom/skills/using-pom.md` before the first POM-related action;
- for a new harness integration, keep a clean-session transcript showing that a natural POM request loads `using-pom`, routes to the selected skill, and does not edit files first;
- read `prompts/references/agent-harnesses.md` when installing, testing, or debugging Codex, Claude Code, Gemini CLI, Cursor, OpenCode, GitHub Copilot, or another harness integration.

Routing signals:

| User intent | Skill |
|---|---|
| "What POM skill should I use?" / "Quale skill POM serve?" | `help` |
| ambiguous POM request or artifact | `clarify` |
| new or empty project setup | `seed` |
| existing project adoption without moving structure | `adopt` |
| resume after pause / restart context / current state changed | `pulse` |
| end-of-session handoff | `handoff` |
| wiki build/query/maintenance/health | `wiki` |
| spec, ADR, or analysis must become verifiable work | `plan` |
| completed phase/task/workstream must be verified | `check` |
| significant POM action needs read-only governance audit | `validate` |
| Target Project bug, test failure, build failure, performance problem, or unexpected behavior | `root-cause` |
| important work should be preserved without implementation | `defer` |
| temporary experiment or isolated exploration | `spike` |
| installed POM refresh or source/target alignment | `sync` |
| Git branch/worktree choice for risky exploratory work | `spike` |
| completed branch, PR, merge, keep, discard, or cleanup decision | `finish-branch` |
| dirty `pom/`, submodule update, vendored POM copy, or source-to-target POM propagation | `sync` |
| POM method change | `extend`, or `prune` first if the change may add method weight |
| divergence between source and memory | `reconcile` |
| document type or status is unclear | `status` |
| domain state-machine workflow | `workflow` |
| agent-shaped loop/goal workflow or experiment | `loop-goal` |

Harness tool mapping summary:

| Skill wording | Codex | Claude Code | Gemini CLI | Cursor | OpenCode | GitHub Copilot |
|---|---|---|---|---|---|---|
| read file | native file read | Read | `read_file` | native file read | native file read | view/read equivalent |
| edit file | `apply_patch` or native edit | Edit | `replace` | native edit | native edit | edit equivalent |
| run shell command | native shell tool | Bash | `run_shell_command` | native shell | native shell | shell equivalent |
| update task list | `update_plan` | TodoWrite | `write_todos` | native todo/tooling | native todo/tooling | todo/plan equivalent |
| invoke/load skill | native skill loading or read skill file | Skill tool | `activate_skill` | plugin skill loading or rule file | native skill tool when available | skill tool when available |
| dispatch subagent | multi-agent tools if enabled; otherwise fresh context/read-back | Task | `@generalist` or named agent | available agent/subagent feature | available agent feature | task/agent equivalent when available |

Behavioral smoke prompts for future harness evals live in `tests/skill-bootstrap/fixtures/routing-smoke.json` in the POM Source repository. They include English and Italian prompts for `adopt`, `wiki`, `pulse`, `validate`, `plan`, `spike`, `sync`, `finish-branch`, `root-cause`, and disabled-module negative cases.

Output:
- state the selected POM skill and why;
- state the project posture if relevant (`owned`, `team`, `external_overlay`, or unknown);
- name any disabled modules that constrain the next action;
- then follow the selected skill's card and prompt.
```
