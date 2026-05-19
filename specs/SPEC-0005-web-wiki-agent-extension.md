# Spec - Web Wiki Agent Extension

| Field | Value |
|---|---|
| Date | 2026-05-19 |
| Status | Draft |
| Area | wiki / AI / integrations |
| Summary | Define the first POM web wiki agent-extension capability: a navigable memory UI that works with an active coding agent session to produce reviewed proposals for wiki, specs, ADRs, task plans, and project documents |

## Purpose

POM needs a richer wiki experience than a static reader when a project has enough memory to navigate. The desired capability is not a separate web application that occasionally calls an agent. It is a web wiki extension of an active AI coding agent session.

The web wiki should let a user read POM memory and linked project documents, ask questions, annotate problems, request corrections, and start new document proposals while the coding agent keeps the current working context.

The first specification goal is to define the minimum product and integration contract for this capability without committing POM to every possible agent, protocol, or UI architecture.

## Context

The preparatory experiment captured the core insight:

- file + CLI is the simplest baseline for testing event and proposal formats;
- the target experience is a streaming session where the web wiki extends an already-open coding agent;
- the web wiki must navigate wiki pages, specs, ADRs, task plans, Open Discussions, Project State, and linked project documents;
- all agent outputs must remain proposals until reviewed and promoted;
- each agent integration needs an adapter because session, streaming, permission, and tool interfaces differ.

The first implementation should therefore separate:

- the POM contract: event, context, proposal, approval, promotion;
- the UI surface: reader, annotations, proposal review, document creation flow;
- the agent adapter: Codex first, other coding agents later only after compatibility testing.

`ADR-0001` decides that the primary user workflow must use a persistent connection to an active AI coding agent session. Codex is the first implementation target, not a permanent constraint. File/event artifacts remain useful for audit, fallback, fixtures, and tests; they are not the daily interaction path.

This spec does not promote the preparatory experiment to authoritative wiki knowledge. It uses that experiment as input for defining a draft capability.

## Requirements

| ID | Requirement | Priority | Source |
|---|---|---|---|
| R1 | The web wiki must be modeled as an extension of an active agent session, not as a separate application that only emits background events | High | `experiments/wiki-agent-orchestration/EXPERIMENT.md` |
| R2 | The web wiki must preserve Markdown files in the repository as the durable source; generated HTML, indexes, and UI state are derived views | High | POM Source Authority |
| R3 | The first supported use cases must be question/reasoning, annotation/triage, and guided creation of new documents | High | experiment use cases |
| R4 | The web wiki must navigate wiki pages and linked POM/project documents, including specs, ADRs, task plans, Open Discussions, Project State, and project docs when configured | High | experiment ideal scenario |
| R5 | The agent must return structured proposals rather than making implicit document changes | High | POM approval discipline |
| R6 | Every proposal must include source files read, authoritative destination, facts, assumptions, gaps or contradictions, proposed change, approval requirement, and reason for not applying automatically | High | proposal contract |
| R7 | The UI must expose proposal states such as draft, in review, approved, applied, parked, and discarded | Medium | proposal lifecycle |
| R8 | Promotion must be a distinct reviewed action that respects Source Authority and Artifact Policy | High | POM governance |
| R9 | The first adapter should target Codex, while keeping the POM contract separate from Codex-specific details | High | incremental support strategy |
| R10 | The baseline prototype may use file + CLI to validate event and proposal formats before implementing a persistent streaming session | Medium | experiment architecture |
| R11 | The target architecture should support streaming interaction with an active agent session when the chosen agent exposes a compatible interface | High | active context requirement |
| R12 | MCP must not be assumed to be the initial event bus; it may later expose POM tools such as wiki search, page read, proposal creation, project-state read, and artifact-policy checks | Medium | MCP analysis |
| R13 | Each future agent adapter must pass a compatibility checklist for session reuse, streaming, external input, context retention, file-system control, permissions, MCP role, and testability | High | compatibility constraints |
| R14 | The first UI scope should include document navigation, an agent interaction panel, annotation capture, proposal review, and approve/apply/park/discard actions | High | MVP scope |

## Proposed Design

### Common POM contract

The agent extension should be built around a small common contract that is independent of the first agent adapter.

Core objects:

| Object | Purpose |
|---|---|
| Wiki event | User action from the web wiki: question, annotation, correction request, addition request, or new-document request |
| Context packet | Selected page, section, linked documents, current project state, active source authority hints, and artifact policy hints |
| Agent proposal | Structured response that can be reviewed, corrected, approved, parked, or discarded |
| Promotion action | Explicit action that applies an approved proposal to a wiki page, Open Discussion, spec, ADR, task plan, or project document |

The common contract should be testable without a full streaming UI. A file + CLI baseline is allowed if it proves the event/proposal contract before the persistent session target is attempted.

### Use cases

The initial use cases are:

1. **Question and reasoning**: the user asks about project memory or linked documents. The agent reads relevant sources, answers with citations, and proposes memory updates only when useful.
2. **Annotation and triage**: the user selects text or a document and records a concern, correction, or possible addition. The agent classifies the annotation and proposes the right destination.
3. **Guided document creation**: the user asks for a new document. The agent classifies the target as wiki, Open Discussion, spec, ADR, task plan, or project document before proposing a path and template.

