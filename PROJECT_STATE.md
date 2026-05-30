# Project State

## Last Updated

2026-05-30

---

## Static Context

_Stable facts about the project. Update only when the project's direction, stack, or permanent constraints change._

### Project Purpose

POM (Project Operating Memory) is a meta-method that gives any AI-assisted software project a shared, version-controlled operating memory: skills, prompts, templates, governance, and ADRs that live in the target repo and are loaded by the coding agent on demand. POM is **method**, not runtime: the artifacts it ships travel with the target project; no central server, no LLM inside POM itself.

### Key Constraints And Decisions

- **No runtime in POM**. POM provides schema, templates, prompts, skills. Execution lives in the target project's own stack (see `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md` Pattern A/B/C for workflow runtimes).
- **No async / no shared state / no inheritance** — the four pillars of POM workflow modeling (SPEC-0006).
- **No promotion to canonical paths (`skills/`, `prompts/`, `specs/`, `decisions/`) before the originating experiment closes** — discipline declared in `templates/WORKFLOW_INTEGRATION_GUIDE.md`. The single explicit exception (workflow examples in `templates/examples/workflow/loop-goal/`) is documented in the commit message of `8da0a25`.
- **No client names in public artifacts** — confidentiality rule documented in the auto-memory and enforced by commit `2ef139e`.

### Files To Always Read When Resuming

- `README.md`
- `CONTEXT.md`
- `PROJECT_STATE.md`
- `CHANGELOG.md` (recent entries)
- `experiments/<active topic>/EXPERIMENT.md` for any open experiment

### Do Not Do Without Decision

- Promote anything to canonical paths if the originating experiment has not closed (except where explicitly documented).
- Add a runtime dependency (LLM client, FSM library, scheduler) to the POM source repo itself.
- Mention client identities in any committed POM artifact.
- Force-push to `main` or rewrite tag history (e.g. `v0.2.0`).

---

## Dynamic Context

_Current operational state. Update at every significant session or when priorities, risks, or next actions change._

### Current State

POM v0.2.0 released and tagged. The most recent active branch is `exp/agent-loop-fsm` (commits up to `403efed` pushed to `origin`), where five hypotheses on agent loop/goal modeling (H1–H5) have all been confirmed at 100% clean fit, and several methodological byproducts have been added:

- five canonical workflow examples promoted to `templates/examples/workflow/loop-goal/` (ReAct minimal, Goal Lifecycle, flat SPAO, bounded retry, supervisor+invoke);
- one candidate skill `experiments/agent-loop-fsm/skills-candidate/loop-goal.md` with five modes (`define-criteria`, `model`, `audit`, `scenarios`, `runtime-guide`);
- three candidate prompts in `experiments/agent-loop-fsm/prompts-candidate/` (`define-loop-goal-criteria` v2, `audit-loop-goal-workflow`, `scenarios-loop-goal-workflow`) — all coding-agent-native;
- one external TypeScript runtime in `experiments/agent-loop-fsm/runtime-candidate/` as evidence that the modeled workflows are executable end-to-end (validated on DeepSeek);
- two auto-generated outputs in `experiments/agent-loop-fsm/design/` (`*-auto.fit.md`, `agent-supervisor.scenarios.md`) as proof that the same tasks are automatable by an external LLM.

The `agent-loop-fsm` experiment is **not yet closed**: H6 `loop_guard` and H7 `timeout` (schema-level primitives) remain in the backlog as motivated extensions, and prompt v3 of `define-loop-goal-criteria` (with Consistency Check + dialog-mode hint) is still to be written.

### Current Objective

Close the loop on `agent-loop-fsm` by addressing the three open methodological items (H6/H7 in a separate experiment, prompt v3, runtime snapshot), then promote skill `loop-goal` to `skills/` canonical with numbered prompts.

### Priorities

| Priority | Activity | Status | Dependencies |
|---|---|---|---|
| 1 | Open parallel experiment `exp/schema-loop-guard-timeout` for H6 `loop_guard` + H7 `timeout` → SPEC-0007 | pending (#63) | — |
| 2 | Write prompt v3 of `define-loop-goal-criteria` with Consistency Check (D4) + dialog-mode hint (D5) | pending (#66) | — |
| 3 | Test prompt v2 in dialog-mode on a new experiment (not the same template-mode used so far) | pending | needs a new experiment trigger |
| 4 | Auditor v2: add explicit "follow `state-invoke`/`event-invoke`" instruction to the audit prompt | pending | minor, ~5 lines |
| 5 | Runtime: implement actual snapshot write/restore (the runtime today shows state+context are alive but doesn't serialize them) | pending | ~20 LOC |
| 6 | Close `agent-loop-fsm` experiment formally and promote `skills-candidate/loop-goal.md` → `skills/loop-goal.md` + prompts to `prompts/28..30-*.md` | pending | depends on (1), (2) |
| 7 | TypeScript guided code for pipeline orchestrator (inherited from workflow-modeling) | pending (#45) | deferred until POM deploy on a target project |

### Next Actions

- [ ] Decide which of the three open items (H6/H7 experiment, prompt v3, runtime snapshot) to address first when the next session opens. Default proposal: prompt v3, because it unblocks the dialog-mode test and is needed before opening any new experiment using the criteria pattern.
- [ ] If the user provides an Anthropic API key or wants to revisit the `/claude-api` skill, the runtime can be re-pointed to Anthropic SDK — but the existing DeepSeek-based runtime stays as evidence.
- [ ] Before promoting `loop-goal` to canonical `skills/`, write a short ADR documenting the relationship between the generic `workflow` skill and the loop/goal sub-type (when to use which).

### Open Decisions

- Whether to extend the `workflow` canonical skill with a `loop-goal` mode or keep `loop-goal` as a separate canonical skill once it's promoted. Current direction: separate skill (loop/goal has distinct discipline: criteria → model → audit → scenarios order, fit vs conformity distinction, expected extensions from backlog).
- Whether to promote the workflow examples already moved to `templates/examples/workflow/loop-goal/` further (e.g. into a worked tutorial in `docs/`) or leave them as examples-only.
- Whether the `runtime-candidate/` should ever become a "reference runtime" documented in `templates/`, or whether it remains in the experiment folder as historical evidence (current direction: the latter, consistent with "no runtime in POM").

### Blockers / Risks

- **None blocking**. All open items are scheduled, not blocked. The main risk is scope drift if a new POM use case opens and pulls focus before `agent-loop-fsm` is formally closed.
- Minor risk: the prompt v3 changes might invalidate the worked `criteria-experiment-1-h1.md` produced during H1; mitigation: archive the current criteria file as v1 if v3 enforces a structurally different shape.

### To Clarify

- Whether `H6 loop_guard` and `H7 timeout` should be opened as a **single** experiment producing **one** SPEC-0007 (covering both primitives), or **two parallel** experiments producing two SPECs. Current direction (from the backlog notes): one experiment `exp/schema-loop-guard-timeout` producing SPEC-0007 that covers both, because they share validator and code-generation infrastructure.
