# Prompt - Create Or Update Project State

Use this prompt to create or update a quick project restart file.

```text
Create or update PROJECT_STATE.md.

Purpose: let me and the AI resume the project after days or weeks without rereading everything.

First read only the essential files:
- README.md;
- `AGENTS.md`/`AGENTS.MD` or equivalent;
- existing PROJECT_STATE.md, if present;
- roadmap/current plan, if present;
- latest relevant ADRs;
- wiki/index.md and wiki/log.md, if present;
- wiki pages indicated by index/log as relevant to the current state.

Do not read the whole repository unless necessary.

PROJECT_STATE.md must include:
- last update;
- current state in 10-15 lines;
- current objective;
- current priorities;
- next actions;
- open decisions;
- blockers/risks;
- files to read when resuming;
- what NOT to do without a new decision.

If you find uncertainty or contradictions, add a "To clarify" section.
```
