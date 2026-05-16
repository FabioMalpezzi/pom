---
name: help
description: Use this skill when the user asks which POM skill, prompt, or template exists or should be used.
---

# Skill - help

## When To Use

- The user asks which POM skill to use.
- POM, prompts, templates, or config need to be explained.
- Navigation is needed across `skills/`, `prompts/`, `templates/`, and `pom.config.json`.
- Use `skills/clarify.md` instead when the work itself is ambiguous and may create or change memory.

## Sources To Read

- `pom/skills/README.md` — read this first: it lists all available skills with their prompts
- `pom.config.json`, when present
- `README.md`, when general context is needed
- `PROJECT_STATE.md`, when the request concerns project state

## Rules

- Do not modify files.
- Explain which skills are available and when to use them.
- Suggest the most appropriate skill for the request.
- Remind that a skill always points to a canonical prompt.
- Remind that `pom.config.json` governs project-specific conventions.
- If the user needs to decide whether memory should be created, route to `skills/clarify.md`.

## Output

- recommended skill;
- reason for the choice;
- canonical prompt to read;
- relevant templates/config;
- recommended next action.
