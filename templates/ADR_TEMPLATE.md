# ADR-0000 - Decision Title

| Field | Value |
|---|---|
| Date | YYYY-MM-DD |
| Status | Draft / Accepted / Superseded |
| Category | governance / product / architecture / technical / security / commercial / compliance |
| Area | wiki / docs / mockups / analysis / AI / ticketing / integrations / billing / tenant |
| Summary | optional one-line decision summary |
| Replaces | ADR-xxxx / none |
| Replaced by | ADR-xxxx / none |
| Driver | mockup / analysis / stakeholder review / technical constraint / commercial constraint / compliance |
| Scope | wiki / docs / mockups / analysis / architecture / functional / AI / integrations / billing |

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

## Context

Describe the problem, change, or contradiction that requires a decision.

## Decision

Describe the chosen decision clearly and verifiably.

## Rationale

Explain why this choice is preferable to the alternatives.

## Alternatives Considered

List rejected alternatives and why they were rejected.

## Impacts

| Area | Impact |
|---|---|
| Wiki | pages to update |
| Docs | impacted official documents |
| Mockup | impacted screens or flows |
| Analysis | linked bridge documents |
| Product | impacted modules/processes |
| Technical | data, services, integrations, security |

## Links

- Wiki:
- Analysis:
- Mockup:
- Docs:

## Follow-up

- [ ] Action to complete
- [ ] Page to update
- [ ] Decision to validate

## Completion Verification

This ADR cannot be marked Accepted without passing semantic validation. Verification is mandatory and automatic.

### Step 0 — Goal-backward check (always first)

- [ ] What must be TRUE for this decision to be valid? List the truths.
- [ ] For each truth, does supporting evidence or reasoning EXIST?
- [ ] If the goal is not met, the ADR cannot be Accepted.

### Thesis (at least 1 required)

Argument or evidence proving this decision is valid, based on use cases it generates or is involved in:

- Thesis 1:

### Antithesis (at least 1 required — each must be confuted)

Cases of incorrect or improper usage demonstrated to be false or inferior to the thesis:

| Antithesis | Confutation |
|---|---|
|  |  |

The ADR cannot be marked Accepted if any antithesis is not confuted.

### Exception

If semantic validation is not possible, document the reason here and mark as "Accepted with exceptions":

Exception reason: _none_

## Evolution Rule

Fine-grained history lives in Git. If this decision changes substantially, create a new ADR that supersedes or replaces it instead of retroactively rewriting the decision.
