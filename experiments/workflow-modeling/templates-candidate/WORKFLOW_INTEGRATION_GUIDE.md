# Workflow Integration & Extension Guide

How to **adopt** POM workflow in a project that decides to use it, and how to **extend** existing workflows over time without losing the discipline that makes the model useful.

This guide is for the team that owns the target project. It complements:

- `WORKFLOW_IMPLEMENTATION_GUIDE.md` — how to translate one YAML into target-language code (Patterns A/B/C, language profiles, suspend/restore).
- `prompts/workflow.md` — how the agent operates in `design | validate | diagram | scenarios | implement` modes.
- `SPEC-DRAFT-workflow-modeling.md` — the contract: schema, validation rules, four invariants.

## When to adopt

POM workflow fits a project that has:

- domain entities with discrete lifecycle states (Order, Ticket, Document, Subscription, Account, Application);
- a small number of distinct workflows per domain (typically 1–10);
- a team that wants the model as a **first-class artifact** (versioned, reviewed, diagrammed), not buried in code comments.

It does **not** fit:

- pure rule-engine classification with concurrent candidate machines (see Syntonia Family rules);
- workflows whose primary complexity is concurrency, real-time, or distributed coordination;
- UI state with deep nesting and parallel regions (XState or a UI-state library is the right tool).

If unsure, pick one domain workflow as a pilot, model it, validate it, generate one implementation. The cost of being wrong is one YAML file.

## File layout in a target project

Recommended structure:

```
<project root>/
├── pom.config.json
├── workflows/
│   ├── <name-1>.yaml
│   ├── <name-2>.yaml
│   ├── <name-3>.pipeline.yaml          ← linear pipeline file
│   └── generated/                      ← auto-rebuilt; never hand-edited
│       ├── <name-1>.validation.md
│       ├── <name-1>.mmd                 ← Mermaid
│       ├── <name-1>.scenarios.md
│       ├── <name-1>.xstate.json         ← optional, for stately.ai
│       └── ...
└── src/
    └── <feature>/
        └── <implementation per language>
```

Conventions:

- one file per workflow, named after the workflow id (snake_case);
- pipeline files use the `.pipeline.yaml` suffix;
- everything under `workflows/generated/` is the validator's territory and is regenerated on every run — do not hand-edit.

For projects with many workflows, group by domain:

```
workflows/
  orders/
    cart-flow.yaml
    checkout-flow.yaml
    payment-flow.yaml
    shipping-flow.yaml
    order-processing.pipeline.yaml
  tickets/
    ticket-lifecycle.yaml
  approvals/
    document-approval.yaml
```

## Configuration

`pom.config.json` declares the workflow section opt-in:

```json
{
  "workflows": {
    "enabled": true,
    "root": "workflows/",
    "generatedRoot": "workflows/generated/",
    "namingConvention": "snake_case",
    "language": "typescript",
    "testRunner": "node:test",
    "implementationPattern": "A"
  }
}
```

`language` and `testRunner` drive the `implement` mode's choice of idiomatic shape. `implementationPattern` is the team's default; per-workflow overrides live in the workflow's `metadata:` block.

## Lifecycle of a workflow

```
draft an idea  →  design  →  validate  →  visualize  →  implement  →  test  →  persist  →  maintain
                  (skill)    (lint)       (mermaid)   (guide)       (target)   (suspend)   (PRs)
```

| Phase | Tool | Output |
|---|---|---|
| Design | `workflow design` skill mode | new or revised `<name>.yaml` |
| Validate | `npm run pom:workflow:lint` (or equivalent) | `<name>.validation.md`, exit code |
| Visualize | Validator with `--mermaid-dir <dir>` (preferred: same run as validation) or `to-mermaid.mjs` / `to-xstate.mjs` + stately.ai | `<name>.mmd` and/or `<name>.xstate.json` |
| Implement | `workflow implement` mode + `WORKFLOW_IMPLEMENTATION_GUIDE.md` | target-language code + tests |
| Test | language-native runner | passing tests |
| Persist | section "Suspend and Restore" of the implementation guide | snapshot shape adopted in storage |
| Maintain | PR-time validator + diff review | new validation report + updated diagram |

CI integration: run the validator on every PR that touches `workflows/`. Fail the build on Error-level findings. Warnings are reviewer-judgment by default; promoting one to blocking is a team choice.

Recommended CI invocation produces both reports and diagrams in one pass:

```bash
node scripts/lint-workflows.mjs --mermaid-dir workflows/generated/ workflows/*.yaml workflows/**/*.yaml
```

