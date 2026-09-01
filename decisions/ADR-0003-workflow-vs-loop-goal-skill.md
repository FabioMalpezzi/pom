# ADR-0003 - Generic `workflow` Skill vs `loop-goal` As A Separate Skill

| Field | Value |
|---|---|
| Date | 2026-05-30 |
| Status | Accepted |
| Category | governance |
| Area | workflow modeling / method |
| Summary | `loop-goal` is a separate canonical skill for agent-shaped loop/goal workflows, composed on top of the generic `workflow` skill rather than added to it as a mode |
| Replaces | none |
| Replaced by | none |
| Driver | analysis |
| Scope | architecture / AI |

## Context

The generic `workflow` skill models domain workflows with a known structure: ticket lifecycle, document approval, spec evolution. The `experiments/agent-loop-fsm/` experiment modeled a different sub-type: an agent (or an agent-shaped controller) that iterates toward a goal through a perceive, decide, act, observe cycle, with bounded retry, replan, suspendable state, and a goal lifecycle that can be separated from the work itself.

That sub-type needs a discipline the generic skill does not have: criteria accepted and frozen before the model exists, an audit that distinguishes structural fit from conformity to the criteria, scenario coverage of every terminal and criteria exit, and an independent adversarial conclusion. The decision was where that discipline should live: inside `workflow` as an optional mode, or in a skill of its own.

## Decision

`loop-goal` is a separate canonical skill, not a mode of the generic `workflow` skill.

- `workflow` (existing skill, `skills/workflow.md`) models domain workflows with a known structure. Modes: `design`, `validate`, `diagram`, `scenarios`, `implement`.
- `loop-goal` (canonical skill, `skills/loop-goal.md`) models the agentic loop/goal sub-type. It adds the modes `workflow` does not have: `define-criteria`, `audit` (structural fit as clean, adapted, or forced, plus conformity to the criteria), loop-goal `scenarios` (terminal and criteria-exit coverage), and `conclude` (independent adversarial evaluation against frozen criteria).

The two skills compose: a loop/goal workflow is still a POM workflow, validated by the same `pom:workflow:lint`. `loop-goal` reuses the `workflow` prompt for modeling (`model` runs `prompts/27-workflow-modeling.md` in `design` mode) and for implementation guidance (`runtime-guide` runs the same prompt in `implement` mode), and adds its own discipline around them.

### When to use which

| Use `workflow` when | Use `loop-goal` when |
|---|---|
| the structure is known and domain-shaped (business states) | the agent takes decisions and may iterate toward a goal |
| there is no decision cycle and no retry or replan | there is bounded retry, replan, suspend/resume, or a goal lifecycle |
| the workflow is not the subject of an experiment with a measurable hypothesis | the workflow is the subject of a POM experiment with frozen gate/signal criteria and adversarial evaluation |

When in doubt, use `workflow`. The `loop-goal` discipline (criteria, then model, then audit, then scenarios, then conclude; fit versus conformity; backlog primitives recorded as expected extensions; a four-agent cycle with an independent evaluator) is valuable for agentic experiments but too heavy for a simple domain workflow: imposing it everywhere would weigh `workflow` down with no gain.

## Rationale

Separating the two skills avoids two opposite mistakes: inflating `workflow` with an apparatus most domain workflows never use, and diluting the `loop-goal` discipline by turning it into an optional mode that is easy to skip. The distinction between fit (shape) and conformity (respect of the criteria), and the non-negotiable order "criteria before model", live only in `loop-goal` and justify its autonomous existence.

## Alternatives Considered

| Alternative | Reason Rejected |
|---|---|
| Add a `loop-goal` mode to the generic `workflow` skill | The discipline becomes optional and skippable; every `workflow` reader pays for concepts (frozen criteria, adversarial conclusion) that domain workflows do not need. |
| Fold `workflow` into `loop-goal` and treat every workflow as a goal loop | Domain workflows have no goal, criteria, or retry cycle; forcing that vocabulary on them produces empty sections and false precision. |
| Keep `loop-goal` as an experiment-only prompt set, never canonical | The experiment validated the discipline and a second experiment (`experiments/dynamic-workflows/`) reused it; leaving it outside `skills/` would make routing depend on memory instead of a card. |

## Impacts

