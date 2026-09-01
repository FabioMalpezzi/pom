# ADR-0001 - Use Wiki As Persistent Project Memory

| Field | Value |
|---|---|
| Date | 2026-03-15 |
| Status | Accepted |
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

Adopt a persistent wiki maintained by the LLM agent as the project's consolidated knowledge base. The wiki will contain current synthesis, not full history. Decision rationale stays in the configured decisions root. Code behavior stays in code and tests.

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

## Completion Verification

This ADR cannot be marked Accepted without passing semantic validation. Verification is mandatory and automatic.

### Step 0 — Goal-backward check

- [x] What must be TRUE for this decision to be valid?
  - A new session can answer "what is the current state of topic X" from the wiki without re-reading the raw sources.
  - The wiki holds synthesis only; decisions and code behavior stay in their authoritative homes.
- [x] For each truth, does supporting evidence or reasoning EXIST?
  - `wiki/index.md` links every page; `wiki/processes/ticket-lifecycle.md` summarizes the lifecycle and links `decisions/ADR-0005-sla-model.md` instead of restating it.
  - `npm run pom:lint` reports zero broken wiki links and zero unreferenced pages.

### Thesis

- Thesis 1: Resuming work on the ticket lifecycle now starts from one wiki page that names the states, the SLA rules, and the open questions, instead of from a search across meeting notes and Slack. The first session after adoption answered the "why does the SLA clock pause on resolved?" question from the wiki alone.

### Antithesis

| Antithesis | Confutation |
|---|---|
| The wiki will rot like every previous wiki did. | Previous wikis rotted because humans had to maintain cross-references and consistency. Here the agent updates the affected pages in the same session that changes the source, and the lint flags broken links and unreferenced pages. |
| A good README is enough for a project this size. | The project already has more than twenty topics with cross-references (entities, processes, SLA rules, integrations); a single README cannot hold them without becoming the scattered document it was meant to replace. |

### Exception

Exception reason: _none_

## Evolution Rule

Fine-grained history lives in Git. If this decision changes substantially, create a new ADR that supersedes or replaces it instead of retroactively rewriting the decision.
