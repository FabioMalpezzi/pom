# POM Wiki Log

This log records root wiki changes for the POM source repository. It keeps update history out of the topic pages while preserving the reason for meaningful wiki changes.

## [2026-09-02] update | POM 0.7.2

Bumped the index to POM v0.7.2: installer messages list the `pom:*` scripts they actually manage. Details in `CHANGELOG.md`.

Sources used: `CHANGELOG.md`, `scripts/install-pom.ts`.

## [2026-09-02] update | POM 0.7.1

Bumped the index to POM v0.7.1: tandem documented end to end (new `wiki/tandem-collaboration.md` with the real slugify run, skill map, guides, README, installation, help, key routes). Details in `CHANGELOG.md`.

Sources used: `CHANGELOG.md`, `wiki/tandem-collaboration.md`.

## [2026-09-02] add | tandem collaboration reading guide

Added `wiki/tandem-collaboration.md`, a human reading guide to the `tandem` skill: roles and backend symmetry, persistent sessions, the controller's own worktree and the executor-workspace guard, the per-task cycle with cap and escalation, the two contracts, exit codes, the collaboration folder, the human-coordinated variant, how a review is read through the coordinator, and a condensed example. Linked from the index under a new "Agent collaboration" area and from `wiki/skills-and-prompts.md`, whose `tandem` section now lists the current commands and exit codes.

Sources used: `skills/tandem.md`, `prompts/38-tandem.md`, `templates/TANDEM_BRIEF_TEMPLATE.md`, `scripts/tandem.mjs`, `scripts/lib/tandem-contract.mjs`, `scripts/lib/tandem-backends.mjs`, `scripts/lib/tandem-state.mjs`.

## [2026-09-02] update | POM 0.7.0

Bumped the index to POM v0.7.0: the tandem skill hardened after an adversarial review (first-line verdict, explicit session reset, guarded paths, fingerprint over ignored files, closed-tandem guards, per-phase budget, `note`, `--done`, `--setup`, `--guard-ignore`). Details in `CHANGELOG.md`.

Sources used: `CHANGELOG.md`, `skills/tandem.md`, `prompts/38-tandem.md`.

## [2026-09-02] update | POM 0.6.1

Bumped the index to POM v0.6.1: the tandem coordinator relays every controller verdict and executor response verbatim in its chat, and the script prints replies between delimiters. Details in `CHANGELOG.md`.

Sources used: `CHANGELOG.md`, `skills/tandem.md`, `prompts/38-tandem.md`.

## [2026-09-02] add | tandem skill for two-agent controller/executor work

Added the `tandem` skill (`skills/tandem.md`, `prompts/38-tandem.md`) to the skill map: a coordinator agent carries assignments, deliverables, and findings between an executor that writes and a controller that reviews in its own worktree, with a fixed verdict contract, a per-task cycle cap, and escalation to the user. Catalogued in `skills/README.md`, `prompts/README.md`, the README, and both HTML guides; `CONTEXT.md` gained Tandem, Controller, and Executor and generalized Coordinator.

Sources used: `skills/tandem.md`, `prompts/38-tandem.md`, `CONTEXT.md`.

## [2026-09-02] update | POM 0.5.0

Bumped the index to POM v0.5.0: one experiment contract shared by `spike` and `loop-goal`, four loop-goal modes, evaluation frontmatter verified by lint, `loop_guard` and `timeout` shown in the workflow template. Details in `CHANGELOG.md`.

Sources used: `CHANGELOG.md`, `skills/loop-goal.md`, `templates/EXPERIMENT_TEMPLATE.md`.

## [2026-09-02] update | POM 0.4.0: installation guides, specs status, reading path

`docs/installation.md` and `docs/project-reader.md` are now the installation and reader authority; `wiki/adoption-and-installation.md` points at them and its agent install prompt names the guide instead of the README. `wiki/current-specs.md` records SPEC-0004, SPEC-0005, and SPEC-0008 as Deferred and ADR-0001 as superseded by ADR-0005 (file-based Project Reader instead of a persistent agent session). The routing table lives only in `skills/README.md`; `prompts/32-using-pom.md` keeps the key routes.

