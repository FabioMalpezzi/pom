# Skills And Prompts

## Summary

POM skills are short operational cards, while prompts are the canonical procedures behind them. Skills help the agent recognize the situation; prompts carry the full workflow.

## Current State

The skills index describes skill cards as recognizable aliases derived from prompts. Each skill file uses YAML frontmatter with `name` and `description` fields so agents that support skill discovery can invoke them automatically.

Prompts remain intentionally generic and reusable. They define what to read, what to propose, when to ask for approval, what to verify, and what output is expected.

Agent instruction files should stay global: identity, communication posture, source authority, safety, and always-on operating rules. Workflow-specific rules belong in skills and their canonical prompts. If a rule applies only to wiki work, handoff, experiments, template creation, status classification, planning, or verification, the agent should route to the matching skill instead of carrying the full procedure in the global instruction block.

## Details

Complete skill catalog:

### `using-pom`

- **Illustration**: bootstrap and router for POM-aware work; it reads the skill index, config, and harness mapping before choosing a specific workflow.
- **Real use cases**: start a fresh session in a POM-managed project; resume after compaction; decide whether a request should use `adopt`, `wiki`, `plan`, `validate`, `spike`, `root-cause`, or `finish-branch`.
- **Why it exists / importance**: prevents agents from acting from memory or frontmatter summaries, and makes POM integration more reliable across Codex, Claude Code, Gemini CLI, Cursor, OpenCode, GitHub Copilot, and instruction-file-only harnesses.

### `clarify`

- **Illustration**: ambiguity reducer before memory creation, governance changes, or file edits.
- **Real use cases**: distinguish a wiki question from a request to update the wiki; clarify whether a note should become a Decision Record, a Task Plan, an Open Discussion, or no artifact.
- **Why it exists / importance**: protects Operating Memory from premature structure and avoids creating durable artifacts from unclear intent.

### `seed`

- **Illustration**: starts POM in a new project.
- **Real use cases**: create first project memory, initial instructions, config, wiki skeleton, and governance defaults for a repository that does not yet use POM.
- **Why it exists / importance**: gives new projects a safe initial Operating Memory without assuming a large process from day one.

### `adopt`

- **Illustration**: introduces POM into an existing or external repository without moving current project structure first.
- **Real use cases**: map existing docs, source, tests, decisions, and wiki roots into `pom.config.json`; install POM in overlay mode for a repository the operator does not own.
- **Why it exists / importance**: makes POM respectful of existing conventions and avoids turning adoption into an accidental migration.

### `pulse`

- **Illustration**: creates or refreshes `PROJECT_STATE.md`.
- **Real use cases**: summarize current objective, blockers, risks, next actions, and files to read before another session resumes.
- **Why it exists / importance**: keeps restart-critical context small, current, and separate from the full project history.

### `plan`

- **Illustration**: converts approved specifications, decisions, or current objectives into verifiable Task Plans.
- **Real use cases**: break an accepted spec into ordered phases; define done criteria and Scenario Tests before implementation.
- **Why it exists / importance**: prevents plans from becoming vague checklists and links execution back to source authority.

### `check`

- **Illustration**: verifies a phase, workstream, Task Plan, or completed change against its declared goal.
- **Real use cases**: review whether a task is actually done; distinguish a Target Project failure from a POM process defect; decide whether `root-cause` or `diagnose` is the right next step.
- **Why it exists / importance**: makes completion claims evidence-based instead of narrative-based.

### `handoff`

- **Illustration**: closes a significant session by updating restart memory and status.
- **Real use cases**: record the next safe action after a branch of work; update `PROJECT_STATE.md` after meaningful scope, risk, or decision changes.
- **Why it exists / importance**: keeps the next agent or human from reconstructing context from chat history or Git diff alone.

### `reader-notes`

- **Illustration**: processes human notes created through the local POM Project Reader.
- **Real use cases**: claim an annotation, decide whether it is valid, apply source-backed edits, record the outcome, and avoid reprocessing closed notes.
- **Why it exists / importance**: turns reader feedback into governed project changes without losing attribution or verification.

### `diagnose`

