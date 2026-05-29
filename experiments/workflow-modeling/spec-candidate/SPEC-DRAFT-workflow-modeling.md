# Spec Draft - Workflow Modeling Support

| Field | Value |
|---|---|
| Date | 2026-05-29 |
| Status | Draft (experimental) |
| Area | method / extension |
| Future ID | SPEC-0006 if promoted |
| Summary | Define POM support for modeling, validating, and guiding the implementation of domain workflows in target projects, without runtime engine, without live instance tracking, and without imposing a specific FSM library |

This spec lives inside `experiments/workflow-modeling/` and is not part of POM main until an explicit promotion decision is taken.

## Implementation Status

This spec describes the target shape of the capability. Not every part is implemented yet inside the experiment; some pieces are aspirational and will be built before promotion. The table below is authoritative on what currently exists vs. what is planned.

| Area | Status | Where it lives today |
|---|---|---|
| YAML model schema (states, events, guards, transitions, invariants) | **Implemented** | `templates-candidate/WORKFLOW_TEMPLATE.yaml` and three example workflows under `examples/` |
| `re_entry_allowed` attribute on terminal states | **Implemented** | Schema + validator + applied to `spec-evolution.complete` and `ticket-lifecycle.closed` |
| Validator Error rules (E000–E017) | **Implemented** | `scripts-candidate/lint-workflows.mjs` |
| Validator Warning rules (W001–W004) | **Implemented** | `scripts-candidate/lint-workflows.mjs` |
| Validation report (`<name>.validation.md`) | **Implemented** | Markdown output of `lint-workflows.mjs` |
| Broken-fixture coverage (one per E and W rule, plus positive `re_entry_allowed`) | **Implemented** | `evidence/broken-fixtures/` |
| Skill card with five modes | **Implemented** | `skills-candidate/workflow.md` |
| Canonical prompt for the skill | **Target for promotion** | Skill currently points to `experiments/workflow-modeling/prompts/workflow.md` (file to be created during the experiment) |
| Validator Info rules (cycles, naming conventions) | **Target for promotion** | Not implemented; explicitly out of scope of the current validator pass |
| Mermaid diagram generator (`<name>.mmd`) | **Target for promotion** | Not implemented |
| Scenario generator (`<name>.scenarios.md`) | **Target for promotion** | Not implemented |
| `pom:workflow:lint` npm wrapper | **Target for promotion** | Not implemented; experiment runs the script directly under `scripts-candidate/` |
| Implementation guide for coding agents | **Implemented (draft)** | `templates-candidate/WORKFLOW_IMPLEMENTATION_GUIDE.md` |
| TypeScript guided-implementation evidence (Hypothesis H4) | **Target for promotion** | Not yet produced; planned under `evidence/typescript/` |
| Promotion decision and consolidation | **Target for promotion** | Section in `EXPERIMENT.md` to be filled at end of experiment |

The rest of this document describes the *target* shape. Read each section together with the row above before assuming a feature exists.

## Purpose

Target projects increasingly need explicit, well-defined workflows: ticket lifecycle, document approval, request authorization, content publishing, internal spec evolution, and so on. The current POM method supports such workflows only as prose inside specs or wiki pages. Prose is good for context but fragile for verification, hard to keep in sync with the implementing code, and hard to hand to a coding agent for accurate translation.

POM should help teams:

- **define** the workflow in a small declarative form that survives sessions and agents;
- **validate** the model statically before any code is written;
- **visualize** the model as a diagram for human review;
- **derive** verification scenarios for the implementation;
- **guide** the coding agent in turning the model into production code in the project's own language and architecture.

POM must not become a runtime, must not execute workflows, must not impose a library, and must not track live instances on behalf of the target.

## Non-goals

- runtime engine for workflows;
- POM-side tracking of live workflow instances;
- automatic code generation in the target project (POM produces guidance, not finished code);
- export to formal verification tools (TLA+, NuSMV, SPIN) in the first release;
- support for concurrency, time, distributed semantics, or hierarchical sub-machines in the first release;
- adapter or bundled support for a specific FSM library (xstate, robot3, etc.) in POM core.

## Model Format

The canonical model is a single YAML file per workflow, by default under `workflows/<name>.yaml` in the target project. Format (draft, subject to change during the experiment):

```yaml
workflow: spec_evolution
version: 1
description: |
  POM SPEC lifecycle: from first draft to a completed, superseded, or withdrawn state.

initial_state: draft

states:
  - name: draft
    description: Spec being written, not yet reviewed.
    is_final: false
  - name: accepted
    description: Spec reviewed and approved. Implementation may begin.
    is_final: false
  - name: complete
    description: Spec fully implemented and verified.
    is_final: true
    re_entry_allowed: true        # admits supersede out-transition

events:
  - name: accept
    description: Reviewer approves the spec content.
  - name: complete
    description: Implementation and verification gate satisfied.

guards:
  - name: has_verification_gate
    description: The spec declares a completion verification gate.

transitions:
  - from: draft
    to: accepted
    event: accept
    guard: has_verification_gate
  - from: accepted
    to: complete
    event: complete

invariants:
  - description: A complete spec cannot return to draft. (Use supersede instead.)
```

The above fields are draft. The experiment compiles three realistic workflows (`spec-evolution`, `ticket-lifecycle`, `document-approval`) and adjusts the schema until all three model cleanly.

## Validation Rules

The validator must report, with severity, at least:

| Severity | Check |
|---|---|
| Error | Initial state missing or not declared in `states`. |
| Error | A transition references a state not declared in `states`. |
| Error | A transition references an event not declared in `events`. |
| Error | A transition references a guard not declared in `guards`. |
| Error | More than one initial state. |
| Warning | A state is declared but never reached by any transition (unreachable). |
| Warning | A non-final state has no outgoing transitions (silent dead-end). |
| Warning | A final state has outgoing transitions (re-entry from terminal). Suppressed when the state declares `re_entry_allowed: true`. |
| Warning | Two transitions share `(from, event)` without distinguishing guards (non-determinism). |
| Info | Cycles exist in the model. (Not always a defect, but worth flagging.) |
| Info | State or event names violate the naming convention (snake_case). |

The validator emits a Markdown report under `workflows/generated/<name>.validation.md`.

## Generated Artifacts

For each `workflows/<name>.yaml` the toolchain produces, on demand:

- `workflows/generated/<name>.mmd` — Mermaid `stateDiagram-v2` rendering.
- `workflows/generated/<name>.validation.md` — validation report.
- `workflows/generated/<name>.scenarios.md` — verification scenarios in language-agnostic form (e.g., "from `draft` on `accept` with `has_verification_gate=true`, expect transition to `accepted`"; "from `complete` on `accept`, expect transition refused").

All generated files declare in the header that they are derived from the YAML and must not be hand-edited.

## Skill Surface

A single skill `skills/workflow.md` exposes the following modes:

| Mode | Purpose |
|---|---|
| `design` | Interview-style help to draft a new workflow YAML from informal description, surfacing ambiguities as open points instead of inventing rules. |
| `validate` | Run the validator and produce the report; declare what remains undecided. |
| `diagram` | Regenerate the Mermaid diagram. |
| `scenarios` | Regenerate the verification scenarios. |
| `implement` | Guide a coding agent to translate the YAML into code in the target stack, proposing implementation patterns (table-based, switch-based, library-based) with selection criteria — never imposing one. |

The skill follows the POM convention: short card, points to a canonical prompt under `prompts/`, refuses to operate without reading `pom.config.json`.

## Implementation Guidance

POM ships a `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md` with:

- pattern catalogue for translating a workflow into code (transition table, switch statement, library-based);
- selection criteria (size of model, presence of guards, need for visual tooling in the target, language idiom);
- minimal pseudo-code per pattern, language-neutral;
- guidance on how guards map to predicate functions and where in the target's architecture they belong;
- guidance on test scenarios derived from the model.

The guide does not include language-specific implementations: those live in the target's codebase and remain the target team's responsibility.

## Configuration

A new optional section in `pom.config.json`:

```json
{
  "workflows": {
    "enabled": true,
    "root": "workflows/",
    "generatedRoot": "workflows/generated/",
    "namingConvention": "snake_case"
  }
}
```

When `enabled` is `false` or missing, POM skills and lint ignore the section. Following the "POM consiglia non impone" principle, workflow support is opt-in.

## Tooling

A single script: `scripts/lint-workflows.ts`, invoked via `npm run pom:workflow:lint`. The script:

- parses every `workflows/*.yaml`;
- runs the validation rules;
- generates the three artifacts under `workflows/generated/`;
- exits non-zero on Error-level findings and zero on Warning/Info.

Dependencies: minimal. Prefer no new runtime dependency in POM; if a YAML parser is needed, evaluate whether a tiny hand-rolled one suffices for the documented schema, or whether one small library is justified. Decision deferred to the experiment.

## Risks

- **Method bloat**: a workflow extension may exceed the weight POM tolerates. Mitigation: hard caps on skill and prompt size, and an explicit Goal-Backward Check during promotion.
- **Implicit framework**: the model format may become so detailed that adopting it effectively forces a particular implementation style. Mitigation: keep the YAML semantically minimal; expressivity beyond the three reference examples requires a new spec, not an in-place extension.
- **Drift between model and code**: a YAML is authoritative only if the team actually uses it. Mitigation: the `implement` mode tells the agent to update both YAML and code together, and the guide recommends a CI check that fails on divergence (recommendation, not POM-installed).

## Open Points

These are deliberately left undecided until the experiment provides evidence:

- representation of pause-like states (`Deferred`, `Blocked`, `Waiting`) — separate states, orthogonal flag, or out of scope;
- guard naming convention and how guards are wired to target code;
- relation between workflows and the existing POM spec / ADR / task-plan vocabulary (does `spec_evolution.yaml` replace or complement the current `## Status` field?);
- minimum / maximum size of the model that the validator accepts;
- whether one workflow file can declare composition with another (out of scope for v1 unless the three examples force it);
- effect of `re_entry_allowed: true` on a non-final state — currently ignored silently; may become an Info or Warning rule in a later pass.

## Closed Decisions

- **`re_entry_allowed: true` on a final state** suppresses W003. The attribute is opt-in, defaults to `false`, and was added after both compiled examples (`spec-evolution`, `ticket-lifecycle`) independently produced the same W003 on terminal states with a documented exception (`supersede`, `reopen`). See `EXPERIMENT.md` "Decisione: re_entry_allowed" for the evidence trail.

## Promotion Path

If promoted, this draft becomes `SPEC-0006-workflow-modeling.md` and the artefacts move out of `experiments/workflow-modeling/`:

| From | To |
|---|---|
| `spec-candidate/SPEC-DRAFT-workflow-modeling.md` | `specs/SPEC-0006-workflow-modeling.md` |
| `skills-candidate/workflow.md` | `skills/workflow.md` |
| `templates-candidate/WORKFLOW_TEMPLATE.yaml` | `templates/WORKFLOW_TEMPLATE.yaml` |
| `templates-candidate/WORKFLOW_IMPLEMENTATION_GUIDE.md` | `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md` |
| `scripts-candidate/lint-workflows.mjs` | `scripts/lint-workflows.ts` |
| (new) | `prompts/27-workflow-modeling.md` |

Promotion proceeds through `skills/extend.md` and `prompts/12-extend-pom.md`, after `skills/challenge.md` review.
