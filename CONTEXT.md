# POM Domain Context

This glossary defines the domain language for POM itself. It keeps discussion of the method precise when changing prompts, templates, scripts, specs, and governed documents.

## Language

**POM**:
A reusable method for preserving a project's operating memory across people, agents, and sessions.
_Avoid_: project manager, runtime framework, agent

**Operating Memory**:
The minimum reliable context needed to understand where a project is, why it is there, and what the next safe step is.
_Avoid_: project history, documentation archive, backlog

**Memory Element**:
A durable artifact that carries part of the project's operating memory.
_Avoid_: asset, file, note

**Persistent Wiki**:
A maintained synthesis of reusable project knowledge that compounds across sources and sessions.
_Avoid_: RAG index, scratch notes, document dump

**Decision Record**:
A durable record of a consequential choice and its rationale.
_Avoid_: changelog, meeting note, preference

**Project State**:
The short restart artifact that explains the current project position and next safe actions.
_Avoid_: status report, session log, timeline

**Current Plan**:
The short-term operating focus that turns active intent into ordered work.
_Avoid_: roadmap, backlog, sprint board

**Task Plan**:
A verifiable breakdown of work into objectives, steps, scenarios, and done criteria.
_Avoid_: checklist, ticket list, implementation notes

**Adoption Profile**:
The selected level of POM usage that determines which memory modules are active for a project.
_Avoid_: preset, installation mode, feature bundle

**Governed Document**:
A document whose shape, status, and closure rules are controlled by POM.
_Avoid_: markdown file, doc, artifact

**Source Authority**:
The rule that each kind of project question has the source best qualified to answer it.
_Avoid_: single source of truth

**Divergence**:
A meaningful mismatch between two sources that should agree or be reconciled.
_Avoid_: drift, inconsistency, stale note

**Completion Verification Gate**:
The mandatory closure check proving that a spec, task, or decision has actually met its goal.
_Avoid_: final review, QA pass, acceptance checklist

**Goal-Backward Check**:
The first verification step that states what must be true for the declared goal to be satisfied.
_Avoid_: task completion check, checkbox review

**Scenario Test**:
A technical verification based on real user use cases, including positive and misuse paths.
_Avoid_: unit test, smoke test, implementation test

**Semantic Validation**:
A non-code verification that proves a document's validity through thesis and confuted antithesis.
_Avoid_: prose review, subjective review, sign-off

**Target Project**:
A project that installs or applies POM to maintain its own operating memory.
_Avoid_: downstream repo, consumer repo, client project

**POM Source**:
The reusable POM repository containing the method, prompts, templates, skills, scripts, and examples.
_Avoid_: upstream codebase, framework code

## Relationships

- **POM** maintains **Operating Memory** through one or more **Memory Elements**.
- A **Memory Element** can be a **Persistent Wiki**, **Decision Record**, **Project State**, **Current Plan**, or **Task Plan**.
- An **Adoption Profile** determines which **Memory Elements** are active in a **Target Project**.
- A **Governed Document** must satisfy the **Completion Verification Gate** before it is closed.
- The **Completion Verification Gate** starts with a **Goal-Backward Check**.
- Technical work uses **Scenario Tests**; non-code work uses **Semantic Validation**.
- **Source Authority** decides which source resolves a question; **Divergence** records when sources disagree.
- **POM Source** supplies reusable rules, while each **Target Project** owns its memory products.

## Example Dialogue

> **Dev:** "Should this new rule go into every target project by default?"
> **Domain expert:** "Only if it protects Operating Memory for all Target Projects. If it is local, encode it as project config, not as a POM Source rule."
>
> **Dev:** "Can we mark this Task Plan complete because every step is checked?"
> **Domain expert:** "No. It must pass the Completion Verification Gate: first the Goal-Backward Check, then Scenario Tests or Semantic Validation."

## Flagged Ambiguities

- "source of truth" suggests one universal authority; resolved: use **Source Authority**, because POM assigns authority by question type.
- "status" can mean **Project State**, document status, or issue state; resolved: use the specific term for the artifact being discussed.
- "task" can mean any work item; resolved: use **Task Plan** when referring to POM-governed work and "issue" only for external issue trackers.
- "project memory" was used broadly; resolved: use **Operating Memory** for the restart-critical context and **Memory Element** for durable artifacts that carry it.
