# Skill - handoff

## When To Use

- End of a significant session.
- Before leaving the AI agent.
- After changes to governance, wiki, lint, tasks, decisions, or project state.

## Canonical Prompt

`prompts/07-update-project-after-work.md`

## Key Rules

- Update `PROJECT_STATE.md` if the operating context changes.
- Use Git for fine-grained history.
- Do not update everything automatically.
- Run available lint/tests.

## Config

Read `pom.config.json`, especially the `handoff` section, before updating or evaluating `PROJECT_STATE.md`.

## Output

- updated restart memory;
- lint/tests run;
- completed/open tasks;
- next restart point.
