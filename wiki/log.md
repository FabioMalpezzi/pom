# POM Wiki Log

## Summary

This log records root wiki changes for the POM source repository. It keeps update history out of the topic pages while preserving the reason for meaningful wiki changes.

## [2026-05-17] init | promote root POM wiki and reader

Promoted the reader-view experiment into a stable root `wiki/` and added generated HTML output under `wiki/_site/`.

Sources used: `README.md`, `CONTEXT.md`, `WIKI_METHOD.md`, `skills/README.md`, `prompts/README.md`, `templates/`, `scripts/`, and `specs/`.

## [2026-05-17] update | auto-render reader after wiki changes

Updated `pom:lint` so it regenerates `wiki/_site/` at the end only when Git reports changed Markdown pages under `wiki/`.

Sources used: `scripts/lint-doc-governance.ts`, `README.md`, and `scripts/pom-help.ts`.

## [2026-05-17] update | document wiki reader lifecycle

Documented the wiki reader lifecycle in `README.md` and `wiki/wiki-method.md`, including the conditional lint-triggered regeneration flow and a Mermaid lifecycle diagram.

Sources used: `README.md`, `wiki/wiki-method.md`, `wiki/reader-capabilities.md`, and `scripts/lint-doc-governance.ts`.

## [2026-05-17] update | exclude log from reader output

Kept `wiki/log.md` as the chronological register but excluded it from generated reader pages, navigation, pager flow, and search index.

Sources used: `scripts/render-wiki.mjs`, `README.md`, `wiki/wiki-method.md`, and `wiki/reader-capabilities.md`.

## [2026-05-17] update | add root wiki reader shortcut

Added `wiki.html` as the stable root shortcut for POM and target projects with wiki-enabled profiles.

Sources used: `README.md`, `scripts/install-pom.ts`, `templates/WIKI_READER_SHORTCUT.html`, `wiki/wiki-method.md`, and `wiki/reader-capabilities.md`.

## [2026-05-17] update | add missing-reader guidance

Updated the root wiki shortcut so it no longer blindly redirects when the generated reader may be missing. It now explains how to enable or build the POM wiki before rendering.

Sources used: `wiki.html`, `templates/WIKI_READER_SHORTCUT.html`, `README.md`, and `wiki/reader-capabilities.md`.