Sources used: `docs/installation.md`, `docs/project-reader.md`, `decisions/ADR-0005-file-based-project-reader-replaces-persistent-agent-session.md`, `specs/`, `skills/README.md`, `CHANGELOG.md`.

## [2026-09-02] update | self-improvement loop promoted, method skill modes

Rewrote the extension paragraph and the self-improvement loop paragraph of `wiki/experiments-and-extension.md`: the `extend` skill is now the `extend` mode of `skills/method.md` alongside `improve` and `prune`, and the loop is no longer "under evaluation" — it is the `improve` mode with `prompts/25-self-improvement-loop.md` as canonical prompt, and `experiments/self-improvement-loop/` is closed. The candidate-outcome table and the open question on the loop were answered accordingly. The same audit superseded ADR-0001 with ADR-0005 (file-based Project Reader instead of a persistent agent session) and deferred SPEC-0004, SPEC-0005, and SPEC-0008; `wiki/current-specs.md` still has to reflect those statuses.

Sources used: `skills/method.md`, `prompts/25-self-improvement-loop.md`, `experiments/self-improvement-loop/EXPERIMENT.md`, `decisions/ADR-0005-file-based-project-reader-replaces-persistent-agent-session.md`, `CHANGELOG.md`.

## [2026-09-02] update | POM 0.3.1

Bumped the index to POM v0.3.1: bootstrap clones `main` explicitly, the Project Reader collapsed navigation is a compact top bar below 760 px, and TASK-0001 is Complete. Details in `CHANGELOG.md`.

Sources used: `CHANGELOG.md`, `bootstrap-pom.mjs`, `scripts/project-reader/public/interactions.css`, `tasks/TASK-0001-lint-taskplans-mapping.md`.

## [2026-09-02] update | skill catalog consolidated in 0.3.0

Rewrote the skill entries in `wiki/skills-and-prompts.md`: removed `help`, `guard`, `extend`, `improve`, and `prune`; added `method` (extend, improve, prune modes), `release`, and `migrate`; updated the sources table. `wiki/experiments-and-extension.md` now points to `skills/method.md` instead of the three merged cards.

Sources used: `skills/README.md`, `skills/method.md`, `skills/release.md`, `skills/migrate.md`, `CHANGELOG.md`.

## [2026-09-02] update | self-audit fixes and POM 0.3.0

Removed the stale `@exp/pom-skill-evolution` branch note from `wiki/adoption-and-installation.md` (the Pi package is on `main`), bumped the index to POM v0.3.0, and dropped the `## Summary` heading from this log so every H2 is a dated entry. The release itself restores `scripts/to-xstate.mjs`, makes the repository pass its own governance lint through a root `pom.config.json`, hardens installer and updater, generates the README skill table from `skills/README.md`, and adds the experiment evidence convention. Details in `CHANGELOG.md`.

Sources used: `CHANGELOG.md`, `skills/README.md`, `templates/EXPERIMENT_TEMPLATE.md`, `wiki/adoption-and-installation.md`.

## [2026-07-26] add | agent graph patterns page with worked cases

Added `wiki/agent-graph-patterns.md` and linked it from the Workflow patterns area of the index. The earlier entry below recorded the rules; this page shows them failing and being fixed on two shipped examples, with real validator output: a fan-in guard that verifies nothing until it declares its evidence, a nightly repair loop that is an unbounded retry until it declares trigger, evidence, feedback, and escalation, and the fan-out questions with the public Bun precedent. It also states when none of it applies, so the page does not read as a recommendation to add ceremony to domain workflows.

Promoted the two examples to `templates/examples/workflow/agent-graph/` with an Italian catalogue README, and extended `tests/workflow-validator/integration/test-verification-and-runtime-loop.mjs` so both are linted on every `pom:test` run and cannot rot.

Sources used: `templates/examples/workflow/agent-graph/`, `prompts/27-workflow-modeling.md`, `skills/workflow.md`, `templates/WORKFLOW_TEMPLATE.yaml`, `specs/SPEC-0006-workflow-modeling.md`, and `scripts/lib/workflow-lint-agent-rules.mjs`.

