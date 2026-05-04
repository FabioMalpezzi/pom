---
name: handoff
description: Use this skill at the end of a significant session to update project state, run lint, verify completed work, and leave a clear restart point.
---

# Skill - handoff

## When To Use

- End of a significant session.
- Before leaving the AI agent.
- After changes to governance, wiki, lint, tasks, decisions, or project state.

## Related Skills

- Use `skills/validate.md` as part of handoff to run the full governance punch list before closing the session.

## Canonical Prompt

`prompts/07-update-project-after-work.md`

## Key Rules

- Before handoff, verify that any work marked Complete during this session has passed the completion verification gate (goal-backward + scenario tests or thesis/antithesis).
- Update `PROJECT_STATE.md` if the operating context changes.
- Use Git for fine-grained history.
- Do not update everything automatically.
- Run available lint/tests.
- Treat lint findings as work to resolve before closing. If a finding is intentionally accepted, document why.

## Config

Read `pom.config.json`, especially the `handoff` section, before updating or evaluating `PROJECT_STATE.md`.

## Output

- updated restart memory;
- lint/tests run;
- completed/open tasks;
- next restart point.
