# Fixture 02 — Documentation-only governance change

Type: documentation-only governance change. Interfaces: NOT APPLICABLE.

## Source spec (input to planning)

Update the project's contribution governance so that every new public API change requires a short "API impact" note in the pull request description.

- Amend `CONTRIBUTING.md` to describe the required "API impact" note and when it applies (any change to an exported symbol).
- Add a PR-description checklist item referencing the note.
- No code, no CI automation, no linter, no tests are requested — this is a documentation and process change only.
- Keep the wording consistent with the existing governance tone (imperative, second person).

## Expected manifest

Exact global constraints every applicable task must preserve:

- Scope is documentation/process only: no code, CI, linter, or test artifacts may be introduced.
- Wording style: imperative, second person, consistent with existing governance.

Shared interface / dependency contracts:

- NOT APPLICABLE. A correct plan states `not applicable` for consumes/produces interfaces rather than inventing a code contract.

Independence / sizing:

- One or two documentation tasks is correct. Do not fabricate implementation, CI, or verification-code tasks.

Trap to avoid: inventing a code interface, a CI job, or a test task to fill the Dependency/Interface Map; forcing a machine-checkable "contract" onto prose.
