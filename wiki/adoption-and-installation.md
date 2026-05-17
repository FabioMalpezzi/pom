# Adoption And Installation

## Summary

POM can be installed as a reusable method without forcing a project into a new shape. Presets, profiles, and ownership posture decide how much memory and governance to introduce.

## Current State

The recommended first install path downloads `bootstrap-pom.mjs`, runs it from the target project root, and chooses a preset such as `owned`, `team`, `overlay`, or `minimal`. The preset is not just a convenience flag; it tells POM how much authority it should assume inside the repository.

POM normally lives in a target project as `pom/`. The memory products, such as `wiki/`, `decisions/`, `PROJECT_STATE.md`, and task plans, belong to the target project and survive POM removal.

## Details

### Install POM In A Project

From the target project root, use the bootstrap script and choose the preset that matches the repository relationship:

```bash
curl -fsSL https://raw.githubusercontent.com/FabioMalpezzi/pom/main/bootstrap-pom.mjs -o bootstrap-pom.mjs
node bootstrap-pom.mjs --preset owned
```

Use:

| Preset | Use When |
|---|---|
| `owned` | The project is yours and POM may become project governance. |
| `team` | The project is shared and existing conventions must be preserved unless changed explicitly. |
| `overlay` | The repository belongs to an external upstream and POM is only local understanding memory. |
| `minimal` | You want the smallest setup and no ownership assumption. |

After bootstrap installs `pom/`, use the agent workflow that fits the project:

```text
Read pom/skills/seed.md and set up POM for this project.
```

for a new project, or:

```text
Read pom/skills/adopt.md and adopt POM without changing the existing structure.
```

for an existing project.

For an external repository, prefer overlay mode:

```bash
node bootstrap-pom.mjs --preset overlay
```

Then ask the agent to use overlay rules:

```text
Read pom/specs/SPEC-0004-external-project-overlay.md and use POM as a local understanding overlay, not as project governance.
```

### What Bootstrap Creates

The bootstrap script:

- clones or updates POM under `pom/`;
- runs the installer with the chosen preset;
- creates or updates `pom.config.json`;
- creates package scripts such as `pom:init`, `pom:update`, `pom:help`, and `pom:lint`;
- updates supported agent instruction files, or creates `AGENTS.md` when none exists;
- creates governance folders only when the selected profile needs them;
- installs or updates the Git pre-commit hook when the project is a Git repository.

### Customize POM For A Project

Project-specific customization belongs in `pom.config.json`, not in files under `pom/`. That separation lets the POM Source update safely while the target project keeps its own language, roots, templates, and thresholds.

Use `pom.config.json` to map:

- ownership mode;
- adoption profile and enabled modules;
- wiki categories and page expectations;
- decision, task, analysis, docs, source, test, mockup, and handoff roots;
- template overrides;
- lint severity and thresholds.

If the project needs translated or customized document shapes, copy templates out of `pom/` and point config to them:

```text
project-templates/
  ADR_TEMPLATE.md
  WIKI_PAGE_TEMPLATE.md
  PROJECT_STATE_TEMPLATE.md
```

```json
"templates": {
  "adr": "project-templates/ADR_TEMPLATE.md",
  "wikiPage": "project-templates/WIKI_PAGE_TEMPLATE.md",
  "projectState": "project-templates/PROJECT_STATE_TEMPLATE.md"
}
```

Do not edit reusable POM files directly under `pom/` for target-project preferences. POM updates may overwrite those files or create conflicts.

### Customize Templates

Templates are the shape of governed POM documents. Customize them when a target project needs a different language, section wording, document tone, or local metadata, while preserving the role each document plays in Operating Memory.

The safe workflow is:

1. Copy only the templates the project needs from `pom/templates/` into a project-owned folder.
2. Rename them clearly if useful, for example `ADR_TEMPLATE_IT.md` or `WIKI_PAGE_TEMPLATE_PRODUCT.md`.
3. Translate or adapt the placeholder text and section headings.
4. Keep the document's purpose and required structure recognizable.
5. Map the copied template paths in `pom.config.json`.
6. Run `npm run pom:lint` after creating or updating governed documents.

Example:

```text
project-templates/
  ADR_TEMPLATE_IT.md
  SPEC_TEMPLATE_IT.md
  TASK_PLAN_TEMPLATE_IT.md
  WIKI_PAGE_TEMPLATE_IT.md
```

```json
"templates": {
  "adr": "project-templates/ADR_TEMPLATE_IT.md",
  "spec": "project-templates/SPEC_TEMPLATE_IT.md",
  "taskPlan": "project-templates/TASK_PLAN_TEMPLATE_IT.md",
  "wikiPage": "project-templates/WIKI_PAGE_TEMPLATE_IT.md"
}
```

What is safe to customize:

| Template Part | Safe Change |
|---|---|
| Section headings | Translate or adapt them to the project language. |
| Placeholder text | Replace generic guidance with local phrasing. |
| Metadata fields | Add project-specific fields when they are useful and stable. |
| Examples | Replace with local examples when clearly marked as examples. |
| Optional sections | Add sections that the project will maintain consistently. |

