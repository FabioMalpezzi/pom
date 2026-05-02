# Spec - Modular AGENTS Template By Adoption Profile

## Status

Draft

## Purpose

Reduce the cognitive load on both the user and the agent by injecting only the AGENTS template sections relevant to the chosen adoption profile, instead of the current monolithic 320-line block that includes rules for modules the project does not use.

## Context

Today `install-pom.ts` injects the full `AGENTS_POM_SECTION_TEMPLATE.md` into the target project's agent instruction file regardless of the adoption profile. A project using profile `minimal` (no wiki, no decisions, no mockups, no structured planning) receives the same 320 lines as a project using profile `full`. This means:

- the agent reads rules about wiki maintenance, ADR governance, mockup reconciliation, test conventions, and structured planning even when those modules are disabled;
- the agent's context window is consumed by irrelevant instructions;
- the user sees a wall of text that doesn't match their project's actual scope;
- the gap between "install POM" and "be productive" is unnecessarily wide.

Sources:

- `templates/AGENTS_POM_SECTION_TEMPLATE.md` — current monolithic template (320 lines)
- `scripts/install-pom.ts` — current installer that injects the full template
- `templates/POM_CONFIG_TEMPLATE.json` — adoption profile definitions
- Critical analysis session comparing POM with GSD, Spec Kit, and OpenSpec

## Requirements

| ID | Requirement | Priority | Source |
|---|---|---|---|
| R1 | The AGENTS template must be split into a core section and module sections | High | Analysis |
| R2 | The installer must assemble only the sections matching the adoption profile | High | Analysis |
| R3 | Profile `minimal` must produce an AGENTS section of ~80 lines or less | High | Analysis |
| R4 | Profile `full` must produce the same content as today (no functionality lost) | High | Constraint |
| R5 | Profile `refresh` must re-assemble based on the current `pom.config.json` adoption profile | High | Consistency |
| R6 | The module sections must be independently readable and self-contained | Medium | Maintainability |
| R7 | Adding a new module section must not require changing the core section | Medium | Extensibility |
| R8 | The assembled output must remain a single contiguous block between POM markers | Medium | Compatibility |
| R9 | `pom:lint` must warn if the injected AGENTS section references modules that are disabled in `pom.config.json` | Low | Governance |

## Proposed Design

### Template structure

```text
templates/
  agents/
    00-core.md              # ~80 lines: principle, git, language, operating cycle, commands, adoption profile
    10-wiki.md              # persistent wiki rules
    11-wiki-skills.md       # wiki skill entry points (build, stale, query, lint)
    20-decisions.md          # ADR and spec rules
    30-planning.md           # hierarchy, completion verification, test convention
    40-handoff.md            # session handoff, PROJECT_STATE rules, pre-commit hook
    50-templates.md          # template table, document statuses
    60-skills.md             # skill index and usage rules
    70-experiments.md        # temporary experiments rules
    80-docs-source.md        # docs and source conventions
    90-mockups.md            # mockup manifest and reconciliation
  AGENTS_POM_SECTION_TEMPLATE.md  # kept as the full assembled version for backward compatibility
```

### Module-to-profile mapping

| Module file | Included when |
|---|---|
| `00-core.md` | always |
| `10-wiki.md` + `11-wiki-skills.md` | `adoption.wiki == "enabled"` |
| `20-decisions.md` | `adoption.decisions == "enabled"` |
| `30-planning.md` | `adoption.planning == "structured"` or `adoption.tasks == "structured"` |
| `40-handoff.md` | always (PROJECT_STATE is always useful) |
| `50-templates.md` | always (filtered to list only relevant templates) |
| `60-skills.md` | always (filtered to list only relevant skills) |
| `70-experiments.md` | `adoption.analysis != "disabled"` |
| `80-docs-source.md` | `adoption.docs != "disabled"` |
| `90-mockups.md` | `adoption.mockups == "enabled"` |

### Installer changes

`install-pom.ts` will:

1. Read `pom.config.json` adoption profile (or use the profile chosen during interactive install)
2. Read module files from `templates/agents/`
3. Assemble only the applicable modules in order (00, 10, 20, ...)
4. Inject the assembled block between `<!-- POM:START -->` and `<!-- POM:END -->`
5. On `refresh`, re-read `pom.config.json` and re-assemble

### Backward compatibility

- `AGENTS_POM_SECTION_TEMPLATE.md` remains as the full assembled version (equivalent to profile `full`)
- Projects that manually copied the template instead of using the installer are not affected
- The POM markers (`<!-- POM:START -->` / `<!-- POM:END -->`) remain unchanged

### Expected sizes

| Profile | Estimated lines | Current |
|---|---|---|
| minimal | ~80 | 320 |
| wiki | ~130 | 320 |
| decisions | ~120 | 320 |
| full | ~320 | 320 |
| adopt | ~100 | 320 |

## Out Of Scope

- Changing the content of any individual rule (this spec is about assembly, not rule changes)
- Changing the prompt or skill file structure
- Changing `pom.config.json` schema (the adoption section already has all needed fields)
- Multi-file AGENTS injection (the output remains a single block)

## Impacts

| Area | Impact |
|---|---|
| Wiki | none |
| Decisions | ADR if the approach changes substantially during implementation |
| Docs | README installation section may need minor update |
| Mockups | none |
| Code | `scripts/install-pom.ts` — assembly logic; `templates/agents/` — new module files |

## Linked Tasks

- `TASK-0002` (to be created after spec approval)

## Completion Verification

This spec cannot be marked Complete without passing the completion verification gate. Verification is mandatory and automatic.

### Step 0 — Goal-backward check (always first)

- [ ] What must be TRUE for the purpose of this spec to be met? List the truths.
  - Truth 1: profile `minimal` produces an AGENTS section ≤80 lines
  - Truth 2: profile `full` produces the same content as the current monolithic template
  - Truth 3: the installer assembles sections based on the adoption profile
  - Truth 4: refresh re-assembles based on current config
- [ ] For each truth, what must EXIST? Verify against actual artifacts.
- [ ] If the goal is not met, the spec cannot be Complete regardless of other checks.

### If this spec has code implementation

- [ ] At least 2 positive scenario tests:
  - Scenario 1: install with profile `minimal` → AGENTS section contains only core + handoff + templates + skills, ≤80 lines
  - Scenario 2: install with profile `full` → AGENTS section contains all modules, content matches current monolithic template
- [ ] At least 1 error/misuse scenario test:
  - Scenario 3: install with profile `full`, then refresh after changing config to `minimal` → AGENTS section shrinks to minimal
- [ ] Tests run and pass

### Exception

Exception reason: _none_

## Sources And Decisions

- Source: critical analysis of POM vs GSD/SpecKit/OpenSpec
- Source: `templates/AGENTS_POM_SECTION_TEMPLATE.md` (320 lines, current state)
- ADR: none yet (create if the approach changes during implementation)

## Evolution Rule

This spec is a living document. Incremental changes are tracked with Git. If a change alters a structural decision, create or update a linked ADR.
