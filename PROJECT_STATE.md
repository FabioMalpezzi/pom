# Project State

## Last Updated

2026-06-01

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

POM v0.2.0 is released and tagged. The loop/goal and workflow extension
work has been integrated into `main`:

- `skills/loop-goal.md` is canonical, with six modes:
  `define-criteria`, `model`, `audit`, `scenarios`, `runtime-guide`,
  and `conclude`.
- Prompts `28` through `31` are canonical for loop/goal criteria,
  audit, scenarios, and conclusion.
- `decisions/ADR-0003-workflow-vs-loop-goal-skill.md` defines
  `loop-goal` as a separate agentic subtype of the generic `workflow`
  skill.
- Five verified loop/goal workflow examples live under
  `templates/examples/workflow/loop-goal/`: ReAct minimal, Goal
  Lifecycle, flat SPAO, bounded retry, and supervisor+invoke.
- SPEC-0007 is complete: `loop_guard` and `timeout` are validated schema
  primitives. Target projects still own counters, timers, scheduling,
  persistence, and timeout event emission.
- The external TypeScript runtime under
  `experiments/agent-loop-fsm/runtime-candidate/` remains evidence of
  executability, not a POM runtime.

On 2026-05-30 the method gained a **fourth named agent and a full experiment lifecycle**, designed in confronto with the user:
- `define-criteria` was re-framed from an extractive interview into a **reasoned confronto** (the agent proposes, motivates, shows consequences on the objective, accepts off-grid questions), with an explicit boundary (the agent proposes and challenges but does not decide for the user, and must declare when it has over-steered) and **continuous + final auditing** (local consequences shown inline at every answer; cross-checks reconciled in section 7).
- the confronto now **leaves a trace** in a separate `*.dialog.md` file (consequences signalled, off-grid questions, user calibrations) — both an anti-shortcut safeguard (the conversational auditing otherwise leaves no trace and is the part most easily skipped when the same agent "changes hat") and raw material for future improvement.
- the fourth agent, `conclude-loop-goal-experiment`, is an **independent adversarial evaluator**: it reads only the artifacts (frozen `criteria.md`, `.fit.md`, scenarios, runtime output), never the criteria-definition dialog, and tries to falsify rather than confirm. If budget remains it leaves improvement **advice for the Coordinator** (never for the user, never retroactive); on a next round `define-criteria` reads that advice into the confronto.

The four-agent lifecycle had its **first real dialog-mode run** on the `exp/dynamic-workflows` branch (closed 2026-05-30). That experiment stress-tested the FSM schema against Anthropic's Dynamic Workflows and produced — as a **workflow-domain deliverable** (not a loop-goal artifact) — an additive **Dynamic Workflow contract**: control-plane FSM + delegated external data plane, with `fan_out_launch` / `await`{`join`: all/quorum/first, `timeout`/`on_timeout`, `react`} / `cancel`+`compensation` / `suspend`/`resume` propagated. See `experiments/dynamic-workflows/design/CONTRACT.md`. The contract is recorded in SPEC-0006 and ADR-0004 as workflow control-plane doctrine. Handle lifecycle rules E080-E089 are implemented; additional validator coverage for the rest of the accepted contract can be added when target projects need stricter automation.

### Current Objective

Keep the integrated loop/goal and workflow documentation aligned with
the canonical implementation, without expanding POM into a runtime.

### Priorities

