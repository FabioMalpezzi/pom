---
name: status
description: Use this skill when a document type or status field is ambiguous — classifying whether the artifact is a spec, ADR, task, wiki page, or plan, and choosing the least misleading status.
---

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

Use `skills/status.md` when the document type or status field is ambiguous. Once the type and status are clear:
- if the work should be parked without implementing it, use `skills/defer.md`;
- if the work should become a task plan, use `skills/plan.md`.

## Output

- document type;
- status;
- rationale;
- path convention from `pom.config.json`;
- implementation scope: yes/no.
