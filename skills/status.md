# Skill - status

## When To Use

- A document type or status is ambiguous.
- A spec, ADR, task, project state, wiki page, or plan needs a `Status`.
- The user asks whether a term like Waiting, Deferred, Backlog, Draft, or Accepted is correct.

## Canonical Prompt

`prompts/15-classify-document-status.md`

## Main Templates

- `templates/ADR_TEMPLATE.md`
- `templates/SPEC_TEMPLATE.md`
- `templates/TASK_PLAN_TEMPLATE.md`
- `templates/CURRENT_PLAN_TEMPLATE.md`
- `templates/PROJECT_STATE_TEMPLATE.md`

## Rule

Choose the least misleading status. In particular, use `Deferred` for deliberate
postponement and reserve `Waiting` for external input or dependency wait.

## Output

- document type;
- status;
- rationale;
- path convention from `pom.config.json`;
- implementation scope: yes/no.
