# Changelog

This changelog records public-facing POM releases. Fine-grained development history remains in Git.

## Unreleased

Lowers the friction of activating workflow modeling in a target project. Before this change, enabling workflows was discoverable only by reading SPEC-0006, and a missing `js-yaml` install made the scripts fail with a raw `ERR_MODULE_NOT_FOUND` stack trace.

### Added

- **`workflows` section in `POM_CONFIG_TEMPLATE.json`**: shipped pre-filled with `enabled: false`, so new projects already have the shape to copy instead of reconstructing it from the spec.
- **"Enabling Workflows" section in the `config` skill** (`skills/config.md`): documents the `workflows` config shape, the activation steps, and the `js-yaml` prerequisite. Closes the referral loop — the `workflow` skill routes to `config.md` when workflows are off, which previously said nothing about how to enable them.
- **`scripts/require-yaml.mjs`**: guarded loader for `js-yaml` (the only external dependency of the workflow scripts). On a missing install it prints an actionable message (`npm install` + pointer to `config.md`) and exits 2 instead of throwing a raw module-resolution stack trace.

### Changed

- **Workflow scripts** (`lint-workflows.mjs`, `to-mermaid.mjs`, `to-xstate.mjs`): import `js-yaml` through `require-yaml.mjs` so all three fail gracefully when the dependency is absent.

## 0.2.0 - 2026-05-30

Adds the workflow modeling capability (SPEC-0006) to POM. Opt-in per target project via `workflows.enabled` in `pom.config.json`. Coherent with the four POM-workflow pillars: no async / no shared state / no inheritance / no runtime in POM.

### Added

- **SPEC-0006 — Workflow Modeling Support** (`specs/SPEC-0006-workflow-modeling.md`): canonical specification of the workflow YAML schema, four synchronous composition primitives (pipeline, invoke-from-state, invoke-from-event, context injection), and the validator rule set.
- **ADR-0002 — Workflow Context Injection** (`decisions/ADR-0002-workflow-context-injection.md`): closed design decision adopting Result<Terminal, Output> as the parent/child data exchange model, rejecting shared context visibility.
- **`workflow` skill** (`skills/workflow.md`): five modes (`design | validate | diagram | scenarios | implement`) for working with a workflow YAML through an agent. Opt-in via `pom.config.json.workflows.enabled`.
- **Canonical prompt** (`prompts/27-workflow-modeling.md`): operational prompt for the skill.
- **Templates** (`templates/`): `WORKFLOW_TEMPLATE.yaml`, `PIPELINE_TEMPLATE.yaml`, `WORKFLOW_IMPLEMENTATION_GUIDE.md` (language profiles for TypeScript and Python, with Pattern A/B/C catalogue and suspend/restore section), `WORKFLOW_INTEGRATION_GUIDE.md` (adoption + extension manual), and three example workflows (`examples/workflow/spec-evolution.yaml`, `ticket-lifecycle.yaml`, `document-approval.yaml`).
- **Validator + transformers** (`scripts/`): `lint-workflows.mjs` with 50 Error rules + 4 Warning rules and integrated Mermaid generation via `--mermaid-dir`; `mermaid.mjs` shared renderer; `to-mermaid.mjs` and `to-xstate.mjs` standalone CLIs.
- **XState v5 compatibility doc** (`docs/workflow-xstate-compatibility.md`): mapping table for the four composition primitives and the stately.ai workflow.
- **npm scripts** (`package.json`): `pom:workflow:lint`, `pom:workflow:mermaid`, `pom:workflow:xstate`. Installer propagates them to target projects.
- **Dependency** (`package.json`): `js-yaml` ^4.1.0 for the workflow scripts. Required only when `workflows.enabled` is true; no impact otherwise.

### Provenance

The capability was developed entirely inside `experiments/workflow-modeling/` on branch `exp/workflow-modeling` and consolidated via the canonical promotion path declared in SPEC-0006. The experiment folder is preserved as the historical record (status: consolidated), including all evidences: 21+ validated YAML workflows, 30 broken-fixture tests for the validator, three language H4 evidences (TypeScript single-machine, Python single-machine, TypeScript composed stack with suspend/restore), 38 Mermaid diagrams generated in one sweep, and a real-project validation on the internal AI agent codebase covering a three-level invoke chain (operational → analyzer → clean-family-repair).

### Open points carried forward (candidates for a future SPEC-0007)

- `loop_guard` primitive with `max_visits` and named exhaustion exits (motivated by `MAX_LLM_ATTEMPTS` and `MAX_FAMILY_REPAIR_ATTEMPTS` in internal AI agent).
- Pipeline-level structured context passing between members.
- Validator Info rules (cycle diagnostics, naming conventions).
- TypeScript guided-implementation evidence for the pipeline orchestrator case (deferred to the actual POM deploy on the internal AI agent project).

## 0.1.0 - 2026-05-18

First truly public POM release. This version is ready for external evaluation and has already been exercised on internal medium-sized projects, but it should still be treated as the beginning of public validation. Reaching a definitive shape will require careful testing across many real projects, with feedback folded back into the method, templates, scripts, and adoption guidance.

### Added

- Bootstrap installer for target projects through `bootstrap-pom.mjs`.
- Adoption presets for owned, team, overlay, and minimal setups.
- POM skills, prompts, templates, and governance lint.
- Static wiki reader generation through `npm run pom:wiki:render`.
- `pom:update` for refreshing installed POM copies.
- `pom:test` for the POM source repository integration suite.

### Distribution Notes

- The current bootstrap checksum is published in `checksums/bootstrap-pom.mjs.sha256`.
- For repeatable adoption, install from a release tag or immutable commit and verify the checksum from the same ref.
- The package version is `0.1.0`; create the matching Git tag before treating this as a published release.
