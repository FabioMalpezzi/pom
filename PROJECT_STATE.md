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
- one candidate skill `experiments/agent-loop-fsm/skills-candidate/loop-goal.md` with six modes (`define-criteria`, `model`, `audit`, `scenarios`, `runtime-guide`, `conclude`);
- four candidate prompts in `experiments/agent-loop-fsm/prompts-candidate/` (`define-loop-goal-criteria` v3, `audit-loop-goal-workflow`, `scenarios-loop-goal-workflow`, `conclude-loop-goal-experiment`) — all coding-agent-native;
- one external TypeScript runtime in `experiments/agent-loop-fsm/runtime-candidate/` as evidence that the modeled workflows are executable end-to-end (validated on DeepSeek);
- two auto-generated outputs in `experiments/agent-loop-fsm/design/` (`*-auto.fit.md`, `agent-supervisor.scenarios.md`) as proof that the same tasks are automatable by an external LLM.

The `agent-loop-fsm` experiment is **not yet closed**: H6 `loop_guard` and H7 `timeout` (schema-level primitives) remain in the backlog as motivated extensions, and the runtime snapshot write/restore is still stubbed. Prompt v3 of `define-loop-goal-criteria` (Consistency Check section 7 + dialog-mode note, resolving D1–D5) was written on 2026-05-30; what remains for the prompt is its first real use in dialog-mode (the H1 test exercised only template-mode).

On 2026-05-30 the method gained a **fourth named agent and a full experiment lifecycle**, designed in confronto with the user:
- `define-criteria` was re-framed from an extractive interview into a **reasoned confronto** (the agent proposes, motivates, shows consequences on the objective, accepts off-grid questions), with an explicit boundary (the agent proposes and challenges but does not decide for the user, and must declare when it has over-steered) and **continuous + final auditing** (local consequences shown inline at every answer; cross-checks reconciled in section 7).
- the confronto now **leaves a trace** in a separate `*.dialog.md` file (consequences signalled, off-grid questions, user calibrations) — both an anti-shortcut safeguard (the conversational auditing otherwise leaves no trace and is the part most easily skipped when the same agent "changes hat") and raw material for future improvement.
- the fourth agent, `conclude-loop-goal-experiment`, is an **independent adversarial evaluator**: it reads only the artifacts (frozen `criteria.md`, `.fit.md`, scenarios, runtime output), never the criteria-definition dialog, and tries to falsify rather than confirm. If budget remains it leaves improvement **advice for the Coordinator** (never for the user, never retroactive); on a next round `define-criteria` reads that advice into the confronto.

The four-agent lifecycle had its **first real dialog-mode run** on the `exp/dynamic-workflows` branch (closed 2026-05-30). That experiment stress-tested the FSM schema against Anthropic's Dynamic Workflows and produced — as a **workflow-domain deliverable** (not a loop-goal artifact) — an additive **Dynamic Workflow contract**: control-plane FSM + delegated external data plane, with `fan_out_launch` / `await`{`join`: all/quorum/first, `timeout`/`on_timeout`, `react`} / `cancel`+`compensation` / `suspend`/`resume` propagated, all on top of H5/H6/H7. See `experiments/dynamic-workflows/design/CONTRACT.md`. The deliverable is destined for the **workflow** filone (SPEC-0006 extension + an ADR), not loop-goal. What returns to loop-goal is only the **methodological feedback** (recorded in `agent-loop-fsm` RESULTS §4-septies): the confronto produced a better objective, the signal moved for the first time, the adversarial evaluator (co-run with the user) refined the deliverable — which is the evidence that unblocks promoting skill `loop-goal`.

### Current Objective

Close the loop on `agent-loop-fsm` by addressing the remaining open methodological items (H6/H7 in a separate experiment, runtime snapshot, plus the dialog-mode first-use of prompt v3 — itself now written), then promote skill `loop-goal` to `skills/` canonical with numbered prompts.

### Priorities

