# Current POM Specs

## Summary

The current specs define the load-bearing shape of POM: its founding principles, modular agent instructions, skill discovery frontmatter, structured reconciliation, external project overlay mode, and the draft boundary for a web wiki agent extension.

## Current State

The specs are living documents, but they are not a diary. Minor changes are tracked with Git. Substantial requirement or structural-decision changes require explicit decision handling.

## Details

| Spec | Status | Current Meaning |
|---|---|---|
| `SPEC-0000-pom-founding-spec.md` | Draft | Defines POM's purpose, pillars, requirements, structural decisions, and out-of-scope boundaries. |
| `SPEC-0001-modular-agents-template.md` | Complete | Splits the agent instruction template into profile-aware modules to reduce cognitive load. |
| `SPEC-0002-skill-yaml-frontmatter.md` | Complete | Adds YAML frontmatter to skills for automatic discovery while preserving readable skill sections. |
| `SPEC-0003-structured-reconciliation.md` | Complete | Adds divergence classification and resolution flow for source-memory mismatches. |
| `SPEC-0004-external-project-overlay.md` | Draft | Defines overlay mode for repositories the operator does not own. |
| `SPEC-0005-web-wiki-agent-extension.md` | Draft | Defines the first boundary for a web wiki that extends an active coding agent session, produces reviewed proposals, and classifies whether notes belong in Open Discussion, specs, ADRs, task plans, or wiki synthesis. |

The wiki reader relates mainly to `SPEC-0000`, `SPEC-0004`, and `SPEC-0005`: it touches Operating Memory consultation, cognitive cost, reversibility, possible local-only wiki use, and agent-assisted proposal workflows. `SPEC-0005` now keeps proposal promotion explicit: Open Discussion holds unresolved material, specs hold expected behavior, ADRs hold explicit decisions, task plans hold executable work, and wiki pages summarize consolidated knowledge. If the reader or web wiki becomes more central, the specs must describe the authority of generated output clearly enough that HTML or UI state never competes with Markdown.

## Sources

| Source | Use |
|---|---|
| `specs/SPEC-0000-pom-founding-spec.md` | Foundational requirements and structural decisions. |
| `specs/SPEC-0001-modular-agents-template.md` | Profile-aware instruction assembly and cognitive load reduction. |
| `specs/SPEC-0002-skill-yaml-frontmatter.md` | Skill discovery structure. |
| `specs/SPEC-0003-structured-reconciliation.md` | Divergence classification and reconciliation loop. |
| `specs/SPEC-0004-external-project-overlay.md` | Local understanding wiki for external repositories. |
| `specs/SPEC-0005-web-wiki-agent-extension.md` | Web wiki as an active agent extension, proposal contract, and Codex-first adapter boundary. |

## Linked Decisions

| Decision | Impact |
|---|---|
| SPEC-0000 R9 | POM must grow gradually rather than imposing modules. |
| SPEC-0000 R12 | POM depends on Markdown and Git as the method baseline. |
| SPEC-0004 R3 | Overlay mode supports a local wiki for understanding a project. |
| SPEC-0005 R2 | Web wiki output and UI state stay derived; Markdown remains durable memory. |

## Open Questions

| Question | Status |
|---|---|
| Should a future spec define wiki reader output as a supported generated artifact? | Open. |
| Should the founding spec mention generated consultation views explicitly? | Open; probably only if reader generation becomes more than optional tooling. |
| Should the first web wiki agent-extension prototype validate file + CLI before streaming session integration? | Resolved for this checkpoint: the file/event baseline was validated manually with the active Codex session. |
| Which Codex interface should the first adapter use for a persistent active session? | Open; must be verified before implementation. |

## Related Links

- [[overview]]
- [[adoption-and-installation]]
- [[experiments-and-extension]]
