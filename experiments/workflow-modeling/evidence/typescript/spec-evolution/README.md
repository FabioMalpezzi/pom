# Guided TypeScript implementation — spec-evolution

Evidence for Hypothesis H4 of the workflow-modeling experiment: the skill `workflow` in mode `implement`, applied to a clean workflow YAML, guides a coding agent to produce target-language code without imposing a library.

## Setup

- Source workflow: `experiments/workflow-modeling/examples/spec-evolution.yaml`.
- Target language: TypeScript on Node.js 22.19 with `--experimental-strip-types` (no compiler, no dependencies, no `tsconfig`).
- Target test runner: `node:test` (built-in, zero dependency).
- Procedure followed: the `implement` mode steps from `experiments/workflow-modeling/prompts/workflow.md`.

## Pattern selection

Following the selection criteria in `WORKFLOW_IMPLEMENTATION_GUIDE.md`:

- `spec-evolution` has 7 states, 7 events, 2 guards — well under the ~20 / ~50 threshold;
- guards (`has_completion_verification_gate`, `superseding_spec_accepted`) are simple textual predicates that map naturally to boolean functions over an opaque context;
- there is no hierarchical state, no parallel region, no need for entry/exit hooks;
- the target stack (the experiment scaffolding) does not already include an FSM library.

The guide's criterion table maps these properties to **Pattern A (transition table)**. Pattern B (switch on state) is reasonable for the size; Pattern C (library-based) would introduce a dependency that the model does not justify. Chosen: **Pattern A**.

## Files produced

| File | Purpose |
|---|---|
| `spec-evolution.ts` | Types, transition table, `applyTransition` function. |
| `guards.ts` | Named predicate stubs with docstrings copied verbatim from the YAML. |
| `spec-evolution.test.ts` | Tests derived manually from the YAML (the `scenarios` generator is target-for-promotion, not implemented yet). |
| `test-output.txt` | Captured output of `node --test --experimental-strip-types`. |

## What the guide actually guided

- **Pattern choice** with explicit criteria (table, switch, library) — the guide's selection table mapped directly to Pattern A.
- **Guard naming convention**: predicate functions named one-to-one with the YAML's `guards[].name`, prefixed `guard_` (e.g., `guard_has_completion_verification_gate`).
- **Docstring discipline**: the textual description from the YAML's `description:` field is reproduced verbatim as the function's leading JSDoc block. The model stays the source of authority; the code documents only how it implements that source.
- **Test cases derivation**: positive transitions, refused (from, event) pairs, guard-true and guard-false branches, terminal-state checks. Even without a scenario generator, the prompt's `scenarios` mode listed the four categories of tests, and the YAML directly supplied the inputs.
- **`re_entry_allowed` handling at the code level**: the transition table includes `complete → superseded` because the YAML declares it, and the terminal-state check in tests is scoped to states that do NOT have `re_entry_allowed: true`. The validator-level suppression of W003 translated cleanly into a code-level distinction.

## What the guide did NOT guide (project-specific decisions)

- **Where the guard predicates live in the project's architecture**. The guide says "behind named functions"; it does not say whether they belong to the entity, a service, a use case, or a repository layer. Decision made for this evidence: a separate `guards.ts` module, predicates take an opaque `context` parameter.
- **Storage layer for the entity holding the state**. Not in scope of POM's guide; would live in the target project. The evidence code returns the next state instead of persisting; persistence is the caller's responsibility.
- **Test framework**. The guide says "use the target's test runner per `pom.config.json`"; for this evidence the experiment had no `pom.config.json`, so `node:test` was chosen for zero-dependency reasons. In a real target the choice would come from configuration.
- **Type of the entity carrying the state**. Modeled as a plain object literal in the tests. Real targets would have a richer type.
- **Whether to emit events on transition** for observability. Not in scope of the workflow model; would live in the surrounding architecture.

## H4: assessment

The guide produced a clear path from the YAML to runnable code without imposing a library, a framework, or a project architecture. The points the guide did *not* cover are correctly the target's own responsibility — not gaps in the guide. The transition table mirrors the YAML one-to-one; the guards expose the YAML's textual descriptions to the developer at the right place; the tests cover all categories that the prompt's `scenarios` mode prescribes.

H4 is confirmed for Pattern A on a small clean model. Patterns B and C remain unverified by this evidence; verifying them would require either a richer model (Pattern C) or a different style preference (Pattern B). Both can be exercised in later rounds; neither is required to claim H4 confirmation for the chosen path.

## How to reproduce

From `experiments/workflow-modeling/evidence/typescript/spec-evolution/`:

```bash
node --test --experimental-strip-types spec-evolution.test.ts
```

Expected output: all tests pass, exit code 0. The recorded output is in `test-output.txt`.
