# Skill - validate

## When To Use

- After closing a task, phase, or workstream.
- After approving, superseding, deferring, or rejecting a decision.
- After a major wiki update.
- Before ending a significant work session (handoff).
- When asked to verify project governance state.

## Canonical Prompt

`prompts/18-post-action-validator.md`

## Key Rules

- Read-only: do not modify any file.
- Check all 6 rules independently — do not stop if one is ambiguous.
- Bias toward NEEDS REVIEW over OK when uncertain.
- Produce the punch list in the exact output format specified.
- The caller or main agent fixes the issues, not the validator.

## The 6 Rules (summary)

1. **PROJECT_STATE.md is current** — reflects latest state, decisions, next actions.
2. **Wiki reflects completed work** — new knowledge is captured, no contradictions.
3. **Task plan status is accurate** — checkboxes and status fields match reality.
4. **Decisions not contradicted** — implementation aligns with approved decisions.
5. **Tests cover verification criteria** — defined test cases exist and pass.
6. **No orphan artifacts** — no untracked files, stale refs, or leftover TODOs.

## Config

Read `pom.config.json` for:
- `wiki`: if disabled, skip Rule 2.
- `decisions`: if disabled, skip Rule 4.
- `tests`: if disabled, skip Rule 5.
- `taskPlans.root`: to find task plan files for Rule 3.

## Output

Punch list table with OK / NEEDS REVIEW / N/A per rule, detail section for non-OK items, and verdict (✅ / ⚠️ / ❌).