## [2026-07-26] update | record verification evidence, runtime loop, and fan-out isolation

Updated the workflow skill and spec synthesis with three optional blocks that describe an agent-shaped graph rather than a purely domain one: `guards[].evidence` with the W005 self-review warning and the W006 fan-in warning, the top-level `runtime_loop` contract validated by E100-E106 with W007 and W008, and `metadata.provenance` for observed versus speculative models. Also recorded the three questions that must be answered or left as named open points before a `fan_out_launch` is modeled: where each worker works, how results merge, and what happens when two workers disagree. Stated that all three blocks are optional and that existing models validate unchanged.

Sources used: `prompts/27-workflow-modeling.md`, `skills/workflow.md`, `templates/WORKFLOW_TEMPLATE.yaml`, `scripts/lib/workflow-lint-rules.mjs`, `scripts/lib/workflow-lint-core.mjs`, `specs/SPEC-0006-workflow-modeling.md`, and `tests/workflow-validator/integration/test-verification-and-runtime-loop.mjs`.

## [2026-07-23] update | explain Dynamic Workflow fan-in guidance

Updated the workflow skill synthesis with concrete fan-in cases: independent audits, shared-write mutation, quorum readiness versus completeness, equal-count missing-plus-duplicate reconciliation, bounded hierarchical reduction, and task-supplied capacity. Clarified that these are control-plane agent instructions, while runtime execution remains Target Project-owned and static fan-in lint remains deferred.

Sources used: `prompts/27-workflow-modeling.md`, `skills/workflow.md`, `experiments/fan-in-accounting/EXPERIMENT.md`, `wiki/skills-and-prompts.md`, and `wiki/current-specs.md`.

## [2026-07-22] update | add MCP interface workflow

Updated the skill and prompt synthesis with `mcp-interface`, including its version-aware protocol boundary, agent-ergonomic audit modes, POM verification gate, and host-visible token evidence requirement.

Sources used: `skills/mcp-interface.md`, `prompts/35-mcp-interface.md`, `skills/README.md`, `prompts/README.md`, and `PROJECT_STATE.md`.

## [2026-06-22] update | clarify workflow templates and runtime seams

Updated the wiki synthesis after workflow, Dynamic Workflow, and loop/goal adoption were clarified for Target Projects. The wiki now states that workflow YAML is the finite-state-machine source of authority, `WORKFLOW_TEMPLATE.yaml` is an optional reference starting point rather than a mandatory copy target, `pom:workflow:lint` validates any target YAML that follows the schema, and the TypeScript/Python runtime seam templates are optional adapters for execution, persistence, timers, retry, tools, and side effects.

Sources used: `skills/workflow.md`, `skills/loop-goal.md`, `prompts/27-workflow-modeling.md`, `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md`, `templates/WORKFLOW_TEMPLATE.yaml`, `templates/WORKFLOW_RUNTIME_TEMPLATE.ts`, `templates/WORKFLOW_RUNTIME_TEMPLATE.py`, `templates/POM_CONFIG_TEMPLATE.json`, `scripts/lib/workflow-lint-rules.mjs`, and `README.md`.

## [2026-06-05] update | document workflow activation config

Updated the wiki synthesis after reconciling the workflow activation changes. The adoption, governance, and skill catalog pages now state that workflow modeling is opt-in through the top-level `workflows` section in `pom.config.json`, and the catalog cites the guarded YAML loader used by the workflow scripts.

Sources used: `skills/config.md`, `templates/POM_CONFIG_TEMPLATE.json`, `scripts/require-yaml.mjs`, `scripts/lint-workflows.mjs`, `scripts/to-mermaid.mjs`, `scripts/to-xstate.mjs`, `wiki/adoption-and-installation.md`, `wiki/templates-and-governance.md`, and `wiki/skills-and-prompts.md`.

## [2026-05-30] update | record POM v0.2.0 workflow modeling capability