### Destination triage

When a wiki event produces or changes project memory, the agent must classify the destination before proposing a path.

- Use Open Discussion for desiderata, hypotheses, alternatives, unresolved questions, or material that is not ready to become implementation authority.
- Use a spec for expected behavior, capability boundaries, requirements, contracts, or user-visible workflows.
- Use an ADR only for an explicit consequential decision with rationale, implications, and rejected alternatives.
- Use a task plan for executable and verifiable work derived from an accepted spec, decision, or approved maintenance need.
- Use the wiki for consolidated reusable knowledge that summarizes authoritative sources without replacing them.

If the destination, Source Authority, or approval requirement is unclear, the proposal must ask for clarification or remain an Open Discussion rather than updating a spec, ADR, task plan, or wiki page.

### Proposal lifecycle

```text
user action
  -> wiki event
  -> source/context selection
  -> agent proposal
  -> human review
  -> approved, applied, parked, or discarded
```

No proposal may update durable project memory without a reviewed promotion step.

### Persistent coding agent adapter

The first adapter targets Codex because it is the most relevant initial agent for this repository and has automation surfaces that can support both baseline and target workflows. The adapter boundary must remain open to other coding agents that can support a comparable persistent session.

The chosen primary path is a persistent coding agent session adapter. The next spike should evaluate Codex `app-server` and `remote-control` as candidate interfaces for the first implementation. One-shot execution remains useful for deterministic validation, CI, and replay, but it is not the primary interactive workflow.

The adapter must not leak Codex-specific assumptions into the POM contract. It should translate between the common objects and the available interface of the chosen coding agent.

Initial adapter questions:

| Area | Question |
|---|---|
| Session | Can an active coding agent session be reused from the web wiki without losing working context? |
| Interface | For the first Codex implementation, should the spike use `app-server`, `remote-control`, or both? |
| State | Which session identifiers, turn identifiers, or event streams must the UI track? |
| Permissions | How are file edits proposed, reviewed, and applied under the chosen agent permissions? |
| Tests | Which fixtures prove question, annotation, new document, and approval flows? |

### UI minimum

The minimum useful UI is not a landing page. It is a work surface with:

- a navigable document reader for wiki and linked POM/project documents;
- an agent panel tied to the active session;
- annotation capture on selected page, section, or document context;
- a proposal list with status;
- a proposal detail view showing sources, destination, diff or suggested content, and required approval;
- actions to approve/apply, edit, park, or discard.

## Out Of Scope

- Supporting every coding agent in the first implementation.
- Treating MCP as the initial event bus.
- Automatic writes to wiki, specs, ADRs, task plans, or project documents without review.
- Replacing Git history, issue trackers, or project documentation systems.
- Building a full multi-agent orchestration system.
- Defining final visual design beyond minimum work-surface requirements.
- Promoting experiment notes into the root wiki before validation.

## Impacts

| Area | Impact |
|---|---|
| Wiki | Defines a future web wiki extension beyond static reader output |
| Decisions | `ADR-0001` chooses a persistent AI coding agent session as the primary path, with Codex as the first implementation target |
| Docs | Reader-facing docs may need updates if the capability is promoted beyond experiment |
| Mockups | Future UI mockups are likely needed before implementation |
| Code | Future code may touch wiki reader tooling, a web server, agent adapter code, and tests |

## Linked Tasks

- `TASK-0003-codex-web-wiki-baseline.md`

## Completion Verification

This spec is not complete. It defines the first capability boundary before implementation.

### Step 0 — Goal-backward check (always first)

- [ ] What must be TRUE for this spec to be complete?
  - The event/proposal contract exists and is documented.
  - The first supported agent adapter is chosen and tested.
  - The three initial use cases are implemented or explicitly deferred.
  - The UI can show sources, proposal status, approval requirement, and apply/park/discard actions.
  - Durable memory is never modified without reviewed promotion.
  - Markdown remains the source and generated/UI state remains derived.
- [ ] Verify each truth against actual artifacts.

### If this spec has code implementation

- [ ] At least 2 positive scenario tests based on real user use cases this spec generates or is involved in.
- [ ] At least 1 error/misuse scenario test validating incorrect or improper usage.
- [ ] Tests run and pass.

### If this spec has no code implementation

- [ ] At least 1 thesis: argument or evidence proving this spec is valid, based on use cases it generates or is involved in.
- [ ] At least 1 antithesis: a case of incorrect or improper usage demonstrated to be false or inferior.
- [ ] Every antithesis is confuted.

### Exception

Exception reason: _none_

## Sources And Decisions

- Source: `experiments/wiki-agent-orchestration/EXPERIMENT.md`.
- Source: `CONTEXT.md` for Operating Memory, Memory Element, Source Authority, Artifact Policy, and Open Discussion terms.
- Source: `templates/OPEN_DISCUSSION_TEMPLATE.md`.
- Source: `templates/EXPERIMENT_TEMPLATE.md`.
- ADR: `decisions/ADR-0001-persistent-coding-agent-session-for-web-wiki.md`.

## Evolution Rule

This spec is a living document. Incremental changes are tracked with Git. If a change alters a structural decision, create or update a linked ADR.