- **Illustration**: focused troubleshooting for confusing or failing POM workflows.
- **Real use cases**: debug an installer issue, a lint false positive, a bad generated agent section, or a wiki-reader problem.
- **Why it exists / importance**: separates defects in POM itself from defects in the Target Project.

### `root-cause`

- **Illustration**: evidence-first debugging for Target Project bugs, test failures, build failures, performance issues, and unexpected behavior.
- **Real use cases**: reproduce a failing test; isolate a build failure; add a regression test before fixing a bug; stop after repeated failed fix attempts and return to investigation.
- **Why it exists / importance**: enforces "root cause before fix" so agents do not patch symptoms or stack speculative changes.

### `mcp-interface`

- **Illustration**: designs, audits, reshapes, or verifies MCP tools, resources, prompts, schemas, responses, and errors for reliable agent use.
- **Real use cases**: inventory an MCP server surface; distinguish transport authorization, JSON-RPC, and tool execution errors; reduce avoidable round trips without losing task success; verify schema, compatibility, security, and host-visible token evidence.
- **Why it exists / importance**: applies version-specific MCP contracts and agent ergonomics while keeping runtime ownership in the Target Project.

### `zero-tech-debt`

- **Illustration**: reshapes a scoped change around the intended product and architecture end state.
- **Real use cases**: replace a temporary implementation with the target design; reduce duplication introduced during a quick patch; align code with an accepted architecture before closure.
- **Why it exists / importance**: prevents "working" changes from becoming permanent accidental design.

### `challenge`

- **Illustration**: adversarial thesis/antithesis review before accepting or completing non-code work.
- **Real use cases**: test an ADR against serious counterarguments; challenge a spec before declaring it ready; look for material missing evidence.
- **Why it exists / importance**: gives semantic validation a concrete shape and prevents agreement from replacing proof.

### `config`

- **Illustration**: creates or updates `pom.config.json`.
- **Real use cases**: map nonstandard documentation roots; set ownership mode; configure wiki, decisions, tests, task plans, templates, workflow activation, and lint severities.
- **Why it exists / importance**: lets POM adapt to a Target Project instead of forcing every repository into one folder layout.

### `spike`

- **Illustration**: manages temporary experiments and consolidation.
- **Real use cases**: explore a library fit; test a risky refactor in an isolated worktree; keep candidate files under `experiments/` until evidence supports promotion.
- **Why it exists / importance**: keeps experiments useful without letting them leak into canonical method or project structure too early.

### `wiki`

- **Illustration**: builds, queries, checks, and maintains the Persistent Wiki.
- **Real use cases**: create the initial wiki; identify stale wiki pages after source changes; answer a question from wiki memory; run lightweight wiki health checks.
- **Why it exists / importance**: keeps reusable knowledge synthesized and linked to sources rather than scattered across notes and generated views.

### `method`

- **Illustration**: the one entry point for changing POM itself, with three modes: `extend` adds or changes an element at the smallest fitting level, `improve` runs a bounded self-improvement loop with evidence, `prune` simplifies, merges, demotes, deletes, or config-gates elements that no longer protect memory or verification.
- **Real use cases**: add a lint rule or skill; evaluate whether repeated agent failures imply a method change; remove two overlapping skills; demote a rule that belongs to one Target Project.
- **Why it exists / importance**: keeps POM extensible and learnable from use while protecting it from process creep; starting in `prune` mode asks whether a change belongs in POM at all.

### `release`

- **Illustration**: closes a numbered version: reconciles the changelog with real history, aligns every version reference, regenerates checksums, verifies, tags, and records the release in project state and wiki log.
- **Real use cases**: cut POM 0.3.0 after a long unreleased stretch; release a Target Project that prints its version in several files; answer "what changed since the last release?".
- **Why it exists / importance**: the September 2026 audit found 59 commits and two and a half months without a release and no procedure for closing one; a version nobody can trust is not memory.

### `migrate`

- **Illustration**: moves an adopted project's folders toward canonical roots, one module per commit, with approval, a dependents checklist, and lint and tests before and after.
- **Real use cases**: unify `doc/` and `docs/`; move ADRs scattered across folders into the configured decisions root; relocate a wiki nested under a documentation root.
- **Why it exists / importance**: adoption maps existing structure and never moves it; migration is the later explicit decision the README promises, and without a procedure it happened ad hoc or not at all.