What to avoid:

| Avoid | Reason |
|---|---|
| Editing files directly under `pom/templates/` | Framework updates may overwrite or conflict with local preferences. |
| Creating parallel document shapes for the same artifact | Readers and agents lose a single expected structure. |
| Removing verification sections from specs, tasks, or decisions | POM relies on completion verification to keep memory trustworthy. |
| Hardcoding project-specific categories into reusable POM templates | Local categories belong in `pom.config.json` or project-owned templates. |

Lint reads required `##` headings from the configured template. If a project maps translated templates, lint checks documents against those translated headings instead of the English defaults.

### Change Adoption Mode

Changing preset, profile, or ownership is a governance change because it changes what POM is allowed to create, check, or assume. Use `pom:init`, not `pom:update`:

```bash
npm run pom:init -- --preset owned
npm run pom:init -- --preset team
npm run pom:init -- --preset overlay
npm run pom:init -- --preset minimal
```

Advanced explicit forms remain available:

```bash
npm run pom:init -- --profile full
npm run pom:init -- --profile adopt --ownership external_overlay
```

### Update POM To A New Version

For a project that already has POM installed, the normal update path is:

```bash
npm run pom:update
git diff
```

`pom:update` updates `pom/`, refreshes generated POM sections, updates package scripts and hooks, and runs lint when available. It does not change `pom.config.json`, project wiki pages, decisions, docs, task plans, or project-owned templates.

Do not pass `--preset`, `--profile`, or `--ownership` to `pom:update`. Those options change operating mode and belong to `pom:init`.

If `pom:update` stops because `pom/` has local changes, inspect them before updating:

```text
Read pom/skills/sync.md and refresh this project's POM installation.
```

If the project does not have `pom:update` yet, install the current updater once:

```bash
curl -fsSL https://raw.githubusercontent.com/FabioMalpezzi/pom/main/bootstrap-pom.mjs -o bootstrap-pom.mjs
node bootstrap-pom.mjs --profile refresh
```

If POM is already installed, `pom/` is clean, and the root scripts already exist, this can refresh generated sections:

```bash
npm run pom:init -- --profile refresh
```

That command starts from the currently installed installer, so it does not replace `pom:update` when POM framework files themselves need updating.

### Check Installed Commands

After installation or update, show the command and skill guide:

```bash
npm run pom:help
```

Ownership posture matters because POM should never claim more authority than the operator actually has:

| Ownership | Meaning |
|---|---|
| `owned` | The user can govern structure and conventions. |
| `team` | The user can change the repository, but shared conventions should be preserved unless approved. |
| `external_overlay` | The repository belongs to an external upstream; POM is local understanding memory only. |
| `unknown` | The agent should ask before making structural assumptions. |

Adoption profile controls which Memory Elements and governance modules are active:

| Profile | Meaning |
|---|---|
| `minimal` | Operating hook, scripts, and config only. |
| `wiki` | Minimal plus Persistent Wiki memory. |
| `decisions` | Minimal plus Decision Record governance. |
| `full` | Wiki, decisions, handoff memory, and current planning. |
| `adopt` | Preserve existing structures and map POM to them. |
| `refresh` | Refresh installation hooks only. |
| `custom` | Explicit user choices. |

Overlay mode is distinct from adoption. In overlay mode, POM governs the operator's understanding, not the upstream project. Overlay artifacts should be kept local and out of upstream contributions unless explicitly wanted.

## Sources

| Source | Use |
|---|---|
| `README.md` | Installation, presets, profile meanings, ownership, update flow, and overlay summary. |
| `templates/POM_CONFIG_TEMPLATE.json` | Default config fields for ownership, adoption, roots, templates, wiki, decisions, tests, and handoff. |
| `prompts/01-bootstrap-new-project.md` | New project setup. |
| `prompts/02-adopt-existing-project.md` | Existing project adoption without moving structures by default. |
| `skills/sync.md` | Safe refresh and synchronization workflow for existing POM installations. |
| `prompts/17-sync-pom-framework.md` | Detailed sync procedure for submodules, nested Git checkouts, and vendored POM copies. |
| `specs/SPEC-0004-external-project-overlay.md` | Overlay mode requirements and recommended posture. |

## Linked Decisions

| Decision | Impact |
|---|---|
| SPEC-0000 D4 | POM lives separately from project-owned memory products. |
| SPEC-0000 D6 | Adoption profile determines which memory modules are active. |
| SPEC-0004 | External overlay mode is local understanding memory, not upstream governance. |

## Open Questions

| Question | Status |
|---|---|
| Should POM source repository have a `pom.config.json` for self-governance? | Open; no root config exists at experiment start. |
| Should a generated wiki reader be part of `wiki` profile or remain an optional command? | Answered for now: optional command. |

## Related Links

- [[overview]]
- [[current-specs]]
- [[experiments-and-extension]]
