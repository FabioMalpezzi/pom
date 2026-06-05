# POM Agent Harness Reference

Use this reference when installing, testing, or debugging POM integration with a coding-agent harness. The goal is to make the agent load `using-pom` early enough to route work before changing files.

## Integration Contract

1. Keep POM installed under `pom/` in the Target Project.
2. Put the POM instruction section in the harness instruction file or rule file.
3. Load `pom/skills/using-pom.md` at session start when the harness has native skill, plugin, or hook support.
4. If the harness only supports project instructions, require the agent to read `pom/skills/using-pom.md` before the first POM-related action, after compaction, after handoff, or when the route is unclear.
5. New harness support needs a clean-session transcript showing that a natural POM request routes through `using-pom` and the selected skill before edits.

## Harness Files

| Harness | Instruction target | Skill loading posture |
|---|---|---|
| OpenAI Codex | `AGENTS.md` | Native skills when installed; otherwise read `pom/skills/using-pom.md` and the linked prompt. |
| Claude Code | `CLAUDE.md` | Use native skill loading when packaged; otherwise follow the installed POM section. |
| Gemini CLI | `GEMINI.md` | Use native skill activation when available; otherwise import or read the installed POM section. |
| Cursor | `.cursor/rules/pom.mdc` or `.cursorrules` | Use project rules to require `using-pom` before POM actions. |
| OpenCode | agent instructions or OpenCode rule/plugin config | Use native skill loading when available; otherwise read the POM skill and prompt files. |
| GitHub Copilot | `.github/copilot-instructions.md` or `.github/instructions/pom.instructions.md` | Use Copilot instructions; if a CLI exposes a skill tool, load the skill instead of treating the description as procedure. |
| Other agents | Agent-specific instruction file | Adapt the POM section and preserve the same session-start contract. |

## Tool Mapping

| Skill wording | Codex | Claude Code | Gemini CLI | Cursor | OpenCode | GitHub Copilot |
|---|---|---|---|---|---|---|
| read file | native file read | `Read` | `read_file` | native file read | native file read | view/read equivalent |
| edit file | `apply_patch` or native edit | `Edit` | `replace` | native edit | native edit | edit equivalent |
| run shell command | native shell tool | `Bash` | `run_shell_command` | native shell | native shell | shell equivalent |
| update task list | `update_plan` | `TodoWrite` | `write_todos` | native todo/tooling | native todo/tooling | todo/plan equivalent |
| invoke or load skill | native skill loading or read skill file | `Skill` | `activate_skill` | plugin skill loading or rule file | native skill tool when available | skill tool when available |
| dispatch subagent | multi-agent tools when enabled | `Task` | `@generalist` or named agent | available agent feature | available agent feature | task/agent equivalent when available |

If a harness lacks one of these tools, use the closest available primitive and state the substitution. Do not skip a POM skill because a tool name differs.

## Session-Start Smoke

Run these in a clean session for each harness being claimed as supported:

```text
Read pom/skills/using-pom.md and route this request before acting. Adopt POM in this existing repository without moving current files.
```

```text
Leggi pom/skills/using-pom.md e instrada questa richiesta prima di agire. Adotta POM in questo repository esistente senza spostare i file attuali.
```

Expected behavior:

- the agent loads `using-pom` before reading or editing project files for the requested work;
- it reads the skill index and `pom.config.json` when present;
- it routes adoption to `adopt` and reads `pom/skills/adopt.md` before acting;
- it does not create wiki pages, decisions, task plans, docs, tests, analysis, or mockups when the adoption profile disables them;
- the transcript records the loaded skill, selected route, and first verification loop.

## Boundaries

POM does not require a universal runtime hook. Native session-start hooks improve reliability, but instruction-file-only integrations remain valid when they force the same `using-pom` read before POM action.

The harness table is a mapping and test protocol, not a live support
claim. Treat a harness as verified only after the clean-session transcript
shows the expected route.
