## Planning

Use this logical hierarchy for planned work (it organizes work, not folders):

```text
Roadmap
  -> Phase          (closes with acceptance review)
    -> Workstream   (closes with cross-functional E2E / user-flow tests)
      -> Task       (closes with integration tests / single-feature E2E)
        -> Step     (closes with atomic verification: unit test, lint, check)
```

Verification happens at every level, not only at the bottom. Place E2E and user-flow tests at Task or Workstream level, not at Step level.

Every spec or decision that generates work must produce verifiable tasks. Every phase must close with concrete verification: user or technical tests for code, lint and critical analysis for documents.

## Completion Verification Rules

A spec, task, or ADR cannot be marked Complete without passing the completion verification gate. This gate is **mandatory and automatic**: when the agent marks work as Complete, it MUST execute the verification before closing. The agent does not ask whether to verify — it verifies.

### Verification procedure

1. **Goal-backward check (first):** before checking tests or theses, verify that the goal declared in the spec/task/ADR has been actually achieved. Ask: "What must be TRUE for this goal to be met?" then verify each truth against the actual artifacts. If the goal is not met, the work cannot be Complete regardless of checkbox status.

2. **Applicable verification gate (second):**

   **Technical work (specs/tasks with code):**
   - at least 2 positive scenario tests validating use cases the spec generates or is involved in;
   - at least 1 error/misuse scenario test (more is better) validating cases of incorrect or improper usage;
   - tests must run and pass before closing as Complete.

   **Non-technical work (specs/ADRs without code):**
   - at least 1 thesis: an argument or evidence that proves the spec/ADR is valid, based on use cases it generates or is involved in;
   - at least 1 antithesis: a case of incorrect or improper usage that is demonstrated to be false or inferior to the thesis (more is better);
   - the work cannot be marked Complete if any antithesis is not confuted.

3. **Governance check (third):** run `pom/skills/validate.md` to verify PROJECT_STATE, wiki, task status, decisions, and orphan artifacts.

### Who verifies

When the environment supports it (Claude Code sub-agents, Kiro hooks, multi-agent setups), the completion verification SHOULD be performed by a separate agent or a fresh context — not by the same agent that did the work. This avoids confirmation bias.

When a separate agent is not available, the working agent performs the verification but MUST re-read the relevant files from disk instead of relying on session memory.

### Exception handling

If verification is not possible, document the reason explicitly and close as "Complete with exceptions". Lint reports this as a warning. Silent omission of verification is not allowed.

## Test Convention

POM proposes this optional structure:

```text
tests/
  <analysis-or-workstream-or-module>/
    e2e/
    integration/
    fixtures/
    evidence/
  cross-system/
```

When tests or evidence validate a specific analysis/workstream, prefer the same namespace used by analysis and task plans.

Use it for E2E tests, integration tests, fixtures, and evidence when the project does not already have an established test convention. Unit tests may remain next to code if the framework expects that.

If an existing test structure differs, the agent must ask whether to adapt to the existing structure or introduce/adapt the POM proposal. Do not move existing tests without approval.