### `tandem`

- **Illustration**: coordinates two coding agents on multi-turn work: an executor that writes, a controller that reviews with a fixed `VERDICT`/`FINDINGS` contract, and a coordinator (the agent running the skill) that carries only the difference between them through `scripts/tandem.mjs`; three modes, `setup`, `run`, `close`.
- **Real use cases**: implement a feature with Claude and have Codex review each task; run Pi as coordinator between a Claude executor and a Codex controller; resume a collaboration from `BRIEF.md`, `LEDGER.md`, and `turns/` after a session is lost.
- **Why it exists / importance**: a reviewer that did not write the code sees what the author cannot, and a different LLM sees more than a second session of the same one; the script keeps the controller in its own worktree (it may run tests there, never touch the executor workspace), caps cycles per task, and turns a stuck task into an escalation instead of a fourth rewrite.

### `status`

- **Illustration**: classifies document type and chooses the least misleading status.
- **Real use cases**: decide whether a file is draft, accepted, historical, generated, active, or superseded; avoid marking a document complete when evidence is missing.
- **Why it exists / importance**: makes document state explicit so agents do not treat provisional memory as authority.

### `defer`

- **Illustration**: parks important work without implementing it.
- **Real use cases**: record a valuable idea that is not in scope; preserve a rejected option for later; create a bounded follow-up without changing files now.
- **Why it exists / importance**: prevents good ideas from either disappearing or hijacking the current task.

### `sync`

- **Illustration**: refreshes an installed POM copy or aligns POM Source changes with a Target Project's `pom/`.
- **Real use cases**: update a vendored `pom/`; reconcile source POM changes after a method release; avoid confusing source-repo work with target installation.
- **Why it exists / importance**: keeps reusable POM and installed POM copies aligned without unsafe cloning or overwrite behavior.

### `finish-branch`

- **Illustration**: closes branch, PR, merge, keep, discard, or cleanup decisions after code or experiment work.
- **Real use cases**: decide whether to merge locally, push a PR, keep a worktree, discard a branch, or prune stale local work after verification.
- **Why it exists / importance**: makes delivery explicit and protects Git state from premature cleanup or unverified success claims.

### `reconcile`

- **Illustration**: classifies and resolves Divergence between source and project memory.
- **Real use cases**: update a wiki page that contradicts current code; decide whether an ADR or a task plan is stale; identify which Source Authority wins.
- **Why it exists / importance**: prevents silent mismatch between code, decisions, wiki, and project state.

### `validate`

- **Illustration**: read-only governance audit after significant actions.
- **Real use cases**: check whether new docs, ADRs, wiki updates, config changes, or task plans obey POM rules before handoff.
- **Why it exists / importance**: catches process regressions without making additional changes during the audit itself.

### `workflow`

- **Illustration**: designs, validates, diagrams, derives scenarios for, and guides implementation of domain workflows declared as YAML finite-state-machine models.
- **Real use cases**: model a ticket lifecycle; enable workflow roots through `pom.config.json`; validate a pipeline; generate Mermaid or XState views; map a YAML workflow to implementation guidance for a Target Project; use optional TypeScript or Python seam templates when execution, persistence, timers, retry, tools, or side effects need explicit adapters.
- **Why it exists / importance**: gives workflow-heavy domains a precise, testable model while keeping execution runtime-owned by the Target Project.

For Dynamic Workflow fan-out and fan-in, the canonical procedure now handles several recurring real-world failures more explicitly:

