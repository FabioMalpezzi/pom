---
name: help
description: Use this skill when the request is ambiguous or the user asks which POM skill, prompt, or template to use for a given task.
---

# Skill - help

## When To Use

- The user asks which POM skill to use.
- POM, prompts, templates, or config need to be explained.
- The request is ambiguous and the correct workflow must be chosen.
- Navigation is needed across `skills/`, `prompts/`, `templates/`, and `pom.config.json`.

## Sources To Read

- `skills/README.md`
- `pom.config.json`, when present
- `README.md`, when general context is needed
- `PROJECT_STATE.md`, when the request concerns project state

## Rules

- Do not modify files.
- Explain which skills are available and when to use them.
- Suggest the most appropriate skill for the request.
- Remind that a skill always points to a canonical prompt.
- Remind that `pom.config.json` governs project-specific conventions.
- If the request matches no skill, propose the closest POM prompt or state that a new skill is needed.

## Output

- recommended skill;
- reason for the choice;
- canonical prompt to read;
- relevant templates/config;
- recommended next action.
