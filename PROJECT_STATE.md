# Project State

## Last Updated

2026-09-02

---

## Static Context

_Stable facts about the project. Update only when the project's direction, stack, or permanent constraints change._

### Project Purpose

POM (Project Operating Memory) is a meta-method that gives any AI-assisted software project a shared, version-controlled operating memory: skills, prompts, templates, governance, and decision records that live in the target repository and are loaded by the coding agent on demand. POM is **method**, not runtime: the artifacts it ships travel with the target project; no central server, no LLM inside POM itself.

### Key Constraints And Decisions

- **No runtime in POM.** POM provides schema, templates, prompts, skills, and validators. Execution lives in the target project's own stack (`templates/WORKFLOW_IMPLEMENTATION_GUIDE.md` Patterns A/B/C; `decisions/ADR-0004-dynamic-workflow-control-plane.md` for the control-plane/data-plane split).
- **No async, no shared state, no inheritance** inside a workflow model — the pillars of `specs/SPEC-0006-workflow-modeling.md`.
- **No promotion to canonical paths** (`skills/`, `prompts/`, `specs/`, `decisions/`, `templates/`) before the originating experiment closes and the change is approved (`prompts/09-run-temporary-experiment.md`, `templates/WORKFLOW_INTEGRATION_GUIDE.md`).
- **No client names in committed artifacts.** POM lives inside client projects and must not name them (`AGENTS.MD` privacy rule).
- **Method changes go through `skills/method.md`** (`extend`, `improve`, `prune`), starting in `prune` when a change may add weight.
- **The reading surface is the file-based Project Reader**, not a persistent agent session (`decisions/ADR-0005-file-based-project-reader-replaces-persistent-agent-session.md`).
- **`loop-goal` is a separate skill composed on top of `workflow`** (`decisions/ADR-0003-workflow-vs-loop-goal-skill.md`).

### Files To Always Read When Resuming

- `README.md`
- `AGENTS.MD`
- `CONTEXT.md`
- `PROJECT_STATE.md`
- `CHANGELOG.md` (most recent release)
- `skills/README.md`
- `decisions/DECISIONS_INDEX.md`
- `wiki/index.md` and `wiki/log.md`
- `experiments/<topic>/EXPERIMENT.md` for any experiment still under evaluation

### Do Not Do Without Decision

- Promote anything to canonical paths if the originating experiment has not closed.
- Add a runtime dependency (LLM client, FSM library, scheduler, server) to the POM Source repository.
- Mention client identities in any committed POM artifact.
- Force-push to `main` or rewrite tag history.
- Reopen the rejected candidates: the Task Plan contract fields (`experiments/task-plan-contracts/`) and the active Pi extension (`experiments/pi-package/`).

---

## Dynamic Context

_Current operational state. Update at every significant session or when priorities, risks, or next actions change. If this section grows beyond the maxLines limit, compact it: remove completed actions, archive closed decisions to the configured decisions root or `wiki/log.md`, delete resolved risks. Do not let this section become a log._

### Current State

POM 0.6.1 is released and tagged (the tandem coordinator relays every verdict and response verbatim in its chat; the script prints replies between delimiters); before it, 0.6.0 (`tandem`: two coding agents with separate sessions, one controller and one executor, coordinated by whoever runs the skill, with per-task cap and controller worktree isolation); before it, 0.5.0 (one experiment contract for spike and loop-goal, four loop-goal modes, evaluation frontmatter verified by lint, `loop_guard` and `timeout` in the workflow template); before it, 0.4.0 (installation guides in `docs/`, one routing table, shared test harness, hardened bootstrap and hook). The repository runs its own governance lint through the root `pom.config.json` (decisions, wiki, structured tasks enabled) and `pom:lint` reports no errors; `npm run pom:test` is green. The catalog holds 28 skills, generated into the README from `skills/README.md`, and every skill points to a canonical prompt.

Stable and installed in target projects: the adoption installer and updater with presets (`owned`, `team`, `overlay`, `minimal`), the doc-governance lint with ADR, task-plan, and completion gates, the wiki with its generated reader, the Project Reader with file-based annotations, and the workflow tooling (validator with core, temporal, handle-lifecycle, guard-evidence, and runtime-loop rules; Mermaid and XState transformers).

