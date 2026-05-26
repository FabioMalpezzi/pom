# Spec - Modular AGENTS Template By Adoption Profile

| Field | Value |
|---|---|
| Date | 2026-05-02 |
| Status | Complete |
| Area | architecture |
| Summary | Keep agent instructions small by separating global POM posture from workflow-specific skills and profile modules |

## Purpose

Reduce the cognitive load on both the user and the agent by keeping global agent instructions limited to identity, communication posture, source authority, safety, and always-on operating rules. Workflow-specific rules belong in POM skills and canonical prompts, or in profile modules only when that module is active.

## Context

The first modular version solved the original monolithic-template problem by assembling `templates/agents/` according to the adoption profile. A later simplicity review added a sharper rule:

> Global = who POM is and how the agent should speak or behave in all work.
> Skills = what POM can do and when to apply each workflow.

A rule that applies only to one task type should not live in the global agent block. It should live in a skill, prompt, template, or profile module.

Before this refinement, profile `minimal` still received useful-but-conditional workflow rules, such as restart handoff, template/status guidance, temporary experiments, and docs/source conventions. That kept the section below the old line cap, but it still violated the method's simplicity goal.

The practical effect of overloading global instructions is:

- the agent reads rules about wiki maintenance, ADR governance, mockup reconciliation, test conventions, and structured planning even when those modules are disabled;
- the agent also reads task-specific procedures before any matching task exists;
- the agent's context window is consumed by irrelevant instructions;
- the user sees a wall of text that doesn't match their project's actual scope;
- the gap between "install POM" and "be productive" is unnecessarily wide.

Sources:

- `templates/AGENTS_POM_SECTION_TEMPLATE.md` — compact manual-install fallback
- `scripts/install-pom.ts` — installer that assembles the agent section from profile modules
- `templates/POM_CONFIG_TEMPLATE.json` — adoption profile definitions
- Critical analysis session comparing POM with GSD, Spec Kit, and OpenSpec
- Simplicity review: global instructions are identity/posture; skills are task-specific capabilities

## Requirements

| ID | Requirement | Priority | Source |
|---|---|---|---|
| R1 | The AGENTS template must be split into a core section and module sections | High | Analysis |
| R2 | The installer must assemble only the sections matching the adoption profile | High | Analysis |
| R3 | Profile `minimal` must produce an AGENTS section of ≤140 lines and contain only global posture plus skill routing | High | Simplicity review |
| R4 | Profile `full` must produce an AGENTS section of ≤260 lines while preserving active workflow entry points | High | Simplicity review |
| R5 | Profile `refresh` must re-assemble based on the current `pom.config.json` adoption profile | High | Consistency |
| R6 | The module sections must be independently readable and self-contained | Medium | Maintainability |
| R7 | Adding a new module section must not require changing the core section | Medium | Extensibility |
| R8 | The assembled output must remain a single contiguous block between POM markers | Medium | Compatibility |
| R9 | `pom:lint` must warn if the injected AGENTS section references modules that are disabled in `pom.config.json` | Low | Governance |
| R10 | Rules that apply only to one workflow must live in a skill, prompt, template, or profile module rather than the global core | High | Simplicity review |

## Proposed Design

### Template structure

```text
templates/
  agents/
    00-core.md              # global posture: identity, language, source authority, safety, commands, adoption profile
    10-wiki.md              # persistent wiki rules
    20-decisions.md          # ADR and spec rules
    30-planning.md           # hierarchy, completion verification, test convention
    40-handoff.md            # restart-memory routing for profiles that create PROJECT_STATE.md
    50-templates.md          # compact governed-document/template routing for active governance modules
    60-skills.md             # always-on skill router
    70-experiments.md        # temporary experiments rules only when analysis is enabled
    80-docs-source.md        # docs and source conventions only when docs governance is enabled
    90-mockups.md            # mockup manifest and reconciliation
  AGENTS_POM_SECTION_TEMPLATE.md  # compact manual-install fallback
```

### Module-to-profile mapping

| Module file | Included when |
|---|---|
| `00-core.md` | always |
| `10-wiki.md` | `adoption.wiki == "enabled"` |
| `20-decisions.md` | `adoption.decisions == "enabled"` |
| `30-planning.md` | `adoption.planning == "structured"` or `adoption.tasks == "structured"` |
| `40-handoff.md` | profile creates restart memory (`full`, or custom structured planning) |
| `50-templates.md` | an active governed-document module exists |
| `60-skills.md` | always |
| `70-experiments.md` | `adoption.analysis == "enabled"` |
| `80-docs-source.md` | `adoption.docs == "enabled"` |
| `90-mockups.md` | `adoption.mockups == "enabled"` |

### Installer changes

`install-pom.ts` will:

