# Spec — POM, Project Operating Memory

| Field | Value |
|---|---|
| Date | 2026-05-02 |
| Status | Draft |
| Area | governance |
| Summary | Founding spec: declares what POM is, why it exists, and which requirements all other specs, decisions, and prompts must respect |

## Role Of This Document

This is the founding spec of POM: it declares what the project is, why it exists, and which requirements every other spec, decision, prompt, and workflow must respect. It is not an operational spec: it does not describe a feature to build, but the frame within which every feature must justify itself.

Minor changes are tracked with Git. Changes that alter a requirement or a structural decision herein require an explicit ADR (Architecture Decision Record).

## Purpose

In short: POM is a lightweight method for giving a project a persistent operating memory. It helps humans and AI agents resume work without reconstructing context from scratch.

POM — Project Operating Memory — keeps a project's operating memory alive: consolidated knowledge, decisions taken, current state, and active plan, so that anyone (human or agent) can sit in front of the project and know what is known, what has been decided, what is being done, what to do next, and what not to do without a new decision.

Operating memory means the minimum reliable context required to understand where the project is, why it is there, and what the next safe step is.

The organization that POM builds around memory — workflows, templates, lint (automated structural checks), verification, and skills — is not the goal. It is the means. It exists only to serve the memory. If a component does not help the memory stay ordered, current, and reliable, it does not belong.

## Context

Agents based on language models have volatile memory: they rediscover the project from scratch every session. People also have limited and partial memory: they forget the rationale behind a choice, lose threads between pauses, reconstruct state by reading commits and chat. The project, as a living object, fragments across repositories, conversations, mockups, documents, and human minds.

POM exists to close this fracture. It does not replace code, does not manage sprints, does not deploy. It holds the project's memory together so that the next step — whoever takes it — starts from solid ground.

Sources feeding this spec:

- README.md — method overview;
- WIKI_METHOD.md — reference to Andrej Karpathy's LLM Wiki pattern that inspired the persistent wiki;
- AGENTS.MD — operating instructions for the POM repository;
- SPEC-0001-modular-agents-template.md — first operational spec, highlights pressure on cognitive cost;
- usage experience accumulated during early repository usage, including commit 937cb17, which introduced the mandatory completion verification gate.

## Structural Principle

POM is articulated on three pillars, in this priority order:

1. **Memory** — what POM maintains.
2. **Verification** — what makes the memory reliable.
3. **Organization** — how POM keeps everything in order.

The first two define the object and its quality. The third is instrumental: it serves the first two.

## Requirements

### Requirement Zero

| ID | Requirement | Priority | Source |
|---|---|---|---|
| R0 | The project never loses its operating context: memory survives pauses, session changes, agent changes, and people changes | High | Founding promise |

### A. Memory — What POM Maintains

POM supports four forms of memory. Which are actually active in a given project is chosen by the adoption profile (the selected level of POM usage for a project): the minimal profile may limit itself to R3, richer profiles activate R1, R2, and R4.

| ID | Requirement | Priority | Source |
|---|---|---|---|
| R1 | POM must be able to maintain the project's consolidated and cumulative knowledge as a persistent wiki, not as a volatile index | High | WIKI_METHOD.md |
| R2 | POM must be able to maintain the history of decisions and their rationale as ADRs, distinct from specs and code | High | README, "ADR And Spec Changes" |
| R3 | POM must be able to maintain the current state and restart point in a single artifact (PROJECT_STATE.md, target ≤220 lines) readable in a few minutes | High | README, "POM Minimal" |
| R4 | POM must be able to maintain the active work plan (current plan, verifiable tasks) as short-term operating memory | Medium | CURRENT_PLAN_TEMPLATE.md, TASK_PLAN_TEMPLATE.md |

### B. Verification — What Makes The Memory Reliable

| ID | Requirement | Priority | Source |
|---|---|---|---|
| R5 | Every memory element that closes work — spec, task, ADR — must pass the completion verification gate (the mandatory check before closing a work item). The gate always starts with goal-backward verification. If there is code, it requires positive and negative tests. If there is no code, it requires a thesis and a confuted antithesis. | High | commit 937cb17, prompts/06 |
| R6 | The memory must be alive, not a museum: POM includes explicit workflows to reconcile contradictions, flag stale content, and identify orphan pages | High | WIKI_METHOD.md, prompts/11, prompts/14 |
| R7 | Verification must be automatic and mandatory: the agent executes it at the moment of closure without asking; explicit exceptions ("Complete with exceptions") are allowed only when motivated | High | README, "Completion Verification Rules" |

