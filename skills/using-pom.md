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

- Read the canonical prompt before any POM action: it fixes the order (locate POM, read `pom.config.json`, read the catalog, route, load the selected skill) and the disabled-module guard.
- Route from the `skills/README.md` catalog, whose `Use` column is the routing signal; do not route from memory alone.
- For session-start hooks, agent instruction files, or tool mapping, read `prompts/references/agent-harnesses.md`.

## Output

- selected POM skill and reason;
- relevant project posture or missing install state;
- integration gap when the harness cannot load `using-pom` at session start;
- next safe action.

## Memory Impact

This is a bootstrap/router skill. It should not create project memory by itself; it chooses the right POM procedure so Operating Memory is changed only by the appropriate skill.
