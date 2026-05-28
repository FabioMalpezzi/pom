# Prompt - Process Project Reader Notes

Use this prompt when a person has created one or more annotations in the POM Project Reader and an agent must process the note.

Project Reader annotations are human review notes. They are useful handoff records, but they are not source authority and they are not automatic edit commands. A note becomes a durable POM or project change only after the agent reads the current repository sources, judges the request, applies or proposes the smallest fitting change, records the outcome, and verifies the result.

## Before Modifying Files

1. Read the local instructions for the repository, including `AGENTS.md` or `AGENTS.MD` when present.
2. If the work changes POM method files, read `CONTEXT.md`, `skills/README.md`, and `prompts/README.md`.
3. Check `git status --short` and do not overwrite unrelated user changes.
4. Confirm the Project Reader annotation directory:
   - default: `.pom-reader/annotations`;
   - custom: use the same `--annotations-dir` used when the reader server was launched.
5. Decide whether this turn should process one annotation or an explicitly requested batch. Default to one annotation.

## Annotation Statuses

Use the statuses already defined by the Project Reader annotation schema:

| Status | Meaning |
|---|---|
| `new` | A person created the note and no agent has taken it yet. |
| `triaged` | The note has been reviewed enough to be ready for a later agent or decision. |
| `in_progress` | An agent has taken the note and is working on it. |
| `resolved` | The note was processed and the durable outcome was recorded. |
| `parked` | The note is valid but cannot be acted on yet because it needs a later decision, missing source, or unavailable context. |
| `discarded` | The note was reviewed and intentionally not applied because it is obsolete, invalid, duplicate, or outside the project rules. |

The UI groups these records into working and processed views. Treat `resolved` and `discarded`, or any annotation with an `agentReport`, as processed. Treat `new`, `triaged`, `in_progress`, and `parked` as working records.

The current CLI exposes `take`, `claim-next`, and `resolve`. If this POM version does not expose a command for `triaged`, `parked`, or `discarded`, do not hand-edit the annotation JSON. State the intended status and reason in the final answer, and leave the record unresolved unless the user asks for explicit recovery or schema maintenance.

## Commands

Run commands from the inspected project root. When POM is installed under `pom/`, prefix the script path with `pom/`.

List open notes:

```bash
node scripts/project-reader/wiki-tools.mjs list --status new
node scripts/project-reader/wiki-tools.mjs list --status triaged
```

Claim the next open note:

```bash
node scripts/project-reader/wiki-tools.mjs claim-next --by <agent-name>
```

Show one note:

```bash
node scripts/project-reader/wiki-tools.mjs show <annotation-id>
```

Take one selected note:

```bash
node scripts/project-reader/wiki-tools.mjs take <annotation-id> --by <agent-name>
```

Resolve a processed note:

```bash
node scripts/project-reader/wiki-tools.mjs resolve <annotation-id> --by <agent-name> --note "<concise outcome>"
```

Use `--annotations-dir <dir>` on every command when the reader uses a custom annotation directory.

## Core Workflow

1. Discover candidate notes.
   - If the user named an annotation id, use that id.
   - If the user asked for the next note, use `claim-next --by <agent-name>`.
   - If there are multiple `new` or `triaged` notes and no selection rule, list them and ask the user which one to process.
2. Claim the note before editing.
   - Use `take` for a chosen note.
   - Use `claim-next` when the next `new` or `triaged` note is acceptable.
3. Read the full annotation with `show`.
   - Capture `annotationId`, `status`, `target.path`, `target.lineStart`, `target.lineEnd`, `selectedText`, `annotation`, and `requestedAction` when present.
4. Read the current target file from disk.
   - Search for `selectedText` when present.
   - If the selected text no longer exists, locate the closest current section before editing.
   - If the target file is missing, report the gap and do not reconstruct content from memory.
5. Decide the outcome.
   - Apply a direct edit only when the human note is clear, the target file still supports it, and the change respects the project's source authority.
   - Ask before modifying additional files unless the annotation clearly implies a standard paired update, such as a wiki page plus `wiki/log.md`.
   - Use `skills/reconcile.md` when the note exposes a divergence between two authoritative sources.
   - Use `skills/clarify.md` when the requested action is ambiguous enough that a reasonable edit would be risky.
6. Apply the smallest durable change.
   - Edit canonical repository files, not generated reader output or annotation runtime files.
   - For wiki changes, update the relevant Markdown page and add a short entry to `wiki/log.md`.
   - Do not update `wiki/_site/` manually; let lint or the wiki renderer regenerate it when configured.
