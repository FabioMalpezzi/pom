## Session Handoff Memory

At the end of a significant session, before final handoff, update `PROJECT_STATE.md` if the project operating context changed.

`PROJECT_STATE.md` is the minimum restart memory for the user and the next AI agent. It must include:

- current state;
- latest relevant decisions or commits;
- recommended next actions;
- open decisions;
- risks or blockers;
- files to read when resuming;
- what not to do without new approval.

Do not update it for tiny edits with no operational impact. If method, governance, priorities, lint, task plans, wiki, or decisions changed, update it before the final response.

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
