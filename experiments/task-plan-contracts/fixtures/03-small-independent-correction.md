# Fixture 03 — Small independent correction (over-fragmentation trap)

Type: small independent correction. Interfaces: NOT APPLICABLE (single task).

## Source spec (input to planning)

A date formatting helper `formatDate(d)` renders months 0-indexed, so January shows as "00". Fix it to render 1-indexed months and add one regression test.

- Single file `src/format-date.js`, single function.
- One regression test asserting January renders as "01".
- No API change, no new dependency, no configuration.

## Expected manifest

Exact global constraints every applicable task must preserve:

- No public API change to `formatDate`'s signature.
- No new dependency, no configuration change.

Shared interface / dependency contracts:

- NOT APPLICABLE. This is one self-contained task.

Independence / sizing:

- Exactly ONE task (fix + its regression test together). Splitting the fix from its one test, or adding setup/config sub-tasks, is over-fragmentation and must be rejected.

Trap to avoid: producing three tasks ("write test", "apply fix", "run lint") for a one-line correction; the verification (the regression test) belongs with the deliverable.
