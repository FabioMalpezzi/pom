# Mock Manifest - Mock Title

## Type

Complete / Partial

## Date

YYYY-MM-DD

## Origin

Provider, tool, person, or process that generated the mock.

## Scope

Describe what the mock covers.

For a complete mock: indicate which platform macro-areas are included.

For a partial mock: indicate specific screens, modules, or flows.

## Replaces

Indicate whether it:

- replaces a previous complete version, for example `mockups/packages/project-full-YYYY-MM/`;
- supplements the current mock;
- replaces only some screens;
- is an alternative proposal to validate.

## Included Files

List the main files included in the mock.

Example:

- `src/TicketQueue.jsx`
- `src/TicketDetail.jsx`
- `screenshots/ticket-queue.png`

## Impacted Screens

List impacted wiki screens or new screens to create.

Example:

- `wiki/screens/02-ticket-queue.md`
- `wiki/screens/03-ticket-detail.md`
- `wiki/screens/21-triage-batch.md`

## Impacted Processes

List involved wiki processes.

Example:

- `wiki/processes/ticket-lifecycle.md`
- `wiki/processes/sla-management.md`

## Impacted Entities And Controls

List involved entities, controls, or policies.

Example:

- `wiki/entities/ticket.md`
- `wiki/controls/sla-rules.md`
- `wiki/controls/ai-guardrails.md`

## Required Decisions

List decisions that must be made before updating wiki or docs.

Example:

- confirm whether the new ticket routing replaces the current model;
- decide whether AI triage remains assistive or becomes automatic with approval;
- validate whether the new queues are global or per tenant.

## Reconciliation Notes

Indicate what must be compared with wiki, analysis, decisions, and docs.

Example:

- compare with `analysis/01-functional/TICKETING_INTEGRATIONS_AND_COMPLETENESS.md`;
- verify consistency with `analysis/02-ai/AI_CONFIGURABILITY_BY_MODULE.md`;
- create ADR if the ticket assignment model changes.
