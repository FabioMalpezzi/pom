# Operating Memory

## Summary

Operating Memory is the reliable context needed to know where a project is, why it is there, and what the next safe step is. POM keeps that context in durable Memory Elements.

## Current State

The POM glossary defines the core terms used by prompts, templates, specs, and code comments. This matters because the method is only useful when its documents name the same things consistently: a Project State is not a status report, a Persistent Wiki is not a document dump, and a Decision Record is not a changelog.

The central Memory Elements are:

- Persistent Wiki.
- Decision Record.
- Project State.
- Current Plan.
- Task Plan.

## Details

POM does not use one universal source of truth. It uses Source Authority by domain, because different questions deserve different evidence:

| Question | Authoritative Source |
|---|---|
| What does the system currently do? | code and tests, when present |
| What do we currently know about the project? | `wiki/` |
| Why did we decide this? | `decisions/` |
| What analysis supports or challenges a choice? | `analysis/` |
| What does the intended experience show? | `mockups/`, when present |
| What can be shared as official documentation? | `docs/`, when present |
| Where do I restart after a pause? | `PROJECT_STATE.md` or current plan |

When authoritative sources diverge, POM surfaces and resolves the Divergence. The reconciliation workflow classifies divergence as obsolescence, contradiction, expiry, or gap before proposing a resolution.

Operating Memory is intentionally narrower than project history. Git keeps fine-grained history; POM keeps the current synthesis, live decisions, and restart-critical context close enough to act on.

## Sources

| Source | Use |
|---|---|
| `CONTEXT.md` | Definitions of POM, Operating Memory, Memory Element, Persistent Wiki, Decision Record, Project State, Current Plan, Task Plan, Source Authority, and Divergence. |
| `README.md` | Source Authority table, documentation discipline, and Git/history rules. |
| `specs/SPEC-0000-pom-founding-spec.md` | Requirement R0 and memory requirements R1-R4. |
| `specs/SPEC-0003-structured-reconciliation.md` | Divergence classification and resolution workflow. |

## Linked Decisions

| Decision | Impact |
|---|---|
| SPEC-0000 R0 | POM must preserve operating context across pauses, sessions, agents, and people. |
| SPEC-0000 R8 | Each question has a source best qualified to answer it. |

## Open Questions

| Question | Status |
|---|---|
| Which Memory Elements should POM itself enable as stable repository artifacts? | Open; the repository currently has specs and docs, but no stable root `wiki/`. |

## Related Links

- [[overview]]
- [[wiki-method]]
- [[templates-and-governance]]
