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
npm run pom:update
```

If `pom:update` stops because `pom/` has local changes, inspect them and continue with the full sync workflow below. On clean vendored copies, `pom:update` can replace `pom/` from the source POM repository while ignoring unrelated parent-project changes outside `pom/`.

If `pom:update` is not installed yet and `pom/` is clean, `node bootstrap-pom.mjs --profile refresh` installs the current updater because the bootstrap lives outside `pom/`. For projects that only have a vendored `pom/` and no root bootstrap yet, refresh from the source POM repository first, then run `npm run pom:init -- --profile refresh`.

Do not rely on `npm run pom:init -- --profile refresh` as the only updater when `pom/scripts/install-pom.ts` may have changed. That command starts from the currently installed installer; use `pom:update`, update `pom/` first, or use the bootstrap path.

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
