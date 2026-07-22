# Project State

## Last Updated

2026-07-22

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

Prompt governance now has automated bidirectional catalog/link coverage and static contract guards for loop/goal prompts, standalone config guards, and reconciliation with disabled Decision Records. Canonical loop/goal prompts 28–31 and `skills/loop-goal.md` are portable current procedures without embedded promotion history; loop/goal modeling requires accepted criteria, and invalid workflows stop before fit classification.

`skills/mcp-interface.md` and `prompts/35-mcp-interface.md` provide the current POM procedure for designing, auditing, reshaping, and verifying MCP interfaces. The procedure adapts AXI ergonomics to version-specific MCP contracts, keeps runtime ownership in Target Projects, separates tool/resource/prompt audits, requires approval before any public-contract change, distinguishes transport authorization from JSON-RPC and tool execution errors, and applies the POM verification gate. Token-efficiency claims require host-visible token measurements rather than serialized size alone.

`tasks/TASK-0004-behavior-bootstrap-task-contracts-pi-package.md` has completed P0 through P3. Real Pi sessions froze the five-repetition behavioral baseline at critical 0.978, and the planted `broken-no-bootstrap` degradation was detected at critical 0.59. The lean bootstrap and skill-only Pi package were promoted; the proposed Task Plan contract and active Pi extension were rejected by their gates. Remaining follow-ups are optional re-baselining after negation-aware matcher hardening, broader deferred-record detection, five-repetition Pi acceptance, and a durable install/removal check.

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

On 2026-06-05 POM gained a source-level bootstrap/router skill inspired
by the comparison with Superpowers, without adding a POM runtime:
`skills/using-pom.md`, `prompts/32-using-pom.md`, and
`prompts/references/agent-harnesses.md` now route POM-aware work before
action, require skill bodies rather than frontmatter descriptions as the
procedure, map common tool names across Codex, Claude Code, Gemini CLI,
Cursor, OpenCode, and GitHub Copilot, and explicitly guard disabled
adoption modules. The installed agent instruction templates now point
agents to `pom/skills/using-pom.md` before the first POM-related action
when the route is unclear, and to the harness reference when
session-start behavior or tool mapping matters.

The same change added deterministic skill-bootstrap checks under
`tests/skill-bootstrap/`: English and Italian smoke fixtures for
`adopt`, `wiki`, `pulse`, `validate`, `plan`, plus Git/experiment
routing through `spike` and POM refresh routing through `sync`. These are
offline structural evals, not yet live harness transcripts.

POM now also has a small branch-delivery procedure: `skills/spike.md`
contains explicit Git isolation rules for risky experiments and
worktrees, while `skills/finish-branch.md` and
`prompts/33-finish-branch.md` guide verified merge, PR, keep, discard,
and cleanup decisions after branch or experiment work.

POM also has a Target Project debugging procedure:
`skills/root-cause.md` and `prompts/34-root-cause-debugging.md` route
bugs, test failures, build failures, performance issues, and unexpected
behavior through evidence-first root-cause investigation before fixes.
`skills/diagnose.md` remains scoped to POM method/tooling defects.

On 2026-06-08 the Project Reader gained a reusable core, POM/generic
adapters, lazy `/api/tree?path=...`, virtualized lists, a command
palette, standalone `project-reader open/search`, and cmux-targetable
`?path=` deep links for large Target Projects and non-POM repositories.

On 2026-06-22 workflow adoption was clarified for Target Projects:
ordinary workflow modeling remains opt-in through `workflows.enabled`,
Dynamic Workflow control-plane modeling is a separate opt-in profile
through `workflows.dynamic.enabled`, and loop/goal modeling is a separate
opt-in profile through `workflows.loopGoal.enabled`. The `workflow` and
`loop-goal` skills still leave execution, persistence, tools, timers,
retries, side effects, and runtime concurrency to the Target Project.
POM now provides TypeScript and Python runtime seam templates for those
Target Project adapters under `templates/WORKFLOW_RUNTIME_TEMPLATE.*`.

The 2026-06-05 critical review cleanup aligned the public skill maps
with the installed skill index, removed stale candidate-status prose from
the canonical loop/goal criteria prompt, split large POM Source files
below the 800-line working target, and added `source-size-*` lint checks
for operational POM Source code files. The source-size guard does not
apply to Target Project application files.

