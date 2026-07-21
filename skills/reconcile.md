---
name: reconcile
description: Use when sources and project memory disagree, expire, or expose a gap.
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
| Obsolescence | Source updated, memory cites old version | Update wiki page (only if `adoption.wiki` is enabled and wiki exists) |
| Contradiction | Two authoritative sources disagree | If `adoption.decisions` is enabled, create an ADR; otherwise use the project's approved decision mechanism or ask whether to enable Decision Records; then update wiki if enabled and present |
| Expiry | Fact no longer relevant | Archive or remove memory |
| Gap | Expected knowledge missing | Create wiki page or open question (only if wiki enabled and exists) |

## Key Rules

- Classify the divergence type before proposing any resolution.
- Contradictions require an explicit authoritative decision; create an ADR only when `adoption.decisions` is enabled. If it is disabled, do not create one implicitly: use the project's approved decision mechanism or ask whether to enable Decision Records.
- Wiki updates apply only when `adoption.wiki` is `enabled` in `pom.config.json` and `wiki/` exists.
- Do not modify memory without explicit approval.
- After resolution, scan for other memory with the same problem (loop closure).
- Run lint after changes.

## Output

- divergence type and classification rationale;
- resolution applied;
- loop closure scan result;
- lint run;
- open follow-up.
