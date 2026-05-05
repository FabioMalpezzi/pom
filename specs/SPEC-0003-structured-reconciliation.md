# Spec - Structured Memory Reconciliation Workflow

| Field | Value |
|---|---|
| Date | 2026-05-05 |
| Status | Complete |
| Area | governance |
| Summary | Add a structured reconciliation workflow that classifies divergences between sources and memory, proposes resolutions, and closes the loop — going beyond stale detection to active resolution |

## Purpose

When a source changes (code, ADR, spec, mockup, analysis), the project memory that cites it may become obsolete, contradictory, or incomplete. POM already detects stale wiki candidates (prompt 11), but stops there: it signals the problem and waits. It does not classify the type of divergence, propose a resolution path, or verify that the loop is closed.

This spec adds a structured reconciliation workflow that:
1. classifies each divergence by type (obsolescence, contradiction, expiry, gap);
2. proposes the appropriate resolution for each type;
3. executes the resolution with approval;
4. verifies that no other memory has the same problem with the same source.

## Context

POM's memory principle (R8 in SPEC-0000) states: "divergences between sources must be surfaced and resolved, not hidden." The current `stale` workflow surfaces divergences. This spec adds the resolution half.

The reconciliation workflow is distinct from the stale workflow:
- `stale` (prompt 11): starts from `git status`, finds wiki pages that cite changed files, proposes updates.
- `reconcile` (prompt 19, this spec): starts from a known divergence or contradiction, classifies it, proposes the right resolution type (wiki update, ADR, archival, or gap note), and closes the loop.

Sources:

- `pom/prompts/11-review-stale-wiki.md` — existing stale detection
- `pom/templates/RECONCILIATION_TEMPLATE.md` — existing reconciliation document shape
- `pom/specs/SPEC-0000-pom-founding-spec.md` — R6 (memory alive, not museum), R8 (authority by domain)

## Requirements

| ID | Requirement | Priority | Source |
|---|---|---|---|
| R1 | The workflow must classify each divergence by type before proposing a resolution | High | SPEC-0000 R6 |
| R2 | Divergence types: obsolescence (source updated, memory outdated), contradiction (two authoritative sources disagree), expiry (fact no longer relevant), gap (expected knowledge missing) | High | Analysis |
| R3 | Each divergence type must have a defined resolution path | High | Analysis |
| R4 | The workflow must verify that no other memory has the same problem with the same source after resolution | Medium | Loop closure |
| R5 | Resolutions that require a structural decision must produce an ADR | High | SPEC-0000 R2 |
| R6 | The workflow must not modify memory without explicit approval | High | POM principle |
| R7 | The RECONCILIATION_TEMPLATE.md must include the divergence type and proposed resolution | Medium | D1 (template as form) |

## Proposed Design

### Divergence types and resolution paths

| Type | Definition | Resolution |
|---|---|---|
| Obsolescence | Source changed, memory cites the old version | Update the wiki page to reflect the current source |
| Contradiction | Two authoritative sources disagree on the same fact | Create an ADR that resolves the contradiction; update wiki after decision |
| Expiry | A fact was true but is no longer relevant (e.g., a temporary constraint that no longer applies) | Archive or remove the memory; note the reason |
| Gap | Expected knowledge is missing from memory | Create a new wiki page or section; flag as open question if source is unclear |

### Workflow steps

```text
1. Identify the divergence (from stale detection, lint, or direct observation)
2. Read the source and the memory that cites it
3. Classify the divergence type
4. Propose the resolution path
5. Wait for approval
6. Execute the resolution
7. Scan for other memory with the same problem (same source, same type)
8. Update wiki/index.md, wiki/log.md, and run lint
```

### Template update

`RECONCILIATION_TEMPLATE.md` gains a `Divergence Type` field and a `Proposed Resolution` section.

### New artifacts

- `prompts/19-reconcile-memory.md` — canonical prompt for the reconciliation workflow
- `skills/reconcile.md` — skill card pointing to prompt 19

## Out Of Scope

- Automatic resolution without approval
- Semantic contradiction detection (the workflow starts from a known or suspected divergence, not from automated semantic analysis)
- Changing the stale detection workflow (prompt 11 remains unchanged)

## Impacts

| Area | Impact |
|---|---|
| Wiki | wiki pages updated as part of reconciliation |
| Decisions | ADRs created when contradictions require a structural decision |
| Docs | none |
| Mockups | none |
| Code | none — this is a documentation workflow |

## Tasks

- [x] T1: Update `RECONCILIATION_TEMPLATE.md` with Divergence Type and Proposed Resolution
- [x] T2: Write `prompts/19-reconcile-memory.md`
- [x] T3: Write `skills/reconcile.md` with YAML frontmatter
- [x] T4: Update `skills/wiki.md` to reference `reconcile` for contradiction cases
- [x] T5: Update `skills/README.md` and `prompts/README.md` to list the new artifacts
- [x] T6: Verify lint passes — 0 errors
- [x] T7: Run completion verification

## Completion Verification

This spec has no code implementation: verification is done with thesis and antithesis.

### Step 0 — Goal-backward check (always first)

- [x] What must be TRUE for the purpose of this spec to be met?
  - Truth 1: the 4 divergence types are defined and each has a resolution path — **verified in template, prompt, and skill**
  - Truth 2: the workflow classifies before resolving — **verified: prompt step 4 (classify) precedes step 5 (propose resolution)**
  - Truth 3: contradictions produce ADRs — **verified: Contradiction → "Create an ADR" in all three artifacts**
  - Truth 4: loop-closure step is explicit — **verified: prompt step 5 after approval, template section "Loop Closure"**
  - Truth 5: no memory modified without approval — **verified: "wait for approval before modifying any file" in prompt**
- [x] All truths hold.

### Thesis (at least one)

- Thesis 1 — Classification prevents wrong resolutions. Without knowing the divergence type, an agent might update a wiki page when the right action is to create an ADR (contradiction case), or create an ADR when the right action is to archive an expired fact. The 4-type classification forces the right resolution path before any modification.

- Thesis 2 — Loop closure prevents recurring divergences. After resolving one wiki page, other pages may cite the same source with the same problem. Without the scan step, the same divergence reappears in the next stale check. The loop-closure step eliminates this.

### Antithesis (at least one)

- Antithesis 1 — "The stale workflow (prompt 11) already handles this — a new workflow is redundant." Confutation: prompt 11 detects candidates and proposes updates, but does not classify divergence types, does not distinguish obsolescence from contradiction, and does not produce ADRs. It is a detection tool, not a resolution tool. The two workflows are complementary: stale finds, reconcile resolves.

- Antithesis 2 — "Automatic semantic contradiction detection would be more powerful." Confutation: semantic detection requires reading and comparing all memory against all sources — expensive, error-prone, and likely to produce false positives. The structured workflow starts from a known or suspected divergence (from stale detection, lint, or direct observation) and classifies it precisely. Precision over recall is the right trade-off for a governance tool.

### Exception

Exception reason: _none_

## Sources And Decisions

- Source: `pom/prompts/11-review-stale-wiki.md`
- Source: `pom/templates/RECONCILIATION_TEMPLATE.md`
- Source: `pom/specs/SPEC-0000-pom-founding-spec.md` (R6, R8)
- ADR: none needed — this is an additive workflow

## Evolution Rule

This spec is a living document. Incremental changes are tracked with Git. If a change alters a structural decision, create or update a linked ADR.
