# Spec - YAML Frontmatter For POM Skills

| Field | Value |
|---|---|
| Date | 2026-05-05 |
| Status | Draft |
| Area | architecture |
| Summary | Add YAML frontmatter to POM skill files so agents can discover and invoke them automatically, following the pattern established by Supermemory and the Claude Skills Marketplace |

## Purpose

Make POM skills machine-readable by adding a YAML frontmatter block to each skill file. This enables agents to discover which skill to use automatically — without requiring the user to name the skill explicitly — and aligns POM with the emerging standard for agent skill files.

## Context

POM skills are currently plain Markdown files with a `## When To Use` section written in prose. An agent must read the file to understand when to apply it. This works when the user explicitly says "use the wiki skill" but fails when the user says "check if the wiki is stale" — the agent has no machine-readable signal to match the request to the right skill.

Supermemory's `SKILL.md` uses YAML frontmatter:

```yaml
---
name: supermemory
description: Use this skill when building applications that need persistent memory, user personalization, long-term context retention, or semantic search across knowledge bases.
---
```

The Claude Skills Marketplace and Claude Code's skill discovery mechanism both rely on this frontmatter to:
- identify the skill by name;
- match user requests to skills via the description;
- enable automatic invocation without explicit user instruction.

POM skills have the same structure as Claude skills but lack the frontmatter. Adding it costs nothing and unlocks automatic invocation in any environment that supports skill discovery.

Sources:

- `supermemory/skills/supermemory/SKILL.md` — reference implementation
- `pom/skills/` — current POM skill files (16 skills, no frontmatter)
- `pom/skills/README.md` — current skill index
- Analysis: "Frontmatter YAML nelle skill — Alto impatto, Basso sforzo"

## Requirements

| ID | Requirement | Priority | Source |
|---|---|---|---|
| R1 | Every POM skill file must have a YAML frontmatter block with `name` and `description` fields | High | Analysis |
| R2 | `name` must be the skill filename without extension (e.g., `wiki` for `skills/wiki.md`) | High | Consistency |
| R3 | `description` must be a single sentence that enables automatic invocation: it must describe when to use the skill, not what it does | High | Supermemory pattern |
| R4 | The frontmatter must not break existing Markdown rendering or agent reading | High | Compatibility |
| R5 | The `## When To Use` section must be kept — it provides human-readable detail that the frontmatter description summarizes | Medium | Backward compatibility |
| R6 | The skills/README.md index must remain the authoritative list of available skills | Medium | Existing convention |
| R7 | The lint script must not flag frontmatter as an error in skill files | Low | Governance |

## Proposed Design

### Frontmatter structure

Each skill file gains a frontmatter block at the top:

```yaml
---
name: <skill-filename-without-extension>
description: <one-sentence trigger description for automatic invocation>
---
```

Example for `skills/wiki.md`:

```yaml
---
name: wiki
description: Use this skill to build, query, maintain, or health-check the project wiki — including initial creation, stale page detection, wiki queries with optional archival, and link/orphan checks.
---
```

Example for `skills/validate.md`:

```yaml
---
name: validate
description: Use this skill to audit POM governance after closing a task, approving a decision, completing a wiki update, deferring work, or before a session handoff.
---
```

### Description writing rules

A good description:
- starts with "Use this skill when..." or "Use this skill to...";
- lists the trigger conditions in plain language;
- is one sentence (can use em-dash or semicolons for multiple conditions);
- does not repeat the skill name;
- does not describe the output — only the trigger.

### File structure after change

```markdown
---
name: wiki
description: Use this skill to build, query, maintain, or health-check the project wiki.
---

# Skill - wiki

## When To Use
...
```

### Backward compatibility

- Files remain valid Markdown — YAML frontmatter is ignored by standard Markdown renderers and displayed as a table or code block in others.
- Agents that do not support frontmatter continue to read the `## When To Use` section as before.
- No existing behavior changes — this is additive only.

## Out Of Scope

- Changing the content of any skill (this spec is about frontmatter, not rule changes)
- Adding new fields beyond `name` and `description` (e.g., `tools`, `triggers`) — can be added later via a new spec
- Changing the prompts or templates linked by skills
- Automatic invocation infrastructure — that depends on the agent environment; this spec only adds the signal

## Impacts

| Area | Impact |
|---|---|
| Wiki | none |
| Decisions | none |
| Docs | README may note that skills now support automatic invocation |
| Mockups | none |
| Code | lint script: verify it does not flag frontmatter in skill files |

## Tasks

- [ ] T1: Write frontmatter descriptions for all 16 skill files
- [ ] T2: Add frontmatter to each skill file
- [ ] T3: Verify lint passes after changes
- [ ] T4: Update skills/README.md to note frontmatter support
- [ ] T5: Run completion verification

## Completion Verification

This spec has no code implementation beyond adding frontmatter text: verification is done with scenario tests and semantic validation.

### Step 0 — Goal-backward check (always first)

- [ ] What must be TRUE for the purpose of this spec to be met?
  - Truth 1: all 16 skill files have a YAML frontmatter block with `name` and `description`
  - Truth 2: `name` matches the filename without extension for each skill
  - Truth 3: each `description` starts with "Use this skill" and describes trigger conditions
  - Truth 4: lint passes with 0 errors after the changes
  - Truth 5: the `## When To Use` section is preserved in every skill file
- [ ] For each truth, what must EXIST? Verify against `pom/skills/*.md` and lint output.

### Scenario tests (code — mandatory for Complete)

- [ ] Scenario 1 (positive): all 16 skill files have frontmatter — `grep -l "^---" pom/skills/*.md | wc -l` returns 16
- [ ] Scenario 2 (positive): all `name` fields match filenames — verified by script or manual check
- [ ] Scenario 3 (error/misuse): a skill file without frontmatter is added — agent falls back to `## When To Use` section without error
- [ ] All tests pass

### Exception

Exception reason: _none_

## Sources And Decisions

- Source: `supermemory/skills/supermemory/SKILL.md` — reference frontmatter pattern
- Source: `pom/skills/` — 16 current skill files
- Source: analysis session comparing POM with Supermemory (2026-05-05)
- ADR: none needed — this is an additive change with no structural decision

## Evolution Rule

This spec is a living document. Incremental changes are tracked with Git. If a change alters a structural decision, create or update a linked ADR.
