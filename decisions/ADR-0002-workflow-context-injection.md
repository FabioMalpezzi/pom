# ADR-0002 - Workflow Context Injection (Result<Terminal, Output>)

| Field | Value |
|---|---|
| Date | 2026-05-29 |
| Status | Accepted |
| Category | architecture |
| Area | workflow modeling / composition |
| Summary | Parent and child workflows exchange data only through injected input and a Result-typed return (terminal tag plus per-terminal output); the validator checks nominal coherence, not types or paths |
| Replaces | none |
| Replaced by | none |
| Driver | technical constraint |
| Scope | architecture / workflow modeling |

## Context

Once a parent workflow can invoke a child workflow synchronously (SPEC-0006, composition sections), the child needs a context of use. A purely enum-returning child is anemic: it can say `validated` or `refused` but cannot say what it validated, nor return a validation token, a refusal reason, or any structured artifact of its work.

The question is therefore not whether to allow context, but how. Two candidate models were considered:

| Option | What it means | Verdict |
|---|---|---|
| A - Injection + Result return | The parent extracts an `input` object from its own private context and hands it to the child; the child works on its own private context; on a terminal, the child returns both a `terminal_state` (the tag) and an `output` object (the payload). The parent reads the output and integrates it into its own context. | Adopted |
| B - Shared context visibility | The child sees the parent's context directly and may read or write it during its lifetime. | Rejected |

## Decision

Adopt the Injection + Result-typed return model (Option A) for parent/child data exchange in POM workflow composition. Reject shared context visibility (Option B) as a violation of FSM autonomy and a slide toward XState shared-state patterns.

### Mental model

A child workflow is a synchronous `Result<Terminal, Output>` function:

- Terminal is the discriminating tag: one of the child's declared `is_final: true` states.
- Output is the structured payload that travels alongside the tag, declared per terminal in the child's `context_schema.output_by_terminal`.
- Input is the seed of the child's private context at invocation time; the child cannot see anything else of the parent.

In TypeScript discriminated-union form:

```ts
type PaymentValidationResult =
  | { terminal: 'validated'; validation_token: string; timestamp: string }
  | { terminal: 'refused';   refusal_reason: string };
```

The parent reads the result, dispatches on the terminal (already handled by `on_completion`), and integrates the per-terminal output into its own private context via the `assign:` block on each `on_completion` entry.

### Schema shape

The child declares its interface:

```yaml
workflow: payment_validation
context_schema:
  input:
    - { name: amount,  type: number, description: "Amount in cents." }
    - { name: method,  type: string, description: "Payment method tag." }
  output_by_terminal:
    validated:
      - { name: validation_token, type: string }
      - { name: timestamp,        type: string }
    refused:
      - { name: refusal_reason,   type: string }
```

The parent maps its context to the child's interface and back:

```yaml
transitions:
  - from: drafting
    event: validate_payment
    invoke:
      workflow: payment-validation.yaml
      input:
        amount: payment.amount               # path in the parent's private context
        method: payment.method
      on_completion:
        - terminal_state: validated
          target: accepted
          assign:
            validation_token: child.validation_token
            timestamp: child.timestamp
        - terminal_state: refused
          target: rejected
          assign:
            refusal_reason: child.refusal_reason
```

The path syntax (`payment.amount`, `child.validation_token`) is declarative documentation of the data flow, not a path expression evaluated at lint time. The implementation guide tells the target agent how to translate it into the project's actual access path.

### Implementation level: documental

The validator checks nominal coherence only:

- every field referenced in `invoke.input` and `on_completion[].assign` exists in the child's declared `context_schema`;
- each `on_completion[]` entry assigns fields consistent with the child's `output_by_terminal[terminal_state]`;
- `context_schema.output_by_terminal` keys name states declared `is_final: true`;
- `mode: async` or `parallel` on an invoke is rejected, consistent with the no-async invariant.

The validator does not type-check fields (`type:` is documentation; the target language type system is the source of truth), does not evaluate path expressions, and does not require that every declared output field is consumed by every parent `assign:` (parents may ignore part of the output).

### The four invariants of the composition model

| # | Pillar | How enforced |
|---|---|---|
| 1 | No asynchronous composition (no parallel regions, no fire-and-forget children) | Validator rules E029 / E036 / E046 |
| 2 | No shared global state (each FSM has a private context) | Schema design: no slot for shared state; the only channels are `invoke.input` and `on_completion[].assign` |
| 3 | No inheritance or override between workflows | Schema design: no `extends:` slot; workflows are standalone |
| 4 | No runtime in POM itself | POM produces YAML, validation reports, Mermaid, scenarios, and implementation guidance; the runtime lives in the target code |

These four pillars are what distinguishes a POM workflow from a YAML dialect of XState.

### What this deliberately does not model

- a runtime context store (POM does not own runtime);
- evented mutation of context during the child's life (would break the no-async pillar);
- bidirectional events between parent and child during invocation (would break isolation);
- typed enums for terminals at the validator level (the target language carries the types).

These are decisions, not open points, like the no-async invariant.

## Rationale

Option A keeps every FSM autonomous: a child can be read, validated, and implemented on its own, and the data crossing the boundary is visible in the YAML at the exact invocation point. Shared context would introduce hidden structural dependencies between workflows and reproduce the XState shared-context patterns that the composition pillars reject.

The documental level is coherent with the "POM recommends, it does not impose" principle: the YAML documents the data flow; the target language carries types and access paths. A strict typed vocabulary would reproduce XState v5 `setup({ types: {...} })` inside the YAML and erode the lightness that distinguishes POM.

### Mapping to XState

