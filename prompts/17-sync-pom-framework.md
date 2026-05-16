# Prompt - Refresh Or Sync POM Framework With Project

Use this prompt when a target project already contains POM as `pom/` and must be refreshed, or when a change made in the POM source repository must be propagated to that target project.

```text
Refresh or sync POM in the target project.

Read:
- target project status;
- target project's `pom/` status;
- `pom.config.json` in the target project when present.
- POM source repository status only when the request includes a framework-level POM change.

Choose the mode:

A. Refresh installed POM
- Use when the target project just needs the latest approved POM version.
- Prefer `npm run pom:update`.
- If `pom:update` stops, inspect the local `pom/` changes before pulling.

B. Sync framework change
- Use when the POM source repository was changed in this session or must be aligned to a specific POM commit.
- Commit and push source POM first, then move the target project's `pom/` to that same commit.

Detect the installation shape:
- submodule: `.gitmodules` contains `pom` or `git ls-files --stage pom` shows mode `160000`;
- nested Git checkout: `pom/` has Git metadata but is not staged as a submodule;
- vendored copy: `pom/` has no usable Git metadata.

Preflight:
1. Run `git status --short --branch` in the target project.
2. Run `git -C pom status --short --branch` when `pom/` is a Git checkout or submodule.
3. If `pom/` has local changes, inspect them before pulling.
   - If they are reusable POM improvements, move them to the source POM repository and commit them there first.
   - If they are target-project customizations, move them outside `pom/` and map them in `pom.config.json` when appropriate.
   - If they are obsolete local experiments, ask before discarding; otherwise stash them with a descriptive message before updating.

Update workflow:
1. If mode B, apply the framework change in the POM source repository.
2. Run `npm run pom:lint` in the POM source repository when available.
3. Commit and push the POM source repository when mode B created source changes.
4. For a simple refresh, run `npm run pom:update` from the target project root and inspect the result. This works for Git-managed installs and for clean vendored `pom/` copies.
5. If `pom:update` is not available or stops, update the target project's `pom/` before running the installer:
   - for a submodule or nested Git checkout, prefer `git -C pom pull --ff-only origin main`, or checkout the exact source POM commit if one was selected;
   - for a vendored copy with local changes under `pom/`, do not overwrite automatically; replace from the source POM repository only after approval and after preserving local changes.
6. Run `npm run pom:init -- --profile refresh` from the target project root when `pom:update` did not already do it.
7. Run `npm run pom:lint` in the target project when available and not already run by `pom:update`.
8. Inspect the diff:
   - expected files are the `pom` pointer or vendored `pom/`, supported agent instruction files, package scripts, hook updates, and possibly `PROJECT_STATE.md`;
   - unexpected source-code or project-document changes must be explained before staging.
9. Update `PROJECT_STATE.md` only if the restart context changed, for example the project now depends on new POM operating rules.
10. Stage selectively. Never use broad staging such as `git add -A`.
11. If requested by the user or required by the local workflow, commit the target project update.

Important note:
- `npm run pom:update` is the normal path. It stops if `pom/` has local changes and suggests this sync workflow. For vendored copies, only changes under `pom/` are blocking; unrelated parent-project changes are preserved.
- `npm run pom:init -- --profile refresh` starts from the installer already present in `pom/`. If the installer itself may have changed, use `pom:update` or update `pom/` first.
- If `pom:update` is missing and `pom/` is clean, `node bootstrap-pom.mjs --profile refresh` can install the current updater because the bootstrap lives outside `pom/`.

Rules:
- do not mix unrelated project work into the POM framework commit;
- do not use broad staging such as `git add -A`;
- do not update project-owned templates outside `pom/` unless that is part of the request;
- if the target project has untracked or unrelated files, leave them untouched;
- if the source POM and target `pom/` diverge, stop and explain the divergence before overwriting anything;
- do not leave a dirty `pom/` working tree as the final state unless the user explicitly chooses to keep a local divergence.

Final report:
- source POM commit, when used;
- target project's final POM commit;
- target project commit, if created;
- lint results in both places;
- remaining local changes, stashes, or unrelated working-tree files, if any.
```
