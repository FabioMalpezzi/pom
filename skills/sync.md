---
name: sync
description: Use this skill to refresh or sync an existing POM installation in a target project, especially when the project already has a pom/ folder, a POM submodule, or POM source changes must be propagated safely.
---

# Skill - sync

## When To Use

- A project already has POM installed as `pom/` and the user asks to update, refresh, or align it.
- POM framework files changed and the target project's `pom/` must move to the new POM commit.
- A POM submodule, nested Git repo, or vendored POM copy has local changes that must be inspected before updating.
- The user asks to apply a POM improvement both locally and to the official POM project.

## Canonical Prompt

`prompts/17-sync-pom-framework.md`

## Modes

Use the smallest mode that fits:

- **Refresh installed POM**: update an existing target project to the latest approved POM version.
- **Sync framework change**: after changing the source POM repository, move one or more target projects to that exact POM commit.

## Quick Start

For an existing target project, update `pom/` before running the refresh installer:

```bash
git status --short --branch
git -C pom status --short --branch
# inspect and resolve local pom/ changes before pulling
git -C pom pull --ff-only origin main
npm run pom:init -- --profile refresh
npm run pom:lint
```

If `bootstrap-pom.mjs` is present, `node bootstrap-pom.mjs --profile refresh` is also valid because the bootstrap lives outside `pom/` and updates POM before launching the installer.

Do not rely on `npm run pom:init -- --profile refresh` as the only updater when `pom/scripts/install-pom.ts` may have changed. That command starts from the currently installed installer; update `pom/` first, or use the bootstrap path.

## Rules

- Inspect local changes in `pom/` before updating. Do not overwrite or discard them silently.
- Keep project-specific customizations outside `pom/`; map them through `pom.config.json` when needed.
- For source POM changes, commit and push the POM source repository first, then align the target project's `pom/` to the same commit.
- Run `npm run pom:lint` in both places when available.
- Stage selectively; never use broad staging for unrelated project files.
- Update `PROJECT_STATE.md` only when the restart context changed.
- Leave unrelated untracked files untouched.

## Output

- POM commit used by the target project;
- target project commit, if created;
- lint results;
- any remaining divergence or unrelated working-tree files.
