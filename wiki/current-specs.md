# Current POM Specs

## Summary

The current specs define the load-bearing shape of POM: its founding principles, modular agent instructions, skill discovery frontmatter, structured reconciliation, external project overlay mode, and the draft boundary for a web wiki agent extension.

## Current State

The specs are living documents, but they are not a diary. Minor changes are tracked with Git. Substantial requirement or structural-decision changes require explicit decision handling.

## Details

| Spec | Status | Current Meaning |
|---|---|---|
| `SPEC-0000-pom-founding-spec.md` | Accepted | Defines POM's purpose, pillars, requirements, structural decisions, and out-of-scope boundaries. |
| `SPEC-0001-modular-agents-template.md` | Complete | Keeps target-project agent instructions small by separating global posture from workflow-specific skills and active profile modules. |
| `SPEC-0002-skill-yaml-frontmatter.md` | Complete | Adds YAML frontmatter to skills for automatic discovery while preserving readable skill sections. |
| `SPEC-0003-structured-reconciliation.md` | Complete | Adds divergence classification and resolution flow for source-memory mismatches. |
| `SPEC-0004-external-project-overlay.md` | Draft | Defines overlay mode for repositories the operator does not own. |
| `SPEC-0005-web-wiki-agent-extension.md` | Draft | Defines the first boundary for a web wiki that extends an active coding agent session, produces reviewed proposals, and classifies whether notes belong in Open Discussion, specs, ADRs, task plans, or wiki synthesis. |
| `SPEC-0006-workflow-modeling.md` | Complete | Adds opt-in workflow modeling. The workflow YAML is the finite-state-machine source of authority; `templates/WORKFLOW_TEMPLATE.yaml` is an optional reference starting point, while `pom:workflow:lint` validates any target YAML that follows the schema. The capability includes four synchronous composition primitives (linear pipeline, state-invoke, event-invoke, context injection), validator rules, Mermaid generation, XState v5 mapping, TypeScript + Python implementation guidance, optional runtime seam templates for execution/persistence/timers/retry/tools/side effects, suspend/restore convention, and an integration guide. Ordinary workflow modeling is opt-in per target via `workflows.enabled`; Dynamic Workflow and loop/goal are separate opt-in profiles via `workflows.dynamic.enabled` and `workflows.loopGoal.enabled`. Four pillars remain: no async / no shared state / no inheritance / no runtime in POM. Dynamic Workflow support is control-plane doctrine: POM records the deterministic contract and target infrastructure owns the data plane; handle lifecycle checks E080-E089 validate `fan_out_launch.handle`, `await.handles`, explicit cancel/detach, and terminal states without implicit active handles. |
| `SPEC-0007-loop-guard-timeout.md` | Complete | Adds two bounded-time workflow primitives: `loop_guard` for loop-level visit/duration bounds and `timeout` for non-loop state residence. Validator rules E060-E073 and W060 are implemented and covered by integration tests; POM validates static shape and target projects own timers, counters, scheduling, and event emission. |
| `SPEC-0008-workflow-control-plane-verification.md` | Draft | Defines the next workflow validation increment: stronger static checks for joins, quorum, timeouts, and dead ends, followed by opt-in finite control-plane model checking. It explicitly limits the correctness claim to POM control-plane properties and excludes target runtime correctness, guard semantics, and business-domain truth. |

The wiki reader relates mainly to `SPEC-0000`, `SPEC-0004`, and `SPEC-0005`: it touches Operating Memory consultation, cognitive cost, reversibility, possible local-only wiki use, and agent-assisted proposal workflows. `SPEC-0005` keeps proposal promotion explicit: Open Discussion holds unresolved material, specs hold expected behavior, ADRs hold explicit decisions, task plans hold executable work, and wiki pages summarize consolidated knowledge. `ADR-0001` records the earlier direction toward a persistent connection to an active AI coding agent session; the promoted POM Project Reader is deliberately lighter and uses file-based annotations for agent handoff. If the reader or web wiki becomes more central, the specs must reconcile that choice explicitly and describe the authority of generated output clearly enough that HTML or UI state never competes with Markdown.

## Sources

| Source | Use |
|---|---|
| `specs/SPEC-0000-pom-founding-spec.md` | Foundational requirements and structural decisions. |
| `specs/SPEC-0001-modular-agents-template.md` | Profile-aware instruction assembly and cognitive load reduction. |
| `specs/SPEC-0002-skill-yaml-frontmatter.md` | Skill discovery structure. |
| `specs/SPEC-0003-structured-reconciliation.md` | Divergence classification and reconciliation loop. |
| `specs/SPEC-0004-external-project-overlay.md` | Local understanding wiki for external repositories. |
| `specs/SPEC-0005-web-wiki-agent-extension.md` | Web wiki as an active agent extension, proposal contract, and Codex-first adapter boundary. |
| `specs/SPEC-0006-workflow-modeling.md` | Workflow modeling capability: YAML FSM schema, composition primitives, validator rules, transformers, language profiles, optional runtime seam templates. |
| `specs/SPEC-0007-loop-guard-timeout.md` | Draft bounded-time primitive extension for workflow schema. |
| `specs/SPEC-0008-workflow-control-plane-verification.md` | Draft plan for stronger static workflow validation and finite control-plane model checking. |
| `decisions/ADR-0002-workflow-context-injection.md` | Closed decision behind the Result<Terminal, Output> model for parent/child data exchange in workflow composition (referenced by SPEC-0006). |
| `decisions/ADR-0004-dynamic-workflow-control-plane.md` | Closed decision accepting the Dynamic Workflow control-plane/data-plane doctrine as SPEC-0006 backlog. |

## Linked Decisions

| Decision | Impact |
|---|---|
| SPEC-0000 R9 | POM must grow gradually rather than imposing modules. |
| SPEC-0000 R12 | POM depends on Markdown and Git as the method baseline. |
| SPEC-0004 R3 | Overlay mode supports a local wiki for understanding a project. |
| SPEC-0005 R2 | Web wiki output and UI state stay derived; Markdown remains durable memory. |
| ADR-0001 | The web wiki must avoid repeated cold agent runs by using a persistent active coding agent session as the primary path. |
| ADR-0002 | Workflow composition uses injection + Result<Terminal, Output> for parent/child data exchange; shared context visibility between machines is rejected as a violation of FSM autonomy. |
| ADR-0004 | Dynamic Workflows are handled through a control-plane/data-plane split: POM records the deterministic workflow contract and target projects own concurrent execution. Handle lifecycle validation makes selective waits explicit: non-awaited handles remain active until awaited, cancelled, or detached. |
| SPEC-0006 four pillars | Workflow capability stays inside "no async / no shared state / no inheritance / no runtime in POM" — the diagonal that distinguishes it from a YAML dialect of XState. |

## Open Questions

| Question | Status |
|---|---|
| Should a future spec define wiki reader output as a supported generated artifact? | Open. |
| Should the founding spec mention generated consultation views explicitly? | Open; probably only if reader generation becomes more than optional tooling. |
| Should the first web wiki agent-extension prototype validate file + CLI before streaming session integration? | Resolved for this checkpoint: the lightweight POM Project Reader uses file-based annotations and CLI handoff. |
| Which interface should the first persistent adapter use? | Deferred. The promoted Project Reader avoids a direct AI-agent session and keeps annotations as files until a stronger integration is justified. |

## Related Links

- [[overview]]
- [[adoption-and-installation]]
- [[experiments-and-extension]]
