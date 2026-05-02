# TASK-0000 - Task Title

## Status

Planned

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

## Origin

| Type | Reference |
|---|---|
| Spec |  |
| ADR |  |
| Wiki |  |
| Analysis |  |
| Mockup |  |

## Objective

Describe what must be implemented or clarified.

## Placement

| Level | Value |
|---|---|
| Phase |  |
| Workstream |  |
| Task |  |

## Steps

- [ ] Concrete step
- [ ] Concrete step

## Verification

A task cannot be marked Complete without passing the completion verification gate. This verification is mandatory and automatic — the agent executes it when marking Complete.

### Step 0 — Goal-backward check (mandatory, always first)

Before checking tests or theses, verify that the declared objective has been achieved:

- [ ] What must be TRUE for the objective to be met? List the truths.
- [ ] For each truth, what must EXIST? Verify against actual artifacts.
- [ ] If the goal is not met, the task cannot be Complete regardless of checkbox status.

### For tasks with code (scenario tests — mandatory for Complete)

- [ ] At least 2 positive scenario tests based on real user use cases the task generates or is involved in
- [ ] At least 1 error/misuse scenario test validating incorrect or improper usage (more is better)
- [ ] Tests run and pass
- [ ] Test location consistent with the project structure or `tests/<analysis-or-workstream-or-module>/...`

### For tasks without code (semantic validation — mandatory for Complete)

- [ ] At least 1 thesis: argument or evidence proving the task outcome is valid, based on use cases it generates or is involved in
- [ ] At least 1 antithesis: a case of incorrect or improper usage demonstrated to be false or inferior (more is better)
- [ ] Every antithesis is confuted — the task cannot close Complete otherwise

### Step-level verification (atomic checks, tracked within each step)

- [ ] Unit test, lint, or single check per step

### Cross-cutting checks

- [ ] Critical analysis of contradictions and gaps
- [ ] Security/privacy check, if relevant

### Exception

If verification is not possible, document the reason here and close as "Complete with exceptions":

Exception reason: _none_

## Test Structure

| Item | Value |
|---|---|
| Existing test structure |  |
| Chosen structure | existing / POM / other approved |
| E2E test path |  |
| Fixture path |  |
| Evidence path |  |

## User Use Cases

- As a ..., I want ..., so that ...
- Positive case 1:
- Positive case 2:
- Handled-error case:

## Risks And Privacy/Security

| Risk | Mitigation |
|---|---|

## Outcome

To be completed at task close.

## Done Criteria

- [ ] Steps completed
- [ ] Verifications run
- [ ] Open issues documented
- [ ] Wiki updated if needed
- [ ] ADR updated if needed
- [ ] Docs updated if needed