1. **Independent audits followed by one report.** Forty route or compliance audits may run independently while a final report consumes every result. The skill preserves parallel work, records only the real data dependency into the report, creates one batch handle rather than forty item handles, and keeps failure or partial-publication policy open when the task does not decide it.
2. **Independent checks writing one shared file.** Security checks can be logically independent yet all append to `report.md`. The skill classifies this as a shared-mutation dependency, but does not silently invent a lock, single writer, serialized execution, or queue. Those implementation choices remain Target Project decisions.
3. **Quorum readiness without a complete report.** A batch may wake after six successful children while other children fail, time out, or return an unknown identity. The skill separates the control-plane wake-up from the `complete` label: unknown records stay visible for reconciliation but cannot satisfy an expected identity, and incomplete accounting cannot be presented as complete.
4. **Equal counts hiding missing work.** A collector expecting sixty identities may receive sixty records because one identity is missing and another is duplicated. The skill reconciles identity sets instead of trusting scalar counts, exposing both the missing and duplicate identities.
5. **Outputs too large for one synthesis context.** A hundred large audit results may not fit safely into one final model input. The skill uses bounded hierarchical groups, preserves expected, observed, represented, status, duplicate, unknown, and unresolved accounting in every group summary, then reconciles summary identities again before final synthesis.
6. **Real capacity versus invented capacity.** An API quota or synthesis-context limit supplied by the task is recorded explicitly. Item count alone is not converted into a limit, and physical workers, queues, scheduling, retries, persistence, rate limiting, and backpressure remain in the Target Project data plane.

7. **Workers overwriting each other.** Before any `fan_out_launch` is modeled, three questions must be answered or recorded as named open points: where each worker does its work, how results are merged, and what happens when two workers contradict each other on the same identity. Parallel workers sharing one mutable workspace overwrite each other, and that is an operational failure, not a detail the data plane discovers later. POM does not model workspaces and does not pick the isolation mechanism; it refuses to leave the decision implicit.

These are agent-procedure guarantees, not runtime claims. Current canonical lint is strongest on Dynamic Workflow handle lifecycle; fan-in provenance, publication policy, and business semantics still require scenario review.

Three optional blocks describe an agent-shaped graph rather than a purely domain one:

- **Verification evidence.** A guard may declare where its pass/fail decision actually comes from: `source: deterministic` (a test, schema check, query, diff, or build result), `model_judgment`, or `human`. Model judgement must also declare `independent_context`, because a verifier handed the executor's own context is not verifying — it agrees with itself and approves exactly the failures the executor could not see. The validator raises W005 for undeclared independence and W006 for a guard leaving an `await` state with no evidence at all, which is the point where one decision covers everything a whole parallel run produced. Neither warning is cleared by declaring an independence the Target Project cannot actually run; the honest move is an open point.
- **Runtime loop.** The state graph says which transitions are legal. It never said what starts another cycle, what evidence decides success, what a failed cycle hands to the next one, or who receives the run when the budget is gone. The optional `runtime_loop` block records exactly those: trigger, goal, evidence, feedback, and stop with an escalation path. Once declared it is validated as a contract. It describes the workflow at runtime and stays separate from the criteria contract that governs an experiment measuring that workflow.
- **Model provenance.** `design` mode declares whether the model was drawn from an observed process or designed from intention alone. Both are legitimate. What is not legitimate is silence, because a speculative model is later read as a description of how the process really behaves.

### `loop-goal`

- **Illustration**: models, audits, tests, and concludes opt-in agent-shaped loop/goal workflows and experiments.
- **Real use cases**: define measurable criteria for an agent loop; audit controller fit; derive terminal-coverage scenarios; conclude whether an experiment actually met its objective; adapt the optional TypeScript or Python runtime seam templates in the target project if the loop needs execution, persistence, timer, retry, tool, or side-effect ports.
- **Why it exists / importance**: handles agentic feedback loops that are too specific for the generic `workflow` skill and need criteria, falsification, and independent evaluation.

The prompt set covers session bootstrap, adoption, state, governance, planning, review, handoff, Project Reader note processing, config, experiments, wiki operations, extension, self-improvement, classification, deferral, sync, branch delivery, validation, reconciliation, clarification, pruning, POM diagnosis, Target Project root-cause debugging, MCP interface ergonomics, workflow modeling, loop/goal workflow work, two-agent tandem collaboration, and adversarial challenge. Together they make POM less dependent on an agent remembering the right procedure for each task.

The installed agent section now keeps the minimal profile to global posture plus a skill router. Profile modules add active workflow entry points, while detailed procedures stay in skills and prompts.

