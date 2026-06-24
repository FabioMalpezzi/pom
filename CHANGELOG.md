# Changelog

This changelog records public-facing POM releases. Fine-grained development history remains in Git.

## Unreleased

### Added

- **Configurable wiki root** (`wiki.root` in `templates/POM_CONFIG_TEMPLATE.json`, `scripts/lib/lint-config.ts`, `scripts/lib/lint-wiki.ts`, `scripts/lib/lint-docs-source.ts`): the wiki directory can now be relocated like every other module root (for example nested under a documentation root such as `doc/tech/wiki`). The wiki lint honors `wiki.root` and the docs-source lint excludes it from official-document section checks, so a wiki nested under the docs root is no longer flagged as official documentation. The lint's wiki-reader regeneration passes the configured root to `render-wiki.mjs` via `--source`/`--out`; manual renders of a relocated wiki use the same flags. Defaults to `wiki`, so existing projects are unaffected.
- **`using-pom` bootstrap skill** (`skills/using-pom.md`, `prompts/32-using-pom.md`): routes POM-aware work before acting, maps common harness tool names across Codex, Claude Code, Gemini CLI, Cursor, OpenCode, and GitHub Copilot, and guards against creating artifacts for disabled adoption modules.
- **Agent harness reference** (`prompts/references/agent-harnesses.md`): documents the session-start contract, instruction targets, tool mapping, and clean-session smoke prompts for POM integrations.
- **Skill bootstrap tests** (`tests/skill-bootstrap/`): deterministic checks for the new bootstrap, concise skill frontmatter descriptions, bilingual English/Italian routing smoke fixtures, disabled-module negative cases, and Git/experiment routing through `spike` and `sync`.
- **`finish-branch` delivery skill** (`skills/finish-branch.md`, `prompts/33-finish-branch.md`): guides verified branch closure through merge, PR, keep, discard, and worktree cleanup options.
- **`root-cause` debugging skill** (`skills/root-cause.md`, `prompts/34-root-cause-debugging.md`): optional Target Project procedure for bugs, test failures, build failures, performance issues, and unexpected behavior; requires evidence-first root-cause investigation before fixes.
- **POM Source file-size lint** (`source-size-*`): enforces the 1000-line hard cap and warns at the 800-line working target for operational POM Source code files, without applying those limits to Target Project application files.
- **Workflow activation config** (`templates/POM_CONFIG_TEMPLATE.json`, `skills/config.md`): ships the `workflows` section disabled by default and documents the activation steps for workflow modeling.
- **Guarded YAML loader** (`scripts/require-yaml.mjs`): workflow scripts now fail with an actionable `js-yaml` install message instead of a raw module-resolution stack trace when the optional dependency is missing.
- **Project Reader standalone CLI and profiles** (`project-reader`): adds `open` and `search` commands, a generic `.project-reader.json` profile, the POM profile as an adapter, a lazy `/api/tree?path=...` directory API, and a command palette for path/file/content lookup.
- **Workflow runtime seam templates** (`templates/WORKFLOW_RUNTIME_TEMPLATE.ts`, `templates/WORKFLOW_RUNTIME_TEMPLATE.py`): provide Target Project starting points for execution, persistence, timers, retry, tools, and side effects without making POM a runtime.

### Changed

- Reworked skill frontmatter descriptions to be trigger-oriented rather than miniature workflows, reducing the chance that an agent follows the description without reading the skill body.
- Updated installed agent instruction templates so POM-aware sessions start from `pom/skills/using-pom.md` when the correct skill is unclear.
- Extended `spike` with Git isolation rules for existing worktrees, submodules, harness-native workspaces, baseline verification, and handoff to `finish-branch`.
- Clarified `check` routing so Target Project failures go to `root-cause`, while POM method/tooling defects stay on `diagnose`.
- Aligned README and config template version references with package version `0.2.0`.
- Aligned README, public guides, and wiki skill maps with the current installed skill index.
- Split large POM Source implementation files below the 800-line working target.
- Removed stale candidate-status prose from the canonical loop/goal criteria prompt.
- Routed workflow lint, Mermaid, and XState scripts through the guarded YAML loader.
- Split the Project Reader into reusable core/adapters, changed tree navigation to lazy directory loading, and virtualized the thematic list so large Target Projects no longer require a global file tree or tens of thousands of buttons before browsing.
- Clarified workflow adoption for Target Projects: ordinary workflow modeling remains gated by `workflows.enabled`, Dynamic Workflow control-plane modeling is an explicit opt-in profile gated by `workflows.dynamic.enabled`, and loop/goal modeling is an explicit opt-in profile gated by `workflows.loopGoal.enabled`; runtime execution remains target-owned.
- Improved workflow template discoverability in the canonical README, HTML guides, and `pom:help`, including optional TypeScript/Python runtime seam templates.

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
