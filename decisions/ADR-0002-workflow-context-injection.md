# ADR-0002 — Workflow Context Injection (Result<Terminal, Output>)

| Field | Value |
|---|---|
| Date | 2026-05-29 |
| Status | Accepted |
| Area | workflow modeling / composition |
| Supersedes | n/a |

## Decision

Adopt the Injection + Result-typed return model (Option A in the design
discussion) for parent/child data exchange in POM workflow composition.
Reject shared context visibility (Option B) as a violation of FSM
autonomy and a slide toward XState shared-state patterns (Pattern C
territory).

Implementation level: documental (nominal coherence in the validator,
no type-checking, no path evaluation at lint time). The target
language carries the types.

This ADR records the closed design decision behind the round-2 schema
additions (context_schema on a workflow, invoke.input and
on_completion[].assign on parent invokes). The full discussion,
rationale, mapping to XState, and open points are in the body below,
preserved verbatim from the experiment.

## Decision body (preserved from the experiment)

## The question

Once a parent workflow can invoke a child workflow synchronously, the child needs **a context of use**. A purely "enum-returning" child is anemic: it can say `validated` or `refused` but cannot say *what* it validated, nor return a validation token, a refusal reason, or any structured artifact of its work.

The question is therefore not whether to allow context, but *how*. Two candidate models were considered.

| Option | What it means | Verdict |
|---|---|---|
| **A — Injection + Result return** | Parent extracts an `input` object from its own private context, hands it to the child; the child elaborates on its **own** private context; on terminal, the child returns both a `terminal_state` (the tag) and an `output` object (the payload). Parent reads the output and integrates it into its own context. | **Adopted.** |
| **B — Shared context visibility** | The child sees the parent's context directly and may read/write it during its lifetime. | **Rejected.** Violates the autonomy of FSMs ("le FSM non sono figlie di nessuno"); introduces hidden structural dependencies; equivalent to XState shared-context patterns and therefore Pattern C territory. |

## The mental model

A child workflow is a **synchronous `Result<Terminal, Output>` function**:

- *Terminal* is the discriminating tag: one of the child's declared `is_final: true` states.
- *Output* is the structured payload that travels alongside the tag, declared per-terminal in the child's `context_schema.output_by_terminal`.
- *Input* is the seed of the child's private context at invocation time; the child cannot see anything else of the parent.

In Rust-ish notation:

```rust
enum PaymentValidationResult {
    Validated { validation_token: String, timestamp: String },
    Refused   { refusal_reason: String },
}

fn payment_validation(input: PaymentValidationInput) -> PaymentValidationResult;
```

In TypeScript discriminated union form:

```ts
type PaymentValidationResult =
  | { terminal: 'validated'; validation_token: string; timestamp: string }
  | { terminal: 'refused';   refusal_reason: string };
```

The parent reads the result, dispatches on the terminal (already handled by `on_completion`), and integrates the per-terminal output into its own private context via the `assign:` block on each `on_completion` entry.

## The four invariants of the composition model

After this decision, the synchronous composition discipline rests on four pillars. All four are enforced by the validator or by schema design:

| # | Pillar | How enforced |
|---|---|---|
| 1 | **No asynchronous composition** (no parallel regions, no fire-and-forget children) | E029 / E036 / E046 in the validator |
| 2 | **No shared global state** (each FSM has a private context; no parent-visible-from-child) | Schema design: there is no slot for shared state; the only channels are `invoke.input` and `on_completion[].assign` |
| 3 | **No inheritance / no override between workflows** | Schema design: there is no `extends:` slot; workflows are standalone |
| 4 | **No runtime in POM itself** | POM produces YAML + validation reports + Mermaid + scenarios + implementation guidance; the runtime always lives in the target code |

These four pillars are what distinguishes POM-workflow from a YAML dialect of XState.

## The chosen implementation level

Two practical levels were considered for the schema additions.

