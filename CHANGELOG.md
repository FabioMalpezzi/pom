# Changelog

This changelog records public-facing POM releases. Fine-grained development history remains in Git.

## Unreleased

### Changed

- **Wiki reader split along its responsibility boundary** (`scripts/render-wiki.mjs`, new `scripts/lib/wiki-reader-markdown.mjs`): the renderer had grown to 826 lines, past the 800-line working target the source-size lint warns about. Markdown parsing — block and inline rendering, tables, code highlighting, link rewriting — moved to `scripts/lib/wiki-reader-markdown.mjs` (419 lines), which takes text and returns HTML fragments and knows nothing about pages, navigation, themes, or the file system. Site assembly — argument parsing, page loading, ordering, layout, outline, CSS and JS emission — stays in `scripts/render-wiki.mjs` (425 lines) and imports from the new module. The dependency runs one way only. Behavior is unchanged: the generated site was compared file by file before and after the split and is byte-identical. Target projects need no action, since `pom/` is copied recursively.

- **Compact always-loaded POM section** (`templates/agents/00-core.md`, `templates/agents/60-skills.md`, `templates/AGENTS_POM_SECTION_TEMPLATE.md`): the always-loaded POM instructions — both the default modular assembly and the manual-install fallback — are now compact. The modular core (`00-core.md` + `60-skills.md`) drops from 1367 to ~900 words, cutting measured bootstrap input-token cost from 3964 to 2616 (−34%); the manual fallback drops similarly. They keep identity, source authority, evidence discipline, Git posture, and the disabled-module adoption guard, and replace the full 15-row routing table with a minimal key-routes cue (clarify, adopt/seed, root-cause, defer, check, wiki, pulse/handoff, spike, finish-branch) plus the `pom/skills/README.md` catalog for everything else, in line with SPEC-0001. A five-repetition behavioral evaluation on the modular default showed routing and safety at parity with the previous section (critical 0.978 in both; `clarify` routing preserved), with no adoption-safety or completion-honesty regression.

### Fixed

- **The wiki reader no longer hangs on an orphan table row** (`scripts/render-wiki.mjs`, `tests/wiki-reader/integration/test-orphan-table-row.mjs`): a `| ... |` line separated from its table by a blank line fell between two checks in `renderMarkdown` — `isTableStart` rejected it because no header separator followed, and `isParagraphLine` rejected it because it looked like a table row. No branch consumed the line, the cursor never advanced, and the renderer appended empty paragraphs until the runtime failed with `RangeError: Invalid array length`, naming neither the file nor the line. Since the orphan row is valid Markdown, no lint could catch it, so the failure surfaced in the pre-commit wiki regeneration as an unreadable error. The row is now rendered as text, as any Markdown renderer would, and reported as `index.md:11: table row is not part of a table (no header separator follows)` with the source line number corrected for frontmatter; the warning does not fail the render. A guard also stops the loop with the offending file, line, and content should any future branch fail to advance the cursor, instead of degenerating into an opaque `RangeError`.

- **The canonical templates now pass their own validator** (`templates/WORKFLOW_TEMPLATE.yaml`, `templates/PIPELINE_TEMPLATE.yaml`, new `templates/workflows/`): both shipped templates used to fail `pom:workflow:lint` — 8 errors and 3 errors respectively — while POM tells target projects that the model is the source of authority and the validator is the judge. `PIPELINE_TEMPLATE.yaml` also contradicted an invariant printed in its own header: its last member handed off to `payment-flow.yaml`, which was not a member of the sequence (E026). The pipeline now declares that third member and terminates on it; the workflow template is one coherent flow (draft → validation child → fan-out batch → done, with the timeout branch cancelling the batch before it terminates) instead of a bag of syntax fragments; the child workflows both templates reference ship beside them under `templates/workflows/`; and the one construct that could not be wired into a single coherent example, the transition-level `invoke`, is shown as a commented block rather than a broken reference. Both templates and all five children validate at zero errors and zero warnings, asserted on every `pom:test` run.

### Added

- **Verification evidence on guards** (`templates/WORKFLOW_TEMPLATE.yaml`, `scripts/lib/workflow-lint-core.mjs`, `prompts/27-workflow-modeling.md`): a guard can now declare where its pass/fail decision comes from through an optional `evidence` block — `source: deterministic | model_judgment | human`, plus `independent_context` for model judgement. The validator adds E090 and E091 for a malformed block, W005 when a model-judged guard does not declare context independence, and W006 when a guard leaving an `await` state declares no evidence at all. POM already required an independent evaluator at experiment level (`prompts/31-loop-goal-conclude.md`); the same discipline now applies to individual verification nodes, because a verifier that shares the executor's context agrees with itself instead of verifying. The block is optional and every existing model validates unchanged.

- **Runtime loop contract** (`runtime_loop` in `templates/WORKFLOW_TEMPLATE.yaml`, validator rules E100–E106, W007, W008): an optional top-level block recording how a runtime re-enters a workflow and what closes a cycle — trigger, goal, evidence, feedback, and stop with an escalation path. The state graph says which transitions are legal; it never said what starts another cycle, what evidence decides success, what a failed cycle hands to the next one, or who owns an exhausted run. Once declared the block is validated as a contract. It stays distinct from the experiment contract in `prompts/28-loop-goal-define-criteria.md`: the runtime loop describes the workflow, the criteria describe the experiment that measures it.

- **Fan-out isolation and merge decisions** (`prompts/27-workflow-modeling.md`, `skills/workflow.md`, `templates/WORKFLOW_TEMPLATE.yaml`): before a `fan_out_launch` is modeled, three questions must be answered or recorded as named open points — where each worker does its work, how results are merged, and what happens when two workers contradict each other on the same identity. POM does not model workspaces and does not choose the isolation mechanism; it refuses to leave the decision implicit, because parallel workers sharing one mutable workspace overwrite each other.

- **Model provenance** (`metadata.provenance` in `templates/WORKFLOW_TEMPLATE.yaml`, `prompts/27-workflow-modeling.md`): `design` mode now declares whether a workflow was drawn from an observed process or designed from intention alone. Both are legitimate; an undeclared speculative model is later read as a description of real behavior.

- **`mcp-interface` skill** (`skills/mcp-interface.md`, `prompts/35-mcp-interface.md`): provides `design`, `audit`, `reshape`, and `verify` modes for MCP tools, resources, prompts, schemas, responses, and errors. It adapts AXI agent-ergonomic principles to version-specific MCP contracts, requires separate tool/resource/prompt inventories, source-cited findings, and approval before any public-contract change. Verification applies the POM Goal-Backward and scenario gate, distinguishes HTTP authorization from JSON-RPC and tool execution errors, and requires host-visible token evidence for token-efficiency claims without adding an MCP runtime to POM.

- **Pi package (skill-only)** (`package.json` `pi` manifest + `pi-package` keyword, `tests/pi-package/`): POM can be installed into the Pi coding agent as a skill package (`pi install git:github.com/FabioMalpezzi/pom` or `pi -e …`). Pi registers the POM skills; a natural POM request loads `using-pom` and routes through the catalog and linked prompts. Live acceptance on Pi confirmed correct routing in a POM project, no injection in a non-POM project, and reload after compaction, so no active extension or Decision Record is needed. It ships no extension code, declares no LLM client, and writes nothing to your project.

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
