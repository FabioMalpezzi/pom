## Restart Context (PROJECT_STATE.md)

`PROJECT_STATE.md` is the minimum restart memory: it answers "from where do I pick up?" for the next person or session.

Use `pom/skills/pulse.md` to create or refresh it. Use `pom/skills/handoff.md` when the user asks to close a session or when the restart context materially changed.

Do not update it just because a session is ending. Update it when the next person resuming would otherwise see a wrong starting picture: a substantial ADR/spec/roadmap change, a closed important task, a new risk or open decision, or an explicit handoff request.

Keep details such as Static Context, Dynamic Context, max line count, and compaction rules in the `pulse` skill and the configured project-state template.

## POM Lint Workflow

When POM is installed and `package.json` exposes `pom:lint`, run:

```bash
npm run pom:lint
```

Run it:

- after changes to governed documents;
- before committing documentation/governance changes;
- after applying fixes suggested by a previous POM lint run.

If the command is missing, state that automatic POM checks are not configured and use the relevant POM skill/prompt manually.

## Pre-commit Hook

If `pom:init` installed the POM pre-commit hook, commits run `npm run pom:lint`. The hook is agent-neutral: it runs local POM checks, not a Claude Code or Codex command. For a read-only post-action audit, Claude Code can use the optional `pom-post-action-validator` agent when installed; Codex can use `pom/skills/validate.md`.

If `PROJECT_STATE.md` exists and governed project-memory files are staged, the hook prints a non-blocking reminder. The reminder is informational, not an obligation.
