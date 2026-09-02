# Experiment - POM Self-Improvement Loop

| Field | Value |
|---|---|
| Date | 2026-05-24 |
| Type | spike / governance / agent |
| Status | consolidated — loop promoted as the `improve` mode of `skills/method.md` |
| Branch / Path | experiments/self-improvement-loop |
| Isolation | experiment folder |
| Owner | POM maintainer |

This experiment evaluates whether POM should gain one reusable procedure for self-improvement cycles that can be applied to any POM-managed project.

POM Source is one such project: it uses POM to maintain and improve the POM method itself.

The loop is promoted: `prompts/25-self-improvement-loop.md` is the canonical procedure and `skills/method.md` exposes it as the `improve` mode. This record keeps the case log and the evidence behind that promotion. References below to `skills/extend.md`, `skills/prune.md`, and `skills/improve.md` describe the skill catalog at the time of the cases; those three cards are now the `extend`, `prune`, and `improve` modes of `skills/method.md`.

This is not a spec, and it does not authorize automatic changes to prompts, skills, templates, lint, or governed documents.

## Objective

Validate a single minimal loop, applicable to the current project, in this shape:

```text
observation
  -> diagnosis
  -> proposal
  -> verification
  -> promotion or discard
```

The loop must help a POM-managed project improve without turning into unguided self-modification.

The procedure is one. What changes is the governed content of the project:

- in POM Source, the "project" is the POM method: prompts, skills, templates, scripts, lint, wiki, specs, and method decisions;
- in another POM-managed project, the "project" is the local product/system: project wiki, Project State, Current Plan, Task Plans, decisions, docs, code, and tests.

In both cases, the loop starts from current configuration and current sources, not reconstructed memory.

## When This Loop Is Worth Running (entry criteria)

Run this loop only when the observed issue is about operating behavior of the method itself, not just a one-off task:

- repeated friction or recurring confusion across sessions/agents;
- a governance rule that is ambiguous, contradictory, or easy to bypass;
- a repeated "wrong place" memory outcome (e.g., updates keep landing in the wiki when they should be decisions, or vice versa);
- a known failure mode in a POM workflow/tooling (lint/install/sync/reader/scripts) that causes unreliable memory.

Do not run it for routine feature work. For that, follow the normal task planning workflow.

## Hypotheses

- An explicit loop reduces random improvements because it separates observation, diagnosis, proposal, and verification.
- The loop has value only if it produces a clear decision: discard, archive analysis, update wiki, create/update a spec, create an ADR, generate a task plan, or promote a procedure into `prompts/` and optionally `skills/`.
- The loop must not auto-promote changes. Any change to prompt, skill, template, lint, README, wiki, spec, ADR, task plan, code, or governed documents requires explicit approval and explicit verification.
- The loop must respect `pom.config.json` when present, ownership mode, Source Authority, Artifact Policy, and local conventions before proposing changes.

## Scope

Included:

- classify when an observed problem deserves a self-improvement loop;
- exercise the minimal cycle on POM Source;
- exercise the same minimal cycle on another POM-managed project or a representative fixture;
- define what evidence is needed before promotion;
- decide whether a stable form belongs in `prompts/`, `skills/`, `templates/`, or lint/scripts.

Excluded:

- creating a stable skill immediately;
- adding automation that modifies method/memory without review;
- introducing a scheduled or autonomous agent;
- using the loop to auto-close specs, ADRs, or task plans;
- imposing generic rules on a project without reading its config and ownership mode;
- replacing existing workflows: `skills/extend.md`, `skills/prune.md`, `skills/diagnose.md`, `skills/validate.md`, or `skills/challenge.md`.

## Isolation Plan

- Branch or worktree: not required for the experiment container itself.
- Temporary path: `experiments/self-improvement-loop/`.
- Dependencies: none.
- Environment/config: no changes.
- Services/data: none.
- Import/build guardrail: no stable code must import from this experiment.

## Relationship With Existing Skills (avoid duplication)

This loop must be a thin wrapper that routes to existing canonical workflows:

- **Diagnosis**: use `skills/diagnose.md` when a POM workflow/tool behaves incorrectly.
- **Method extension**: use `skills/extend.md` for approved improvements to prompts/skills/templates/config/lint.
- **Method bloat/overlap**: use `skills/prune.md` when the candidate improvement duplicates existing rules or adds weight.
- **Non-code verification**: use `skills/challenge.md` for thesis/antithesis review before accepting a normative change.
- **Post-action audit**: use `skills/validate.md` after significant governed-memory changes.
- **Exploratory work**: if the investigation requires temporary artifacts, route through `skills/spike.md`.

## Procedure

1. Capture a concrete observation: friction, repeated error, method gap, ambiguity, cognitive cost, or memory regression.
2. Identify the current project and its posture: POM Source, owned project, team project, external overlay, or another configured profile.
3. Read `pom.config.json` when present and declare the relevant ownership mode, Source Authority, and Artifact Policy constraints.
4. Diagnose the cause by reading current sources from disk, not reconstructing from memory. If a workflow/tool is failing, route through `skills/diagnose.md`.
5. Propose the smallest intervention level: no change, wiki update, analysis note, prompt change, skill change, template change, lint/script change, spec, ADR, or task plan. If the candidate adds weight or duplicates, route through `skills/prune.md`.
6. Define explicit verification criteria for the proposal:
   - for code/tooling: at least one positive scenario + one misuse path;
   - for method or normative documents: thesis + confuted antithesis (use `skills/challenge.md` when appropriate);
   - for memory shape changes: re-check Source Authority and Artifact Policy.
7. Ask for approval before promotion. No changes are applied automatically by the loop.
8. After promotion, run the available lint/tests for the current project. In POM Source: `npm run pom:lint` and, if code/tests were touched, `npm run pom:test`.
9. Record what was promoted, what was discarded, what remains open, and where the "next safe step" lives.

## Output Contract (what an agent must produce)

At the end of a completed loop, produce:

- the original observation (with source links or file references);
- the diagnosis and the evidence used;
- the proposed change, including the smallest POM level chosen and why;
- explicit verification performed and results;
- promotion decision: discard, archive, or promote (wiki/spec/ADR/prompt/skill/template/lint/script/task plan);
- the next safe step and where it is recorded (typically `PROJECT_STATE.md`, a task plan, or an Open Discussion note).

## Exit Criteria (when the loop is "closed")

The loop is closed only when:

- the proposal is either discarded with rationale, or promoted with approval;
- verification evidence exists and is referenced from the promoted artifact (or from the experiment record if discarded);
- post-action governance has been checked for significant changes (use `skills/validate.md` when applicable);
- follow-ups are explicit and placed in a governed place (task plan / `PROJECT_STATE.md` / decision record), not left only as chat intent.

## Evidence

Minimum evidence to close the experiment:

- at least one real case completed from observation to decision in POM Source;
- at least one case applied to another POM-managed project or a fixture simulating config, ownership, and Artifact Policy;
- a proposed stable destination, or a motivated discard decision;
- proof the loop does not duplicate an existing skill (see mapping above);
- proof the loop does not bypass human approval or the Completion Verification Gate.

## Case Log

### Case 0001 - Make The Loop Operable For Agents (POM Source)

Observation:
The self-improvement loop existed as an experiment, but it was not operational enough for agents: no entry criteria, no routing to existing skills, unclear output/exit criteria, and mixed language reduced portability.

Diagnosis:
The loop overlapped existing workflows (`diagnose`, `extend`, `spike`, `validate`, `challenge`) but did not explicitly route to them, so an agent could easily apply it inconsistently or treat it as yet another parallel procedure.

Proposal:
Update `experiments/self-improvement-loop/EXPERIMENT.md` to be fully English and add:
- explicit entry criteria;
- explicit routing to existing skills (avoid duplication);
- an output contract;
- explicit exit criteria.
Update `wiki/experiments-and-extension.md` to point agents to the experiment doc for those operational details.

Verification:
Run `npm run pom:lint` in POM Source and confirm doc governance lint passes and the wiki reader regenerates successfully.

Promotion decision:
Promoted the improved procedure within the experiment. Updated the wiki page to reference the experiment doc.

Next safe step:
Run Case 0002 (prompt/skill promotion) and then execute the loop on another POM-managed project or a representative fixture.

### Case 0002 - Promote A Canonical Prompt + Skill Alias (POM Source)

