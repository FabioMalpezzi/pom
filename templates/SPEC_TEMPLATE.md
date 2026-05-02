# Spec - Title

## Status

Draft

Suggested statuses:

| Status | Meaning | Use when |
|---|---|---|
| Waiting | Waiting for something or someone | Blocked by external input |
| Blocked | Cannot proceed because of a concrete impediment | Missing dependency or error |
| Deferred | Deliberately postponed | Decided to do it later |
| Planned | Expected but not started yet | In the active plan |
| Backlog | Future candidate, not yet planned | Parked idea or need |
| Draft | Still being written or reviewed | Spec or task not consolidated |
| Accepted | Approved decision | ADR, not an operational task |

## Purpose

Describe the problem or capability to specify.

## Context

Sources, constraints, mockups, code, or linked decisions.

## Requirements

| ID | Requirement | Priority | Source |
|---|---|---|---|

## Out Of Scope

- Excluded item

## Impacts

| Area | Impact |
|---|---|
| Wiki |  |
| Decisions |  |
| Docs |  |
| Mockups |  |
| Code |  |

## Linked Tasks

- `TASK-0000`

## Completion Verification

This spec cannot be marked Complete without passing the completion verification gate. Verification is mandatory and automatic.

### Step 0 — Goal-backward check (always first)

- [ ] What must be TRUE for the purpose of this spec to be met? List the truths.
- [ ] For each truth, what must EXIST? Verify against actual artifacts.
- [ ] If the goal is not met, the spec cannot be Complete regardless of other checks.

### If this spec has code implementation

- [ ] At least 2 positive scenario tests based on real user use cases this spec generates or is involved in
- [ ] At least 1 error/misuse scenario test validating incorrect or improper usage (more is better)
- [ ] Tests run and pass

### If this spec has no code implementation

- [ ] At least 1 thesis: argument or evidence proving this spec is valid, based on use cases it generates or is involved in
- [ ] At least 1 antithesis: a case of incorrect or improper usage demonstrated to be false or inferior (more is better)
- [ ] Every antithesis is confuted

### Exception

If verification is not possible, document the reason here and close as "Complete with exceptions":

Exception reason: _none_

## Sources And Decisions

- Source:
- ADR:

## Evolution Rule

This spec is a living document. Incremental changes are tracked with Git. If a change alters a structural decision, create or update a linked ADR.
