---
name: loop-goal
description: Use this skill to design, audit, generate test scenarios for, and guide the implementation of POM workflows that model agent loop/goal patterns — agents that iterate (perceive → reason → act → observe) toward a stated goal, with bounded retry, suspendable state, and replan loops. Distinct from the generic `workflow` skill: this one is specialized for the loop/goal subtype where the agent makes decisions and may iterate.
---

# Skill - loop-goal (candidate)

**Status**: candidate, lives in `experiments/agent-loop-fsm/skills-candidate/` while the parent experiment is open. Promotion to `skills/` canonical path is gated on closure of the `agent-loop-fsm` experiment (H6/H7 still open in backlog, prompt v3 still to be written).

## When To Use

- The target project hosts an AI agent (or any agent-shaped controller) whose control flow is a loop toward a goal: receive goal → decide → act → observe → loop or conclude.
- The agent has at least one of: bounded retry, replan after failure, suspendable mid-loop state, goal lifecycle separable from the loop.
- The team wants this control flow modeled as a POM workflow YAML, audited for fit, equipped with test scenarios, and implemented in target code.

**Not for**:
- Generic domain workflows (ticket lifecycle, document approval) — use `skills/workflow.md` instead.
- Multi-agent orchestration with concurrent autonomous agents (no current POM primitive).
- Real-time control loops with hard timing (POM has no runtime semantics for deadlines beyond `loop_guard` H6).

## Relationship to other POM artifacts

- Generalises the `workflow` skill for the agentic case: a loop/goal workflow is still a POM workflow, validated by the same `pom:workflow:lint`. The `audit` and `scenarios` modes here produce *additional* artifacts (`.fit.md`, `.scenarios.md`) that the generic skill does not.
- Depends on the `agent-loop-fsm` experiment for its primitives' backlog: H6 `loop_guard` and H7 `timeout` are expected schema extensions; treating them as already-in-backlog (rather than as falsifications) is part of this skill's discipline.
- Composes with `skills/workflow.md`: `design`/`validate`/`diagram`/`implement` modes there work unchanged on loop/goal workflows; this skill adds `define-criteria`, `audit`, `scenarios` modes that the generic skill does not have.

## Modes

Pass the mode as the first instruction.

| Mode | Purpose | Canonical prompt |
|---|---|---|
| `define-criteria` | Fix the experiment's objective and measurement (gate + signal metrics) before any modeling. First step of any loop/goal experiment. | `prompts-candidate/define-loop-goal-criteria.md` |
| `model` | Translate an informal agent description into a POM workflow YAML (ReAct minimal, Goal Lifecycle, SPAO, bounded retry, supervisor + sub-workflow, etc.). | Use `prompts/27-workflow-modeling.md` `design` mode. |
| `audit` | Classify every state and transition as `clean fit` / `adapted fit` / `forced lossy`, produce `<name>.fit.md`. Verify backlog primitives (H6, H7) are admitted as expected extensions, not falsifications. | `prompts-candidate/audit-loop-goal-workflow.md` |
| `scenarios` | Enumerate happy path / failure paths / loop paths / edge cases, produce `<name>.scenarios.md` with a sequence table per scenario. For composed workflows, traverse `state-invoke` / `event-invoke` references. | `prompts-candidate/scenarios-loop-goal-workflow.md` |
| `runtime-guide` | Guide the coding agent to implement the modeled workflow as runtime code in target language. Pattern A / B / C selection from `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md`. | Use `prompts/27-workflow-modeling.md` `implement` mode. |

## Key Rules

- **Criteri prima del modello** (regola d'ordine non negoziabile): la sequenza è `define-criteria` → `model` → `audit` → `scenarios`. `model` *deve* leggere il `criteria.md` esistente (se l'esperimento ha già fissato obiettivo + metriche gate/signal) e produrre un workflow conforme. `audit` *deve* verificare la conformità del workflow ai criteri, non solo la forma. Se non esiste un `criteria.md`, instradare a `define-criteria` prima di procedere con `model`.
- **Fit ≠ conformità** (distinzione chiave dell'audit): un workflow può essere `clean fit` sul piano della forma (ogni stato e transizione mappa pulito alle primitive) ed essere non conforme ai criteri (es. manca un terminale di forfait_for_stall richiesto dal criteria; il signal non è misurabile sul modello prodotto). L'audit produce due dimensioni distinte. Solo se entrambe sono accettabili il workflow è "promovibile".
- The YAML model is the source of authority. `.fit.md`, `.scenarios.md`, diagrams, and runtime code are derived.
- `audit` mode never modifies the YAML. It only produces the classification file.
- `audit` and `scenarios` modes use only the coding agent's native tools (Read for the workflow YAML, Bash to run `pom:workflow:lint`, Write for the output). **No external LLM runtime required.** A reference TypeScript runtime exists in `experiments/agent-loop-fsm/runtime-candidate/` as proof of executability, but the operational pattern is the one in this skill — the coding agent uses its own connection.
- Backlog primitives (`H6 loop_guard`, `H7 timeout`) are treated as **expected extensions**, not falsifications. A loop/goal workflow that needs `loop_guard` is *not* outside POM; it is awaiting promotion of the primitive.
- Composed workflows (with `state-invoke` or `event-invoke`) require following the chain: in `audit` and `scenarios` modes, read also the referenced sub-workflow before producing the output.

## Worked examples (in this experiment)

These are committed artifacts you can read as reference for what each mode should produce:

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

- `define-criteria`: `design/criteria-experiment-<N>-<HID>.md` (short structured file, see prompt for format).
- `model`: a new or updated `workflows-candidate/<name>.yaml` (during experiment) or `workflows/<name>.yaml` (after promotion).
- `audit`: `design/<name>.fit.md` with two tables (states, transitions), counts, gate results, verdict.
- `scenarios`: `design/<name>.scenarios.md` with one scenario per significant path + coverage table.
- `runtime-guide`: a proposed change to target code, plus a note on which Pattern was chosen and why.

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
- Open backlog primitives motivated here: H6 `loop_guard`, H7 `timeout` (in `EXPERIMENT.md`).
- External runtime as proof of executability (not the operational path): `experiments/agent-loop-fsm/runtime-candidate/`.
