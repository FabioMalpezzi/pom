---
name: pom-method
description: Use when POM itself must change - extend it with a new element, improve it after recurring friction, or prune method weight.
---

# Skill - method

## When To Use

- POM needs a new rule, skill, prompt, template, config option, lint check, or script (`extend`).
- Repeated friction, an ambiguous or bypassable governance rule, or memory that keeps landing in the wrong place suggests the method itself should change, with evidence (`improve`).
- POM feels heavier than the problem it solves, two elements overlap, a lint check enforces a preference, or a local convention leaked into the general method (`prune`).

Not for: Target Project features (`plan`), defects in POM tooling with a known symptom (`diagnose`), Target Project bugs (`root-cause`), or project-specific configuration (`config`).

## Modes

Pass the mode as the first instruction. When unsure, start with `prune`: it decides whether the change belongs in POM at all before anything is added.

| Mode | Purpose | Canonical prompt |
|---|---|---|
| `extend` | Add or change a POM element at the smallest fitting level: config guidance, template, prompt, skill, lint, or script. | `prompts/12-extend-pom.md` |
| `improve` | Run a bounded self-improvement loop: observe friction, diagnose, propose, verify with evidence, then promote or discard. | `prompts/25-self-improvement-loop.md` |
| `prune` | Simplify, merge, demote, delete, or config-gate POM elements that no longer protect memory, verification, or source authority. | `prompts/21-prune-pom-method.md` |

## Key Rules

- Use `skills/clarify.md` first if the objective or the correct POM level is unclear.
- Preserve the founding order: memory > verification > organization. An element stays only if it helps a future agent understand state, verify completion, or avoid rediscovering a project fact.
- Read current sources from disk; do not reconstruct POM from session memory.
- Choose the smallest necessary level; do not turn local adaptations into general rules without a reason.
- A skill stays short and points to a canonical prompt; prefer one canonical rule plus references over repeated prose.
- Keep backward-compatible entry points, or leave a migration note when one is removed.
- Ask for approval before promoting a method change; verify with tests/lint for code and thesis/antithesis for normative changes.
- Use `skills/sync.md` after a framework-level change when a target project must be aligned to the new POM commit.
- Update `PROJECT_STATE.md` when the operating context changes, and run `npm run pom:lint` when available.

## Memory Impact

Method changes must improve operating memory, verification, or portability. If a proposal mostly adds process, run `prune` before implementing it.

## Output

- mode used and the observation or request that triggered it;
- proposed or applied change, with the POM level touched and the files changed;
- verification run (lint, tests, thesis/antithesis) and result;
- promotion or discard decision, and any open decision recorded in a governed place.