Added SPEC-0006 (`workflow-modeling`) and ADR-0002 (`workflow-context-injection`) to the specs table on `current-specs.md`. Added the `workflow` skill row to `skills-and-prompts.md` together with the new prompt 27, four templates (`WORKFLOW_TEMPLATE.yaml`, `PIPELINE_TEMPLATE.yaml`, `WORKFLOW_IMPLEMENTATION_GUIDE.md`, `WORKFLOW_INTEGRATION_GUIDE.md`), and the XState compatibility doc. Updated `experiments-and-extension.md` with the consolidated workflow-modeling experiment and its promotion outcome row in the candidate-outcome table.

Sources used: `specs/SPEC-0006-workflow-modeling.md`, `decisions/ADR-0002-workflow-context-injection.md`, `skills/workflow.md`, `prompts/27-workflow-modeling.md`, `templates/WORKFLOW_*`, `docs/workflow-xstate-compatibility.md`, `CHANGELOG.md` v0.2.0 entry, `experiments/workflow-modeling/EXPERIMENT.md` final verdict.

## [2026-05-17] init | promote root POM wiki and reader

Promoted the reader-view experiment into a stable root `wiki/` and added generated HTML output under `wiki/_site/`.

Sources used: `README.md`, `CONTEXT.md`, `WIKI_METHOD.md`, `skills/README.md`, `prompts/README.md`, `templates/`, `scripts/`, and `specs/`.

## [2026-05-17] update | auto-render reader after wiki changes

Updated `pom:lint` so it regenerates `wiki/_site/` at the end only when Git reports changed Markdown pages under `wiki/`.

Sources used: `scripts/lint-doc-governance.ts`, `README.md`, and `scripts/pom-help.ts`.

## [2026-05-17] update | document wiki reader lifecycle

Documented the wiki reader lifecycle in `README.md` and `wiki/wiki-method.md`, including the conditional lint-triggered regeneration flow and a Mermaid lifecycle diagram.

Sources used: `README.md`, `wiki/wiki-method.md`, `wiki/reader-capabilities.md`, and `scripts/lint-doc-governance.ts`.

## [2026-05-17] update | exclude log from reader output

Kept `wiki/log.md` as the chronological register but excluded it from generated reader pages, navigation, pager flow, and search index.

Sources used: `scripts/render-wiki.mjs`, `README.md`, `wiki/wiki-method.md`, and `wiki/reader-capabilities.md`.

## [2026-05-17] update | add root wiki reader shortcut

Added `wiki.html` as the stable root shortcut for POM and target projects with wiki-enabled profiles.

Sources used: `README.md`, `scripts/install-pom.ts`, `templates/WIKI_READER_SHORTCUT.html`, `wiki/wiki-method.md`, and `wiki/reader-capabilities.md`.

## [2026-05-17] update | add missing-reader guidance

Updated the root wiki shortcut so it no longer blindly redirects when the generated reader may be missing. It now explains how to enable or build the POM wiki before rendering.

Sources used: `wiki.html`, `templates/WIKI_READER_SHORTCUT.html`, `README.md`, and `wiki/reader-capabilities.md`.

## [2026-05-18] update | document reader runtime security

Clarified that the wiki reader does not load Mermaid by default, and that projects using a remote Mermaid runtime create an external browser dependency without Subresource Integrity.

Sources used: `README.md`, `scripts/render-wiki.mjs`, and `wiki/reader-capabilities.md`.

## [2026-05-19] update | document open discussions, challenge review, and artifact policy

Updated the wiki synthesis for the new Open Discussion memory element, the adversarial `challenge` skill, and Artifact Policy as the edit-permission layer for governed artifacts.

Sources used: `CONTEXT.md`, `README.md`, `skills/challenge.md`, `prompts/24-challenge-antithesis.md`, `templates/OPEN_DISCUSSION_TEMPLATE.md`, `templates/ADR_TEMPLATE.md`, and `templates/POM_CONFIG_TEMPLATE.json`.

## [2026-05-19] update | add web wiki agent-extension draft spec

