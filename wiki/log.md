# POM Wiki Log

## Summary

This log records root wiki changes for the POM source repository. It keeps update history out of the topic pages while preserving the reason for meaningful wiki changes.

## [2026-05-17] init | promote root POM wiki and reader

Promoted the reader-view experiment into a stable root `wiki/` and added generated HTML output under `wiki/_site/`.

Sources used: `README.md`, `CONTEXT.md`, `WIKI_METHOD.md`, `skills/README.md`, `prompts/README.md`, `templates/`, `scripts/`, and `specs/`.

## [2026-05-17] update | auto-render reader after wiki changes

Updated `pom:lint` so it regenerates `wiki/_site/` at the end only when Git reports changed Markdown pages under `wiki/`.

Sources used: `scripts/lint-doc-governance.ts`, `README.md`, and `scripts/pom-help.ts`.
