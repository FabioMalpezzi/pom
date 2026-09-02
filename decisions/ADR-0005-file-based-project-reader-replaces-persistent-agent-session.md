# ADR-0005 - File-Based Project Reader Replaces The Persistent Agent Session

| Field | Value |
|---|---|
| Date | 2026-09-02 |
| Status | Accepted |
| Category | architecture |
| Area | wiki / AI / integrations |
| Summary | The POM reading surface is the local Project Reader with file-based annotations that a coding agent claims from the repository; a persistent connection to an active agent session is not pursued and ADR-0001 is superseded |
| Replaces | ADR-0001 |
| Replaced by | none |
| Driver | technical constraint |
| Scope | wiki / AI / integrations |

## Context

ADR-0001 chose a persistent connection to an active AI coding agent session as the primary path for a web wiki, with Codex `app-server` or `remote-control` as the first adapter to evaluate. Its two follow-ups — a spike task for the persistent session and a check that Codex can receive wiki events without rebuilding context — were never executed, and SPEC-0005, which depends on that decision, stayed a Draft.

What was built instead is recorded in `experiments/wiki-agent-orchestration/EXPERIMENT.md`: on 2026-05-20 the Project Cockpit direction and the adapters toward persistent agent sessions were judged too broad for POM's purpose, and the active target was reduced to a local reader with deterministic `rg` search, annotations saved as JSON files in the repository, and one command with which a coding agent takes the next open annotation in charge. That lightweight target was promoted on 2026-05-24 as supported tooling under `scripts/project-reader/`, later extended with a reusable core, POM and generic adapters, lazy directory loading, a command palette, and a standalone `project-reader open/search` CLI (see `CHANGELOG.md` 0.3.0). The `reader-notes` skill and `scripts/lib/lint-reader-notes.ts` route open annotations to an agent through the ordinary POM workflow.

The repository therefore contains no web wiki agent extension, no session adapter, and no streaming integration, while the decision record still says that such an integration is the primary path. The contradiction must be closed explicitly rather than by leaving ADR-0001 Accepted with open follow-ups.

## Decision

The POM reading and annotation surface is the local Project Reader with file-based annotations. Its contract is:

- the reader serves repository documents and searches them with `rg`; it does not edit source files in the browser;
- a user records questions, corrections, and requests as annotation JSON files under the configured annotation directory (`.pom-reader/annotations/` by default);
- a coding agent reads, claims, and resolves those files from the repository (`node scripts/project-reader/wiki-tools.mjs claim-next`, `skills/reader-notes.md`), inside its ordinary session and with its ordinary approval and verification rules;
- every change to durable memory goes through the normal POM proposal, approval, and lint path; the reader never writes wiki, specs, ADRs, task plans, or code.

A persistent connection between the reader and an active agent session is not pursued. ADR-0001 is superseded by this decision. SPEC-0005 is deferred; it is reactivated only by a new decision record that names a concrete target project need, an agent that exposes a compatible persistent-session interface, and the privacy and approval rules for LLM-driven proposals.

## Rationale

The problem ADR-0001 wanted to solve — an agent that does not reload the project context for every wiki interaction — is solved by keeping the agent where it already is. The agent session that owns the working context is the one the user is already running in the terminal; the reader hands it work through files in the repository instead of opening a second channel to it. That keeps POM within its boundary: Operating Memory in verifiable files, no runtime, no LLM client, no server that must stay alive for the memory to work.

The file-based path also preserves what ADR-0001 valued in the file/event baseline: proposals stay observable and testable, and every step leaves a trace in Git. What it drops is the part that was never built and that would have made POM depend on one agent vendor's session protocol.

## Alternatives Considered

| Alternative | Reason Rejected |
|---|---|
| Keep ADR-0001 Accepted and schedule the persistent-session spike | The reader work since the scope correction produced no need for it; keeping an Accepted decision with unexecuted follow-ups misrepresents the state of the method. |
| Build the persistent-session adapter for one agent now | No target project has asked for it; it binds POM to a vendor session protocol and adds a server-side runtime that POM's constraints exclude. |
| Expose POM tools over MCP as the reader's agent channel | MCP can expose POM capabilities later (`skills/mcp-interface.md` exists for that design work), but it does not remove the need for a live session and is not required for the file-based contract to work. |
| Add LLM querying directly to the reader | Introduces provider configuration, privacy, and write-approval questions that belong to a separate experiment, as `wiki/experiments-and-extension.md` already records. |

