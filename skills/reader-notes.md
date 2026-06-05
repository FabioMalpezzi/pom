---
name: reader-notes
description: Use when processing notes created in the POM Project Reader.
---

# Skill - reader-notes

## When To Use

- Process a human note created in the POM Project Reader.
- Triage or claim a Project Reader annotation.
- Turn selected text plus a human note into a source-backed repository edit.
- Record the outcome of a Project Reader annotation without treating the annotation as authority.

## Canonical Prompt

`prompts/26-process-reader-notes.md`

## Key Rules

- Reader annotations are human review notes and handoff records, not document authority and not automatic commands.
- Use the current repository files as authority before proposing or applying a change.
- Process one annotation per turn by default unless the user asks for a batch.
- Use the existing annotation states: `new`, `triaged`, `in_progress`, `resolved`, `parked`, and `discarded`.
- Use an agent-neutral identifier with `--by`, for example `<agent-name>`.
- Do not hand-edit `.pom-reader/` annotation JSON unless the user explicitly asks for recovery work.
- Do not commit annotation runtime files unless the project intentionally archives them.
- When a wiki page changes, update `wiki/log.md`.
- Run `npm run pom:lint` when available after durable POM or wiki changes.

## Output

- annotation id and current status;
- source files read;
- change applied, proposed, parked, or discarded;
- annotation outcome recorded or reason it could not be recorded;
- lint/tests run;
- remaining human decision, if any.