| Area | Impact |
|---|---|
| Wiki | Method pages describe two workflow skills with an explicit routing boundary. |
| Docs | none |
| Mockup | none |
| Analysis | none |
| Product | Agentic loop/goal experiments follow `loop-goal`; domain workflows keep using `workflow`. |
| Technical | `skills/loop-goal.md` with prompts `prompts/28-loop-goal-define-criteria.md`, `prompts/29-loop-goal-audit.md`, `prompts/30-loop-goal-scenarios.md`, `prompts/31-loop-goal-conclude.md`; the config gate `workflows.loopGoal.enabled` in `templates/POM_CONFIG_TEMPLATE.json` is separate from `workflows.enabled`. |

## Links

- Skill: `skills/workflow.md`
- Skill: `skills/loop-goal.md`
- Experiment: `experiments/agent-loop-fsm/EXPERIMENT.md` (where the decision emerged and was validated)
- Experiment: `experiments/dynamic-workflows/EXPERIMENT.md` (field use of the discipline)
- Spec: `specs/SPEC-0006-workflow-modeling.md`

## Follow-up

- [x] Promote `loop-goal` to a canonical skill card with its own prompts (this ADR was the declared prerequisite).
- [ ] Keep the routing table in `skills/loop-goal.md` ("When To Use") aligned with this ADR when either skill gains a mode.

## Completion Verification

This ADR cannot be marked Accepted without passing semantic validation. Verification is mandatory and automatic.

### Step 0 — Goal-backward check

- [x] What must be TRUE for this decision to be valid?
  - Two distinct skill cards exist, and each has modes the other does not.
  - The `loop-goal` card routes ordinary domain workflows back to `workflow` and names this ADR as the boundary.
  - A loop/goal workflow is still validated by the shared workflow validator, so the split does not fork the model.
- [x] For each truth, does supporting evidence or reasoning EXIST?
  - `skills/workflow.md` lists `design`, `validate`, `diagram`, `scenarios`, `implement`; `skills/loop-goal.md` lists `define-criteria`, `model`, `audit`, `scenarios`, `runtime-guide`, `conclude`.
  - `skills/loop-goal.md`, "When To Use": ordinary domain workflows and static state models go to `skills/workflow.md`; "The routing boundary is recorded in `decisions/ADR-0003-workflow-vs-loop-goal-skill.md`".
  - `skills/loop-goal.md`, "Key Rules": the YAML is the Source Authority and `loop_guard` / `timeout` are validated schema contracts; the `model` mode delegates to `prompts/27-workflow-modeling.md`.

### Thesis

- Thesis 1: The separation is real, not nominal. `loop-goal` owns an ordered lifecycle (criteria, model, audit, scenarios, implement, conclude) with the rule "do not model before criteria are explicitly accepted; do not weaken criteria after evidence exists". None of this exists in `skills/workflow.md`, whose five modes start from an informal description and never freeze criteria. A domain workflow author is therefore never asked for criteria, and a loop/goal author is never allowed to skip them.
- Thesis 2: Composition works without duplication. `loop-goal` `model` and `runtime-guide` reuse `prompts/27-workflow-modeling.md`, and its config gate requires `workflows.enabled` before `workflows.loopGoal.enabled`, so a loop/goal model cannot exist in a project that has not enabled workflow modeling.

### Antithesis

| Antithesis | Confutation |
|---|---|
| One skill with a `loop-goal` mode would be simpler to discover than two skills. | Discovery is handled by the routing table in both cards; the cost of a single skill is that its optional mode makes the criteria-first order skippable, which is the exact failure the experiment was designed to prevent. |
| The distinction is artificial: a loop is just a workflow with a cycle. | Cycles are allowed in any POM workflow. What distinguishes `loop-goal` is not the cycle but the goal lifecycle, the frozen criteria, and the adversarial conclusion; those are method obligations, not graph shapes. |
| Two skills will drift apart and produce incompatible YAML. | Both skills produce YAML validated by the same `pom:workflow:lint`, and `loop-goal` delegates modeling to the `workflow` prompt; the shared validator is the drift guard. |

### Exception

Exception reason: _none_

## Evolution Rule

Fine-grained history lives in Git. If this decision changes substantially, create a new ADR that supersedes or replaces it instead of retroactively rewriting the decision.