On 2026-05-30 the method gained a **fourth named agent and a full experiment lifecycle**, designed in confronto with the user:
- `define-criteria` was re-framed from an extractive interview into a **reasoned confronto** (the agent proposes, motivates, shows consequences on the objective, accepts off-grid questions), with an explicit boundary (the agent proposes and challenges but does not decide for the user, and must declare when it has over-steered) and **continuous + final auditing** (local consequences shown inline at every answer; cross-checks reconciled in section 7).
- the confronto now **leaves a trace** in a separate `*.dialog.md` file (consequences signalled, off-grid questions, user calibrations) — both an anti-shortcut safeguard (the conversational auditing otherwise leaves no trace and is the part most easily skipped when the same agent "changes hat") and raw material for future improvement.
- the fourth agent, `conclude-loop-goal-experiment`, is an **independent adversarial evaluator**: it reads only the artifacts (frozen `criteria.md`, `.fit.md`, scenarios, runtime output), never the criteria-definition dialog, and tries to falsify rather than confirm. If budget remains it leaves improvement **advice for the Coordinator** (never for the user, never retroactive); on a next round `define-criteria` reads that advice into the confronto.

The four-agent lifecycle had its **first real dialog-mode run** on the `exp/dynamic-workflows` branch (closed 2026-05-30). That experiment stress-tested the FSM schema against Anthropic's Dynamic Workflows and produced — as a **workflow-domain deliverable** (not a loop-goal artifact) — an additive **Dynamic Workflow contract**: control-plane FSM + delegated external data plane, with `fan_out_launch` / `await`{`join`: all/quorum/first, `timeout`/`on_timeout`, `react`} / `cancel`+`compensation` / `suspend`/`resume` propagated. See `experiments/dynamic-workflows/design/CONTRACT.md`. The contract is recorded in SPEC-0006 and ADR-0004 as workflow control-plane doctrine. Handle lifecycle rules E080-E089 are implemented; additional validator coverage for the rest of the accepted contract can be added when target projects need stricter automation.

### Current Objective

Maintain the promoted lean bootstrap and skill-only Pi package from `tasks/TASK-0004-behavior-bootstrap-task-contracts-pi-package.md`, while keeping the rejected Task Plan contract and active Pi extension out of the method. Treat the remaining evaluator and durable-install checks as explicit follow-ups rather than unfinished P1–P3 work.

### Next Actions

Current post-integration state:

- [ ] **Behavioral evaluation follow-ups**: optionally re-freeze the baseline after negation-aware `transcriptExcludes` hardening, broaden deferred-record detection, run five-repetition Pi acceptance, and verify durable `pi install`/removal. P0–P3 are closed; these follow-ups do not reopen the rejected Task Plan contract or active extension.
- [x] **Lato workflow — promuovere il contratto Dynamic Workflow** (priorità 3b): dottrina control-plane/data-plane registrata in `decisions/ADR-0004-dynamic-workflow-control-plane.md`; SPEC-0006 aggiornato con `fan_out_launch`/`await`/`join`/`timeout`/`react`/`compensation`. Il contratto è dentro il workflow come control plane; l'esecuzione concorrente reale resta nel data plane del target. La copertura validator completa può crescere a partire dalle regole handle lifecycle E080-E089.
- [x] **Runtime agent-loop-fsm**: snapshot/restore reale aggiunto al runtime dimostrativo con `--snapshot` e `--restore`.
- [x] **Auditor v2**: l'istruzione di seguire `state-invoke`/`event-invoke` è già presente nel prompt canonico `prompts/29-loop-goal-audit.md`; nessuna modifica duplicativa necessaria.
- [x] **Esperimento H6/H7** (priorità 1): adottato. SPEC-0007 è completa; validator E060-E073/W060, esempi, fixture, test automatico e guida Pattern A/B/C sono presenti.
- [x] **Dynamic Workflow follow-up — handle lifecycle**: regole statiche E080-E089 aggiunte al validator per `fan_out_launch.handle`, `await.handles`, `cancel_handles`, `detach_handles` e terminali senza handle attivi impliciti; esempi e fixture in `experiments/dynamic-workflows/`; test automatici in `tests/workflow-validator/integration/test-dynamic-handles.mjs` e `tests/dynamic-workflows/integration/test-reference-executors.mjs`. I reference executor TypeScript e Python rimuovono gli handle attesi, propagano `detach`/`cancel` alle FSM figlie e rifiutano terminali con handle ancora attivi.
- [x] **Integrare i rami verso `main`** (priorità 8): `exp/dynamic-workflows` è stato mergiato in `main`; il ramo includeva già `exp/agent-loop-fsm` e le modifiche H6/H7. Verifica post-merge: `npm run pom:test` e `npm run pom:lint` passati.
- [x] **Bootstrap POM per agenti e eval bilingui**: `using-pom` aggiunto come router canonico; descrizioni frontmatter rese trigger-oriented; fixture inglesi/italiane e casi negativi per moduli disabilitati, Git, esperimenti e sync aggiunti. Verifica: `npm run pom:test` e `npm run pom:lint` passati il 2026-06-05.
- [x] **Git isolation e chiusura branch**: `spike` esteso con rilevamento worktree/submodule e preferenza per workspace nativi; `finish-branch` aggiunto per chiudere branch con opzioni merge, PR, keep, discard e cleanup.
- [x] **Debug Target Project a radice causa**: `root-cause` aggiunto come skill opzionale per bug, test failure, build failure, performance issue e comportamenti inattesi; `diagnose` resta riservato a difetti del metodo POM.
- [x] **Pulizia revisione critica POM**: prompt `loop-goal` ripulito da note candidate, README/guide/wiki allineati alle skill correnti, file sorgente sopra target splittati, lint dimensionale aggiunto e testato.

