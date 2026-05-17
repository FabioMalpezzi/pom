---
name: zero-tech-debt
description: Use this skill to reshape a scoped change around the intended product and architecture end state, deleting accidental compatibility only after checking real callers and protected public contracts.
---

# Skill - zero-tech-debt

## When To Use

- A change has accumulated temporary wrappers, mode flags, duplicate flows, route aliases, fallbacks, or compatibility code.
- The user asks to clean up a patch as if the intended UX and architecture had existed from day one.
- A refactor is needed to make the final product surface coherent before closing work.

## Canonical Prompt

`prompts/23-zero-tech-debt.md`

## Key Rules

- Keep the refactor scoped to the current change.
- Optimize for the code that should exist, not the smallest diff from the old shape.
- Search for real callers before preserving compatibility.
- Do not delete public APIs, persisted routes, saved state, migrations, config keys, or external integration points without explicit approval or verified migration.
- Prefer one clear component or flow over mode flags.
- Do not invent a generic framework for one feature.
- Keep source files within POM file-size standards: aim under 800 lines and do not exceed 1000 lines for hand-written source.
- Write the final shape in idiomatic, readable code: product-intent names, small units, explicit boundaries, localized side effects, and comments only for non-obvious decisions.
- Move shared product rules to one authoritative place.
- Verify the intended flow and the deleted assumptions.

## Memory Impact

This skill protects POM's operating memory by keeping code aligned with what the system actually does. It removes accidental historical paths that would otherwise create false memory for future agents.

## Output

- intended end state;
- deleted compatibility paths and caller evidence;
- final structure;
- code writing practices applied or intentionally left to existing project conventions;
- source files that were split or kept below the size limit;
- tests or checks run;
- remaining risks or decisions.