Pairing `--mermaid-dir` with the validator guarantees that `workflows/generated/*.mmd` is always in sync with the YAML: drift is impossible, because the diagram is rebuilt at the same time the validation report is. This is the single most effective drift-prevention measure POM offers; see "Maintenance: avoiding drift" below.

## Adoption on a greenfield project

1. Add `pom.config.json` with `workflows.enabled: true`.
2. Pick the first domain workflow (start small).
3. Use `workflow design` to draft `workflows/<name>.yaml` from prose.
4. Run the validator until clean.
5. Generate Mermaid for the team review.
6. Pick a Pattern (A by default).
7. Use `workflow implement` to produce code + tests.
8. Wire up suspend/restore at the persistence boundary.
9. Add CI job for the validator.

Time budget for the pilot: a few hours of model + a half day of implementation for a small workflow (5–10 states).

## Adoption on an existing project (migration patterns)

Most projects already have FSMs encoded somewhere: enum + switch, state column + business rules in services, ad-hoc scattered boolean flags. The migration is **modeling first, refactoring second**.

### Pattern A — model first, leave code alone

1. Identify the implicit FSM by reading the code (states, transitions, terminals).
2. Write the YAML to match the **observed** behavior, not the desired behavior.
3. Validate it. Show the diagram to whoever maintains that code.
4. Surprises in the model often reveal real bugs or undocumented behavior. Decide whether to fix them by changing code, or by accepting them in the YAML as `open_points`.
5. Only after the YAML is stable, consider refactoring the code to match a generated implementation.

This is the safest migration path. It produces documentation as a side effect even if no code is touched.

### Pattern B — generate side-by-side, switch when ready

1. Model the FSM in YAML.
2. Generate the implementation in a new module (e.g., `order_lifecycle_v2.ts`) using Pattern A.
3. Add tests that prove the new module matches the old behavior on representative scenarios.
4. Switch callers gradually behind a feature flag.
5. Delete the old code when the new one is in production for one full cycle.

### Pattern C — adopt the model, generate XState, run dual

1. Model the FSM in YAML.
2. Generate the XState `MachineConfig` JSON via `to-xstate.mjs`.
3. Run the XState actor in a sidecar that records what it would have decided.
4. Compare with the existing implementation in production.
5. When parity holds, switch.

## Extending an existing workflow

The schema is intentionally easy to extend. The discipline lives in **what** to extend and **how to version** the change.

### Adding a state

1. Add the entry under `states[]`.
2. Add at least one transition that reaches it (otherwise W001 unreachable fires).
3. Decide if it is terminal (`is_final: true`) or transient.
4. If terminal and the workflow is invoked by a parent, update each parent's `on_completion` to handle the new terminal.
5. Bump `version` if downstream consumers depend on the state list. See "Versioning".

### Adding a terminal

If the workflow is consumed by a parent or by pipeline-level routing, **every consumer must declare what to do** when the new terminal appears. Without that, the parent's `on_completion` is incomplete and the validator will warn.

Checklist:

- Add the terminal to `states[]` with `is_final: true` (or with `re_entry_allowed: true` if it admits a documented exception).
- If the workflow declares `context_schema.output_by_terminal`, add the per-terminal output payload for the new terminal.
- For every parent invoking this workflow: extend `on_completion[]` with a new branch for the new terminal.

### Adding a transition

1. Add the entry under `transitions[]`.
2. If the source state was previously a dead-end (W002), the warning silently disappears — confirm that this was intended.
3. If the destination is a terminal with `re_entry_allowed: true`, no warning. Otherwise check W003 carefully.

### Removing a state or a transition

This is the dangerous case. **In-flight instances may be sitting in the state about to be removed.**

1. Mark the state or transition as deprecated in the YAML (`metadata.deprecated: true`) for one release cycle.
2. Migrate in-flight instances to a still-supported state.
3. Wait for confirmation that no live instance is in the deprecated state.
4. Remove from the YAML.
5. Bump the major part of `version`.

The validator does not enforce migration; this is operational discipline.

### Bumping the version

The `version:` field is for **schema-shape compatibility**. Snapshot loaders use it to refuse incompatible payloads (see suspend/restore section).

Convention:

- **Patch** (`version: 1` → still `1` but commit message says "patch"): documentation-only changes, no semantic effect.
- **Minor** (incremented integer in v1 of POM): additive changes — new state, new terminal, new transition that does not remove anything. Snapshots from the previous version remain valid.
- **Major** (incremented integer + explicit migration note in `metadata`): removals, renames, terminal-status flips. Snapshots from the previous version are not portable without a migration function in target code.

