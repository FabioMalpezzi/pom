---
name: diagnose
description: Use this skill to debug a failing or confusing POM workflow, lint check, installer run, template, skill, prompt, or memory update using a focused feedback loop.
---

# Skill - diagnose

## When To Use

- `pom:lint`, installer, sync, template assembly, or a POM script behaves incorrectly.
- A skill or prompt produces confusing or contradictory output.
- A memory update, task status, decision, or wiki rule appears wrong.
- The root cause is unknown and should be found before changing method.

## Canonical Prompt

`prompts/22-diagnose-pom-problem.md`

## Key Rules

- Build the shortest useful feedback loop first.
- Reproduce the problem before fixing it when possible.
- List concrete hypotheses and test the highest-signal one first.
- Add a regression test when the defect has a stable seam.
- If the issue is caused by method bloat or overlap, route to `skills/prune.md`.

## Memory Impact

Diagnosis protects memory by fixing the mechanism that keeps it trustworthy. Persist the cause only when it affects future operation or explains an intentional exception.

## Output

- failure observed;
- feedback loop;
- root cause or narrowed hypothesis;
- fix or next action;
- verification run;
- remaining risk.
