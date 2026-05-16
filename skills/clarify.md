---
name: clarify
description: Use this skill to clarify ambiguous POM work before creating memory or changing method, including whether the next artifact should be nothing, wiki, ADR, spec, task, spike, config, prompt, skill, template, or lint.
---

# Skill - clarify

## When To Use

- The request is ambiguous.
- The next POM artifact is unclear.
- A method change, new memory page, task plan, ADR, or spec might be unnecessary.
- The user asks for analysis before implementation.

## Canonical Prompt

`prompts/20-clarify-pom-work.md`

## Key Rules

- Read the repository before asking questions.
- Ask only questions that cannot be answered from local context.
- Prefer the smallest useful memory artifact.
- If no persistent memory is needed, say so.
- Route to the next skill only after the objective and memory impact are clear.

## Memory Impact

Clarification should reduce ambiguity without creating durable memory by default. Persist only decisions, reusable context, or work that changes a future restart point.

## Output

- clarified objective;
- chosen route;
- memory impact;
- unresolved questions;
- next skill or prompt.
