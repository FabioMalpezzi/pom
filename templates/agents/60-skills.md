## POM Skills

`pom/skills/` is the operating index for POM workflows. Global instructions say who POM is and how to behave; skills say what POM can do and when to apply it.

Before the first POM-related action in a session, after compaction, or whenever the correct skill is unclear, read `pom/skills/using-pom.md`: it routes by intent, enforces the adoption guard above, and points to the selected skill card and canonical prompt. Route from the `pom/skills/README.md` catalog for anything not in the key routes below — do not route from memory alone.

Ordering that keeps routing safe:

- the `pom.config.json` read required by Adoption Profile above comes first;
- load the selected skill (read its card, then its linked prompt) before gathering evidence, editing, or claiming completion;
- state which POM skill is being used and why;
- for harness session-start behavior or tool mapping, read `pom/prompts/references/agent-harnesses.md`.

Key routes (read the skill card before acting; the full catalog with routing signals is `pom/skills/README.md`):

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
