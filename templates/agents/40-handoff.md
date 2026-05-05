## Session Handoff Memory

At the end of a significant session, before final handoff, update `PROJECT_STATE.md` if the project operating context changed.

`PROJECT_STATE.md` has two sections with different update frequencies:

**Static Context** — update only when the project's direction, stack, or permanent constraints change:
- project purpose, key constraints, structural decisions, files to always read, what not to do without a new decision.

**Dynamic Context** — update at every significant session:
- current state, current objective, priorities, next actions, open decisions, risks.

Do not update Static Context for operational changes. Do not update Dynamic Context for permanent structural changes — create or update an ADR instead.

Compaction rules:
- if the file exceeds the maxLines limit, compact Dynamic Context: remove completed actions, archive closed decisions to `decisions/` or `wiki/log.md`, delete resolved risks;
- if a section of Dynamic Context is becoming a log, move it to `wiki/log.md` or `decisions/` and remove it from `PROJECT_STATE.md`;
- never compact Static Context.

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

If `pom:init` installed the POM pre-commit hook, commits run `npm run pom:lint`.

If `PROJECT_STATE.md` exists and governed project-memory files are staged, the hook prints a non-blocking reminder to update `PROJECT_STATE.md` when the restart context changed.

Update `PROJECT_STATE.md` when:

- an ADR, spec, roadmap, priority, or current plan changes substantially;
- an important task or phase is closed;
- a relevant risk, blocker, or open decision is introduced;
- the user explicitly asks for a handoff or restart-status update.

Do not update it for typos, regenerated indexes, or changes with no restart impact.
