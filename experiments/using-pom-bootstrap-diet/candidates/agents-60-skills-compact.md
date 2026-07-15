## POM Skills

`pom/skills/` is the operating index for POM workflows. Global instructions say who POM is and how to behave; skills say what POM can do and when to apply it.

Before the first POM-related action in a session, after compaction, or whenever the correct skill is unclear, read `pom/skills/using-pom.md`: it routes by intent, enforces the adoption guard above, and points to the selected skill card and canonical prompt. Route from the `pom/skills/README.md` catalog for anything not in the key routes below — do not route from memory alone.

Ordering that keeps routing safe:

- read `pom.config.json` before creating, moving, or judging governed artifacts, and before editing project sources;
- load the selected skill (read its card, then its linked prompt) before gathering evidence, editing, or claiming completion;
- treat YAML frontmatter descriptions as triggers only, never as the procedure;
- state which POM skill is being used and why;
- for harness session-start behavior or tool mapping, read `pom/prompts/references/agent-harnesses.md`.

Key routes (read the skill card before acting; see `README.md` for the full catalog):

| Situation | Skill |
|---|---|
| Ambiguous POM request or unclear artifact/status | `clarify` |
| Existing project adoption; new or empty project | `adopt`; `seed` |
| Target Project bug, test/build failure, or unexpected behavior | `root-cause` |
| Park or postpone work without implementing | `defer` |
| Verify a completed phase, task, spec, or ADR | `check` |
| Wiki build, query, or maintenance | `wiki` |
| Restart, handoff, or current-state memory | `pulse` or `handoff` |
| Temporary experiment or risky Git worktree/branch | `spike` |
| Finish branch, PR, merge, keep, discard, or cleanup | `finish-branch` |
