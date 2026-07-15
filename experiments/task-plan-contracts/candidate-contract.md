# Candidate — Task Plan Global Constraints And Task Contracts (experiment-only)

This is the experiment-only positive output contract for P2B. It is NOT installed into the
canonical prompt or template; `generate.mjs` prepends it to the candidate-variant planning
instruction. It adds two sections and per-task contract fields to the current Task Plan format
while explicitly allowing `not applicable`.

## Added section 1 — Global Constraints

Place near the top of the plan, after Objective. One row per project-wide constraint that binds
more than one task. Copy each constraint EXACTLY (version floors, ranges, limits, naming); do not
paraphrase a version or a bound.

```markdown
## Global Constraints

| Constraint | Exact requirement | Source |
|---|---|---|
```

Rules:

- Every constraint that applies to more than one task appears here with its exact value and source.
- If the work has no project-wide constraints (e.g. a one-task correction), write a single row
  stating `No cross-task constraints` — do not invent constraints.

## Added section 2 — Dependency And Interface Map

Place after Global Constraints. One row per task.

```markdown
## Dependency And Interface Map

| Task | Consumes | Produces | Used by | Contract |
|---|---|---|---|---|
```

Rules:

- Name exact produced and consumed contracts (types, signatures, schema columns, ordering) when
  the task has them.
- `Contract` states the invariant the interface must hold across dependent tasks (exact signature,
  compatibility window, ordering constraint).
- For independent, documentation-only, or single-task work with no cross-task interface, write
  `not applicable` in Consumes/Produces/Used by rather than inventing a code contract.

## Per-task requirements (added to each Step/Task)

- Declare dependencies on earlier tasks by id.
- Name the exact contracts the task produces and consumes when applicable, or `not applicable`.
- State an independently testable deliverable.
- Keep setup, config, and documentation WITH the deliverable that needs them unless they merit an
  independent test/review cycle of their own.
- Retain POM's goal-backward check, scenario/misuse tests, thesis/antithesis validation, Source
  Authority, and privacy/security checks — these are NOT replaced by the contract fields.

## Anti-bloat guardrails (must hold, or reject the candidate)

- Do not create a task solely to own a Global Constraints or interface table.
- Do not fragment a one-deliverable task to populate the interface map.
- Do not force a machine-checkable contract onto prose/documentation work — `not applicable` is a
  first-class, correct answer.