Opt-in per target project: workflow modeling (`workflows.enabled`), Dynamic Workflow control planes (`workflows.dynamic.enabled`), loop/goal modeling (`workflows.loopGoal.enabled`), and the Pi skill-only package. Runtime execution, persistence, timers, and concurrency stay target-owned in every case.

Deferred with explicit reactivation criteria: the external-overlay `.pom/` layout (SPEC-0004), the web wiki agent extension (SPEC-0005), and the control-plane model checker (SPEC-0008).

### Current Objective

Keep the 0.3.x line honest and portable: close the open follow-ups of TASK-0004, keep the deferred specs deferred until a target project asks for them, and let method changes enter only through `skills/method.md` with evidence.

### Priorities

| Priority | Activity | Status | Dependencies |
|---|---|---|---|
| 1 | Close TASK-0004 (five-repetition Pi acceptance, durable `pi install`/removal check) | Open | Pi and model credentials available locally |
| 2 | Align `wiki/current-specs.md` with ADR-0005 and the deferred specs | Open | none |
| 3 | Keep experiment evidence within the tracked-size convention | Open | `.gitignore` entry for `experiments/fan-in-accounting/evidence-raw/` |

### Next Actions

- [ ] **Wiki current specs**: update `wiki/current-specs.md` so ADR-0001 shows as superseded by ADR-0005 and SPEC-0004, SPEC-0005, SPEC-0008 show as Deferred with their reactivation criteria.
- [ ] **Fan-in raw evidence**: add `experiments/fan-in-accounting/evidence-raw/` to `.gitignore` and stop tracking the six `report.json` files that were moved there; the tracked summaries are `report.summary.json` in each `evidence-structured/<run>/` folder.
- [ ] **SPEC-0004 overlay layout**: reactivate only when a second external-repository trial or an adopter needs the `.pom/` local-only layout or the overlay wiki page set; the ownership parameter and lint posture already exist.
- [ ] **SPEC-0008 control-plane checks**: reactivate only when a target project modeling Dynamic Workflows needs malformed `join`/`k`/`on_timeout` or reachable dead ends caught statically; Level 1 first, and renumber the proposed E090/E091 codes, which now belong to the guard `evidence` block.
- [ ] **Self-improvement loop, cross-project case** (optional): run `method improve` once on another POM-managed project or a representative fixture and record the case in `experiments/self-improvement-loop/EXPERIMENT.md`.

### Open Decisions

- Whether `wiki/loop-goal-workflow-tutorial.md` is enough for loop/goal adoption, or whether a separate public guide under `docs/` is useful.
- Whether the runtime candidates under `experiments/agent-loop-fsm/runtime-candidate/` and `experiments/dynamic-workflows/runtime/` should ever become documented reference runtimes in `templates/`, or remain experiment evidence (current direction: the latter, consistent with "no runtime in POM").
- Whether the criteria-definition method of `loop-goal` (reasoned dialogue with trace, coherence audit, independent adversarial evaluator) should be generalized to all POM experiments. Agreed direction: bring the loop/goal criterion to regime first, then evaluate the extension as its own experiment, with `prompts/09-run-temporary-experiment.md` and `skills/spike.md` kept for light exploration below a rigor threshold.

### Blockers / Risks

- **Fan-in accounting enforcement is intentionally limited**: the canonical prompt carries the supported procedure, while static fan-in schema and lint stay deferred because the experiment showed that structural validity alone does not prove semantic provenance or scenario truth.
- **Contract ownership versus runtime ownership** can be confused for Dynamic Workflows: the contract belongs to the workflow control plane, real concurrent execution to the target data plane; validator coverage is partial, the contract is not.
- **loop/goal is heavy** and opt-in: use `workflow` for ordinary domain workflows and `loop-goal` only when the controller is agent-shaped and measured criteria matter.
- **Behavioral evidence is Pi-only**: the frozen baseline and the bootstrap gates were measured on Pi with one default model; claims about other harnesses rest on deterministic structural tests, not on real transcripts.
- **Branch delivery guidance is procedural**, not a release policy: target projects own branch naming, PR templates, protected branches, and release automation.

### To Clarify

- Dynamic Workflow validator coverage can still grow for `join`, `k`, `react`, compensation ordering, and lifecycle propagation evidence; the handle lifecycle itself is closed (every active handle is awaited, cancelled, or detached before a terminal).