7. Record the annotation outcome.
   - Use `resolve` only after the change is applied, verified, or intentionally answered without a file edit.
   - The `--note` value must say what happened, for example `Updated wiki/reader-capabilities.md and wiki/log.md to clarify annotation statuses.`
   - If the right outcome is `parked` or `discarded` but the current CLI cannot set that status, do not mark it `resolved` just to close the queue. Report the intended status and the blocker.
8. Verify.
   - Run `npm run pom:lint` when available after POM, documentation, or wiki changes.
   - Treat `reader-notes-open` lint warnings as routing guidance to this prompt, not as proof that every note must be processed in the same turn.
   - Run narrower tests when code changed.
   - If verification cannot be run, state why and what remains unverified.
9. Report the result.
   - Include the annotation id, files changed, command used to record the outcome, and verification result.
   - Mention any human decision still needed.

## Example - Process The Next Clear Documentation Note

Use this when the user says "process the next Project Reader note" and there is no need to choose manually.

```bash
node scripts/project-reader/wiki-tools.mjs claim-next --by <agent-name>
node scripts/project-reader/wiki-tools.mjs show annotation-20260528-example-reader-capabilities-md
```

Then:

1. Read the target file named in `target.path`.
2. Find `selectedText` in the current file.
3. Apply the requested wording change if it is still valid.
4. If a wiki page changed, update `wiki/log.md`.
5. Run `npm run pom:lint`.
6. Resolve the note:

```bash
node scripts/project-reader/wiki-tools.mjs resolve annotation-20260528-example-reader-capabilities-md --by <agent-name> --note "Clarified the Project Reader annotation status wording and updated wiki/log.md."
```

## Example - Choose Among Multiple Human Notes

Use this when several notes are open and the user did not name one.

```bash
node scripts/project-reader/wiki-tools.mjs list --status new
node scripts/project-reader/wiki-tools.mjs list --status triaged
```

Report the annotation ids, target paths, and first line of each note. Ask the user which note to process. After selection:

```bash
node scripts/project-reader/wiki-tools.mjs take <annotation-id> --by <agent-name>
node scripts/project-reader/wiki-tools.mjs show <annotation-id>
```

Process only the selected note unless the user asks for a batch.

## Example - Target Project With Installed POM

Use this form from a target project root where POM lives under `pom/`:

```bash
node pom/scripts/project-reader/wiki-tools.mjs claim-next --by <agent-name>
node pom/scripts/project-reader/wiki-tools.mjs show <annotation-id>
node pom/scripts/project-reader/wiki-tools.mjs resolve <annotation-id> --by <agent-name> --note "<concise outcome>"
```

If the target project uses a custom annotation directory:

```bash
node pom/scripts/project-reader/wiki-tools.mjs claim-next --by <agent-name> --annotations-dir .pom-reader/annotations
node pom/scripts/project-reader/wiki-tools.mjs resolve <annotation-id> --by <agent-name> --annotations-dir .pom-reader/annotations --note "<concise outcome>"
```

## Example - Parked Or Discarded Outcome

If the note asks for a change that depends on a missing decision, mark the outcome as `parked` when the current tooling supports it. If not, leave the annotation unresolved and report:

```text
Annotation annotation-... should be parked because it depends on a decision about whether reader-generated output is committed in this target project. The current CLI exposes resolve but not parked, so I did not hand-edit the annotation JSON.
```

If the note is obsolete or duplicate, mark it as `discarded` when the current tooling supports it. If not, report the intended discard reason and leave the record available for a human or future tool command.

## Guardrails

- Do not process annotations from generated reader output as if the generated output were canonical.
- Do not silently propagate a wording change across unrelated files. Ask first unless all touched files are required by an established POM workflow.
- Do not mark an annotation `resolved` before the durable edit or answer exists.
- Do not use annotation text as evidence for claims about current behavior. Read the current source.
- Do not commit `.pom-reader/` files unless the project explicitly archives annotation evidence.
- Do not mix several unrelated annotations into one change unless the user requested a batch and the notes clearly share one outcome.

## Expected Output

- annotation id processed;
- status before and intended status after;
- target path and sources read;
- files changed or reason no file changed;
- annotation outcome command run, or reason it could not be recorded;
- verification commands and results;
- remaining human decision, if any.
