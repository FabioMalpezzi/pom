# Prompt - Sync POM Framework With Project

Use this prompt when changing POM itself and a project contains POM as a
submodule or vendored folder.

```text
Sync POM framework changes with the target project.

Read:
- POM source repository status;
- target project's `pom/` status;
- target project status;
- `pom.config.json` in the target project when present.

Workflow:
1. Apply the general framework change in the POM source repository.
2. Run `npm run pom:lint` in the POM source repository when available.
3. Commit the POM source repository with a descriptive message.
4. Apply or fetch the same commit into the target project's `pom/`.
5. Ensure the target project's `pom/` points to the same commit.
6. Run `npm run pom:lint` in the target project when available.
7. Stage only the submodule pointer and directly related target-project files.
8. Commit the target project update.

Rules:
- do not mix unrelated project work into the POM framework commit;
- do not use broad staging such as `git add -A`;
- do not update project-owned templates outside `pom/` unless that is part of the request;
- if the target project has untracked or unrelated files, leave them untouched;
- if the source POM and target `pom/` diverge, stop and explain the divergence before overwriting anything.

Final report:
- source POM commit;
- target project commit;
- lint results in both places;
- remaining unrelated working-tree files, if any.
```
