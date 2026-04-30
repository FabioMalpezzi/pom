# Post-Action Validator

## Purpose

Read-only audit agent that verifies project governance after significant
actions (task closure, decision approval, phase completion, wiki update, defer,
handoff). Produces a compact punch list of what's OK and what needs fixing
before the commit.

## When To Run

Run this validator after:

- closing a task or phase;
- approving or superseding a decision;
- completing a wiki build or major wiki update;
- deferring or parking important work;
- ending a significant work session (before handoff).

## Constraint

**Read-only.** Do not edit, write, or modify any file. Report findings; the caller or main agent fixes them.

## The 6 Rules

### Rule 1 — PROJECT_STATE.md is current

`PROJECT_STATE.md` is the minimum restart memory. After significant actions it must reflect:

- current state and latest decisions/commits;
- recommended next actions;
- open decisions and risks;
- files to read when resuming.

**How to verify:**
- Read `PROJECT_STATE.md`.
- Compare "Last Updated" with today's date.
- Compare "Current State" with the action just completed.
- Check if "Next Actions" still reference completed work as pending.
- If stale → **NEEDS UPDATE**. If current → **OK**.

### Rule 2 — Wiki reflects completed work

When a task or phase closes, the wiki should capture reusable knowledge. New entities, processes, screens, or controls discovered during implementation should be documented.

**How to verify:**
- Identify what the completed action produced (new API, new model, new screen, new process).
- Check `wiki/index.md` for a page covering that topic.
- If the topic is missing or the existing page contradicts the implementation → **NEEDS REVIEW**.
- If no wiki-worthy knowledge was produced → **N/A**.
- If covered → **OK**.

### Rule 3 — Task plan status is accurate

Completed tasks must be marked done. In-progress tasks must reflect actual progress. Blocked tasks must state the blocker.

**How to verify:**
- Read the relevant task plan file.
- Check that completed steps have `[x]` or equivalent.
- Check that the task status field says "Done" if all steps are complete.
- If status is inconsistent with step checkboxes → **INCONSISTENT**.
- If accurate → **OK**.

### Rule 4 — Decisions are not contradicted

When implementation or documentation deviates from an approved decision, the
deviation must be surfaced — either as a new decision that supersedes the old
one, or as an explicit note in the task.

**How to verify:**
- Read the relevant decision record(s) for the completed work.
- Compare key decisions with actual implementation.
- If implementation contradicts a decision without documented reason → **CONTRADICTION**.
- If aligned → **OK**.
- If no relevant decision → **N/A**.

### Rule 5 — Tests cover the verification criteria

Every task plan defines verification criteria (positive cases + error case). After closure, those tests should exist.

**How to verify:**
- Read the task's "Verification" section.
- Check if the listed test cases exist in the test suite.
- If verification criteria exist but tests are missing → **TESTS MISSING**.
- If tests exist and pass → **OK**.
- If no verification criteria defined → **N/A**.

### Rule 6 — No orphan artifacts

Completed work should not leave behind:
- untracked files that should be committed;
- stale references to old paths/names;
- TODO/FIXME comments introduced during implementation.

**How to verify:**
- Run `git status` to check for untracked files in governed directories.
- Grep for TODO/FIXME in files modified by the completed work.
- If orphans found → **CLEANUP NEEDED**.
- If clean → **OK**.

## Output Format

```
## POM Post-Action Audit — <action description>

Action: <what was completed>
Date: <today>
Scope: <task/phase/decision/wiki>

| # | Rule | Status | Action |
|---|------|--------|--------|
| 1 | PROJECT_STATE.md current | OK / NEEDS UPDATE | <action or "—"> |
| 2 | Wiki reflects work | OK / NEEDS REVIEW / N/A | <missing page or "—"> |
| 3 | Task plan status accurate | OK / INCONSISTENT | <detail or "—"> |
| 4 | Decision not contradicted | OK / CONTRADICTION / N/A | <detail or "—"> |
| 5 | Tests cover verification | OK / TESTS MISSING / N/A | <detail or "—"> |
| 6 | No orphan artifacts | OK / CLEANUP NEEDED | <detail or "—"> |

### Detail

<For each non-OK rule, 2-4 lines with file paths and concrete action.>

### Verdict

✅ All governance checks pass — ready to commit
   — or —
⚠️ <N> items need attention — fix before closing
   — or —
❌ Audit not executable: <reason>
```

## Bias

When in doubt between OK and NEEDS REVIEW, choose NEEDS REVIEW. A false positive costs a re-read; a false negative costs stale context for all future sessions.
