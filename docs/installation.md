# POM Installation Guide

## Purpose

This is the installation authority for POM - Project Operating Memory: how to bring POM into a target project, choose a preset, update it, keep project-owned customizations safe, and install POM where npm is not available. The README keeps only a Quickstart; every installation detail lives here.

## Audience

Technical: maintainers installing POM in a project they own, share, or only observe, and coding agents asked to install, update, or repair a POM installation.

## Content

### Requirements

- Node.js >= 22.6 for the installer and the scripts it installs (they run TypeScript through `--experimental-strip-types`). The bootstrap itself needs only Node >= 20.
- Git. The installer initializes a repository when the target root is not already inside a Git worktree.

### Two Complementary Ways To Bring In POM

- **Pi package (skill package)** gives the *agent* the POM method in every Pi session. It registers the skills so a session can load `using-pom` and route POM work; it writes Pi settings, not project files.
- **Project install (bootstrap)** gives the *project* its Operating Memory: `pom.config.json`, the method files under `pom/`, the always-loaded POM section in the agent instruction files (harness-agnostic, shared with teammates), and the memory folders.

The Pi package does not replace the project install. Skills read `pom.config.json` to respect disabled modules, so a project you actually govern with POM still needs the bootstrap below.

### Use With The Pi Coding Agent

```bash
# Try it for one run (no install):
pi -e git:github.com/FabioMalpezzi/pom

# Or install it (writes Pi settings, not your project):
pi install git:github.com/FabioMalpezzi/pom      # add -l for project-local settings
pi install /absolute/path/to/pom                 # from a local clone

pi list                                          # show registered packages and skills
pi remove git:github.com/FabioMalpezzi/pom       # remove from settings
```

Once loaded, a natural POM request (for example "adopt POM in this repo" or "defer this work") makes the agent read `skills/using-pom.md`, consult the `skills/README.md` catalog, and follow the selected skill's linked prompt. This is skill-only: it does not run code, call a model, or write to your project; in a repository without POM it stays inert, and it reloads `using-pom` after compaction.

### First Install

Download and run the bootstrap script from the target project root:

```bash
curl -fsSL https://raw.githubusercontent.com/FabioMalpezzi/pom/main/bootstrap-pom.mjs -o bootstrap-pom.mjs
node bootstrap-pom.mjs --preset owned
```

Do not install POM by running `git clone https://github.com/FabioMalpezzi/pom.git .` in a project root. That repository is the POM Source. The bootstrap is the supported install path because it keeps the reusable method under `pom/` and leaves project-owned files at the target project root.

If your goal is to improve POM itself, clone the POM Source as its own working repository and do not run the bootstrap. Use the source repository commands such as `npm run pom:lint`, `npm run pom:test`, `npm run pom:wiki:render`, `npm run pom:skills:sync` (regenerates the README skill table from `skills/README.md`), and `npm run pom:experiments:clean` (reports Git-ignored experiment evidence and removes it only with `--delete`).

Do not pipe a remote bootstrap script directly into `node`. Download it first, then inspect it or verify it before running.

For environments that require a pinned and checked install, prefer a tag or commit URL and verify the bootstrap checksum before execution:

```bash
POM_REF=main
curl -fsSL "https://raw.githubusercontent.com/FabioMalpezzi/pom/${POM_REF}/bootstrap-pom.mjs" -o bootstrap-pom.mjs
curl -fsSL "https://raw.githubusercontent.com/FabioMalpezzi/pom/${POM_REF}/checksums/bootstrap-pom.mjs.sha256" -o bootstrap-pom.mjs.sha256
shasum -a 256 -c bootstrap-pom.mjs.sha256
node bootstrap-pom.mjs --preset owned
```

Use `main` only when you intentionally want the current development line. For repeatable adoption, set `POM_REF` to a release tag or immutable commit and use the checksum published with that same ref.

When asking an AI agent to install this method, say `POM - Project Operating Memory from FabioMalpezzi/pom` and ask it to run the bootstrap from the target project root. That wording distinguishes POM from Maven `pom.xml`, Page Object Model, and other common meanings. The prompt to hand to the agent is in the README Quickstart; it sends the agent to this guide.

