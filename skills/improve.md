---
name: improve
description: Run a controlled self-improvement loop for a POM-managed project's method/governance: observation -> diagnosis -> proposal -> verification -> promotion or discard.
---

# Skill - improve

## When To Use

- Repeated friction or confusion suggests the operating method needs adjustment.
- A governance rule is ambiguous, contradictory, or easy to bypass.
- Memory keeps landing in the wrong place (wiki vs decisions vs tasks vs analysis).
- A recurring failure in a POM workflow/tooling needs a controlled fix.

Do not use this skill for routine feature delivery work. Use planning workflows instead.

## Canonical Prompt

`prompts/25-self-improvement-loop.md`

## Key Rules

- Read current sources from disk; do not reconstruct from session memory.
- Respect `pom.config.json`, ownership mode, Source Authority, and Artifact Policy.
- Route to existing workflows when applicable:
  - workflow/tool defect -> `skills/diagnose.md`;
  - method bloat/overlap -> `skills/prune.md`;
  - method extension -> `skills/extend.md`.
- Ask for approval before promoting changes.
- Verify with evidence (tests/lint for code, thesis/antithesis for normative changes).

## Output

- observation;
- diagnosis;
- proposal;
- verification result;
- promotion/discard decision;
- next safe step recorded in a governed place.

