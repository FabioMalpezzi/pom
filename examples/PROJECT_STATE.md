# Project State

## Last Updated

2026-04-20

---

## Static Context

_Stable facts about the project. Update only when the project's direction, stack, or permanent constraints change._

### Project Purpose

A ticketing platform for support teams: ticket intake, triage, assignment, SLA tracking, and an AI-assisted triage module under design.

### Key Constraints And Decisions

- SLA thresholds and escalation rules are fixed by `decisions/ADR-0005-sla-model.md`.
- AI triage mode (assistive vs. automatic with approval) is decided in `decisions/ADR-0012-ai-triage-mode.md`, pending stakeholder review.
- Test layout is governed by `pom.config.json`; restructuring tests requires updating it first.

### Files To Always Read When Resuming

- `README.md`
- `AGENTS.md`
- `PROJECT_STATE.md` (this file)
- `decisions/ADR-0012-ai-triage-mode.md`
- `wiki/processes/ticket-lifecycle.md`
- `docs/delivery/CURRENT_PLAN.md`

### Do Not Do Without Decision

- Do not implement AI triage before ADR-0012 is approved.
- Do not add multi-tenant isolation without a new ADR.
- Do not restructure tests without updating `pom.config.json`.

---

## Dynamic Context

_Current operational state. Update at every significant session or when priorities, risks, or next actions change. If this section grows beyond the maxLines limit, compact it: remove completed actions, archive closed decisions to the configured decisions root or `wiki/log.md`, delete resolved risks. Do not let this section become a log._

### Current State

The ticketing platform MVP is feature-complete. Authentication, ticket CRUD, assignment, and SLA tracking are implemented and tested. The wiki covers all core entities and processes. Documentation lint passes with zero errors. The AI triage module is in design phase: spec written, ADR pending stakeholder review.

### Current Objective

Complete the AI triage design review and begin implementation if approved.

### Priorities

| Priority | Activity | Status | Dependencies |
|---|---|---|---|
| High | AI triage ADR review | waiting for stakeholder | ADR-0012 |
| High | SLA escalation edge cases | in progress | TASK-0045 |
| Medium | Performance baseline | not started | needs test fixtures |
| Low | Admin dashboard mockup | blocked | waiting for design |

### Next Actions

- [ ] Follow up on ADR-0012 stakeholder review
- [ ] Complete SLA escalation edge case tests (TASK-0045)
- [ ] Create performance test fixtures

### Open Decisions

- AI triage: assistive vs. automatic with approval (ADR-0012)
- Whether to add multi-tenant isolation in v1 or defer to v2

### Blockers / Risks

- Stakeholder availability for ADR-0012 review (2 weeks overdue)
- Performance baseline blocked until test fixtures exist