### Presets

Choose the preset that matches your relationship to the repository:

| Preset | Use when | Meaning |
|---|---|---|
| `owned` | The project is yours | POM may become project governance when useful. |
| `team` | The project is shared with a team | POM must preserve shared conventions unless explicitly changed. |
| `overlay` | The repository belongs to an external upstream | POM is local understanding memory only. |
| `minimal` | You want only the smallest local setup | POM starts with minimal memory and no ownership assumption. |

Running `bootstrap-pom.mjs` without a preset prints this guide and exits. POM does not guess ownership during first install.

Use `--lang it|en` only when you want to force the language of CLI guidance.

For existing repositories, the presets are the normal path:

```bash
node bootstrap-pom.mjs --preset owned
node bootstrap-pom.mjs --preset team
node bootstrap-pom.mjs --preset overlay
```

You can still pass ownership explicitly when the agent or user already knows the relationship:

```bash
node bootstrap-pom.mjs --profile adopt --ownership owned
node bootstrap-pom.mjs --profile adopt --ownership team
node bootstrap-pom.mjs --profile adopt --ownership external_overlay
```

The same option is available after POM is installed:

```bash
npm run pom:init -- --preset overlay
```

You can also pass an adoption profile directly for advanced use (`minimal`, `wiki`, `decisions`, `full`, `adopt`, `refresh`, `custom`):

```bash
node bootstrap-pom.mjs --profile full
```

### After The Bootstrap

For agent-driven setup on a new project, ask:

```text
Read pom/skills/seed.md and set up POM for this project.
```

For agent-driven adoption in an existing repository, ask:

```text
Read pom/skills/adopt.md and adopt POM without changing the existing structure.
```

For a cloned repository you do not own, prefer overlay mode:

```bash
node bootstrap-pom.mjs --preset overlay
```

Then ask the agent to read the overlay rules before adding project memory:

```text
Read pom/specs/SPEC-0004-external-project-overlay.md and use POM as a local understanding overlay, not as project governance.
```

In overlay mode, POM governs the operator's understanding of the project. It must not impose POM conventions on upstream `docs/`, `tests/`, ADRs, source layout, release process, or pull-request contents.

If the correct skill is not obvious, start with `pom/skills/using-pom.md`: it routes the request and checks adoption constraints in `pom.config.json`. Show the installed commands and skill index with `npm run pom:help`; it prints the reference and exits immediately, with no interactive input.

### What The Bootstrap Does

The bootstrap script:

- clones POM into `pom/` (or pulls if it already exists);
- runs the installer using the selected preset;
- initializes Git in the target project root when the target is not already inside a Git worktree;
- lets advanced users choose an adoption profile directly (minimal, wiki, decisions, full, adopt, refresh, custom);
- updates the POM section in every existing supported agent instruction file, or creates `AGENTS.md` if none exists;
- creates `package.json` scripts (`pom:init`, `pom:update`, `pom:help`, `pom:lint`, `pom:reader`, `pom:wiki:render`, `pom:workflow:lint`, `pom:workflow:mermaid`, `pom:workflow:xstate`, `pom:tandem`), `pom-update.mjs`, `pom.config.json`, and governance folders based on the chosen profile;
- installs or updates the Git pre-commit hook with POM checks when the target project root is the Git worktree root.

Rerunning the bootstrap when `pom/` already exists updates a Git-managed checkout (checkout `main`, fast-forward pull, submodule fallback) and leaves a vendored copy without `.git` untouched, pointing at `npm run pom:update` instead: running Git inside a vendored copy would act on the project repository. When the source cannot be reached, the bootstrap stops with the Git error and no clone; when the source has no `main` branch, it clones the default branch and says so.

### Agent Instruction Targets

Supported instruction targets are deliberately conservative:

