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

## Output

- updated `PROJECT_STATE.md`;
- concise current state;
- next actions;
- open decisions;
- minimum files to read.
