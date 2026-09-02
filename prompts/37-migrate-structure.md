# Prompt 37 - Migrate Project Structure Toward Canonical Roots

Move existing documents or folders of an adopted project toward the POM canonical layout without losing references, history, or verification. Adoption maps the current structure; migration is the later, explicit decision the README describes, and it is never a prerequisite for using POM.

## Goal

After the migration, every governed module lives in one root, `pom.config.json` describes the real layout, no link or index points to an old path, and lint and tests report at least what they reported before.

## Preconditions

1. `pom.config.json` exists and maps the current structure (`skills/adopt.md` and `skills/config.md` are done).
2. `ownership.mode` is `owned` or `team`. With `external_overlay` stop: upstream structure is not POM's to change.
3. The working tree is clean and the migration has its own branch (`chore/migrate-<module>` or similar).

## Procedure

1. **Inventory.** For each module (documentation, decisions, task plans, analysis, wiki, tests, source) list the current root from `pom.config.json` and the canonical default (`docs/`, `decisions/`, `tasks/`, `analysis/`, `wiki/`, `tests/`, `src/`). Note duplicates (two roots for one module) and content that does not belong to any module.
2. **Find dependents.** For each root that may move, search the repository for its path: Markdown links, `pom.config.json`, generated indexes, CI and build files, scripts, import paths, `wiki.html`, agent instruction files. Keep the list; it becomes the checklist of the move.
3. **Decide per module.** `keep` when the config mapping is enough; `move` when a single convention or simpler tooling justifies it; `split` when one folder mixes modules. Write the options and the recommendation in an Open Discussion; when the change is consequential (shared team conventions, published paths), record the decision in an ADR. Get explicit approval before touching files.
4. **Baseline.** Run `npm run pom:lint` and the project tests. Record error and warning counts and the test summary.
5. **Move one module.** Use `git mv` so history follows. Update, in the same commit: the module root in `pom.config.json`; every dependent found in step 2; generated indexes (rerun lint, which regenerates them); the pre-commit hook with `npm run pom:init -- --profile refresh`; CI paths. For tests, first confirm the approval the config requires (`tests.requireApprovalBeforeMigratingExistingTests`).
6. **Verify the module.** Lint and tests again; compare with the baseline. Open the moved pages through the Project Reader or the wiki reader when applicable. Search once more for the old path; the only remaining hits should be historical (changelog, closed ADRs, wiki log).
7. **Repeat** for the next approved module. Do not interleave feature work.
8. **Record.** Update `PROJECT_STATE.md` (what moved, what is left), append a wiki log entry, and link the ADR or Open Discussion. Close the branch with `skills/finish-branch.md`.

## Output

- inventory table: module, current root, canonical root, decision, approval reference;
- dependents checklist per moved module, all ticked;
- baseline and post-migration lint and test results;
- commit list, one per module;
- open points outside the repository (external links, deployment paths, documentation portals).

## Anti-patterns

- Moving folders during adoption "while we are at it".
- Migrating tests without the approval the configuration requires.
- Updating `pom.config.json` after the move instead of in the same commit, leaving lint blind in between.
- Leaving the old root as an empty folder or a symlink without a decision.
- Treating a mapping problem as a migration problem: if the only issue is that lint does not see a folder, `config` is the skill.
