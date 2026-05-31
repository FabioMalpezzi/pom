---
experiment: agent-loop-fsm
hypothesis: H5
artifact: evidence/snapshot/agent-orchestrator.suspended.json
iteration: 1
date: 2026-05-30
pattern: Suspend/restore snapshot for a single agent workflow
---

# Suspend/restore demonstration — agent-orchestrator (H5 iter 1)

## Approach

H5 does not introduce a new workflow model. It demonstrates that the workflow modeled in H1 iter 1 (`agent-orchestrator.yaml`, ReAct minimal) supports the suspend/restore contract documented in `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md` without schema growth.

The contract requires a snapshot to be:

- a JSON document with four canonical keys `{workflow, version, state, context}`;
- the `state` must be one of the names in `workflows[].name` of the cited workflow;
- the `workflow` and `version` must match the source-of-authority file;
- the `context` must conform to the `context_schema` declared in the workflow file.

These are the three validation invariants of the "no best-effort restore" rule.

## Artifact

`evidence/snapshot/agent-orchestrator.suspended.json` — snapshot of a ReAct minimal agent suspended after two reason/act/observe cycles, paused in the `reasoning` state on the third iteration. The agent's `goal` is a flight-search task; `history` contains the two prior cycles; `last_observation` carries the most recent search result. A `_meta` block records the time and reason of the checkpoint.

## Gate results

| Gate | Esito |
|---|---|
| Snapshot JSON valid with 4 canonical keys | PASS — `workflow`, `version`, `state`, `context` all present. |
| `state` is in the workflow's `states[].name` | PASS — `reasoning` is one of the 6 modeled states. |
| `workflow` and `version` match the source | PASS — both `agent_orchestrator` / 1. |
| `context` conforms to `context_schema` | PASS — keys `goal`, `history`, `last_observation` present, matching the three declared schema entries. |

Gate checks executed with a small Node script reading both files and verifying the four invariants programmatically.

## What restore does (described)

Given this snapshot and the source workflow file:

1. The restore runtime reads `workflow` and `version` from the snapshot and confirms they match `agent_orchestrator` / 1 in `agent-orchestrator.yaml`.
2. It reads `state = "reasoning"` and confirms that name appears in the workflow's `states[]`.
3. It rehydrates the `context` object (deep clone of the JSON value), ready to be consumed by the agent's reasoning code.
4. It hands control to the application's reasoning step with the rehydrated context. From the application's perspective, the agent resumes as if no suspension had happened: it reads `history` and `last_observation`, produces the next thought, selects the next action, and emits `plan_ready` (or `goal_already_met`) to move the workflow forward.

## What POM provides and what it does not

POM **provides**: the schema for a workflow that *makes a snapshot meaningful* (named states, named events, context schema). The snapshot is just a 4-tuple — its meaning lives entirely in the workflow file.

POM **does not provide**: the runtime that takes the snapshot and resumes execution. That code lives in the target project. The Pattern A / B / C catalogue in `WORKFLOW_IMPLEMENTATION_GUIDE.md` describes how to write that runtime in TypeScript, Python, or via an external FSM library.

This separation is intentional and structural: POM is method, not runtime.

## Verdict on H5

**CONFIRMED.** Suspend/restore of an agent workflow loop is supported by the POM workflow schema as-is. No schema extension is required. The four contract invariants are checkable mechanically on any snapshot+workflow pair (the small Node script in this iteration is essentially a 20-line restore validator).

The snapshot is sufficient to reconstruct *what the agent knows* (`context`) and *where it is in the loop* (`state`). The runtime that consumes the snapshot is the target project's responsibility, per the POM-as-method principle.

## Scope and limits

- A single-workflow snapshot is shown. Composed-stack snapshots (a chain of invoked workflows) are not exercised here; they were validated in `experiments/workflow-modeling/` round 2 (suspend/restore evidence section).
- No partial / best-effort restore: if any of the four invariants fails, the contract says reject the snapshot, do not heal it.
- No retention policy: how snapshots are stored (DB columns, document DB, KV, distributed log) is out of scope for POM.

## Budget used

~5 min of 15 min cap. Loop exits via "Raggiunto" at iter 1.