| Priority | Activity | Status | Dependencies |
|---|---|---|---|
| 1 | Open parallel experiment `exp/schema-loop-guard-timeout` for H6 `loop_guard` + H7 `timeout` → SPEC-0007 | pending (#63) | — |
| 2 | Write prompt v3 of `define-loop-goal-criteria` with Consistency Check (D4) + dialog-mode hint (D5) | **done (#66, 2026-05-30)** — resolves D1–D5; adds section 7 Consistency Check and a 4th promotion criterion | — |
| 3 | First real **dialog-mode** run of the full four-agent lifecycle | **done (2026-05-30)** via `exp/dynamic-workflows`; feedback in `agent-loop-fsm` §4-septies (4 limits to fold into prompt v4 + skill promotion) | — |
| 3b | Promote the **Dynamic Workflow contract** to the workflow filone: an ADR (control-plane/data-plane doctrine) + SPEC-0006 backlog entries for `fan_out_launch`/`await`/`compensation`; real validator+executor at target deploy | pending (#new) — user-approved direction (Adopt) | depends on workflow-domain decision |
| 3c | Two **reference executors** of the contract (TypeScript, Python), simple in structure but functionally complete | in progress (this session) | — |
| 4 | Auditor v2: add explicit "follow `state-invoke`/`event-invoke`" instruction to the audit prompt | pending | minor, ~5 lines |
| 5 | Runtime: implement actual snapshot write/restore (the runtime today shows state+context are alive but doesn't serialize them) | pending | ~20 LOC |
| 6 | Close `agent-loop-fsm` experiment formally and promote `skills-candidate/loop-goal.md` → `skills/loop-goal.md` + prompts to `prompts/28..30-*.md` | pending | depends on (1), (2) |
| 7 | TypeScript guided code for pipeline orchestrator (inherited from workflow-modeling) | pending (#45) | deferred until POM deploy on a target project |

### Next Actions

- [x] Prompt v3 of `define-loop-goal-criteria` written (2026-05-30): resolves D1–D5, adds section 7 Consistency Check.
- [ ] Of the two remaining open items (H6/H7 experiment, runtime snapshot), decide which to address next. The dialog-mode test of v3 (priority 3) is now the natural follow-up: it should ride on the next real experiment trigger rather than being run on a synthetic case.
- [ ] If the user provides an Anthropic API key or wants to revisit the `/claude-api` skill, the runtime can be re-pointed to Anthropic SDK — but the existing DeepSeek-based runtime stays as evidence.
- [ ] Before promoting `loop-goal` to canonical `skills/`, write a short ADR documenting the relationship between the generic `workflow` skill and the loop/goal sub-type (when to use which).

### Open Decisions

- Whether to extend the `workflow` canonical skill with a `loop-goal` mode or keep `loop-goal` as a separate canonical skill once it's promoted. Current direction: separate skill (loop/goal has distinct discipline: criteria → model → audit → scenarios order, fit vs conformity distinction, expected extensions from backlog).
- Whether to promote the workflow examples already moved to `templates/examples/workflow/loop-goal/` further (e.g. into a worked tutorial in `docs/`) or leave them as examples-only.
- Whether the `runtime-candidate/` should ever become a "reference runtime" documented in `templates/`, or whether it remains in the experiment folder as historical evidence (current direction: the latter, consistent with "no runtime in POM").
- **Whether to generalize the criterion-definition method beyond loop/goal to all POM experiments** (idea raised by the user 2026-05-30). The structure is already mostly generic — `define-criteria` covers ten POM scopes, of which loop/goal is only a sub-type; the generic layer (reasoned confronto, coherence auditor, trace, independent adversarial evaluator, advice loop) is separable from the loop/goal-specific layer (FSM modeling, fit classification, backlog primitives, terminal-coverage scenarios, runtime). It would relate to the existing lighter `prompts/09-run-temporary-experiment.md` / `skills/spike.md` via a rigor threshold (light exploration below, measurable-hypothesis experiment above), not replace them. **Agreed direction: experiment and bring the loop/goal criterion to regime first, then evaluate if and how to extend** — generalizing an as-yet-unproven method would violate POM's "no promotion before evidence". A clean way to do both at once: treat "generalize the criterion" as itself a POM experiment (scope 1) and use it as the first dialog-mode exercise of the criterion.

### Blockers / Risks

- **None blocking**. All open items are scheduled, not blocked. The main risk is scope drift if a new POM use case opens and pulls focus before `agent-loop-fsm` is formally closed.
- Minor risk: the prompt v3 changes might invalidate the worked `criteria-experiment-1-h1.md` produced during H1; mitigation: archive the current criteria file as v1 if v3 enforces a structurally different shape.

### To Clarify

- Whether `H6 loop_guard` and `H7 timeout` should be opened as a **single** experiment producing **one** SPEC-0007 (covering both primitives), or **two parallel** experiments producing two SPECs. Current direction (from the backlog notes): one experiment `exp/schema-loop-guard-timeout` producing SPEC-0007 that covers both, because they share validator and code-generation infrastructure.
