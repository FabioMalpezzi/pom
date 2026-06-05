---
name: using-pom
description: Use when starting POM work, choosing a POM skill, or operating in a project with pom/ installed.
---

# Skill - using-pom

## When To Use

- At the start of a POM-related session.
- Before choosing another POM skill.
- When an installed `pom/` folder is present and the agent needs the project posture.
- After context compaction or handoff when POM rules may have fallen out of context.

## Canonical Prompt

`prompts/32-using-pom.md`

## Key Rules

- Read the canonical prompt before any POM action.
- Read `pom.config.json` when present before creating, moving, or judging governed artifacts.
- Use `skills/README.md` as the skill catalog; do not route from memory alone.
- Use skill descriptions only as triggers; read the full skill card and linked prompt before acting.
- Respect disabled adoption modules. Do not create wiki, decisions, task plans, docs, tests, analysis, or mockups just because POM supports them.
- For session-start hooks, agent instruction files, or tool mapping, read `prompts/references/agent-harnesses.md`.

## Output

- selected POM skill and reason;
- relevant project posture or missing install state;
- integration gap when the harness cannot load `using-pom` at session start;
- next safe action.

## Memory Impact

This is a bootstrap/router skill. It should not create project memory by itself; it chooses the right POM procedure so Operating Memory is changed only by the appropriate skill.