Updated the current specs synthesis for `SPEC-0005`, which defines the draft boundary for a web wiki that extends an active coding agent session and produces reviewed proposals for POM and project documents.

Sources used: `specs/SPEC-0005-web-wiki-agent-extension.md` and `experiments/wiki-agent-orchestration/EXPERIMENT.md`.

## [2026-05-19] update | record web wiki baseline checkpoint

Updated the current specs synthesis after the first web wiki baseline checkpoint. The synthesis now notes the destination triage rule promoted into `SPEC-0005` and records that the file/event baseline was validated before any persistent streaming integration.

Sources used: `specs/SPEC-0005-web-wiki-agent-extension.md`, `tasks/TASK-0003-codex-web-wiki-baseline.md`, and `experiments/wiki-agent-orchestration/EXPERIMENT.md`.

## [2026-05-28] update | add Project Reader note workflow

Updated the skills, prompts, and reader synthesis after adding the `reader-notes` skill, its canonical prompt, and a lint warning that routes open Project Reader annotations to the skill.

Sources used: `skills/reader-notes.md`, `prompts/26-process-reader-notes.md`, `scripts/project-reader/wiki-tools.mjs`, `scripts/project-reader/public/annotations.js`, `scripts/lib/lint-reader-notes.ts`, and `scripts/lib/lint-reporter.ts`.

## [2026-05-19] update | record persistent coding agent session decision

Updated the current specs synthesis after accepting the decision that the primary web wiki workflow must use a persistent connection to an active AI coding agent session. Codex is the first implementation target; file/event artifacts remain audit, fallback, fixture, and test support.

Sources used: `decisions/ADR-0001-persistent-coding-agent-session-for-web-wiki.md`, `specs/SPEC-0005-web-wiki-agent-extension.md`, and `experiments/wiki-agent-orchestration/EXPERIMENT.md`.

## [2026-05-20] update | document POM Project Reader server

Updated the reader synthesis for the local POM Project Reader server: launch path, configurable project root, configurable annotation directory, navigation, `rg` search, in-file search, and file-based annotation handoff.

Sources used: `README.md`, `docs/POM_GUIDE.en.html`, `docs/POM_GUIDE.it.html`, `experiments/wiki-agent-orchestration/mini-ui/README.md`, and `experiments/wiki-agent-orchestration/wiki-tools.mjs`.

## [2026-05-20] update | refine POM Project Reader UI contract

Updated the reader synthesis for the finalized lightweight UI shape: responsive document layout, pinned or collapsible side panels, language labels, annotation tabs, annotation detail behavior, and the current decision to keep browser-based source editing outside the workflow.

Sources used: `experiments/wiki-agent-orchestration/mini-ui/public/index.html`, `experiments/wiki-agent-orchestration/mini-ui/public/app.js`, `experiments/wiki-agent-orchestration/mini-ui/public/styles.css`, `experiments/wiki-agent-orchestration/mini-ui/public/reader-document.css`, `experiments/wiki-agent-orchestration/mini-ui/server.mjs`, and `wiki/reader-capabilities.md`.

## [2026-05-20] update | use POM config in Project Reader classification

Updated the reader synthesis after adding optional `pom.config.json` support to the local Project Reader. The reader now uses configured documentation, decision, task plan, analysis, source, test, mockup, root Markdown, and generated-output settings when the config exists, while preserving the built-in allowlist when it does not.

Sources used: `templates/POM_CONFIG_TEMPLATE.json`, `experiments/wiki-agent-orchestration/mini-ui/document-sources.mjs`, `experiments/wiki-agent-orchestration/mini-ui/server.mjs`, `README.md`, and `wiki/reader-capabilities.md`.

## [2026-05-21] update | record deferred Project Reader improvements

Added two deferred Project Reader improvement candidates: a local event bridge for tools such as Cmux to focus a changed or created file in the browser, and a read-only Git diff view for the active file.

Sources used: `wiki/reader-capabilities.md`.

## [2026-05-21] update | exclude wiki log from Project Reader search

Updated the Project Reader synthesis after aligning project search with reader-only document exclusions. The chronological `wiki/log.md` register is excluded from navigation and from Project Reader search results.