| Level | Behavior | Cost | Verdict |
|---|---|---|---|
| **Documental** (chosen) | `context_schema` on the child workflow declares input fields and per-terminal output fields with names and types. `input:` on the parent's `invoke` block names which parent-context paths feed the child; `assign:` on each `on_completion` entry names which child-output fields land where in the parent context. The validator checks **nominal coherence** (cited fields exist in the declared schema; cited terminals exist in the child) but does *not* type-check, does *not* validate path expressions, does *not* attempt runtime evaluation. The target code is the source of truth for types and access. | ~2 commits | **Adopted.** Coherent with the "POM consiglia, non impone" principle. |
| **Strict** | Closed type vocabulary, statically validated path expressions, machine-readable type system at the YAML level. | ~5 commits, with maintenance debt | Rejected. Reproduces XState v5 `setup({ types: {...} })` and erodes the lightness that distinguishes POM. If a project needs strict typing, that lives in the target's TypeScript / Pydantic / etc., not in the YAML. |

## Schema sketch (anticipates the next implementation commit)

**Child declares its interface:**

```yaml
workflow: payment_validation
version: 1
description: |
  Validates a payment request against the active gateway.

context_schema:
  input:
    - { name: amount,  type: number, description: "Amount in cents." }
    - { name: method,  type: string, description: "Payment method tag (e.g., card, bank_transfer)." }
  output_by_terminal:
    validated:
      - { name: validation_token, type: string }
      - { name: timestamp,        type: string }
    refused:
      - { name: refusal_reason,   type: string }

initial_state: ready
states: [...]
events: [...]
transitions: [...]
```

**Parent maps its context to the child's interface and back:**

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

The path syntax (`payment.amount`, `child.validation_token`) is **declarative documentation** of the data flow, not a path expression evaluated at lint time. The implementation guide tells the target agent how to translate it into the project's actual access path.

## What the validator will and will not do

**Will (documental level)**:

- Check that every field referenced in `invoke.input` and `on_completion[].assign` exists in the child's declared `context_schema`.
- Check that each `on_completion[]` provides an `assign:` consistent with the `output_by_terminal[terminal_state]` of the child.
- Check that `context_schema.output_by_terminal` keys are themselves declared as `is_final: true` states.
- Reject `mode: async` / `parallel` on `input` / `assign` block (consistency with the no-async invariant).

**Will not**:

- Type-check fields. The `type:` declaration is documentation; the implementing language type system is the source of truth.
- Evaluate path expressions at lint time. The target agent translates them.
- Enforce that *every* output field declared in the child schema is consumed by every parent `assign:`. Parents may legitimately ignore part of the output.

## What this does *not* model

By choice, the schema does not provide:

- a runtime context store (POM does not own runtime);
- evented mutation of context during the child's life (would break the no-async pillar);
- bidirectional events between parent and child during invocation (would break isolation);
- typed enums for terminals at the validator level (the target language carries the types).

These are explicitly **out of scope** and *not* open points — they are decisions, like the no-async invariant.

## Open points that remain

- **Path expression resolution conventions**: `payment.amount`, `child.validation_token`. The dotted form is human-readable but does not address arrays, nullable, or default values. Decision deferred to a follow-up if the three real-world examples need it.
- **Versioning of `context_schema`**: when the child evolves and adds or removes fields, parents must adapt. The schema currently has no `version` on the context block (only at the workflow level). May need to grow.
- **Empty contexts**: workflows that genuinely need no input and produce no per-terminal output should be allowed to omit `context_schema` entirely. The validator must not require it.

## Mapping to XState

XState v5 has a richer model: `setup({ types: {...}, actors: {...} })` plus `invoke: { src, input, onDone, onError }`. The mapping is:

- POM `context_schema.input` → XState invoke's `input` (object passed at invocation time).
- POM `on_completion[].terminal_state = 'validated'` → XState invoke's `onDone` (success path).
- POM `on_completion[].terminal_state = 'refused'` → XState invoke's `onError` *or* another `onDone` discriminating in the action — POM treats refusal as just another terminal, XState distinguishes errors syntactically.
- POM `on_completion[].assign` → XState `actions: assign({ ... })` in the onDone handler.

Compatibility remains lossless (input/output map cleanly), and the POM model is still a *subset* of what XState can express.

## Cross-references

- `EXPERIMENT.md`: the round 2 narrative will reference this note as the design rationale.
- `spec-candidate/SPEC-DRAFT-workflow-modeling.md`: a new "Context Injection" section will cite this note as the closed decision and document only the schema rules.
- `xstate-compat/COMPATIBILITY.md`: will gain a row for the input/output mapping.
- `templates-candidate/WORKFLOW_IMPLEMENTATION_GUIDE.md`: will gain a section on how the target agent translates `input` / `assign` into language-specific access (entity field access, repository read, etc.).