Reader generation is currently a script command, not a separate skill. Use `npm run pom:wiki:render` to regenerate the static HTML view from the root wiki.

## Sources

| Source | Use |
|---|---|
| `skills/README.md` | Skill purpose, configuration rule, and skill index. |
| `prompts/README.md` | Prompt catalog and planning hierarchy. |
| `skills/spike.md` | Experiment isolation rules. |
| `prompts/09-run-temporary-experiment.md` | Full temporary experiment procedure. |
| `skills/method.md` | Extension, improvement, and pruning modes for changing POM itself. |
| `prompts/12-extend-pom.md` | Controlled POM extension procedure. |
| `skills/release.md`, `prompts/36-release.md` | Version closure procedure. |
| `skills/migrate.md`, `prompts/37-migrate-structure.md` | Structure migration procedure for adopted projects. |
| `skills/tandem.md`, `prompts/38-tandem.md` | Controller/executor tandem between two coding agents, coordinated by a third through `scripts/tandem.mjs`. |
| `skills/reader-notes.md` | Skill card for processing human Project Reader notes. |
| `prompts/26-process-reader-notes.md` | Canonical procedure for claiming, evaluating, applying, recording, and verifying Project Reader notes. |
| `skills/challenge.md` | Skill card for adversarial thesis/antithesis review. |
| `prompts/24-challenge-antithesis.md` | Read-only challenge procedure that looks for material antitheses before acceptance or completion. |
| `skills/mcp-interface.md` | Skill card for MCP interface design, audit, reshape, and verification. |
| `prompts/35-mcp-interface.md` | Version-aware MCP interface ergonomics and verification procedure. |
| `specs/SPEC-0002-skill-yaml-frontmatter.md` | YAML frontmatter requirements for skill discovery. |
| `specs/SPEC-0001-modular-agents-template.md` | Global-vs-skill boundary and profile-aware agent instruction assembly. |
| `skills/workflow.md` | Workflow modeling skill card (5 modes: design / validate / diagram / scenarios / implement). |
| `prompts/27-workflow-modeling.md` | Canonical prompt behind the workflow skill. |
| `specs/SPEC-0006-workflow-modeling.md` | Workflow modeling specification and validator rule set. |
| `decisions/ADR-0002-workflow-context-injection.md` | Closed decision behind workflow composition data-exchange model. |
| `templates/WORKFLOW_TEMPLATE.yaml`, `templates/PIPELINE_TEMPLATE.yaml`, `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md`, `templates/WORKFLOW_INTEGRATION_GUIDE.md`, `templates/WORKFLOW_RUNTIME_TEMPLATE.ts`, `templates/WORKFLOW_RUNTIME_TEMPLATE.py` | Workflow-skill reference templates, optional runtime seam templates, and adoption/extension manuals. |
| `docs/workflow-xstate-compatibility.md` | XState v5 compatibility and the stately.ai visualization workflow. |
| `skills/config.md`, `templates/POM_CONFIG_TEMPLATE.json` | Workflow activation config shape and safe opt-in procedure. |
| `scripts/require-yaml.mjs`, `scripts/lint-workflows.mjs`, `scripts/to-mermaid.mjs`, `scripts/to-xstate.mjs` | Guarded `js-yaml` dependency loading and workflow script entry points. |

## Linked Decisions

| Decision | Impact |
|---|---|
| SPEC-0002 | Skills have YAML frontmatter while keeping human-readable `When To Use` sections. |
| SPEC-0000 D2 | Extensions choose the smallest fitting level. |
| SPEC-0001 | Agent instructions stay small by keeping workflow-specific rules in skills or active profile modules. |

## Open Questions

| Question | Status |
|---|---|
| Should reader generation be a new wiki mode, a separate skill, or only a script? | Answered for now: script command. |
| Should prompt usage tracking include reader commands if promoted? | Open. |
| Should `challenge` become part of every non-code completion gate or remain invoked for material risk? | Open; current rule keeps it targeted to avoid noise. |

## Related Links

- [[wiki-method]]
- [[experiments-and-extension]]
- [[templates-and-governance]]
- [[loop-goal-workflow-tutorial]]
