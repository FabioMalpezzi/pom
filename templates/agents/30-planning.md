## Planning

Use this logical hierarchy only when the project needs structured planning:

```text
Roadmap
  -> Phase          (closes with acceptance review)
    -> Workstream   (closes with cross-functional E2E / user-flow tests)
      -> Task       (closes with integration tests / single-feature E2E)
        -> Step     (closes with atomic verification: unit test, lint, check)
```

Verification happens at every level, not only at the bottom. Place E2E and user-flow tests at Task or Workstream level, not at Step level.

Every spec or decision that generates work must produce verifiable tasks. For significant steps, run the shortest relevant checkpoint before dependent work continues.

Use `pom/skills/plan.md` to create task plans and `pom/skills/check.md` before closing a phase, task, spec, or decision.

## Completion Verification Rules

A spec, task, or ADR cannot be marked Complete or Accepted without passing the completion verification gate. This is a closure rule, not a general chat rule: apply it when closing governed work.

Use `pom/skills/check.md` for the full procedure. The invariant is:

- start with a goal-backward check;
- for technical work, verify real positive and misuse scenarios and run the checks;
- for non-technical work, prove the thesis and confute the antithesis;
- document explicit exceptions instead of silently skipping verification.

## Test Convention

POM proposes this optional structure when the project has no established test convention:

```text
tests/
  <analysis-or-workstream-or-module>/
    e2e/
    integration/
    fixtures/
    evidence/
  cross-system/
```

When tests or evidence validate a specific analysis/workstream, prefer the same namespace used by analysis and task plans. If an existing test structure differs, map it in `pom.config.json`; do not move tests without approval.