(Spunto non azionabile, registrato a parte: Prolog è un fit naturale per *validare/verificare* i workflow — non per eseguirli; valutazione esplorativa, non una cosa da fare.)

### Open Decisions

- Whether the wiki tutorial under `wiki/loop-goal-workflow-tutorial.md`
  is enough for loop/goal adoption, or whether a separate public guide
  under `docs/` is useful.
- Whether the `runtime-candidate/` should ever become a "reference runtime" documented in `templates/`, or whether it remains in the experiment folder as historical evidence (current direction: the latter, consistent with "no runtime in POM").
- **Whether to generalize the criterion-definition method beyond loop/goal to all POM experiments** (idea raised by the user 2026-05-30). The structure is already mostly generic — `define-criteria` covers ten POM scopes, of which loop/goal is only a sub-type; the generic layer (reasoned confronto, coherence auditor, trace, independent adversarial evaluator, advice loop) is separable from the loop/goal-specific layer (FSM modeling, fit classification, backlog primitives, terminal-coverage scenarios, runtime). It would relate to the existing lighter `prompts/09-run-temporary-experiment.md` / `skills/spike.md` via a rigor threshold (light exploration below, measurable-hypothesis experiment above), not replace them. **Agreed direction: experiment and bring the loop/goal criterion to regime first, then evaluate if and how to extend** — generalizing an as-yet-unproven method would violate POM's "no promotion before evidence". A clean way to do both at once: treat "generalize the criterion" as itself a POM experiment (scope 1) and use it as the first dialog-mode exercise of the criterion.

### Blockers / Risks

- **None blocking**. The main risk is confusing contract ownership with runtime ownership: the Dynamic Workflow contract belongs to the workflow control plane and is opt-in through `workflows.dynamic.enabled`, while real concurrent execution belongs to the target data plane. Validator coverage is partial, not the contract itself.
- Secondary risk: the loop/goal lifecycle is powerful but heavy and is opt-in through `workflows.loopGoal.enabled`. Use `workflow` by default for ordinary domain workflows; use `loop-goal` only when the controller is agent-shaped and measured criteria matter.
- Branch delivery guidance is procedural, not a project release policy. Target projects still own branch naming, PR templates, protected branches, and release automation.
- New bootstrap evals are deterministic structural checks, not real harness
  transcripts. True agent-behavior evals for Claude Code, Codex, Gemini,
  Cursor, and OpenCode remain a future distribution/integration step.

### To Clarify

- Dynamic Workflow validator coverage can still expand for `join`, `k`,
  `react`, compensation ordering, and lifecycle propagation evidence.
  The contract itself is accepted as workflow control plane; real data
  plane execution remains target-owned. The handle lifecycle itself is
  no longer open: terminal states require every active handle to be
  awaited, cancelled, or explicitly detached.
