# ADR-0001 - Persistent Coding Agent Session For Web Wiki

| Field | Value |
|---|---|
| Date | 2026-05-19 |
| Status | Accepted |
| Category | architecture |
| Area | wiki / AI / integrations |
| Summary | The web wiki must use a persistent connection to an active AI coding agent session as the primary path, not repeated cold one-shot runs |
| Replaces | none |
| Replaced by | none |
| Driver | technical constraint |
| Scope | wiki / AI / integrations |

## Context

The file/event baseline proved the POM contract: a web wiki event can become a structured proposal and then a reviewed promotion. It does not solve the product-level problem of repeated context loading.

If each web wiki interaction starts a fresh agent run, the agent must repeatedly reload project context. That increases latency and cost, and it can reduce coherence because every answer starts from a colder context.

## Decision

The primary web wiki integration path is a persistent connection to an active AI coding agent session.

The web wiki must be treated as an extension of an already active coding agent session. It should send compact events to that session, such as the active document, selection, user request, linked sources, and source-authority hints. The agent session should keep the working context across turns.

Codex is the first implementation target, not a permanent constraint. Other coding agents can be supported later if they expose a compatible session, streaming, permission, and file-edit model.

File/event artifacts remain useful for audit, fallback, fixtures, and tests. They are not the intended daily interaction path.

MCP is not the primary event bus for the first implementation. It may later expose POM tools to agents, but it should not be used to avoid solving session continuity.

One-shot command execution is not the primary user workflow. For Codex, `codex exec` remains useful for deterministic validation, CI, and replay.

The next implementation spike should evaluate Codex `app-server` and `remote-control` as candidate interfaces for the first persistent session adapter.

## Rationale

This choice directly protects the main user value: the agent should not reload the same project context for every wiki interaction. A persistent connection to an active coding agent is more likely to preserve coherence, reduce repeated prompt/context cost, and keep the web wiki as a side surface of the current work instead of a separate app.

The file/event baseline stays valuable because it keeps proposals observable and testable. It simply moves from primary interaction path to support mechanism.

## Alternatives Considered

| Alternative | Reason Rejected |
|---|---|
| Use one-shot command execution for every web wiki event | Too cold for daily use; repeats context loading and risks slower, less coherent answers. Codex `exec` remains useful for Codex-specific validation and replay. |
| Use MCP as the first event bus | MCP can expose tools, but it does not by itself solve persistent session continuity. |
| Keep only manual event files read by the active Codex chat | Good enough for the baseline experiment, but not enough for a usable web wiki extension. |
| Support multiple agents immediately | Premature; first prove the persistent session contract with Codex, then generalize the adapter boundary. |

## Impacts

| Area | Impact |
|---|---|
| Wiki | The web wiki should be described as a side surface of an active AI coding agent session. |
| Docs | `SPEC-0005` should link this decision and stop treating the persistent-session direction as open. |
| Technical | The next spike should evaluate Codex `app-server` and `remote-control` as the first implementation target; one-shot execution remains fallback/test tooling. |

## Links

- Spec: `specs/SPEC-0005-web-wiki-agent-extension.md`
- Experiment: `experiments/wiki-agent-orchestration/EXPERIMENT.md`
- Task: `tasks/TASK-0003-codex-web-wiki-baseline.md`

## Follow-up

- [ ] Create a small task for the persistent coding agent session spike, with Codex as the first implementation target.
- [ ] Verify whether Codex `app-server` or `remote-control` can receive web wiki events and return turn output without rebuilding context.

## Completion Verification

This ADR cannot be marked Accepted without passing semantic validation. Verification is mandatory and automatic.

### Step 0 — Goal-backward check

- [x] What must be TRUE for this decision to be valid?
  - The baseline has already proved event/proposal shape.
  - Repeated cold execution is unsuitable for the target user experience.
  - Codex exposes candidate persistent-session interfaces worth testing as the first implementation target.
  - The decision preserves file/event artifacts for audit and testability.
- [x] For each truth, does supporting evidence or reasoning EXIST?

### Thesis

- Thesis 1: A persistent connection to an active coding agent is the correct primary path because the web wiki is intended to extend the current agent work, not start a new isolated agent run for every question. This reduces repeated context loading and keeps proposal behavior closer to the ongoing project conversation.

### Antithesis

| Antithesis | Confutation |
|---|---|
| One-shot command execution is simpler and therefore should be the main path. | It is simpler for fixtures and CI, but it repeats context loading and does not meet the target of a web wiki attached to the active working session. |
| MCP should be the main path because it is an agent protocol. | MCP can expose POM tools, but it is not a guarantee of active session reuse. Using MCP first would avoid the actual continuity problem. |
| Manual event files are enough because they worked in the checkpoint. | They proved the contract, but the user still had to route events through the chat manually. That is not the intended daily workflow. |

### Exception

Exception reason: _none_

## Evolution Rule

Fine-grained history lives in Git. If this decision changes substantially, create a new ADR that supersedes or replaces it instead of retroactively rewriting the decision.
