# Spec - External project overlay mode

| Field | Value |
|---|---|
| Date | 2026-05-16 |
| Status | Draft |
| Area | governance / wiki |
| Summary | Define POM overlay mode for repositories the operator does not own, where POM governs local understanding instead of upstream project governance |

## Purpose

POM needs a documented mode for working inside a cloned repository that the operator does not own, such as an upstream open-source project, a vendor dependency, or a temporary audit target.

In this situation, POM must not behave as if it governs the project. It should instead govern the operator's local understanding of the project: what was learned, what is being investigated, what must not be changed, and where to resume safely.

## Context

The `mcp-toolbox` adoption trial showed a real distinction:

- the upstream repository already had its own structure, documentation system, test layout, and agent instruction files;
- POM's default `adopt` posture was still too close to project adoption and initially treated Hugo documentation and Go integration tests as POM-governed artifacts;
- the useful need was not to change upstream governance, but to create a local memory layer for understanding the project and working safely.

This mode is different from ordinary POM adoption:

- normal adoption: POM becomes part of the project's operating method;
- overlay mode: POM remains a local working aid for the person or agent studying or modifying a project owned by someone else.

Core principle:

> In external project overlay mode, POM does not govern the project. POM governs the operator's understanding of the project.

## Requirements

| ID | Requirement | Priority | Source |
|---|---|---|---|
| R1 | Overlay mode must be explicitly distinct from project adoption | High | `mcp-toolbox` trial |
| R2 | Overlay mode must not impose POM conventions on upstream `docs/`, `tests/`, ADRs, source layout, or release process | High | external repository safety |
| R3 | Overlay mode must support a local wiki used to understand the cloned project | High | POM wiki principle |
| R4 | Overlay artifacts should be local-only by default and easy to keep out of upstream commits | High | PR hygiene |
| R5 | Overlay mode must preserve upstream agent instruction files unless the operator intentionally wants local agent guidance | High | external repository safety |
| R6 | Overlay mode must make it easy to create a clean upstream PR without including POM artifacts | High | external contribution workflow |
| R7 | Overlay mode should document discovered architecture, entrypoints, modules, tests, conventions, risks, and open questions | Medium | restart memory |
| R8 | Ownership must be explicit: POM may use heuristics to ask better questions, but must not silently decide whether a repository is owned or external | High | operator consent |
| R9 | Future installer support must be non-blocking and agent-friendly through explicit parameters such as `--ownership external_overlay` | Medium | agent workflow |

## Proposed Design

Overlay mode is a documented operating posture first, not an installer feature yet.

### Ownership classification

Before adoption, POM should classify the user's relationship to the repository as one of:

| Mode | Meaning |
|---|---|
| `owned` | The user can govern structure and conventions. |
| `team` | The user can modify the repository, but existing conventions should be preserved unless explicitly changed. |
| `external_overlay` | The repository belongs to an external upstream; POM is local understanding memory only. |

POM may notice signals such as `origin` pointing to another organization, existing contribution files, or upstream branch tracking. These signals should only shape the question. They must not silently decide the mode.

Future installer support should prefer deterministic parameters over blocking prompts, for example:

```bash
node bootstrap-pom.mjs --profile adopt --ownership external_overlay
npm run pom:init -- --profile adopt --ownership external_overlay
```

If ownership is missing in an ambiguous existing repository, the agent should ask the user and then save the answer in `pom.config.json`.

### Recommended local shape

Preferred future layout:

```text
.pom/
  wiki/
    index.md
    architecture.md
    entrypoints.md
    modules.md
    docs-map.md
    tests-map.md
    conventions.md
    open-questions.md
  PROJECT_STATE.md
  pom.config.json
```

This layout keeps local understanding separate from upstream-owned files. The `.pom/` directory should be excluded through `.git/info/exclude` by default, not by editing upstream `.gitignore`.

Until `.pom/` is automated, the safe documented practice is:

1. create a local branch or worktree;
2. install POM only if local repository changes are acceptable;
3. configure `pom.config.json` so upstream `docs/` and `tests/` are preserved, not governed;
4. use wiki-style pages only for local understanding;
5. before preparing a PR, stage only the upstream-relevant change and leave POM overlay artifacts uncommitted or excluded.

### Overlay wiki

The overlay wiki is not official project documentation. It is a map for the operator.

Recommended pages:

| Page | Purpose |
|---|---|
| `architecture.md` | System shape, major components, boundaries |
| `entrypoints.md` | Main binaries, CLIs, services, commands |
| `modules.md` | Source tree map and responsibilities |
| `docs-map.md` | How upstream documentation is organized |
| `tests-map.md` | Test types, expensive tests, fixtures, required services |
| `conventions.md` | Naming, formatting, PR, branch, and commit rules |
| `open-questions.md` | Unknowns to resolve before changing code |

### Lint posture

Overlay mode lint must observe rather than prescribe:

- upstream `docs/` are existing project documentation, not POM official docs;
- upstream `tests/` are existing test layout, not POM test governance;
- source roots are mapped for understanding, not migration;
- warnings should focus on local overlay hygiene, not upstream structure.

### Contribution posture

Before contributing upstream:

1. run the upstream project's own tests and lint;
2. ensure POM overlay artifacts are not staged;
3. ensure upstream docs or source changes are intentional;
4. create a PR that contains the actual contribution, not the local operating memory.

## Out Of Scope

- Implementing the `.pom/` overlay installer.
- Changing default `adopt` behavior in code.
- Moving existing POM installations from `pom/` to `.pom/`.
- Automatically building a wiki by scanning every repository.
- Submitting POM artifacts to external upstream projects by default.

## Impacts

| Area | Impact |
|---|---|
| Wiki | Defines a local overlay wiki for understanding external repositories |
| Decisions | No ADR required yet; this is an additive documented mode |
| Docs | README and readable guides should mention overlay mode |
| Mockups | none |
| Code | none in this document-only step |

## Linked Tasks

- `TASK-0000` not created yet.

## Completion Verification

This spec is not complete. It documents the mode before implementation.

### Step 0 — Goal-backward check (always first)

- [ ] What must be TRUE for overlay mode to be complete?
  - POM has an explicit command or workflow for local-only overlay setup.
  - POM has an explicit ownership field or parameter, rather than silent ownership inference.
  - Overlay artifacts can be kept out of upstream commits by default.
  - The wiki can be created under a local overlay root.
  - Lint does not impose project-governance conventions on upstream docs/tests.
  - README, guides, skills, and prompts describe when to use overlay mode.
- [ ] Verify each truth against actual artifacts.

### If this spec has code implementation

- [ ] At least 2 positive scenario tests based on real user use cases this spec generates or is involved in.
- [ ] At least 1 error/misuse scenario test validating incorrect or improper usage.
- [ ] Tests run and pass.

### If this spec has no code implementation

- [ ] At least 1 thesis: argument or evidence proving this spec is valid, based on use cases it generates or is involved in.
- [ ] At least 1 antithesis: a case of incorrect or improper usage demonstrated to be false or inferior.
- [ ] Every antithesis is confuted.

### Exception

Exception reason: _none_

## Sources And Decisions

- Source: `mcp-toolbox` local adoption trial on 2026-05-16.
- Source: `skills/adopt.md`.
- Source: `skills/wiki.md`.
- Source: `prompts/02-adopt-existing-project.md`.
- ADR: none yet.

## Evolution Rule

This spec is a living document. Incremental changes are tracked with Git. If a change alters a structural decision, create or update a linked ADR.
