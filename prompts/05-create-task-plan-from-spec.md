# Prompt - Create Task Plan From Spec Or ADR

Use this prompt to turn a spec, decision, or analysis into verifiable work.

```text
Read the indicated spec/ADR/analysis and create an operational task plan.

Use this logical hierarchy (it organizes work, not folders):

Roadmap
  -> Phase          (closes with acceptance review)
    -> Workstream   (closes with cross-functional E2E / user-flow tests)
      -> Task       (closes with integration tests / single-feature E2E)
        -> Step     (closes with atomic verification: unit test, lint, check)

Verification happens at every level, not only at the bottom. Place E2E and user-flow tests at Task or Workstream level, not at Step level.

For each task, include:
- origin: spec, ADR, wiki, analysis, mockup, stakeholder decision;
- objective;
- phase;
- workstream;
- concrete steps;
- verifications;
- real user scenarios where applicable;
- documentation checks when there is no code;
- security/privacy checks when relevant;
- done criteria.

Rules:
- do not create generic tasks that cannot be verified;
- every phase must close with concrete verification;
- if the work is documentation-only, include lint + critical analysis for contradictions, gaps, and security/privacy risks;
- if the work is implementation, include technical tests and a user scenario;
- when E2E or user-flow tests are possible, plan at least 2 positive user cases and at least 1 handled-error user case;
- if the project already has a test structure, use it only after identifying it; if it differs from the POM proposal, ask whether to adapt to the existing structure or use/adapt `tests/<module-or-area>/...`;
- if no test structure exists, propose `tests/<module-or-area>/{e2e,integration,fixtures,evidence}` and `tests/cross-system/`, without creating unnecessary empty folders.

Recommended output:
- docs/delivery/CURRENT_PLAN.md or equivalent;
- docs/delivery/tasks/TASK-xxxx-title.md or equivalent.

Do not modify an existing plan without highlighting what you are changing.
```
