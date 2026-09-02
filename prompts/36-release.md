# Prompt 36 - Release a Version

Close a numbered version of the POM Source repository or of a Target Project governed by POM. The procedure reconciles the changelog with real history, aligns every version reference, verifies, tags, and records the release in project memory.

## Goal

A tag that any reader can trust: the changelog section describes exactly what the tag contains, every printed version agrees, published checksums match the released files, and the project state says the release happened.

## Preconditions

1. The working tree is clean and the current branch is the one releases are cut from (usually `main`). Open branches were closed with `skills/finish-branch.md`.
2. `npm run pom:lint` (when configured) and the project test command are green now, not from memory.
3. `pom.config.json` is read: ownership mode `external_overlay` forbids releasing an upstream project through POM; stop and say so.

## Procedure

1. **Find the last release.** `git describe --tags --abbrev=0` or the last `## <version>` heading in the changelog. If none exists, the release is the first and starts from the initial commit.
2. **Reconcile history and changelog.** List `git log --oneline <last-tag>..HEAD`. For each commit, confirm the changelog has an entry under `Unreleased` (or the equivalent section) or decide, explicitly, that it is internal and needs none. Add missing entries in the changelog's own style. Remove or correct entries that describe something not in the history.
3. **Choose the version.** Semantic versioning by contract: a change in what a Target Project sees (installed templates, skills, prompts, lint rules, scripts, config shape) is at least a minor version; a method or contract removal is a major version; fixes only are a patch. State the choice and the reason.
4. **Move the changelog section.** `Unreleased` becomes `## <version> - <YYYY-MM-DD>`. Leave an empty `Unreleased` placeholder only if the changelog convention wants one.
5. **Align version references in one commit.** POM Source: `package.json`, `package-lock.json` (both `version` fields), `README.md` (`Version:` line), `templates/POM_CONFIG_TEMPLATE.json` (`pomVersion`), the root `pom.config.json` (`pomVersion`), `wiki/index.md` (`Last updated` line). Target Project: search for the previous version string across manifests and documents (`git grep "<previous-version>"`) and update every occurrence that prints the version, leaving historical mentions untouched.
6. **Regenerate published checksums.** POM Source: `shasum -a 256 bootstrap-pom.mjs > checksums/bootstrap-pom.mjs.sha256`, then `shasum -a 256 -c checksums/bootstrap-pom.mjs.sha256`. Target Project: any checksum file the project publishes for installable artifacts.
7. **Verify again.** Run lint and tests on the release commit content. If the wiki is enabled, run `npm run pom:lint` so the reader is regenerated with the new index line.
8. **Record the release in memory.** `PROJECT_STATE.md`: update `Last Updated` and the current state with the version; `wiki/log.md`: append a dated `update` entry naming the version and pointing to the changelog.
9. **Commit and tag.** One commit, for example `release: <version>`, then an annotated tag `v<version>` whose message summarizes the release in one line.
10. **Push only with explicit approval.** `git push origin <branch>` and `git push origin v<version>`. A pushed tag is never moved; a mistake found afterwards becomes the next version.

## Output

- version, reason, and the changelog section;
- list of files with version references updated;
- checksum verification output;
- lint and test results on the release commit;
- commit and tag names; pushed or not, and why.

## Anti-patterns

- Tagging before the changelog is reconciled with the history.
- Bumping the version in one file and forgetting the others.
- Moving or deleting a pushed tag.
- Releasing with a dirty tree or with tests run only earlier in the session.
- Closing a release while the changelog still contains promises about work that is not in the tag.