POM v1 uses a single `version` integer. For projects that need semver, add `metadata.semver: "x.y.z"` alongside.

### Renaming a state, event, or guard

Treat as a major version bump. The schema accepts the new name but every parent invoking this workflow, every stored snapshot, and every target-code reference must move together. The validator catches references in YAML; references in target code must be checked by the team.

Recommended: rename in two steps. First introduce the new name as an alias in target code, regenerate from YAML with the new name, update parents, deploy, then remove the alias.

## Adding a new workflow

### From scratch

Run the `workflow design` skill mode with a prose description. The agent surfaces ambiguities as `open_points` rather than inventing rules. Iterate until the validator is clean and the diagram makes sense to the domain expert.

### Derived from an existing workflow

Copy the file. Rename `workflow:` and `initial_state`. Adapt states, events, guards. Do **not** add an `extends:` field — POM does not support inheritance (pillar 3). Two workflows that share 80% of their structure are still two independent files; the duplication is the price of autonomy.

If the duplication becomes painful, the symptom is usually that the two workflows are not really separate — they are one workflow with different guards. Consider merging into one with broader guards rather than splitting.

## Composing workflows

| Composition need | POM primitive |
|---|---|
| Sequential pipeline (cart → checkout → payment → shipping) | Pipeline file with linear `sequence:` |
| Parent calls one child synchronously while in a specific state | `states[].invoke` |
| Parent's transition runs a child before deciding the target | `transitions[].invoke` |
| Parent calls N children concurrently | **Not supported.** Pattern C territory. |
| Parent collects partial results from multiple children | **Not supported.** |
| Workflows that share state mid-execution | **Not supported.** Each FSM has private context. |

If your composition need falls in the "not supported" rows, the design choice is: extract that part of the system out of POM-workflow and into the runtime layer (queue, actor system, library).

## Maintenance: avoiding drift

The largest risk after adoption is that the YAML and the target code drift apart. Three counter-measures:

1. **Validator in CI**: every PR touching `workflows/` runs the validator. Build fails on errors.
2. **Regenerate-on-PR**: when the YAML changes, the diagram and scenarios are regenerated in the same PR. Reviewers see them.
3. **Code-from-YAML check**: depending on adoption pattern:
   - Pattern A hand-written: a CI test compares the transition table in code with the YAML transitions, by name. Mismatches fail the build.
   - Pattern A build-generated: the build script regenerates the transition table from YAML; the PR diff shows the change.
   - Pattern C with XState: a CI test parses the XState config and compares its states/events with the YAML. Mismatches fail.

The team adopts the option that fits their workflow. POM does not enforce one.

## Best practices

- **One workflow, one YAML, one responsibility**. A YAML that models more than one concept is a YAML waiting to be split.
- **Guards are nouns, not verbs**. `has_completion_verification_gate` is a state of the world; `verify_completion` is an action. Actions belong in code; guards belong in the YAML.
- **State names describe the entity, not the activity**. `validating_credit` (the document is in this state) is preferable to `running_credit_check` (something is happening to the document) when the latter is implied.
- **Terminal names spell the outcome explicitly**. `payment_captured` and `payment_refused` are better than `success` and `failure` because the parent reads them as discriminator values.
- **`re_entry_allowed: true` is opt-in and explicit**. Use it when a "terminal" admits a documented exception (closed-but-reopenable ticket, completed-but-supersedable spec). Do not use it as a workaround to silence W003.
- **`open_points` and `closed_points` in metadata** are the workflow's design diary. They survive longer than commit messages and travel with the file.
- **Diagram before merge**. The Mermaid output is regenerated cheaply; reviewing the PR with the new diagram open catches structural mistakes that the validator can't see.
- **Suspend/restore from day one** if the workflow has any chance of being long-running. Retrofitting persistence later is harder than adding it at boundary creation time.

## When to retire a workflow

Workflows die too. Causes:

- the entity no longer exists in the domain;
- the workflow was merged into another;
- the feature was rolled back.

Recommended retirement procedure:

1. Mark `metadata.retired: true` and freeze the file.
2. Move it under `workflows/retired/`.
3. Keep the file forever in the repository — it documents historical states the storage layer may still encounter.

The validator skips files under `workflows/retired/` by convention; the storage layer's snapshot validator should still consider them when restoring old data.