- existing root files: `AGENTS.md`, `AGENTS.MD`, `agents.md`, `CLAUDE.md`, `GEMINI.md`, `CONVENTIONS.md`, `.cursorrules`, `.clinerules`, `.windsurfrules`;
- existing nested files: `.github/copilot-instructions.md`, `.junie/guidelines.md`, `.junie/instructions.md`, `.junie/AGENTS.md`;
- existing rule folders, where POM creates or updates a dedicated file: `.claude/rules/pom.md`, `.github/instructions/pom.instructions.md`, `.cursor/rules/pom.mdc`, `.windsurf/rules/pom.md`, `.kiro/steering/pom.md`, `.continue/rules/pom.md`, `.roo/rules/pom.md`, `.clinerules/pom.md`.

POM does not create tool-specific folders just because the tool exists. It only writes into a tool-specific folder when that folder is already part of the project.

The POM Source has its own `AGENTS.MD`, which governs work on the POM repository itself; it is never copied into target projects. The section written into a target project is assembled from `pom/templates/agents/*.md` according to the adoption profile, with `pom/templates/AGENTS_POM_SECTION_TEMPLATE.md` as the compact fallback, so different coding agents see the same POM rules.

For Claude Code, `.claude/agents/pom-post-action-validator.md` is optional. The installer creates or updates it only when `.claude/` already exists. If `.claude/` is missing, the installer prints the exact `mkdir -p .claude` and `npm run pom:init ...` commands to enable the helper with the same install mode.

For OpenAI Codex, `AGENTS.md` is the project instruction target. The equivalent post-action audit is the generic `pom/skills/validate.md` skill and its canonical prompt `pom/prompts/18-post-action-validator.md`; no Claude-specific wrapper is required.

POM includes a bootstrap/router skill at `pom/skills/using-pom.md`. Harnesses with native skill or hook support should load it at session start when possible. Instruction-file-only integrations should read it before the first POM-related action, especially after compaction, handoff, or when choosing between POM skills. See `pom/prompts/references/agent-harnesses.md` for the session-start contract, instruction targets, tool mapping, and smoke prompts. The harness table there is a mapping and test protocol, not a live support claim; mark a harness as verified only after a clean-session transcript proves the route.

### Updating POM In An Existing Project

For normal manual updates from a project that already has POM installed:

```bash
npm run pom:update
git diff
```

`pom:update` updates `pom/`, refreshes the POM section in every existing supported agent instruction file, updates package scripts and the pre-commit hook, then runs `pom:lint` when available. It supports both Git-managed POM installs and clean vendored `pom/` copies. It does not change `pom.config.json`, project documents, wiki, decisions, or project-owned templates outside `pom/`.

`pom:update` also does not change adoption mode. If called with `--preset`, `--profile`, or `--ownership`, it stops and tells you to use `pom:init` instead. Changing mode is a governance decision, not a framework update.

If `pom/` has local changes, `pom:update` stops and suggests `pom/skills/sync.md` instead of overwriting them. For vendored copies, unrelated parent-project changes outside `pom/` do not block the update. A vendored `pom/` that Git ignores is refused as well, because an ignored folder always looks clean and local edits could not be detected before it is replaced: track `pom/` or update it by hand.

For agent-driven updates, use the sync skill:

```text
Read pom/skills/sync.md and refresh this project's POM installation.
```

If the project does not have `pom:update` yet, install the current updater once:

```bash
curl -fsSL https://raw.githubusercontent.com/FabioMalpezzi/pom/main/bootstrap-pom.mjs -o bootstrap-pom.mjs
node bootstrap-pom.mjs --profile refresh
```

If POM is already installed, `pom/` is clean, and `package.json` has the scripts, you can also refresh only generated sections with:

```bash
npm run pom:init -- --profile refresh
```

That command is an advanced convenience path. It does not replace `pom:update` when POM itself may need to be pulled first.

### External Project Overlay

Use overlay mode when the repository is cloned from an upstream you do not own and POM is needed to understand, audit, or prepare a limited contribution.

Overlay mode is different from adoption:

| Mode | What POM governs |
|---|---|
| Adoption | the project's operating method |
| Overlay | the operator's local understanding of someone else's project |

Overlay mode should keep upstream structures authoritative:

- upstream `docs/` remain upstream documentation, not POM-governed docs;
- upstream `tests/` remain upstream test layout, not POM-governed test structure;
- upstream agent instruction files should be preserved unless local agent guidance is intentionally added;
- local wiki pages are working notes for understanding architecture, entrypoints, modules, tests, conventions, risks, and open questions;
- before opening a PR, POM overlay artifacts must stay out of the contribution unless the upstream project explicitly wants them.

Recommended Git posture:

- keep the overlay in its own branch or, better, in a separate Git worktree;
- do actual upstream contribution work on a separate feature branch;
- do not merge the overlay branch into the contribution branch;
- transfer only selected non-POM changes with a patch, file checkout, or `git cherry-pick -n` of commits that contain no POM artifacts.

See `specs/SPEC-0004-external-project-overlay.md` for the documented mode and future implementation requirements.

### Project-Owned Templates

If you customized or translated templates, keep them outside `pom/` before refreshing, for example:

```text
project-templates/
  ADR_TEMPLATE.md
  WIKI_PAGE_TEMPLATE.md
  PROJECT_STATE_TEMPLATE.md
```

Then point `pom.config.json` to those project-owned templates:

```json
"templates": {
  "adr": "project-templates/ADR_TEMPLATE.md",
  "wikiPage": "project-templates/WIKI_PAGE_TEMPLATE.md",
  "projectState": "project-templates/PROJECT_STATE_TEMPLATE.md"
}
```

Template paths in `pom.config.json` are relative to the target project root, where `pom.config.json`, agent instruction files, `package.json`, and `pom/` live. For example, `project-templates/ADR_TEMPLATE.md` means `<project-root>/project-templates/ADR_TEMPLATE.md`, not `<project-root>/pom/project-templates/ADR_TEMPLATE.md`.

Do not customize files directly under `pom/`: updates may overwrite them or create Git conflicts.

`pom/templates/POM_CONFIG_TEMPLATE.json` assumes the common installation style where POM lives in the target project as `pom/`, so template paths point to `pom/templates/...`. If you install POM somewhere else, adapt those paths in the target project's `pom.config.json`.

### Manual Install

**Important:** POM must live in a subfolder (typically `pom/`), not at the project root. Cloning POM directly into the root would overwrite the project's `README.md`, `AGENTS.MD`, and `package.json`, and break all internal path references.

Supported installation styles:

- copy POM into the target project as a `pom/` folder;
- add POM as a Git submodule or subtree under `pom/`;
- keep POM as an external reference and copy only the needed templates/prompts.

```bash
# Option A: Git submodule (stays updatable)
git submodule add https://github.com/FabioMalpezzi/pom.git pom

# Option B: Simple copy
cp -r /path/to/pom ./pom
```

Then run the installer:

```bash
node --experimental-strip-types pom/scripts/install-pom.ts
```

### Project Structure After Installation

In the common Git-managed install, `pom/` is a full checkout of the POM Source and may contain its own `.git`, `README.md`, `AGENTS.MD`, `bootstrap-pom.mjs`, and `package.json`. That is expected. The wrong layout is POM Source files directly at the target project root.

On a new project, the root may initially contain only `pom/`, agent instructions, `package.json`, `pom-update.mjs`, and `pom.config.json`. That is a valid day-zero state: create `PROJECT_STATE.md`, `CURRENT_PLAN.md`, `tasks/`, `analysis/`, `docs/`, `wiki/`, or the configured decisions root only when the selected adoption profile enables them or current work needs them.

If a new project has no application infrastructure yet, POM must not infer the stack, source layout, package manager, deployment model, database, authentication system, test framework, or hosting strategy on its own. Treat infrastructure as a project decision: ask the user how they want it realized, or create an approved Open Discussion or analysis note for the alternatives, before scaffolding code or committing to a technical structure.

```text
my-project/
  pom/                  <- POM method (the POM Source)
    .git/               <- present in Git-managed installs
    prompts/
    skills/
    templates/
    scripts/
  AGENTS.md             <- project agent instructions, when used (references pom/)
  CLAUDE.md             <- also updated when already present
  pom.config.json       <- project-specific config
  wiki.html             <- shortcut to the generated wiki reader, if wiki profile enabled
  wiki/                 <- if wiki profile enabled
  decisions/            <- default decisions root, if decisions profile enabled
  ...
```