XState v5 has a richer model (`setup({ types, actors })` plus `invoke: { src, input, onDone, onError }`). The mapping is lossless and POM remains a subset of what XState can express:

- POM `context_schema.input` maps to the XState invoke `input` object.
- POM `on_completion[].terminal_state = 'validated'` maps to the invoke `onDone` path.
- POM `on_completion[].terminal_state = 'refused'` maps to `onError` or another `onDone` discriminating in the action; POM treats refusal as just another terminal, XState distinguishes errors syntactically.
- POM `on_completion[].assign` maps to `actions: assign({ ... })` in the `onDone` handler.

## Alternatives Considered

| Alternative | Reason Rejected |
|---|---|
| Shared context visibility (Option B) | Violates the autonomy of FSMs, introduces hidden structural dependencies between workflows, and is equivalent to XState shared-context patterns. |
| Strict implementation level (closed type vocabulary, statically validated path expressions, machine-readable type system at the YAML level) | Estimated at about five commits versus two, with ongoing maintenance debt; reproduces XState v5 typed setup and erodes POM's lightness. Strict typing belongs in the target's TypeScript, Pydantic, or equivalent. |
| Enum-only children (terminal tag without payload) | Anemic: the child cannot return a token, a reason, or any structured artifact of its work, so the parent must reconstruct it elsewhere. |

## Impacts

| Area | Impact |
|---|---|
| Wiki | Workflow pages describe parent/child data exchange as input injection plus Result-typed return. |
| Docs | `docs/workflow-xstate-compatibility.md` carries the input/output mapping to XState. |
| Mockup | none |
| Analysis | none |
| Product | Workflow authors declare `context_schema` on children that return data; parents map fields explicitly at every invoke. |
| Technical | Validator rules E050-E058 in `scripts/lib/workflow-lint-rules.mjs` and `scripts/lib/workflow-lint-core.mjs`; schema documented in `templates/WORKFLOW_TEMPLATE.yaml`; translation guidance in `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md`. |

## Links

- Spec: `specs/SPEC-0006-workflow-modeling.md`, section "Composition: Context Injection (Result<Terminal, Output>)"
- Experiment: `experiments/workflow-modeling/EXPERIMENT.md` (round 2 narrative)
- Docs: `docs/workflow-xstate-compatibility.md`
- Template: `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md`

## Follow-up

- [ ] Path expression conventions: the dotted form (`payment.amount`, `child.validation_token`) does not address arrays, nullable, or default values. Decide in a follow-up only if real-world examples need it.
- [ ] Versioning of `context_schema`: the context block has no `version` of its own (only the workflow level has one). Revisit when a child evolves its fields and parents must adapt.
- [ ] Empty contexts: workflows that need no input and produce no per-terminal output may omit `context_schema` entirely; keep the validator from requiring it.
- [ ] Add a committed broken fixture for the E050-E058 family under `tests/workflow-validator/fixtures/` so the rules are covered by `pom:test`, not only by the rule table.

## Completion Verification

This ADR cannot be marked Accepted without passing semantic validation. Verification is mandatory and automatic.

### Step 0 — Goal-backward check

- [x] What must be TRUE for this decision to be valid?
  - A child can declare input and per-terminal output, and a parent can map fields across the boundary in the YAML.
  - The validator rejects a mapping that references a field the child does not declare.
  - No schema slot exists for shared state, inheritance, or asynchronous invocation.
- [x] For each truth, does supporting evidence or reasoning EXIST?
  - `context_schema`, `invoke.input`, and `on_completion[].assign` are documented in SPEC-0006 and `templates/WORKFLOW_TEMPLATE.yaml`.
  - Rules E050-E058 are implemented in `scripts/lib/workflow-lint-rules.mjs` and `scripts/lib/workflow-lint-core.mjs` (`validateInvokeContext`).
  - The schema has no `extends:` slot and no shared-context slot; `mode: async` / `parallel` on an invoke fails with E046.

### Thesis

- Thesis 1: Nominal coherence is machine-checked at the boundary. A parent whose `on_completion[].assign` references `child.receipt_id` while the child declares only `validation_token` for that terminal fails validation with E056 (`on_completion[].assign value references a "child.<field>" path whose <field> is not declared in the child workflow context_schema.output_by_terminal[terminal_state]`), while the same pair with matching fields passes with zero errors and zero warnings. The data contract is therefore visible and enforced without a type system in the YAML.
- Thesis 2: The model composes with the existing pillars instead of weakening them. The only channels are `input` and `assign`; asynchronous invocation is still rejected (E029 / E036 / E046), so adding data exchange did not reintroduce shared state or concurrency inside the FSM.

### Antithesis

| Antithesis | Confutation |
|---|---|
| Shared context is simpler: the child just reads what it needs from the parent. | Simpler to write, harder to reason about: the child can no longer be validated or implemented alone, and any parent field becomes an implicit dependency. Option A keeps every dependency explicit at the invoke site, which is what the validator can check. |
| Documental validation is too weak; a strict typed vocabulary at the YAML level would catch more bugs. | Types at the YAML level would duplicate the target language type system and drift from it. The bugs the YAML can catch are name mismatches across the boundary, and those are caught (E055, E056); type errors are caught where the types live, in the target code. |
| A child that returns only a terminal tag is enough; the parent can look up the details elsewhere. | That moves the child's result into an out-of-band store the YAML does not describe, which is exactly the hidden coupling the composition pillars forbid. |

### Exception

Exception reason: _none_

## Evolution Rule

Fine-grained history lives in Git. If this decision changes substantially, create a new ADR that supersedes or replaces it instead of retroactively rewriting the decision.
