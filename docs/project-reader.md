# POM Project Reader

## Purpose

The POM Project Reader is a supported local web server for browsing a repository without turning generated HTML into a new source of authority. This document describes how to start it, what it can show and search, how annotations work, and how a coding agent picks up annotations as handoff artifacts.

## Audience

Technical: maintainers who browse a project in the browser, and coding agents that process Project Reader annotations or drive the reader through cmux.

## Content

### Starting The Server

By default, the reader uses the current working directory as the project root and port `4173`; pass `--root` or `--dir` and `--port` when you want to choose them explicitly.

Project-wide content search requires `rg` from ripgrep. Annotation files default to `.pom-reader/annotations/` under the project root; pass `--annotations-dir` to use a different working directory for annotation handoff files.

From the POM Source repository:

```bash
npm run pom:reader -- --port 4173
```

From a target project where POM is installed under `pom/`:

```bash
npm run pom:reader -- --port 4173
```

Explicit form:

```bash
node pom/scripts/project-reader/server.mjs --port 4173 --root . --annotations-dir .pom-reader/annotations
```

Standalone CLI form:

```bash
project-reader --root . --port 4173
project-reader open wiki/overview.md --port 4173
project-reader search "Operating Memory" --root .
```

Then open:

```text
http://127.0.0.1:4173
```

If a coding-agent sandbox reports `EPERM` or `EACCES` while binding `127.0.0.1`, the local environment blocked the server start. Approve the local-server startup request or run the command in a normal terminal; once the URL responds, no POM update or project repair is implied by that first failure.

### Profiles And Configuration

The reader starts from `wiki/index.md` when the project has a wiki. If the project has no wiki index, it shows a generated `POM Project Reader` entry page and still exposes project documentation and source files through an explicit allowlist.

The reader is split into a reusable core and profiles. In `auto` mode it first honors `.project-reader.json`, then uses the POM profile when `pom.config.json` or the POM Source structure is present, otherwise falls back to common roots such as `README.md`, `docs/`, `src/`, and `tests/`. The POM profile classifies `documentation.officialRoot` and `documentation.existingRoots` as project documents, `decisions.root` as decisions, `taskPlans.root` as task plans, `analysis.root` as analysis, `source.roots` as source, and `tests.root` as tests. It also respects generated-output exclusions from `artifactPolicy.generated` in navigation and search. If a config exists but is invalid JSON, the server fails loudly instead of guessing. The UI shows which profile and config mode are active.

### What It Shows And Searches

- wiki pages, README, context, docs, specs, decisions, task plans, prompts, skills, templates, examples, selected experiment files, scripts, tests, `bootstrap-pom.mjs`, and `package.json`;
- thematic navigation and project-tree navigation;
- direct file opening with URLs such as `http://127.0.0.1:4173/?path=wiki/overview.md`;
- command palette for direct path open, file lookup, and content search;
- collapsible or pinned navigation and annotation side panels;
- project-wide `rg` search with optional regex mode;
- search inside the open file, with optional regex mode;
- a responsive document surface that keeps prose readable while giving code blocks and tables more room on large screens;
- Markdown tables, fixed-width text blocks, syntax-highlighted code, source line numbers where they are useful, and English/Italian interface labels;
- local safety guards: rendering rejects files above 1 MB and binary-looking files, while project search skips files above 1 MB.

For large repositories, the project tree uses a lazy API: expanding `src/server` reads `/api/tree?path=src/server` instead of building one global tree first. The thematic list loads progressively and renders through a virtualized window instead of one DOM button per file. The reader can open the wiki or a direct `?path=` URL immediately, and project search remains available during loading.

### Driving The Reader From cmux

cmux can drive the reader by opening the direct URL in a browser surface:

```bash
project-reader open wiki/overview.md --port 4173 --cmux
cmux browser open "http://127.0.0.1:4173/?path=wiki/overview.md"
```

For a single Markdown file outside the Project Reader UI, cmux also provides:

```bash
cmux markdown open wiki/overview.md
```

### Annotations

Annotations are file-based. The UI saves JSON work files under the configured annotation directory. Treat this as runtime evidence and keep it out of commits unless the project intentionally wants to archive an annotation. If you choose a custom annotation directory, add it to the target project's ignore rules.

The annotation panel has "New note", "In progress", and "Processed" tabs. It can send selected document text into a note, show the JSON work file on demand, and reopen the target document when an annotation is selected. Browser-based source editing is not part of the current workflow.

`pom:lint` warns when the default `.pom-reader/annotations/` directory contains working annotations. The warning routes agents to `skills/reader-notes.md`; lint does not process the notes itself.

A coding agent can read the next open annotation from the same project root:

```bash
node scripts/project-reader/wiki-tools.mjs claim-next --by codex
```

When the server uses a custom annotation directory, pass the same directory to the CLI:

```bash
node scripts/project-reader/wiki-tools.mjs claim-next --by codex --annotations-dir .pom-reader/annotations
```

When the CLI is being used from an installed `pom/` folder, prefix the script path with `pom/`. The UI does not talk directly to an AI agent; the annotation file is the handoff artifact, and durable document changes still need a separate reviewed edit.

### Security Posture

The server binds to `127.0.0.1` and sends restrictive browser security headers. It is still a local repository browser; do not expose it on a shared network without a separate threat model.

## Gaps And Open Decisions

- Browser-based source editing is out of scope; annotations are the only write path, and they are handoff artifacts, not document edits.
- Exposure beyond `127.0.0.1` would need its own threat model.

## Sources And Decisions

- Wiki: `wiki/reader-capabilities.md`
- Analysis: none
- ADR: none
- Mockup: none
- Spec: `scripts/project-reader/README.md`, `scripts/project-reader/server.mjs`, `scripts/project-reader/core.mjs`, `scripts/project-reader/wiki-tools.mjs`, `skills/reader-notes.md`
