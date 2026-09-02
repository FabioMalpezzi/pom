---
name: release
description: Use when a version must be closed - changelog, version references, checksums, tag, and the memory updates that go with a release.
---

# Skill - release

## When To Use

- Accumulated changes must become a numbered version with a changelog section, a tag, and aligned version references.
- The user asks "what has changed since the last release?" or "can we release this?".
- A release was skipped for a long time and unreleased history must be reconciled with the changelog.

Not for: closing a single branch (`finish-branch`), deciding what to build next (`plan`), or publishing documentation without a version.

## Canonical Prompt

`prompts/36-release.md`

## Key Rules

- A release starts from a clean, verified state: working tree clean, lint and tests green, branches already closed through `finish-branch`.
- The changelog is reconciled against the real history (`git log <last-tag>..HEAD`) before the version number is chosen; nothing shipped stays undocumented and nothing documented stays unshipped.
- Every place that prints the version changes in the same commit; the prompt lists the POM Source set and how to find the Target Project set.
- Checksums published for installable files are regenerated from the released content and verified before tagging.
- Tags are annotated and never moved once pushed; a mistake after push means a new version.
- Pushing the release is a separate, explicit approval.
- `PROJECT_STATE.md` and the wiki log record the release as a restart point.

## Memory Impact

`release` turns a stretch of Git history into a durable, citable version. It updates the changelog, version references, project state, and wiki log; it does not rewrite past release notes.

## Output

- version chosen and why (patch, minor, major);
- changelog section for the version;
- files with version references updated;
- checksum and verification evidence;
- commit and tag names, and whether they were pushed.