### C. Organization — How POM Keeps Everything In Order

| ID | Requirement | Priority | Source |
|---|---|---|---|
| R8 | Authority by domain: each type of question has its authoritative source (code and tests for what it does, wiki for what we know, decisions for why, mockups for what it shows, PROJECT_STATE for where to restart); divergences between sources must be surfaced and resolved, not hidden | High | README, "Principle" |
| R9 | Gradual adoption: start from the minimum useful and grow only when needed; POM does not impose modules the project does not use | High | README, "POM Minimal" |
| R10 | Minimum cognitive cost: the overhead to be productive must stay low; every component that weighs on the agent's context or the user's mind must justify itself against R0–R7 | High | SPEC-0001 |
| R11 | The agent operates, the human decides: the agent does the heavy lifting (synthesis, lint, verification, template application); the human approves directional decisions (ADRs, substantial specs, closures) | Medium | prompts/06, prompts/18 |
| R12 | Agent-agnostic method: POM as a method depends only on Markdown and Git, and works with any agent that reads Markdown. POM tooling (installer, lint) may have additional runtime dependencies, which must remain optional for the method itself to be applicable | High | README, "Installation Model" |
| R13 | Reversible: POM lives in pom/; the products of memory (wiki, decisions, PROJECT_STATE, tasks) belong to the project and survive POM's removal | High | README, "Installation" |
| R14 | Extensible by smallest necessary level: adaptations are made at the lowest level that fits the need (pom.config.json → templates/ → prompts/ → skills/ → lint), without forcing changes at higher levels | Medium | README, "Extending POM" |

## Structural Decisions

These are the design choices through which POM realizes the requirements above. Each is a candidate to become an autonomous ADR if contested or replaced.

| ID | Decision | Realizes |
|---|---|---|
| D1 | Template as form, lint as enforcement: templates are the normative source for governed document structure; they are a starting point, not a constraint — projects can adapt, extend, or translate them by placing customized versions outside pom/ and mapping them in pom.config.json; lint reads required sections from the configured templates, so translated templates work automatically | R5, R6, R10 |
| D2 | Extensibility by levels: every adaptation chooses the smallest possible level — pom.config.json → templates/ → prompts/ → skills/ → lint script | R9, R10, R14 |
| D3 | Agent-agnostic injection: POM updates every existing agent instruction file in the project (AGENTS.md, CLAUDE.md, GEMINI.md, Cursor/Windsurf/Copilot rules, etc.) and does not create tool-specific folders unless already present | R0, R10, R12 |
| D4 | Reversible separation: POM lives in pom/; memory products live outside pom/ and belong to the project | R0, R10, R13 |
| D5 | Bilingual by design: POM's own files (templates, prompts, skills, scripts, specs) are in English for portability; project-generated documents (wiki, ADRs, specs, tasks, state, conversation) use the project/user language; templates can be customized in any language by placing them outside pom/ and mapping them in pom.config.json | R9, R10 |
| D6 | Modular adoption guided by profile: minimal, wiki, decisions, full, adopt, refresh, custom — the profile determines which memory modules are active and which instruction sections are injected | R9, R10 |
| D7 | Delegated history: POM relies on Git for fine-grained chronology; specs, ADRs, wiki, and state hold synthesis only, not changelogs | R10 |

## Out Of Scope

POM is not and will not become:

- a project management system (sprints, boards, assignments, deadlines);
- a code generator or feature scaffolding tool;
- a deploy, CI/CD, or release management platform;
- a substitute for Git as code history;
- an agent: POM is a method that agents apply, not an agent itself;
- a runtime library: POM is composed of prompts, templates, and support scripts, not software components the project imports.

## Impacts

| Area | Impact |
|---|---|
| Wiki | This spec is the source of legitimacy for persistent wiki rules |
| Decisions | Structural decisions D1–D7 should each receive an ADR over time |
| Documentation | README.md remains the narrative entry point; this spec remains the normative reference |
| Mockup | None |
| Code | scripts/install-pom.ts, pom/scripts/ and lint files must be coherent with R5–R7 and D1–D2 |

## Linked Tasks

None: this spec is founding, it does not generate implementation tasks directly. Operational specs such as SPEC-0001-modular-agents-template.md descend from here.

## Completion Verification

This spec has no code implementation: verification is done with thesis and antithesis.

### Step 0 — Goal-backward (always first)

What must be TRUE for the purpose of this spec to be met?