Observation:
Even with an improved experiment record, agents are most likely to discover and apply workflows via `skills/` and `prompts/`. Keeping the loop only in `experiments/` makes it easy to ignore or apply inconsistently.

Diagnosis:
The repository's operational entry points are the canonical prompts and the skill index. A non-promoted experiment is not an ergonomic invocation point for agents.

Proposal:
Promote the loop as:
- `prompts/25-self-improvement-loop.md` (canonical procedure);
- `skills/improve.md` (short alias pointing to the canonical prompt).
Update prompt/skill indexes and align the wiki to avoid claiming the loop is not a stable prompt/skill.

Verification:
Run `npm run pom:lint` and confirm doc governance passes and the wiki reader regenerates.

Promotion decision:
Promoted prompt + skill. The experiment remains under evaluation until a second case is executed on another POM-managed project or fixture.

Next safe step:
Execute the loop on another POM-managed project or a representative fixture, then decide whether the prompt/skill stay, are simplified, or are removed/demoted.

## Risks

| Area | Risk | Mitigation |
|---|---|---|
| Method safety | The loop becomes unreviewed self-modification | Every promotion requires approval and explicit verification |
| Cognitive cost | A new procedure overlaps existing skills | Before any promotion, compare with `extend`, `prune`, `diagnose`, `validate`, and `challenge` |
| Quality | The loop rewards overly frequent changes | Require concrete evidence and an explicit value criterion |
| Maintainability | The loop creates more documents instead of improving existing ones | Apply "update before creating" and promote at the smallest level |
| Authority | An experimental diagnosis is treated as normative | Keep this file non-authoritative until a stable synthesis is promoted |
| Portability | The loop works only in POM Source | Verify it in another POM-managed project or representative fixture |

## Outcome

Decision: promote the loop as a stable prompt and skill mode; close the experiment.

- Case 0001 and Case 0002 ran the loop on POM Source itself and promoted `prompts/25-self-improvement-loop.md` plus a short alias skill (`skills/improve.md`).
- The duplication risk named in the hypotheses materialized as catalog weight rather than as a defect of the procedure: `extend`, `improve`, and `prune` overlapped as three separate cards. The 0.3.0 skill-catalog consolidation resolved it by merging them into one `method` skill with three modes, which starts in `prune` when a change may add weight (`CHANGELOG.md` 0.3.0, `skills/method.md`). The loop therefore did not duplicate `extend` or `prune`; it became their sibling mode.
- The loop did not bypass approval or the Completion Verification Gate in either case: both promotions were verified with `npm run pom:lint` and recorded here before the canonical files changed.
- The second evidence item — one case on another POM-managed project or a fixture — was not executed. The promotion rests on the POM Source cases and on the catalog consolidation; a cross-project case remains a useful follow-up, not a gate.

Promotion path: clean reimplementation in `prompts/` and `skills/`, already applied; no experiment file moved into stable source.

## Candidate Consolidation

| Artifact | Destination | Action |
|---|---|---|
| Reusable procedure | `prompts/` | Create only after at least one validated case |
| Operational alias | `skills/` | Add only if the procedure becomes recurring |
| Method synthesis | `wiki/` | Update only with consolidated knowledge |
| Mandatory rule | `templates/` or lint/script | Use only if the rule is stable and automatable |
| Guidance for POM-managed projects | `prompts/` and `skills/` | Must include reading `pom.config.json`, ownership mode, and Artifact Policy |

## Follow-up

- [x] Execute the first real self-improvement loop case in POM Source.
- [x] Promote a canonical prompt (`prompts/25-self-improvement-loop.md`) and a short alias skill (`skills/improve.md`).
- [ ] Execute or simulate the same loop in another POM-managed project (or fixture) — optional, strengthens the evidence.
- [x] Confirm the loop does not duplicate `extend`, `prune`, `diagnose`, `validate`, or `challenge` — resolved by merging `extend`, `improve`, and `prune` into `skills/method.md`; `diagnose`, `validate`, and `challenge` stay routed from the procedure.
- [x] Decide whether the prompt/skill stay, are simplified, or are removed/demoted — they stay: `prompts/25-self-improvement-loop.md` canonical, `skills/method.md` `improve` mode.
