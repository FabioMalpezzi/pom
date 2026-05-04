---
name: sync
description: Use this skill to align a target project's pom/ folder with the latest POM source repository after a framework-level change.
---

# Skill - sync

## When To Use

- POM framework files changed and a project has POM installed as `pom/`.
- A project submodule or vendored POM copy must be aligned with the source POM repository.
- The user asks to apply a POM improvement both locally and to the official POM project.

## Canonical Prompt

`prompts/17-sync-pom-framework.md`

## Quick Start

To refresh an existing installation to the latest POM version:

```bash
npm run pom:init -- --profile refresh
# or, from the target project root:
node bootstrap-pom.mjs --profile refresh
```

Use this skill when a framework-level change must be applied to both the POM source repository and a target project's `pom/`, or when the refresh command alone is not sufficient.

## Rules

- Commit the POM source repository first.
- Align the target project's `pom/` to the same commit.
- Run `npm run pom:lint` in both places when available.
- Stage selectively; never use broad staging for unrelated project files.
- Leave unrelated untracked files untouched.

## Output

- POM source commit;
- target project commit;
- lint results;
- any remaining divergence or unrelated working-tree files.