Sources used: `experiments/wiki-agent-orchestration/mini-ui/document-sources.mjs`, `experiments/wiki-agent-orchestration/mini-ui/server.mjs`, `tests/project-reader/integration/test-project-reader.mjs`, and `wiki/reader-capabilities.md`.

## [2026-05-24] update | record Project Reader promotion and self-improvement experiment

Updated the experiments synthesis after promoting the lightweight Project Reader into stable `scripts/project-reader/` tooling and opening a separate self-improvement loop experiment. The loop remains non-authoritative until one case in POM Source and one case in another POM-managed project validate the same method.

Sources used: `scripts/project-reader/README.md`, `experiments/wiki-agent-orchestration/EXPERIMENT.md`, `experiments/self-improvement-loop/EXPERIMENT.md`, and `wiki/experiments-and-extension.md`.

## [2026-05-24] update | promote self-improvement loop prompt and skill alias

Promoted the self-improvement loop into a canonical prompt (`prompts/25-self-improvement-loop.md`) with a short alias skill (`skills/improve.md`) so agents can discover and apply it via the normal prompt/skill entry points. The loop remains under evaluation until it is proven on another POM-managed project (or a representative fixture), and it does not authorize automatic changes without approval.

Sources used: `prompts/25-self-improvement-loop.md`, `skills/improve.md`, `prompts/README.md`, `skills/README.md`, `experiments/self-improvement-loop/EXPERIMENT.md`, and `wiki/experiments-and-extension.md`.

## [2026-05-26] update | clarify global instructions versus skills

Recorded the agent-instruction simplification rule: global target-project instructions describe identity, communication posture, Source Authority, Artifact Policy, safety, commands, adoption profile semantics, and skill routing; workflow-specific rules live in skills, prompts, templates, or active profile modules.

Sources used: `specs/SPEC-0001-modular-agents-template.md`, `templates/agents/`, `templates/AGENTS_POM_SECTION_TEMPLATE.md`, `scripts/install-pom.ts`, `wiki/skills-and-prompts.md`, and `wiki/templates-and-governance.md`.

## [2026-06-01] update | add loop-goal scope examples guide

Added a non-normative wiki guide with possible objectives, gates, signals, baselines, falsification events, and stall exits for the ten loop/goal criteria scopes.

Sources used: `prompts/28-loop-goal-define-criteria.md`, `skills/loop-goal.md`, `wiki/loop-goal-workflow-tutorial.md`, and `experiments/agent-loop-fsm/notes/2026-05-30-prompt-criteria-critical-review.md`.

## [2026-06-01] update | document agent goal tracking with loop-goal

Updated the loop/goal tutorial with the optional integration pattern: an agent-native goal tracker can track session status and budget, while POM loop/goal defines the measurable contract, gate, signal, falsification, and exits. Agents without native goal tracking should carry the active loop state through a POM note, task plan, or workflow state.

Sources used: `wiki/loop-goal-workflow-tutorial.md`, `skills/loop-goal.md`, and the 2026-06-01 loop/goal trial in this repository session.

## [2026-07-21] update | align loop-goal guidance with configured paths

Updated the loop/goal tutorial to distinguish POM Source fallback paths from Target Project paths configured through `workflows.loopGoal.dialogPath`.

Sources used: `prompts/28-loop-goal-define-criteria.md`, `skills/loop-goal.md`, `templates/POM_CONFIG_TEMPLATE.json`, and `wiki/loop-goal-workflow-tutorial.md`.

## [2026-09-02] update | one experiment contract and four loop-goal modes

Aligned the loop/goal tutorial with the unified experiment contract: the `## Criteria` section of `EXPERIMENT.md` is the contract, budget is written in experiment units and kept apart from `loop_guard`/`timeout`, signals use threshold/target/expected trend, exits are `reached`/`stalled`/`exhausted`/`falsified`, and the operating sequence uses the four `loop-goal` modes plus `workflow design`/`workflow implement`. The tutorial now cites the criteria and evaluation examples under `templates/examples/workflow/loop-goal/`.

