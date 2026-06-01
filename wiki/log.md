# POM Wiki Log

## Summary

This log records root wiki changes for the POM source repository. It keeps update history out of the topic pages while preserving the reason for meaningful wiki changes.

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
