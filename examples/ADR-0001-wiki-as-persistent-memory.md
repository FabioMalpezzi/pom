# ADR-0001 - Use Wiki As Persistent Project Memory

| Field | Value |
|---|---|
| Date | 2026-03-15 |
| Category | governance |
| Area | wiki |
| Summary | Adopt a persistent LLM-maintained wiki as the project's consolidated knowledge base to avoid rediscovering context from scratch every session |
| Replaces | none |
| Replaced by | none |
| Driver | stakeholder review |
| Scope | wiki / docs / analysis |

## Context

The team loses context between work sessions. Each new AI agent session rediscovers the same information from scratch. Meeting notes, Slack threads, and scattered documents make it hard to find the current state of any topic.

## Decision

Adopt a persistent wiki maintained by the LLM agent as the project's consolidated knowledge base. The wiki will contain current synthesis, not full history. Decision rationale stays in `decisions/`. Code behavior stays in code and tests.

## Rationale

A persistent wiki avoids the "rediscovery problem" where every session starts from zero. The LLM handles the maintenance burden (cross-references, consistency, updates) that causes humans to abandon wikis. The wiki becomes more valuable over time as knowledge compounds.

## Alternatives Considered

- **RAG over raw documents**: rejected because it rediscovers knowledge on every query without building cumulative synthesis.
- **Detailed README**: rejected because a single file cannot scale to dozens of topics with cross-references.
- **External wiki tool (Notion, Confluence)**: rejected because it adds a dependency and cannot be maintained by the LLM agent directly in the repository.

## Impacts

| Area | Impact |
|---|---|
| Wiki | create `wiki/index.md`, `wiki/log.md`, and initial pages |
| Docs | official docs will be derived from wiki synthesis when needed |
| Mockup | none |
| Analysis | bridge analyses feed the wiki but remain separate |
| Product | none |
| Technical | none |

## Links

- Wiki: `wiki/index.md`
- Analysis: none
- Mockup: none
- Docs: none

## Follow-up

- [x] Create wiki/index.md and wiki/log.md
- [x] Create first batch of wiki pages
- [ ] Review wiki after 2 weeks of use

## Evolution Rule

Fine-grained history lives in Git. If this decision changes substantially, create a new ADR that supersedes or replaces it instead of retroactively rewriting the decision.