## Impacts

| Area | Impact |
|---|---|
| Wiki | `wiki/experiments-and-extension.md` and `wiki/reader-capabilities.md` already describe the file-based reader as the promoted shape; `wiki/current-specs.md` must show SPEC-0005 as deferred and ADR-0001 as superseded. |
| Docs | Reader documentation in `scripts/project-reader/README.md` is the operating reference; no web wiki agent extension is documented as available. |
| Mockup | none. |
| Analysis | none. |
| Product | The reader stays optional tooling; adoption profiles are unaffected. |
| Technical | No session adapter, streaming channel, or MCP server is added to POM Source. |

## Links

- Wiki: `wiki/experiments-and-extension.md`, `wiki/reader-capabilities.md`
- Analysis: none
- Mockup: none
- Docs: `scripts/project-reader/README.md`
- Superseded decision: `decisions/ADR-0001-persistent-coding-agent-session-for-web-wiki.md`
- Deferred spec: `specs/SPEC-0005-web-wiki-agent-extension.md`
- Experiment: `experiments/wiki-agent-orchestration/EXPERIMENT.md`
- Baseline task: `tasks/TASK-0003-codex-web-wiki-baseline.md`

## Follow-up

- [x] Mark ADR-0001 as Superseded with this ADR as replacement.
- [x] Mark SPEC-0005 as Deferred with the reactivation criteria stated above.
- [ ] Align `wiki/current-specs.md` with the new ADR and spec statuses.

## Completion Verification

This ADR cannot be marked Accepted without passing semantic validation. Verification is mandatory and automatic.

### Step 0 — Goal-backward check (always first)

- [x] What must be TRUE for this decision to be valid?
  - The file-based reader exists as supported tooling: `scripts/project-reader/` with `wiki-tools.mjs` (`search`, `claim-next`, `history`) and `tests/project-reader/`.
  - No persistent-session adapter or web wiki agent extension exists in the repository: no script, skill, prompt, or template references Codex `app-server` or `remote-control`; the only mentions are ADR-0001, SPEC-0005, and the `experiments/wiki-agent-orchestration/` record.
  - The reader's annotation handoff reaches an agent through the ordinary POM workflow: `skills/reader-notes.md`, `prompts/26-process-reader-notes.md`, and the `lint-reader-notes` warning.
  - Durable memory is never written by the reader itself.
- [x] For each truth, does supporting evidence or reasoning EXIST? Yes: the files named above and the experiment's scope correction and promotion notes.

### Thesis (at least 1 required)

- Thesis 1: A user reading a wiki page in the Project Reader notices an outdated statement, saves an annotation with the selected text and a note, and continues working. In the terminal session that already holds the project context the agent runs `claim-next`, reads the annotation and the current sources, and proposes the correction through the normal approval path. The context is not reloaded, no second channel to the agent is needed, and the whole exchange is visible in the repository.

### Antithesis (at least 1 required — each must be confuted)

| Antithesis | Confutation |
|---|---|
| Without a live session the reader is just a static site; the value ADR-0001 promised (coherent, low-latency answers) is lost. | The agent session is still live — it is the terminal session the user already runs. The annotation file is the event; the agent consumes it with full context. Latency moves from a socket to a `claim-next` call, which the experiment's phase-1 criteria accepted as the minimal verifiable loop. |
| A file-based handoff lets an agent modify memory unsupervised, because nothing gates what it does with an annotation. | The annotation only carries the request; the agent's writes remain subject to Artifact Policy, approval, and `pom:lint`, exactly as for any other request. The reader adds no write path, so it adds no unsupervised path. |
| Superseding ADR-0001 throws away the baseline work in TASK-0003. | TASK-0003 is Complete and its event/proposal contract is preserved as experiment evidence and reused by the annotation format; only the unbuilt streaming target is dropped. |

### Exception

Exception reason: _none_

## Evolution Rule

Fine-grained history lives in Git. If this decision changes substantially, create a new ADR that supersedes or replaces it instead of retroactively rewriting the decision.
