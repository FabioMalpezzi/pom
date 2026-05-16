---
name: prune
description: Use this skill to reduce POM bloat by simplifying, merging, demoting, deleting, or config-gating rules, prompts, skills, templates, and lint checks that no longer protect operating memory.
---

# Skill - prune

## When To Use

- POM feels heavier than the problem it solves.
- Two skills, prompts, templates, or rules overlap.
- A lint check enforces a preference instead of a stable rule.
- A local project convention has leaked into the general method.
- The user asks whether POM has drifted from its founding idea.

## Canonical Prompt

`prompts/21-prune-pom-method.md`

## Key Rules

- Preserve the founding order: memory > verification > organization.
- Delete or merge rules that do not protect operating memory, verification, or source authority.
- Demote occasional workflows instead of making them mandatory.
- Prefer one canonical rule plus references over repeated prose.
- Keep backwards-compatible entry points unless there is a migration note.

## Memory Impact

Pruning improves memory quality by removing noise. A rule should remain only if it helps a future agent understand state, verify completion, or avoid rediscovering a project fact.

## Output

- keep/simplify/merge/demote/delete/config-gate recommendation;
- affected files;
- memory risk;
- verification to run.
