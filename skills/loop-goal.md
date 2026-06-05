---
name: loop-goal
description: Use when modeling or evaluating an agent-shaped controller that iterates toward a measurable goal.
---

# Skill - loop-goal

**Status**: canonical (promoted from `agent-loop-fsm` on 2026-05-30, after the four-agent cycle's first real dialog-mode run on `dynamic-workflows`). When to use this vs the generic `workflow` skill: `decisions/ADR-0003-workflow-vs-loop-goal-skill.md`. H6 `loop_guard` and H7 `timeout` were promoted by `specs/SPEC-0007-loop-guard-timeout.md`; loop/goal workflows may now use them as schema primitives while target code still owns counters, timers, scheduling, and event emission.

## When To Use

- The target project hosts an AI agent (or any agent-shaped controller) whose control flow is a loop toward a goal: receive goal → decide → act → observe → loop or conclude.
- The agent has at least one of: bounded retry, replan after failure, suspendable mid-loop state, goal lifecycle separable from the loop.
- The team wants this control flow modeled as a POM workflow YAML, audited for fit, equipped with test scenarios, and implemented in target code.

**Not for**:
- Generic domain workflows (ticket lifecycle, document approval) — use `skills/workflow.md` instead.
- Ordinary feature work, bug fixes, or implementation tasks where there is no measurable loop experiment — use the project's normal coding workflow or `skills/spike.md` for lightweight exploration.
- Static workflow modeling where the controller does not decide, retry, replan, suspend, or pursue a goal — use `skills/workflow.md` and stop before the criteria/audit/conclude lifecycle.
- Multi-agent orchestration with concurrent autonomous agents (no current POM primitive).
- Real-time control loops with hard timing (POM has no runtime semantics for deadlines beyond `loop_guard` H6).

## Relationship to other POM artifacts

- Generalises the `workflow` skill for the agentic case: a loop/goal workflow is still a POM workflow, validated by the same `pom:workflow:lint`. The `audit` and `scenarios` modes here produce *additional* artifacts (`.fit.md`, `.scenarios.md`) that the generic skill does not.
- Depends on the `agent-loop-fsm` experiment for its pattern evidence and on SPEC-0007 for bounded-loop and timeout primitives. In historical experiment criteria, primitives already accepted into backlog were not falsifications; in current workflows, `loop_guard` and `timeout` are normal validated schema fields.
- Composes with `skills/workflow.md`: `design`/`validate`/`diagram`/`implement` modes there work unchanged on loop/goal workflows; this skill adds `define-criteria`, `audit`, `scenarios`, and `conclude` modes that the generic skill does not have.

The four named agents of the loop/goal method form the experiment lifecycle: **Coordinator+Auditor** (`define-criteria`) opens it with the user in the loop; the **Fit Auditor** (`audit`) and **Scenarios Generator** (`scenarios`) run during it on each modeled workflow, automatable without the user; the **Independent Adversarial Evaluator** (`conclude`) closes it. The evaluator is deliberately *not* the same agent that opened the experiment — independence (it reads only the artifacts, never the criteria-definition dialog) plus adversariality (it tries to falsify) guard against confirmation bias, on top of the frozen-criteria safeguard.

The cycle can close into a loop. If budget remains when the evaluator concludes, it does **not** propose improvements to the user or open a new round itself (that would erode its independence): it leaves advice *for the Coordinator* in its evaluation file. On a next round, `define-criteria` reads that advice and brings it into the confronto with the user. The improvement idea thus originates with the judge but is "washed" through the user↔Coordinator dialogue before it can become a frozen criterion — the evaluator never has direct hands on the metro, of either the present or the future round.

## Modes

Pass the mode as the first instruction.

| Mode | Purpose | Canonical prompt |
|---|---|---|
| `define-criteria` | Fix the experiment's objective and measurement (gate + signal metrics) before any modeling. First step of any loop/goal experiment. | `prompts/28-loop-goal-define-criteria.md` |
| `model` | Translate an informal agent description into a POM workflow YAML (ReAct minimal, Goal Lifecycle, SPAO, bounded retry, supervisor + sub-workflow, etc.). | Use `prompts/27-workflow-modeling.md` `design` mode. |
| `audit` | Classify every state and transition as `clean fit` / `adapted fit` / `forced lossy`, produce `<name>.fit.md`. Verify conformance to the frozen criteria as well as structural fit. | `prompts/29-loop-goal-audit.md` |
| `scenarios` | Enumerate happy path / failure paths / loop paths / edge cases, produce `<name>.scenarios.md` with a sequence table per scenario. For composed workflows, traverse `state-invoke` / `event-invoke` references. | `prompts/30-loop-goal-scenarios.md` |
| `runtime-guide` | Guide the coding agent to implement the modeled workflow as runtime code in target language. Pattern A / B / C selection from `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md`. | Use `prompts/27-workflow-modeling.md` `implement` mode. |
| `conclude` | Independently and adversarially evaluate whether the experiment met its objective, measuring the gathered evidence (`.fit.md`, scenarios, runtime output) against the **frozen** `criteria.md`. Tries to falsify, not confirm. If budget remains, may propose improvements to the definition for a *next* round (never retroactive). Last step. | `prompts/31-loop-goal-conclude.md` |

## Key Rules

- **Criteri prima del modello** (regola d'ordine non negoziabile): la sequenza è `define-criteria` → `model` → `audit` → `scenarios`. `model` *deve* leggere il `criteria.md` esistente (se l'esperimento ha già fissato obiettivo + metriche gate/signal) e produrre un workflow conforme. `audit` *deve* verificare la conformità del workflow ai criteri, non solo la forma. Se non esiste un `criteria.md`, instradare a `define-criteria` prima di procedere con `model`.
- **Fit ≠ conformità** (distinzione chiave dell'audit): un workflow può essere `clean fit` sul piano della forma (ogni stato e transizione mappa pulito alle primitive) ed essere non conforme ai criteri (es. manca un terminale di forfait_for_stall richiesto dal criteria; il signal non è misurabile sul modello prodotto). L'audit produce due dimensioni distinte. Solo se entrambe sono accettabili il workflow è "promovibile".
- The YAML model is the source of authority. `.fit.md`, `.scenarios.md`, diagrams, and runtime code are derived.
- `audit` mode never modifies the YAML. It only produces the classification file.
- `audit` and `scenarios` modes use only the coding agent's native tools (Read for the workflow YAML, Bash to run `pom:workflow:lint`, Write for the output). **No external LLM runtime required.** A reference TypeScript runtime exists in `experiments/agent-loop-fsm/runtime-candidate/` as proof of executability, but the operational pattern is the one in this skill — the coding agent uses its own connection.
- SPEC-0007 primitives (`loop_guard`, `timeout`) are validated schema fields. A historical experiment may still mention them as "expected extensions" when reading old criteria, but new loop/goal work should treat them as available contracts whose enforcement remains target-owned.
- Composed workflows (with `state-invoke` or `event-invoke`) require following the chain: in `audit` and `scenarios` modes, read also the referenced sub-workflow before producing the output.
- **Conclude discipline** (the closing agent): the verdict is measured against the criteria *as frozen* at acceptance — no softening a gate, moving a threshold, or reinterpreting the falsification event to make the result fit. The evaluator runs as a fresh session: it reads the artifacts (frozen `criteria.md`, `.fit.md`, scenarios, runtime output), never the criteria-definition dialog, and it tries to falsify rather than confirm. Budget-residual improvement advice is **never retroactive** and is addressed **to the Coordinator, not the user**: it opens a *next* round with new criteria to be frozen before re-measuring, and does not alter the verdict just issued. The evaluator recommends the verdict; the promotion decision (Adopt/Refine/Reject) stays with the user via `prompts/09-run-temporary-experiment.md`.
- **The confronto leaves a trace** (anti-shortcut + improvement fuel): `define-criteria` writes, beside the frozen `criteria.md`, a `criteria.dialog.md` recording the essential parts of the confronto — consequences signalled, off-grid questions, user calibrations. Two reasons. First, the continuous auditing of the Coordinator is conversational and otherwise leaves no trace in the artifact, so it is the part most easily shortcut when the same agent "changes hat" (the failure observed in D5, and again mid-session when the agent ran ahead on its own); the trace makes that shortcut detectable after the fact. Second, the essential parts of a confronto are themselves operating memory and the raw material for improving the method later — exactly how the prompt's own D1–D5 weaknesses were discovered from the confronto on H1.

## Worked examples

Artefatti committati, di riferimento per ciò che ogni modo deve produrre. I `model` examples vivono in `templates/examples/workflow/loop-goal/` (canonici); i path `design/…` ed `evidence/…` qui sotto sono relativi a `experiments/agent-loop-fsm/`, dove sono nati.

| Mode | Worked example | Hand-written reference (for diff) |
|---|---|---|
| `model` (ReAct minimal) | `templates/examples/workflow/loop-goal/agent-orchestrator.yaml` | — |
| `model` (Goal Lifecycle) | `templates/examples/workflow/loop-goal/agent-orchestrator-goal-lifecycle.yaml` | — |
| `model` (flat SPAO) | `templates/examples/workflow/loop-goal/agent-loop-table.yaml` | — |
| `model` (bounded retry) | `templates/examples/workflow/loop-goal/agent-retry-bounded.yaml` | — |
| `model` (supervisor + invoke) | `templates/examples/workflow/loop-goal/agent-supervisor.yaml` | — |
| `audit` | `design/agent-supervisor-auto.fit.md` (auto, by external runtime) | `design/agent-supervisor.fit.md` (hand-written, H4) |
| `audit` | `design/agent-loop-table-auto.fit.md` (auto, by external runtime) | `design/agent-loop-table.fit.md` (hand-written, H2) |
| `scenarios` | `design/agent-supervisor.scenarios.md` (auto, by external runtime) | — |
| Snapshot (H5) | `evidence/snapshot/agent-orchestrator.suspended.json` | `design/agent-suspend-restore.fit.md` |

The `auto` files were produced by the external TypeScript runtime as proof that the same pattern is also automatable end-to-end with an LLM. The **canonical operational pattern of this skill is the same task done by the coding agent itself**, using its native tools — which produces equivalent output without an external runtime or LLM key.

## Output

- `define-criteria`: `design/criteria.md` (short frozen contract, see prompt for format) **plus** `design/criteria.dialog.md` (the trace of the confronto — consequences signalled, off-grid questions, user calibrations; kept separate so the contract stays lean and freezable). Historical experiments may still use numbered `criteria-experiment-<N>-<HID>.md` files.
- `model`: a new or updated `workflows-candidate/<name>.yaml` (during experiment) or `workflows/<name>.yaml` (after promotion).
- `audit`: `design/<name>.fit.md` with two tables (states, transitions), counts, gate results, verdict.
- `scenarios`: `design/<name>.scenarios.md` with one scenario per significant path + coverage table.
- `runtime-guide`: a proposed change to target code, plus a note on which Pattern was chosen and why.
- `conclude`: `design/evaluation-experiment-<N>-<HID>.md` — adversarial verification table against the frozen criteria, verdict (confirmed/refuted/inconclusive), budget, and (only if budget remains) a section of advice addressed to the Coordinator for a next round. Never modifies any other artifact.

## Memory Impact

- A loop/goal workflow YAML is operating memory (like any POM workflow): the agreed shape of an agent's control flow.
- The criteria file from `define-criteria` is the *contract* of an experiment — it is operating memory until the experiment closes.
- `.fit.md` and `.scenarios.md` are derived artifacts and may be regenerated freely when the YAML changes.

## Reference

- Experiment: `experiments/agent-loop-fsm/EXPERIMENT.md`
- Results summary: `experiments/agent-loop-fsm/RESULTS.md`
- Generic workflow skill (composable): `skills/workflow.md`
- Implementation patterns A/B/C: `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md`
- Schema: `specs/SPEC-0006-workflow-modeling.md`
- Context injection ADR: `decisions/ADR-0002-workflow-context-injection.md`
- Bounded loop and timeout primitives: `specs/SPEC-0007-loop-guard-timeout.md`.
- External runtime as proof of executability (not the operational path): `experiments/agent-loop-fsm/runtime-candidate/`.
