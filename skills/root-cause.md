---
name: root-cause
description: Use when bugs, test failures, build failures, performance issues, or unexpected behavior need root-cause investigation.
---

# Skill - root-cause

## When To Use

- A Target Project has a bug, failing test, failing build, performance problem, integration issue, or unexpected behavior.
- The first apparent fix is tempting but the cause has not been proven.
- A previous fix did not work or exposed a different failure.
- The user asks to debug application behavior rather than POM method/tooling.

## Canonical Prompt

`prompts/34-root-cause-debugging.md`

## Key Rules

- No fix before root-cause investigation. If an emergency mitigation is needed, label it as containment, not a fix.
- Reproduce or gather enough evidence before changing implementation.
- Read errors, logs, tests, recent diffs, config, and relevant code from disk; do not diagnose from session memory.
- Form one concrete hypothesis at a time and test it with the smallest useful check.
- Fix the cause, not the symptom. Avoid bundled refactors and unrelated improvements.
- Add a regression test, scenario test, or repeatable reproduction when the project has a stable test seam.
- If three fix attempts fail, stop and question the architecture or assumptions with the user.

## Related Skills

- Use `skills/diagnose.md` for POM workflow, installer, prompt, template, lint, or memory defects.
- Use `skills/check.md` after the fix to verify the completed task or phase.
- Use `skills/spike.md` when investigation requires risky, broad, dependency-heavy, or temporary exploration.

## Output

- observed failure and reproduction status;
- evidence read;
- root cause or narrowed hypothesis;
- fix or containment decision;
- verification run;
- remaining risk and memory impact.
