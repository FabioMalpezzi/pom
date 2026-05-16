---
name: handoff
description: Use this skill at the end of a significant session to leave a clear restart point, updating project state only when operating context changed.
---

# Skill - handoff

## When To Use

- End of a significant session.
- Before leaving the AI agent.
- After changes to governance, wiki, lint, tasks, decisions, or project state.

## Related Skills

- Use `skills/validate.md` during handoff only when governed memory changed significantly or the user asks for a governance audit.
- Use `skills/pulse.md` when the restart point itself needs to be created or refreshed.

## Canonical Prompt

`prompts/07-update-project-after-work.md`

## Key Rules

- Before handoff, verify that any work marked Complete during this session has passed the completion verification gate (goal-backward + scenario tests or thesis/antithesis).
- Update `PROJECT_STATE.md` if the operating context changes.
- Do not rewrite `PROJECT_STATE.md` when nothing materially changed; state that no memory update is needed.
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

## Memory Impact

`handoff` writes restart memory, not a full diary. Capture only state, decisions, blockers, next actions, and verification that matter to the next session.
