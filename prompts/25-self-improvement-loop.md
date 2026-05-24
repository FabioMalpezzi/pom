# Prompt - Self-Improvement Loop (Method / Governance)

Use this prompt when a POM-managed project needs to improve its operating method (governance, memory shapes, workflows, prompts/skills/templates, or tooling) in a controlled way.

This is not for routine feature work. If the work is product/system delivery, use normal planning and verification workflows instead.

```text
I want to run a POM self-improvement loop.

Goal:
- Improve operating memory and verification without adding process weight.

Entry criteria (run only when at least one applies):
- repeated friction or recurring confusion across sessions/agents;
- a governance rule is ambiguous, contradictory, or easy to bypass;
- repeated "wrong place" memory outcomes (wiki vs decisions vs tasks vs analysis);
- a known failure mode in a POM workflow/tooling (lint/install/sync/reader/scripts).

Before changing any file:
1. read `CONTEXT.md`, `README.md`, and `pom.config.json` if present;
2. identify the current project posture (owned / team / external overlay) and the relevant Source Authority + Artifact Policy constraints;
3. capture the concrete observation with file links and/or quotes from current sources;
4. diagnose the cause by reading sources from disk (not session memory);
5. decide whether this is:
   - a workflow/tool defect -> run `prompts/22-diagnose-pom-problem.md`;
   - method bloat/overlap -> run `prompts/21-prune-pom-method.md`;
   - a method extension -> continue below and route through `prompts/12-extend-pom.md` for the actual change proposal.

Loop steps:
1) Observation:
   - state the symptom, frequency, and impacted workflow;
   - point to the source(s) that demonstrate it.

2) Diagnosis:
   - list 3 to 5 concrete hypotheses;
   - test the highest-signal one first (shortest useful feedback loop).

3) Proposal:
   - choose the smallest intervention level:
     - project adaptation -> `pom.config.json`;
     - document shape -> `templates/`;
     - agent procedure -> `prompts/`;
     - recurring workflow alias -> `skills/`;
     - automatic enforcement -> lint/scripts;
     - governed decision -> ADR;
     - delivery work -> task plan.
   - do not duplicate rules across README, prompts, skills, templates: prefer one canonical rule plus references.
   - if the change is a method extension, use `prompts/12-extend-pom.md` to structure the proposal and approval step.

4) Verification:
   - define explicit verification criteria:
     - code/tooling: at least one positive scenario + one misuse path;
     - normative documents: thesis + confuted antithesis (use `prompts/24-challenge-antithesis.md` when appropriate);
     - memory shape changes: re-check Source Authority + Artifact Policy.

5) Promotion or discard:
   - ask for explicit approval before applying any promotion;
   - after applying, run available lint/tests (in POM Source, run `npm run pom:lint` and, if code/tests changed, `npm run pom:test`);
   - if discarded, record the reason and keep only the minimum useful lesson.

Output contract (required):
- observation, with sources;
- diagnosis, with evidence;
- proposal, with smallest level chosen and why;
- verification run and result;
- promotion decision (discard / archive / promote where);
- next safe step, and where it is recorded (`PROJECT_STATE.md`, task plan, decision record, or Open Discussion).

Exit criteria (loop is closed only when all are true):
- proposal is discarded with rationale, or promoted with approval;
- verification evidence exists and is referenced from the promoted artifact (or recorded with the discard decision);
- significant governed-memory changes have a post-action audit (`prompts/18-post-action-validator.md` when applicable);
- follow-ups are placed in a governed location, not left only in chat.
```

