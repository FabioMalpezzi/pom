---
name: challenge
description: Use this skill to run an adversarial thesis/antithesis review of an ADR, non-code spec, task plan, or normative document before accepting or completing it.
---

# Skill - challenge

## When To Use

- Before accepting an ADR.
- Before completing a spec or task plan that has no executable test gate.
- Before approving a normative document change.
- When the user asks for antithesis, adversarial review, challenge, critique, or validation against self-confirmation.

Do not use this skill for Open Discussion documents. They are not authoritative yet; keep them open or promote them first.

## Canonical Prompt

`prompts/24-challenge-antithesis.md`

## Key Rules

- Re-read the target document and linked sources from disk.
- Do not rely on session memory.
- Search for plausible ways the thesis could be false, incomplete, unsafe, or contradicted.
- Prefer source-grounded objections over style comments.
- Do not edit the target document unless the user explicitly asks for a follow-up edit.

## Output

- target document and linked sources reviewed;
- strongest antitheses found;
- whether each antithesis is confuted, unresolved, or document-breaking;
- verdict: Pass, Pass with exceptions, or Does not pass;
- recommended next action.
