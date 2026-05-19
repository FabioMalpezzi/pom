# TASK-0003 - Codex Web Wiki Baseline Contract

## Status

Complete

## Origin

| Type | Reference |
|---|---|
| Spec | `specs/SPEC-0005-web-wiki-agent-extension.md` |
| Experiment | `experiments/wiki-agent-orchestration/EXPERIMENT.md` |

## Objective

Prepare and validate the first baseline for the POM web wiki agent extension: a file-based event/proposal contract that a Codex adapter can use before any persistent streaming integration is attempted.

The task does not implement the final web UI. It creates the minimum contract, fixtures, and verification shape needed to prove that a wiki event can become a structured proposal without modifying durable POM files automatically.

## Placement

| Level | Value |
|---|---|
| Phase | P0 |
| Workstream | Wiki agent orchestration |
| Task | Codex baseline event/proposal contract |

## Steps

- [x] Define the minimum `wiki-event` contract for question, annotation, correction request, addition request, and new-document request.
- [x] Define the minimum `agent-proposal` contract with sources read, authoritative destination, facts, assumptions, gaps, proposed change, approval requirement, and non-auto-apply reason.
- [x] Add fixture events for the three initial use cases: question/reasoning, annotation/triage, and guided new document creation.
- [x] Add a baseline prompt that instructs Codex to read one event and produce one structured proposal without editing files.
- [x] Validate the first fixture manually with the active Codex session before creating a separate runner.
- [x] Add an experiment-local mini UI that reads the real project wiki and linked POM documents, then saves wiki events for the active Codex session.
- [x] Validate the first live mini UI event with the active Codex session: event saved, proposal recorded, and a limited prototype correction applied.
- [x] Validate a second live mini UI event on POM method content rather than a prototype UI defect.
- [x] Defer the executable runner choice to a later implementation checkpoint.
- [x] Verify the checkpoint against fixture coverage and live events without changing source Markdown automatically.

## Verification

### Step 0 - Goal-backward check

- [x] What must be TRUE for the objective to be met?
  - A wiki event schema exists.
  - An agent proposal schema exists.
  - At least three event fixtures exist, one per initial use case.
  - The baseline Codex prompt forbids direct file edits and asks for a structured proposal.
  - The task does not require a web UI or persistent agent session to validate the contract.
  - The proposal contract preserves Source Authority and Artifact Policy.
- [x] For each truth, verify against actual artifacts.

### Scenario tests

- [x] Positive case: a question event can produce a proposal that cites sources and either answers or suggests a wiki/Open Discussion/spec destination.
- [x] Positive case: a live mini UI event can produce a proposal evidence file and a controlled, requested prototype correction.
- [x] Positive case: a live method question can identify a spec gap and produce a draft spec-update proposal without applying it automatically.
- [x] Positive case: an annotation fixture maps to a reviewed clarification path instead of an automatic write.
- [x] Positive case: a new-document request fixture maps to the created baseline task plan.
- [x] Error case: excluded source-side wiki log remains unavailable through the mini UI document API.

### Cross-cutting checks

- [x] `npm run pom:lint` passes.
- [x] `npm run pom:test` passes if code or test fixtures are added outside the experiment scaffold.
- [x] Security/privacy check confirms that fixture events do not contain secrets or external private data.

## Test Structure

| Item | Value |
|---|---|
| Existing test structure | Integration tests under `tests/`; experiment fixtures under `experiments/` |
| Chosen structure | Experiment fixtures first; stable tests only after runner behavior exists |
| E2E test path | not created yet |
| Fixture path | `experiments/wiki-agent-orchestration/fixtures/events/` |
| Evidence path | `experiments/wiki-agent-orchestration/evidence/` |
| Mini UI path | `experiments/wiki-agent-orchestration/mini-ui/` |

## Fixture Mapping

| Fixture | Checkpoint mapping |
|---|---|
| `question-wiki-vs-spec.json` | Sample proposal generated in `evidence/question-wiki-vs-spec.proposal.json`. |
| `annotation-correction.json` | Maps to a reviewed clarification/update proposal for experiment or spec wording; no automatic write. |
| `new-document-request.json` | Maps to `tasks/TASK-0003-codex-web-wiki-baseline.md`, created as the baseline work document. |

## User Use Cases

- As a project user, I want to ask a question from the web wiki so that the agent can answer from relevant POM and project sources.
- As a project user, I want to annotate a wiki or project document section so that the agent can propose a safe correction or discussion path.
- As a project user, I want to request a new document from the web wiki so that the agent can classify whether it should be wiki, Open Discussion, spec, ADR, task plan, or project documentation.
- Handled-error case: if the source authority or approval requirement is unclear, the agent asks for clarification instead of proposing an automatic file change.

## Risks And Privacy/Security

| Risk | Mitigation |
|---|---|
| The baseline contract becomes too Codex-specific | Keep schemas agent-neutral and put Codex-specific behavior in the prompt or adapter layer |
| The fixture output encourages automatic writes | Require proposals and approval metadata; forbid direct edits in the baseline prompt |
| The experiment creates a second source of truth | Keep fixtures and evidence under `experiments/`; promote only after review |
| Sensitive project context is copied into fixtures | Checked at checkpoint close: fixtures and live events contain only repository-local POM discussion, no secrets or private external data |
| Prototype becomes mistaken for final integration | Keep it under `experiments/`; defer runner and persistent-session choices to a later checkpoint |

## Outcome

Draft preparation started. The baseline contract, event fixtures, prompt, evidence directory, and mini UI exist. The active Codex session produced the first sample proposal for the question/reasoning fixture.

The first live mini UI cycle was also validated: the UI saved an event about `wiki/log.md` being visible, Codex read the event from `evidence/ui-events/`, recorded an applied proposal, and corrected the mini UI document set instead of changing the canonical wiki.

The second live mini UI cycle validated a method-content question: the UI saved an event about when web wiki notes should remain Open Discussion or become spec, ADR, or task plan. Codex read the event, `SPEC-0005`, the experiment, and `CONTEXT.md`, then recorded a draft spec-update proposal without modifying the spec automatically. After explicit user approval, the destination triage rule was promoted into `SPEC-0005`.

Checkpoint closed here. Runner automation and persistent-session integration remain future work; this task proved the baseline contract and the human-reviewed promotion loop.

## Done Criteria

- [x] Steps completed
- [x] Verifications run
- [x] Open issues documented
- [x] `SPEC-0005` updated if the contract changes its requirements
- [x] Wiki updated only if the result becomes consolidated project knowledge
