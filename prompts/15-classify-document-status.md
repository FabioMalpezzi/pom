# Prompt - Classify Document And Status

Use this prompt before creating or changing a governed POM document when the
document type or status is unclear.

```text
Classify the requested artifact before writing it.

First decide the document type:

| Question | Document |
|---|---|
| Is this a durable decision or boundary? | ADR |
| Is this intended behavior or capability, without immediate implementation? | Spec |
| Is this verifiable work to execute? | Task plan |
| Is this current restart memory? | PROJECT_STATE |
| Is this reusable project knowledge? | Wiki |
| Is this temporary research or spike output? | Experiment/analysis |

Then choose the status:

| Status | Meaning | Use when |
|---|---|---|
| Waiting | Waiting for something or someone | Blocked by external input |
| Blocked | Cannot proceed because of a concrete impediment | Missing dependency or error |
| Deferred | Deliberately postponed | Decided to do it later |
| Planned | Expected but not started yet | In the active plan |
| Backlog | Future candidate, not yet planned | Parked idea or need |
| Draft | Still being written or reviewed | Spec or task not consolidated |
| Accepted | Approved decision | ADR, not an operational task |

Rules:
- do not use Waiting when the team simply decided to postpone work; use Deferred;
- do not use Blocked unless there is a concrete impediment;
- do not use Accepted for operational tasks;
- keep existing project-specific statuses only when they are already part of the local workflow;
- if the status is ambiguous, state the ambiguity and propose the least misleading option.

Output:
- chosen document type;
- chosen status;
- reason in one or two sentences;
- target file path from `pom.config.json` conventions;
- whether code changes are in scope.
```