### Non-npm Projects

If the project does not use npm, copy the POM section manually into every agent instruction file used by the project:

| Agent | Instructions file | What to do |
|---|---|---|
| OpenAI Codex | `AGENTS.md` | Copy `pom/templates/AGENTS_POM_SECTION_TEMPLATE.md` into `AGENTS.md` |
| Claude Code | `CLAUDE.md` | Copy `pom/templates/AGENTS_POM_SECTION_TEMPLATE.md` into `CLAUDE.md` |
| Gemini | `GEMINI.md` | Copy `pom/templates/AGENTS_POM_SECTION_TEMPLATE.md` into `GEMINI.md` |
| GitHub Copilot | `.github/copilot-instructions.md` or `.github/instructions/pom.instructions.md` | Copy the template content into the project instructions |
| Cursor | `.cursor/rules/pom.mdc` or `.cursorrules` | Copy the template content into a project rule |
| Windsurf | `.windsurf/rules/pom.md`, `.windsurfrules`, or `AGENTS.md` | Copy the template content into a project rule |
| Kiro | `.kiro/steering/pom.md` | Copy the template content as a steering file |
| Junie | `.junie/AGENTS.md` or `.junie/guidelines.md` | Copy the template content into the project guidelines |
| Cline / Roo / Continue | tool-specific rules file or folder | Copy the template content into a POM-specific rule file |
| Other agents | Agent-specific config | Adapt the template to the agent's instructions format |

### Pre-commit Hook

`pom:init` initializes Git in the target project root when the target is not already inside a Git worktree. When the target project root is the Git worktree root, it installs a managed POM block in the resolved Git `pre-commit` hook path.

If the target project is a subdirectory inside a larger Git worktree, `pom:init` does not create a nested repository and does not install a hook automatically. Install POM from the Git root, or adapt the hook manually so it runs the target project's `npm run pom:lint` from the correct directory.

The hook is agent-neutral. It works for Claude Code, Codex, and any other workflow because it only runs local project commands.

The hook:

- runs `npm run pom:lint`;
- blocks the commit if lint fails;
- restages the generated artifacts that lint touched (folder indexes, the ADR index, `wiki/_site/`): for an artifact the project already tracks, modifications, deletions, and new files under it are staged so the commit carries the regenerated output; a generated file the project does not track yet is left unstaged and listed in a notice, so the choice to track or ignore it stays explicit;
- with `core.hooksPath` pointing at husky's shim directory (`.husky/_`), the block goes into the user hook `.husky/pre-commit`; any other custom hooks directory is respected as configured;
- if `PROJECT_STATE.md` exists and governed project-memory files are staged, prints a non-blocking reminder to update it when the restart context changed.

The hook does not synthesize or rewrite `PROJECT_STATE.md`: that remains the agent's responsibility, because it requires project understanding. Claude Code can use the optional `pom-post-action-validator` agent when installed; Codex can use `pom/skills/validate.md` for the same read-only audit.

Update `PROJECT_STATE.md` when the project restart context changes:

- substantial ADR change;
- substantial spec change;
- roadmap, priority, dependency, or current-plan change;
- important task/phase closed;
- new relevant risk, blocker, or open decision;
- explicit end-of-session or end-of-day handoff request.

Do not update it for typo fixes, regenerated indexes, small link fixes, or changes that do not affect how the next session should restart.

## Gaps And Open Decisions

- The harness table in `prompts/references/agent-harnesses.md` is a mapping and test protocol; a harness counts as verified only after a clean-session transcript.
- Overlay mode is documented in `specs/SPEC-0004-external-project-overlay.md`; its implementation requirements are still partly future work.

## Sources And Decisions

- Wiki: `wiki/adoption-and-installation.md`
- Analysis: none
- ADR: none
- Mockup: none
- Spec: `specs/SPEC-0001` (assembled agent section), `specs/SPEC-0004-external-project-overlay.md`; scripts `bootstrap-pom.mjs`, `scripts/install-pom.ts`, `templates/POM_UPDATE_TEMPLATE.mjs`
