# Prompt - Using POM

Use this prompt as the bootstrap/router for POM-aware work. Its job is to make the coding agent load the right POM skill before acting and to respect the target project's adoption profile. The complete routing table is the `skills/README.md` catalog; harness setup, the session-start contract, and tool mapping live in `prompts/references/agent-harnesses.md`.

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
   - if neither exists, do not invent a POM workflow; use the POM README Quickstart or `docs/installation.md` in the POM Source.
2. read `pom.config.json` when present; the adoption guard it drives is stated once in the installed POM section. If the file is missing, state that project-specific adoption/profile checks are not configured.
3. read `pom/skills/README.md` or `skills/README.md` as the skill catalog: its `Use` column is the routing signal.
4. route by intent from the key routes below or from the catalog, then read the selected skill card and its linked prompt before acting.
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

Session-start contract: defined once in `prompts/references/agent-harnesses.md` (integration contract, harness instruction files, tool mapping, smoke prompts). Read it when installing, testing, or debugging Codex, Claude Code, Gemini CLI, Cursor, OpenCode, GitHub Copilot, or another harness integration.

Key routes (the same table as the installed POM section; everything else routes from the catalog):

| Situation | Skill |
|---|---|
| Ambiguous POM request or unclear artifact/status | `clarify` |
| Existing project adoption; new or empty project | `adopt`; `seed` |
| Target Project bug, test/build failure, or unexpected behavior | `root-cause` |
| Design, audit, reshape, or verify an MCP server interface | `mcp-interface` |
| Park or postpone work without implementing | `defer` |
| Spec, ADR, or analysis must become verifiable work | `plan` |
| Verify a completed phase, task, spec, or ADR | `check` |
| Read-only governance audit after a significant POM action | `validate` |
| Wiki build, query, or maintenance | `wiki` |
| Restart, handoff, or current-state memory | `pulse` or `handoff` |
| Temporary experiment or risky Git worktree/branch | `spike` |
| Installed POM refresh, dirty `pom/`, or source/target alignment | `sync` |
| Two agents building and reviewing multi-turn work as controller and executor | `tandem` |
| Finish branch, PR, merge, keep, discard, or cleanup | `finish-branch` |

Output:
- state the selected POM skill and why;
- state the project posture if relevant (`owned`, `team`, `external_overlay`, or unknown);
- name any disabled modules that constrain the next action;
- then follow the selected skill's card and prompt.
```
