---
name: reconcile
description: Use this skill when a divergence between a source and project memory must be resolved — classifying it as obsolescence, contradiction, expiry, or gap, and applying the appropriate resolution with loop closure.
---

# Skill - reconcile

## When To Use

- A wiki page, ADR, or spec cites a source that has since changed.
- Two authoritative sources disagree on the same fact.
- A fact in memory is no longer relevant (expired).
- Expected knowledge is missing from memory.
- After `wiki stale` detection identifies a candidate that needs more than a simple update.

## Canonical Prompt

`prompts/19-reconcile-memory.md`

## Main Template

`pom/templates/RECONCILIATION_TEMPLATE.md`

## Related Skills

- Use `skills/wiki.md` in `stale` mode first to detect candidates; then use `reconcile` to resolve them.
- Use `skills/validate.md` after reconciliation to verify governance state.

## Divergence Types

| Type | When | Resolution |
|---|---|---|
| Obsolescence | Source updated, memory cites old version | Update wiki page |
| Contradiction | Two authoritative sources disagree | Create ADR, then update wiki |
| Expiry | Fact no longer relevant | Archive or remove memory |
| Gap | Expected knowledge missing | Create wiki page or open question |

## Key Rules

- Classify the divergence type before proposing any resolution.
- Contradictions require an ADR — do not resolve them with a wiki update alone.
- Do not modify memory without explicit approval.
- After resolution, scan for other memory with the same problem (loop closure).
- Run lint after changes.

## Output

- divergence type and classification rationale;
- resolution applied;
- loop closure scan result;
- lint run;
- open follow-up.
