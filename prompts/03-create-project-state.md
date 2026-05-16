# Prompt - Create Or Update Project State

Use this prompt to create or update a quick project restart file.

```text
Create or update PROJECT_STATE.md.

Purpose: let me and the AI resume the project after days or weeks without rereading everything.

First read only the essential files:
- README.md;
- supported agent instruction files, if present;
- existing PROJECT_STATE.md, if present;
- roadmap/current plan, if present;
- latest relevant ADRs;
- wiki/index.md and wiki/log.md, if present;
- wiki pages indicated by index/log as relevant to the current state.

Do not read the whole repository unless necessary.

PROJECT_STATE.md has two sections with different update frequencies:

Static Context — update only when the project's direction, stack, or permanent constraints change:
- project purpose (one sentence);
- key constraints and structural decisions (link to ADRs);
- files to always read when resuming;
- what NOT to do without a new decision.

Dynamic Context — update at every significant session or when priorities, risks, or next actions change:
- current state in 5-10 lines;
- current objective;
- current priorities;
- next actions;
- open decisions;
- blockers/risks.

Rules:
- do not update Static Context for operational changes — it describes the project, not the session;
- do not update Dynamic Context for permanent structural changes — create or update an ADR instead;
- keep the total file under the configured maxLines limit (default 220);
- compaction rule 1: if the file exceeds the limit, compact Dynamic Context — remove completed actions, archive closed decisions to decisions/ or wiki/log.md, delete resolved risks; never compact Static Context;
- compaction rule 2: Dynamic Context must describe current state and next steps only — if a section is becoming a log or changelog, move it to wiki/log.md, decisions/, or Git and remove it from PROJECT_STATE.md;
- if you find uncertainty or contradictions, add a "To clarify" section under Dynamic Context.
```