- Truth 1: the three pillars (memory, verification, organization) are distinguishable and no requirement belongs to more than one without justification.
- Truth 2: every operating rule in README.md and AGENTS.MD is either traceable to a requirement or structural decision in this spec, or is an implementation detail not raised to constitutional level.
- Truth 3: every structural decision D1–D7 is traceable to one or more requirements R0–R14.
- Truth 4: the minimal profile remains valid under this spec — it is not forced to implement R1, R2, R4 — because memory requirements are modulated by the adoption profile (R9, D6).

For each truth, existence is verified against README.md, templates/, prompts/, skills/, scripts/install-pom.ts, and templates/POM_CONFIG_TEMPLATE.json.

If any truth does not hold, the spec cannot be accepted.

### Theses (at least one, prove validity)

- Thesis 1 — The three-pillar structure prevents scope drift. When someone proposes adding function X to POM, the test is: "Does X serve to maintain, verify, or organize memory?" If no, X is out of scope. Observed case: SPEC-0001 was accepted because it serves R10 (minimum cognitive cost); a hypothetical "POM runs tests" would be rejected because it competes with the project's code and tests, not its memory.

- Thesis 2 — The completion verification gate (R5) is what separates POM from any wiki. A wiki accumulates. POM verifies at closure. Without R5, memory can grow but cannot be trusted; with R5, every element that closes work carries proof of its own validity. Use case: closing SPEC-0001 must demonstrate that the minimal profile actually produces an AGENTS section ≤200 lines — the gate forces this proof before marking Complete.

- Thesis 3 — The adoption profile (D6) makes R1–R4 compatible with R9. Without the profile, R1–R4 would seem to require wiki, ADR, PROJECT_STATE, and CURRENT_PLAN in every project, contradicting gradual adoption. With the profile, R1–R4 become available capabilities, not universal obligations. Use case: a small new project starts with minimal (only PROJECT_STATE.md), a mature project moves to full when needed.

- Thesis 4 — R6 (alive, not museum) prevents memory decay. Without explicit workflows for reconciliation, stale detection, and orphan identification, the wiki degenerates into a static archive after N sessions because no one reconciles contradictions introduced by new code, decisions, or sources. The stale-wiki and lint-wiki prompts (prompts/11-review-stale-wiki.md, prompts/14-lint-wiki.md) exist specifically to serve R6.

### Antitheses (at least one, to confute)

- Antithesis 1 — "POM should also manage tasks as a project management system, because tasks are operating memory." Confutation: tasks as active plan (R4) are memory; tasks as execution units, assignments, and deadline tracking are project management. POM stops at plan memory and closure verification (R5), not at people planning or time monitoring. Extending POM to that territory would violate R10 (cognitive cost) and collide with specialized tools (Linear, Jira, GitHub Projects), which remain out of scope.

- Antithesis 2 — "The agent should be able to close work without verification when the user is in a hurry." Confutation: R5 and R7 say the opposite, and the exception is already provided in controlled form ("Complete with exceptions" with explicit motivation). Skipping verification for speed means accepting that memory contains unverified claims, making R0 falsifiable at the next session. The cost of verification is the price of trust in memory; removing it demolishes pillar B.

- Antithesis 3 — "POM should impose a canonical folder structure even on existing projects, for uniformity." Confutation: this would violate R9 (gradual adoption) and D4 (reversibility). Existing projects have structures born from their context; forcing migration is an upfront cost that blocks adoption and adds no memory. POM maps the existing structure in pom.config.json (see prompts/02-adopt-existing-project.md) and proposes migrations as explicit decisions, not prerequisites. Real use case: a project with ADRs under doc/architecture/ADR-###-*.md stays there and POM configures itself to read that pattern.

### Exception

Exception reason: none.

## Sources And Decisions

- Source: README.md (version 0.1.0).
- Source: AGENTS.MD of the POM repository.
- Source: WIKI_METHOD.md and Andrej Karpathy's original LLM Wiki pattern gist.
- Source: SPEC-0001-modular-agents-template.md.
- Source: commit 937cb17 (introduction of the mandatory completion verification gate).
- ADR: none yet; structural decisions D1–D7 are candidates to become ADR-0001…ADR-0007 over time.

## Evolution Rule

This spec is alive. Minor changes (clarifications, examples, reformulations) are tracked with Git. Changes that:

- add, remove, or reformulate a requirement R0–R14,
- add, remove, or reformulate a structural decision D1–D7,
- move something from "Out of Scope" to "in scope" or vice versa,

require an explicit ADR that motivates the change and cites this spec as the modified document.
