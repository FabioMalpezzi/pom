# Ticket Lifecycle

## Summary

Describes the end-to-end lifecycle of a support ticket from creation to resolution, including all intermediate states, transitions, and the actors involved at each stage.

## Current State

A ticket moves through 5 states: `new` → `triaged` → `assigned` → `in_progress` → `resolved`. Tickets can also be `closed` (by the customer or after 7 days of inactivity) or `reopened` (from `resolved` only, within 30 days).

Assignment is currently manual. AI-assisted triage is under evaluation (see ADR-0012).

## Details

### States

| State | Entry condition | Exit condition | Actor |
|---|---|---|---|
| new | customer submits ticket | agent triages | system |
| triaged | priority and category assigned | agent picks up | support agent |
| assigned | agent accepts ticket | agent starts work | support agent |
| in_progress | agent begins investigation | agent proposes resolution | support agent |
| resolved | customer confirms or 7-day timeout | ticket closes or reopens | customer / system |
| closed | resolution confirmed or timeout | terminal state | system |
| reopened | customer reopens within 30 days | returns to triaged | customer |

### SLA Rules

- Priority 1 (critical): first response within 1 hour, resolution within 4 hours
- Priority 2 (high): first response within 4 hours, resolution within 24 hours
- Priority 3 (normal): first response within 8 hours, resolution within 72 hours
- SLA clock pauses when ticket is in `resolved` state waiting for customer confirmation

### Escalation

If SLA is breached, the ticket is escalated to the team lead. A second breach escalates to the department manager. Escalation is logged but does not change the ticket state.

## Sources

| Source | Use |
|---|---|
| `specs/ticketing-v1.md` | original requirements |
| `decisions/ADR-0005-sla-model.md` | SLA timing decision |
| `decisions/ADR-0012-ai-triage-mode.md` | pending: AI triage approach |
| `mockups/packages/ticketing-v1/` | UI flow reference |

## Linked Decisions

| Decision | Impact |
|---|---|
| ADR-0005 | defines SLA thresholds and escalation rules |
| ADR-0012 | may change triage from manual to AI-assisted |

## Open Questions

| Question | Status |
|---|---|
| Should reopened tickets reset the SLA clock? | under discussion |
| Should AI triage auto-assign or only suggest? | waiting for ADR-0012 |

## Related Links

- [[ticket-entity]]
- [[sla-rules]]
- [[support-agent-workflow]]
- [[ai-triage-design]]