1. Read `pom.config.json` adoption profile on refresh, or use the profile chosen during install/reconfiguration
2. Read module files from `templates/agents/`
3. Assemble only the applicable modules in order (00, 10, 20, ...)
4. Inject the assembled block between `<!-- POM:START -->` and `<!-- POM:END -->`
5. On `refresh`, re-read `pom.config.json` and re-assemble

### Backward compatibility

- `AGENTS_POM_SECTION_TEMPLATE.md` remains for manual copy workflows, but is now a compact global fallback rather than a full profile dump
- Projects that use the installer get profile-aware modules from `templates/agents/`
- The POM markers (`<!-- POM:START -->` / `<!-- POM:END -->`) remain unchanged

### Expected sizes

| Profile | Estimated lines | Legacy full template |
|---|---|---|
| minimal | ≤140 | 399 |
| wiki | ≤180 | 399 |
| decisions | ≤170 | 399 |
| full | ≤260 | 399 |
| adopt | ≤140 | 399 |

## Out Of Scope

- Redesigning every skill or prompt
- Changing the prompt or skill file structure
- Changing `pom.config.json` schema (the adoption section already has all needed fields)
- Multi-file AGENTS injection (the output remains a single block)

## Impacts

| Area | Impact |
|---|---|
| Wiki | none |
| Decisions | ADR if the approach changes substantially during implementation |
| Docs | README and wiki synthesis may need minor updates when the global/skills boundary changes |
| Mockups | none |
| Code | `scripts/install-pom.ts` — assembly logic; `templates/agents/` — new module files |

## Tasks

- [x] T1: Split `AGENTS_POM_SECTION_TEMPLATE.md` into module files under `templates/agents/`
- [x] T2: Implement `assembleAgentsTemplate()` in `install-pom.ts` that reads modules and assembles by profile
- [x] T3: Wire `upsertAgentInstructionSections()` to use the modular assembly instead of the monolithic template
- [x] T4: Keep `AGENTS_POM_SECTION_TEMPLATE.md` as compact manual-install fallback
- [x] T5: Write and run scenario tests (see Completion Verification below)
- [x] T6: Verify line counts match targets (minimal 116 ≤140 ✓, full 242 ≤260 ✓)
- [x] T7: Mark spec as Complete after all tests pass

## Completion Verification

This spec cannot be marked Complete without passing the completion verification gate. Verification is mandatory and automatic.

### Step 0 — Goal-backward check (always first)

- [x] What must be TRUE for the purpose of this spec to be met?
  - Truth 1: profile `minimal` produces an AGENTS section ≤140 lines and keeps workflow details out — **verified: 116 lines**
  - Truth 2: profile `full` produces an AGENTS section ≤260 lines while keeping active workflow entry points — **verified: 242 lines**
  - Truth 3: the installer assembles sections based on the adoption profile — **verified: modules assembled by `assembleAgentsTemplate()`**
  - Truth 4: refresh re-assembles based on current config — **verified: invalid config stops refresh before writing agent files; partial `full` config expands from full defaults; full→minimal shrinks from 242 to 116**
- [x] For each truth, what must EXIST? Verified against `templates/agents/`, `scripts/install-pom.ts`, `tests/spec-0001/integration/test-modular-assembly.mjs`.
- [x] All truths hold.

### Scenario tests (code — mandatory for Complete)

- [x] Scenario 1 (positive): install with profile `minimal` in a temp directory → 116 lines, ≤140, no wiki/ADR/handoff/template/experiment/docs-source/mockup workflow sections ✓
- [x] Scenario 2 (positive): install with profile `full` in a temp directory → 242 lines, ≤260, active workflow modules still present ✓
- [x] Scenario 3 (error/misuse): refresh honors current `pom.config.json`, then after changing config to `minimal` the section shrinks from 242 to 116 lines ✓
- [x] Scenario 18 (error/misuse): refresh with invalid `pom.config.json` exits non-zero and does not create `AGENTS.md` ✓
- [x] Scenario 19 (positive): refresh with partial `{ "adoption": { "profile": "full" } }` config includes wiki, planning, and handoff modules ✓
- [x] All 19 scenarios in `tests/spec-0001/integration/test-modular-assembly.mjs` run and pass (`90 passed, 0 failed`)

### Exception

Exception reason: _none_

## Sources And Decisions

- Source: critical analysis of POM vs GSD/SpecKit/OpenSpec
- Source: `templates/AGENTS_POM_SECTION_TEMPLATE.md` (compact manual-install fallback, current state 111 lines)
- Source: user-stated simplicity principle: global instructions describe identity and communication posture; skills describe capabilities and when to apply them
- ADR: none yet (create if the approach changes during implementation)

## Evolution Rule

This spec is a living document. Incremental changes are tracked with Git. If a change alters a structural decision, create or update a linked ADR.
