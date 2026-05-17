# POM Overview

## Summary

POM, Project Operating Memory, preserves restart-critical project context across people, agents, and interrupted sessions. It keeps that context in Markdown.

This page summarizes the method for the root POM wiki and the generated reader view, while keeping Markdown as the canonical source.

## Current State

POM is a method, not an agent, runtime library, project manager, deployment tool, or replacement for Git. Its repository contains reusable prompts, skills, templates, scripts, specs, examples, and readable HTML guides.

The canonical entry point is `README.md`. The domain language is defined in `CONTEXT.md`. The cited conceptual origin for the wiki model is `WIKI_METHOD.md`, which keeps a reference copy of Andrej Karpathy's LLM Wiki pattern.

## Details

The method is organized around three pillars from the founding spec:

- Memory: what POM maintains.
- Verification: what makes the memory reliable.
- Organization: how POM keeps the memory ordered.

Memory preserves context. Verification makes that context reliable. Organization keeps it findable, so the next reader or agent does not have to rediscover the project from scratch.

POM should start small. The README describes gradual adoption through profiles such as `minimal`, `wiki`, `decisions`, `full`, `adopt`, `refresh`, and `custom`. The same method can be applied to owned repositories, team repositories, or external repositories in overlay mode.

The current repository already contains reader-oriented guides under `docs/`, but those guides are explanatory. Operational rules remain in `README.md`, `AGENTS.MD`, `prompts/`, `skills/`, and `templates/`.

## Sources

| Source | Use |
|---|---|
| `README.md` | Canonical overview, installation model, wiki rules, skills, templates, and extension levels. |
| `CONTEXT.md` | Domain glossary for POM terms. |
| `specs/SPEC-0000-pom-founding-spec.md` | Foundational requirements and structural decisions. |
| `WIKI_METHOD.md` | Reference copy of the LLM Wiki pattern. |

## Linked Decisions

| Decision | Impact |
|---|---|
| SPEC-0000 structural decisions D1-D7 | Defines templates, extensibility levels, agent-agnostic installation, reversibility, bilingual policy, adoption profiles, and delegated history. |

## Open Questions

| Question | Status |
|---|---|
| Should target projects generate reader HTML by default or only on demand? | Open; default generation could add method weight. |

## Related Links

- [[operating-memory]]
- [[wiki-method]]
- [[adoption-and-installation]]