Sources used: `templates/EXPERIMENT_TEMPLATE.md`, `skills/loop-goal.md`, `prompts/28-loop-goal-define-criteria.md`, `prompts/31-loop-goal-conclude.md`, and `templates/examples/workflow/loop-goal/README.md`.

## [2026-09-02] update | overview declares its sources and generates its page map

`overview.md` now carries `derivedFrom` (README, CONTEXT, SPEC-0000, WIKI_METHOD) and `verified: 2026-09-02`, so `pom:lint` reports `wiki-stale-synthesis` when one of those sources changes after that date. The hand-written "Related Links" list became a `<!-- pom:generated pages -->` block that the lint fills with every page of this wiki. Both mechanisms are described in the README section "Synthesis Pages Stay Honest".

Sources used: `scripts/lib/lint-wiki-freshness.ts`, `scripts/lib/wiki-generated-blocks.ts`, `README.md`.

## [2026-09-03] update | projects declare their own rules in the always-loaded block

The generated POM section is identical in every repository. A target now declares its own conventions, non-functional requirements, and prohibitions in `PROJECT_RULES.md`, which the installer seeds and injects as the final section of the block it writes into every agent instruction file; `pom:lint` reports the file while it is missing, undeclared, not yet injected, or over its word budget. Motivated by the ETH/LogicStar measurement that repository context files show no gain in task success and cost about 20% more steps, while developer-written project-specific instructions are the content with a measured advantage. Recorded in ADR-0007.

Sources used: `decisions/ADR-0007-projects-declare-their-own-rules-in-the-always-loaded-block.md`, `scripts/lib/project-rules.ts`, `scripts/lib/lint-project-rules.ts`, `README.md`.

## [2026-09-03] update | the always-loaded block costs about two extra tool calls per session

Measured on 100 real sessions, five repetitions per arm of the behavioral core suite, with and without the always-loaded block: +2.00 tool calls (+16.3%), +1.58 file reads (+15.2%), +15.3% input tokens, and unchanged turns, against a negative-control noise band of 0.6 tool calls. The direction and size match what *Evaluating AGENTS.md* reports for context files. The block also held the result mix the other arm lost on the ambiguity scenario, which is the only benefit observed and rests on two failures out of five. Recomputing the July diet's own evidence showed its 34-41% saving was the section's weight, not a session's cost: about 10% of session tokens, partly returned as extra exploration. The evaluator's token figures were doubled by a summing bug until this work; ratios were unaffected, absolute values were not.

Sources used: `experiments/pom-block-step-cost/EXPERIMENT.md`, `experiments/using-pom-bootstrap-diet/EXPERIMENT.md`, `experiments/pom-skill-behavior-evals/run.mjs`.

## [2026-09-03] update | POM 0.9.0

A target project now declares its own conventions, non-functional requirements, and prohibitions in `PROJECT_RULES.md`, and the installer folds them into the generated block of every agent instruction file, so they are written once and loaded without an extra read (ADR-0007). The behavioral evaluator records steps, and 100 real sessions put the always-loaded block at +2.00 tool calls and +15.3% input tokens with turns unchanged; the same work fixed a token double-count that had made every absolute figure twice its true value, and showed that the July diet's 34-41% was the section's weight, not a session's cost. The outcome A/B bench was built and stopped by its own pilot, with the reasons recorded. Full notes in `CHANGELOG.md`.

Sources used: `CHANGELOG.md`, `decisions/ADR-0007-projects-declare-their-own-rules-in-the-always-loaded-block.md`, `experiments/pom-block-step-cost/EXPERIMENT.md`.

## [2026-09-03] update | POM 0.9.1

`pomVersion` in a target's `pom.config.json` was written once, at creation, and never refreshed afterwards, so a project that had been updating POM for months still declared the version it was adopted with. The installer now aligns it on every path, refresh included, taking the value from the config template that the release procedure keeps current. Found on a real target sitting at 0.2.0 with 0.9.0 installed.

Sources used: `CHANGELOG.md`, `scripts/install-pom.ts`.
