# TASK-0002 - Local Wiki Reader Server

## Status

Backlog

## Origin

| Type | Reference |
|---|---|
| User need | Optional local server for the generated wiki reader |
| Reader behavior | `scripts/render-wiki.mjs` |
| Related lesson | Keep the static reader simple; do not generate one HTML source page per linked Markdown file |

## Objective

Add an optional Node-based local wiki server that can serve the generated wiki reader and render linked Markdown files on demand in memory, without creating persistent `_sources/` HTML files.

The static reader remains the default supported path. The local server is an interactive convenience layer for projects that want a richer reading and review workflow over `http://localhost`.

The Project Reader (`npm run pom:reader`, `scripts/project-reader/server.mjs`) already serves project documents over `localhost` with an annotation flow; this task is only about serving the generated wiki reader and rendering linked Markdown on demand, and must reuse that command rather than add a new one.

## Assumptions And Success Criteria

Assumptions:

- `scripts/render-wiki.mjs` keeps producing a self-contained `wiki/_site/` that works from `file://`.
- Markdown rendering can reuse the renderer already used by `scripts/render-wiki.mjs`, so no second Markdown engine is introduced.
- The server is local-only; it is not a deployment target.

Success criteria:

- The generated reader is served over `http://localhost` without changing its `file://` behavior.
- A linked project Markdown file renders as HTML in memory; no file under `wiki/_site/_sources/` or similar is ever written.
- Requests for paths outside the project root are rejected with a clear error.

## Placement

| Level | Value |
|---|---|
| Phase | Reader tooling |
| Workstream | Wiki reader |
| Task | Optional local server and Markdown viewer |

## Steps

- [ ] Confirm the supported command shape: the existing `npm run pom:reader` (`scripts/project-reader/server.mjs`), extended to serve `wiki/_site/`, instead of a new script.
- [ ] Add a Node server script that serves `wiki/_site/` over `localhost`.
- [ ] Add a dynamic Markdown viewer route that reads a project-local `.md` file and renders it to HTML in memory.
- [ ] Keep direct `file://` reader behavior unchanged and fully supported.
- [ ] Ensure the server never generates persistent HTML mirrors such as `wiki/_site/_sources/`.
- [ ] Add a review/proposal model for annotations instead of direct document mutation.
- [ ] Document the security boundary: local-only server, path traversal protection, no arbitrary filesystem reads outside the project root.
- [ ] Add integration tests for static serving, Markdown rendering, blocked unsafe paths, and no persistent generated source pages.

## Verification

### Step 0 - Goal-backward check

- [ ] The static wiki reader still works from `file://`.
- [ ] The local server serves the existing generated reader over `http://localhost`.
- [ ] Linked Markdown documents can be viewed as formatted HTML through the local server.
- [ ] No duplicate source-of-truth files are generated.
- [ ] Annotation or modification flows produce explicit proposals, not silent edits.

### Scenario tests

- [ ] Positive case: a wiki page link to a project Markdown file opens in the local Markdown viewer.
- [ ] Positive case: the generated static reader continues to work without the server.
- [ ] Error case: a path outside the project root is rejected.
- [ ] Error case: a missing Markdown file returns a clear reader error.

### Cross-cutting checks

- [ ] Security/privacy review covers local file access and path traversal.
- [ ] Documentation explains that Markdown files remain canonical and server-rendered HTML is transient.

## Risks And Privacy/Security

| Risk | Mitigation |
|---|---|
| Local server reads files outside the project | Resolve and validate every requested path against the project root |
| Viewer becomes a second source of truth | Render in memory only; never write mirrored HTML files |
| Annotation flow mutates governed docs silently | Store proposals explicitly and require a separate review/apply step |
| Feature makes the static reader fragile | Keep `pom:wiki:render` independent from `pom:reader` |

## Test Structure

| Item | Value |
|---|---|
| Existing test structure | Integration tests under `tests/<area>/integration/`; wiki reader tests under `tests/wiki-reader/integration/` |
| Chosen structure | existing |
| E2E test path | not planned; integration tests drive the server in-process |
| Fixture path | `tests/wiki-reader/fixtures/` (to create when the task starts) |
| Evidence path | `tests/wiki-reader/evidence/` (to create when the task starts) |

## User Use Cases

- As a project reader, I want to open the generated wiki over `http://localhost`, so that links to project Markdown files render as pages instead of downloading raw files.
- Positive case 1: a wiki page link to `specs/SPEC-0006-workflow-modeling.md` opens as formatted HTML in the local viewer.
- Positive case 2: the generated static reader keeps working from `file://` with the server stopped.
- Handled-error case: a request for `../../etc/passwd` or any path outside the project root is rejected with a clear error and nothing is read.

## Outcome

Not started. This task captures the future option; it does not approve the implementation yet.

## Done Criteria

- [ ] Steps completed
- [ ] Verifications run
- [ ] README or wiki reader docs updated
- [ ] Security constraints documented