| Priority | Activity | Status | Dependencies |
|---|---|---|---|
| 1 | Open parallel experiment `exp/schema-loop-guard-timeout` for H6 `loop_guard` + H7 `timeout` → SPEC-0007 | **done (2026-05-31)** — adopted; SPEC-0007 complete; validator/tests/spec/guidance implemented | — |
| 2 | Write prompt v3 of `define-loop-goal-criteria` with Consistency Check (D4) + dialog-mode hint (D5) | **done (#66, 2026-05-30)** — resolves D1–D5; adds section 7 Consistency Check and a 4th promotion criterion | — |
| 3 | First real **dialog-mode** run of the full four-agent lifecycle | **done (2026-05-30)** via `exp/dynamic-workflows`; feedback in `agent-loop-fsm` §4-septies (4 limits to fold into prompt v4 + skill promotion) | — |
| 3b | Promote the **Dynamic Workflow contract** to the workflow filone: an ADR (control-plane/data-plane doctrine) + SPEC-0006 contract entries for `fan_out_launch`/`await`/`join`/`react`/`compensation`; real data-plane executor remains target-owned | **done (2026-05-31)** — `decisions/ADR-0004-dynamic-workflow-control-plane.md` + SPEC-0006 contract section | — |
| 3c | Two **reference executors** of the contract (TypeScript, Python), simple in structure but functionally complete | **done (2026-05-30)** — both verified on the scenarios; in `experiments/dynamic-workflows/runtime/` | — |
| 4 | Auditor v2: add explicit "follow `state-invoke`/`event-invoke`" instruction to the audit prompt | **done (2026-05-31)** — already present in `prompts/29-loop-goal-audit.md`; confirmed by current-turn read | — |
| 5 | Runtime: implement actual snapshot write/restore (the runtime today shows state+context are alive but doesn't serialize them) | **done (2026-05-31)** — `agent-runtime.ts` supports `--snapshot` and `--restore`; README updated | — |
| 6 | Promote `skills-candidate/loop-goal.md` → `skills/loop-goal.md` + the 4 prompts to `prompts/28..31-loop-goal-*.md` | **done (2026-05-30)** — skill canonical, prompts numbered, registries updated; candidates kept in the closed experiment as history | — |
| 6a | Short **ADR**: relationship between generic `workflow` skill and the `loop-goal` sub-type | **done** — `decisions/ADR-0003-workflow-vs-loop-goal-skill.md` | — |
| 7 | TypeScript guided code for pipeline orchestrator (inherited from workflow-modeling) | pending (#45) | deferred until POM deploy on a target project |
| 8 | **Integrate branches** `exp/agent-loop-fsm` + `exp/dynamic-workflows` + H6/H7 changes toward `main` | **done (2026-06-01)** — merged `exp/dynamic-workflows` into `main`; `exp/agent-loop-fsm` was already an ancestor; post-merge test/lint passed | — |

### Next Actions

Current post-integration state:

- [x] **Lato workflow — promuovere il contratto Dynamic Workflow** (priorità 3b): dottrina control-plane/data-plane registrata in `decisions/ADR-0004-dynamic-workflow-control-plane.md`; SPEC-0006 aggiornato con `fan_out_launch`/`await`/`join`/`timeout`/`react`/`compensation`. Il contratto è dentro il workflow come control plane; l'esecuzione concorrente reale resta nel data plane del target. La copertura validator completa può crescere a partire dalle regole handle lifecycle E080-E089.
- [x] **Runtime agent-loop-fsm**: snapshot/restore reale aggiunto al runtime dimostrativo con `--snapshot` e `--restore`.
- [x] **Auditor v2**: l'istruzione di seguire `state-invoke`/`event-invoke` è già presente nel prompt canonico `prompts/29-loop-goal-audit.md`; nessuna modifica duplicativa necessaria.
- [x] **Esperimento H6/H7** (priorità 1): adottato. SPEC-0007 è completa; validator E060-E073/W060, esempi, fixture, test automatico e guida Pattern A/B/C sono presenti.
- [x] **Dynamic Workflow follow-up — handle lifecycle**: regole statiche E080-E089 aggiunte al validator per `fan_out_launch.handle`, `await.handles`, `cancel_handles`, `detach_handles` e terminali senza handle attivi impliciti; esempi e fixture in `experiments/dynamic-workflows/`; test automatici in `tests/workflow-validator/integration/test-dynamic-handles.mjs` e `tests/dynamic-workflows/integration/test-reference-executors.mjs`. I reference executor TypeScript e Python rimuovono gli handle attesi, propagano `detach`/`cancel` alle FSM figlie e rifiutano terminali con handle ancora attivi.
- [x] **Integrare i rami verso `main`** (priorità 8): `exp/dynamic-workflows` è stato mergiato in `main`; il ramo includeva già `exp/agent-loop-fsm` e le modifiche H6/H7. Verifica post-merge: `npm run pom:test` e `npm run pom:lint` passati.

(Spunto non azionabile, registrato a parte: Prolog è un fit naturale per *validare/verificare* i workflow — non per eseguirli; valutazione esplorativa, non una cosa da fare.)

### Open Decisions

- Whether the wiki tutorial under `wiki/loop-goal-workflow-tutorial.md`
  is enough for loop/goal adoption, or whether a separate public guide
  under `docs/` is useful.
- Whether the `runtime-candidate/` should ever become a "reference runtime" documented in `templates/`, or whether it remains in the experiment folder as historical evidence (current direction: the latter, consistent with "no runtime in POM").
- **Whether to generalize the criterion-definition method beyond loop/goal to all POM experiments** (idea raised by the user 2026-05-30). The structure is already mostly generic — `define-criteria` covers ten POM scopes, of which loop/goal is only a sub-type; the generic layer (reasoned confronto, coherence auditor, trace, independent adversarial evaluator, advice loop) is separable from the loop/goal-specific layer (FSM modeling, fit classification, backlog primitives, terminal-coverage scenarios, runtime). It would relate to the existing lighter `prompts/09-run-temporary-experiment.md` / `skills/spike.md` via a rigor threshold (light exploration below, measurable-hypothesis experiment above), not replace them. **Agreed direction: experiment and bring the loop/goal criterion to regime first, then evaluate if and how to extend** — generalizing an as-yet-unproven method would violate POM's "no promotion before evidence". A clean way to do both at once: treat "generalize the criterion" as itself a POM experiment (scope 1) and use it as the first dialog-mode exercise of the criterion.

### Blockers / Risks

- **None blocking**. The main risk is confusing contract ownership with runtime ownership: the Dynamic Workflow contract belongs to the workflow control plane, while real concurrent execution belongs to the target data plane. Validator coverage is partial, not the contract itself.
- Secondary risk: the loop/goal lifecycle is powerful but heavy. Use `workflow` by default for ordinary domain workflows; use `loop-goal` only when the controller is agent-shaped and measured criteria matter.

### To Clarify

- Dynamic Workflow validator coverage can still expand for `join`, `k`,
  `react`, compensation ordering, and lifecycle propagation evidence.
  The contract itself is accepted as workflow control plane; real data
  plane execution remains target-owned. The handle lifecycle itself is
  no longer open: terminal states require every active handle to be
  awaited, cancelled, or explicitly detached.
