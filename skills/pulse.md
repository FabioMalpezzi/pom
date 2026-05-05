---
name: pulse
description: Use this skill to create or update PROJECT_STATE.md — resuming after a pause or recording a change in governance, priorities, risks, or next actions.
---

# Skill - pulse

## When To Use

- Resume the project after a pause.
- Update the minimum handoff memory.
- Governance, priorities, risks, decisions, or next actions changed.

## Canonical Prompt

`prompts/03-create-project-state.md`

## Main Template

`templates/PROJECT_STATE_TEMPLATE.md`

## Config

Read `pom.config.json`, especially `handoff.projectStatePath`, `handoff.maxLines`, `handoff.triggerPaths`, and `handoff.forbiddenHeadings`.

## Key Rules

- **Static Context** (project purpose, constraints, permanent decisions): update only when the project's direction or stack changes. Do not touch for operational updates.
- **Dynamic Context** (current state, priorities, next actions, risks): update at every significant session.
- Permanent structural changes belong in an ADR, not in Static Context.
- **Compaction rule 1:** if the file exceeds the maxLines limit, compact Dynamic Context — remove completed actions, archive closed decisions to `decisions/` or `wiki/log.md`, delete resolved risks. Never compact Static Context.
- **Compaction rule 2:** Dynamic Context must describe current state and next steps only. If a section is becoming a log or changelog, move it to `wiki/log.md`, `decisions/`, or Git and remove it from `PROJECT_STATE.md`.

## Output

- updated `PROJECT_STATE.md` with static and dynamic sections correctly separated;
- static context updated only if project direction or constraints changed;
- dynamic context updated with current state, priorities, next actions, open decisions;
- minimum files to read.
