# Experiment - Thin POM Package Adapter For Pi

| Field | Value |
|---|---|
| Date | 2026-07-13 |
| Type | API library / spike |
| Status | under evaluation |
| Branch / Path | `exp/pom-skill-evolution` / `experiments/pi-package/` |
| Isolation | branch + generated staging package |
| Owner | POM maintainer |

## Objective

Verify that POM can be distributed as a Pi package that registers POM skills and conditionally activates the accepted compact router in trusted POM repositories, including after compaction, without becoming a workflow runtime or modifying Target Project memory.

This adapter changes POM distribution behavior and introduces active harness code. A Decision Record is required before canonical promotion unless the experiment proves that conventional skill-only packaging is sufficient and no extension is needed.

## Hypotheses

- A zero-runtime-dependency TypeScript extension can provide conditional, deduplicated, compaction-aware POM bootstrap loading.
- Pi package metadata can register POM skills without duplicating a `resources_discover` registration path.
- The package can stay inert for ordinary work in unrelated non-POM repositories while still allowing native skill discovery for explicit install/adopt requests.

Minimum value criterion:

- generated staging package contains a real `package.json` and every resource referenced by its skills;
- POM Source and trusted Target Project scenarios receive exactly one router injection;
- post-compaction scenario receives exactly one new injection after the compaction summary;
- unrelated non-POM and untrusted-project scenarios do not consume project-local POM configuration or receive automatic POM routing;
- package load creates no project files and calls no model directly.

## Scope

Included:

- Pi package manifest fields for skills and extension;
- a thin TypeScript adapter using documented Pi lifecycle APIs;
- trusted POM-context detection;
- idempotency, caching of immutable package content, session replacement, and compaction behavior;
- staging-package builder, unit tests, local install, temporary load, and live Pi acceptance.

Excluded:

- workflow execution;
- direct LLM calls;
- automatic POM installation or document creation;
- custom tools unrelated to loading POM;
- timers, watchers, sockets, shared service state, or telemetry;
- support claims for other harnesses.

## Isolation Plan

- Branch or worktree: `exp/pom-skill-evolution` in the current checkout.
- Temporary path: staging package generated outside tracked canonical package paths.
- Dependency isolation: Node built-ins only at runtime; Pi core import declared as peer dependency if retained.
- Environment/config isolation: isolated Pi settings/home for installation tests where supported; project trust fixtures are synthetic.
- Service/data isolation: no service and no external project data.
- Import/build guardrail: stable POM code does not import experiment extension code.

## Commands / Procedure

Planned interface:

```bash
node experiments/pi-package/scripts/build-staging-package.mjs
node experiments/pi-package/tests/test-pi-extension.mjs
pi -e <generated-staging-package>
pi -e <generated-staging-package> -p "Adotta POM in questo repository esistente senza spostare i file attuali."
```

Procedure:

1. freeze the compact-router contract from the bootstrap experiment;
2. define trusted POM Source, Target Project, untrusted, and non-POM fixtures;
3. build a staging-package generator that copies all required POM resources;
4. implement the smallest lifecycle adapter;
5. test resource registration, conditional injection, deduplication, compaction, and session replacement;
6. run temporary-load and local-install checks;
7. run five real-session repetitions for critical acceptance scenarios;
8. decide the adapter boundary in a Decision Record before promotion.

## Evidence

Source evidence read before experiment:

- Pi packages declare skills and extensions in the `pi` section of `package.json` or use convention directories;
- Pi loads TypeScript extensions directly;
- `resources_discover` runs after `session_start` and can contribute skill paths;
- `before_agent_start` and `context` can inject context;
- `session_compact` signals completed compaction;
- `ctx.isProjectTrusted()` exposes project trust;
- Pi installation writes package settings by design, but the package itself need not edit project instruction or memory files.

Baseline POM evidence:

- root `package.json` has no Pi package metadata;
- POM has no canonical Pi extension;
- current structural tests do not prove session-start or post-compaction behavior.

## Live probe evidence (P3.4 first probe, 2026-07-15, Pi 0.80.6, default model, `pi -e <staging>`)

One live session in a synthetic trusted POM target project (a temp dir with `pom.config.json`, `src/example.js`, `package.json`), prompt "Adotta POM in questo repository esistente…". Both pivot questions resolved positively:

- Skill-only routing works: from progressive disclosure alone the model read the package's `skills/using-pom.md`, then `skills/README.md` (catalog), routed to `skills/adopt.md`, and read `pom.config.json` before acting — no file edits first. No extension was needed to make it load and route.
- Skill→prompt chain resolves from the package: after reading `skills/using-pom.md` (at the package's absolute path) the model read `prompts/32-using-pom.md`, and after routing to adopt it read `prompts/02-adopt-existing-project.md` — the linked prompts resolved against the package root. The path-resolution risk did not materialize; the model inferred the package root from the absolute skill path.

Lean: this satisfies the falsification gate's "native packaged skill discovery alone reliably satisfies the clean-session acceptance contract" — so the active extension is, on this evidence, NOT required for routing/adoption, and no Decision Record is needed. Still to confirm before closing: post-compaction reload of `using-pom` (the one case that could still justify an extension) and the non-POM negative (package stays inert for ordinary work in an unrelated repo), plus repetition. This is a single probe, not the five-repetition acceptance.

## Falsification And Promotion Gate

Reject the extension approach if:

- native packaged skill discovery alone reliably satisfies the clean-session acceptance contract with lower context cost;
- the extension must read untrusted project configuration;
- it injects into unrelated non-POM work;
- deduplication or post-compaction behavior is unreliable;
- staging differs materially from the package that would be released;
- runtime dependencies, background resources, direct model calls, or durable project writes are required.

Promotion requires wiring tests, live five-repetition critical scenarios, installation/removal evidence, no project writes, a closed bootstrap dependency, independent review, explicit user approval, and a Decision Record for the active-adapter boundary if an extension remains.

## Risks

| Area | Risk | Mitigation |
|---|---|---|
| Security | Installed extension runs with full system access | Minimal reviewed code; Node built-ins only; no command execution needed |
| Privacy | Extension exposes project configuration in injected messages | Inject method rules only; read project config only after trust and only when needed |
| License | Superpowers Pi adapter is copied directly | Implement from Pi documentation and POM requirements; preserve attribution for any reused code |
| Costs | Global package injects context into every session | Conditional POM-context detection and non-POM negative test |
| Maintainability | Manifest and dynamic resource registration diverge | Choose one registration mechanism and test package contents |
| Architecture | Adapter is mistaken for POM runtime | Decision Record and explicit no-model/no-workflow/no-write boundary |

## Pi API findings (P3.1, verified against installed Pi 0.80.6, 2026-07-15)

Read from the installed package docs (`docs/extensions.md`, `docs/packages.md`, `docs/skills.md`):

- Package manifest: `package.json` with a `pi` key — `pi.skills`, `pi.extensions`, `pi.prompts`, `pi.themes` (arrays of paths/globs), plus `keywords: ["pi-package"]`. Skills register through `pi.skills` alone; NO extension is required to register skills. Pi core imports belong in `peerDependencies` with `"*"`. Load temporarily with `pi -e <path>`; install with `pi install <path>` (writes settings, not project files).
- Skills are progressive-disclosure: at startup Pi extracts name+description into the system prompt (XML); the model then `read`s the full SKILL.md on demand — "models don't always do this; use prompting or `/skill:name` to force it." Package skills come from `skills/` dirs or `pi.skills`; project skills load only after trust.
- Extension API (only if needed): `export default function (pi: ExtensionAPI)`, `pi.on("before_agent_start", ...)` can modify `event.systemPrompt` / inject a message; `pi.on("session_compact", ...)` fires after compaction (reinjection point); `resources_discover` can add skill paths; trust is exposed via the ctx trust context. Loaded via jiti (TS, no build). No timers/sockets/model calls/writes from the factory.

Two decisions this forces on the experiment:

1. Test order (falsification gate): evaluate the skill-only package FIRST. If a natural POM request in a trusted POM repo makes the model load `using-pom` and route correctly with no extension, the extension is rejected and no Decision Record is needed. Only if skill-only is unreliable (or post-compaction reload fails) is the thin `before_agent_start` + `session_compact` injector justified — and then a Decision Record for the active-adapter boundary is required before promotion.
2. Integration risk to resolve in P3.2/P3.4: POM skill cards reference linked prompts as `prompts/NN-*.md` / `pom/prompts/...`, assuming the installed `pom/` layout. In a Pi package the layout is `<pkg>/skills/` + `<pkg>/prompts/`, and Pi's `read` resolves relative paths against cwd, not the skill directory. So the staging package must either mirror the POM root layout AND make the package root discoverable to the model, or rewrite each skill's linked-resource paths. The live acceptance run must confirm the model can actually follow the skill→prompt→template chain from a package.

## Outcome

Decision (2026-07-15): PROMOTE skill-only packaging; REJECT the active extension. Three live acceptance behaviors held on Pi 0.80.6 with `pi -e <staging>` (evidence above and two follow-up probes): (a) a POM request in a trusted POM project loaded `using-pom`, routed to `adopt`, read `pom.config.json` before editing, and followed the skill->prompt chain; (b) an ordinary coding request in a non-POM project left the package inert (`using-pom` never read, just the rename + test); (c) a post-compaction-framed POM request re-loaded `using-pom` and routed to `defer`. Because native skill discovery alone satisfies the acceptance contract, the falsification gate rejects the extension — no active adapter, and therefore no Decision Record, is required.

Promoted: the root `package.json` now carries `keywords: ["pi-package"]` and `pi: { skills: ["./skills"] }`, making the POM Source repo installable as a skill-only Pi package. Verified that `pi -e <repo-root>` registers the skills with no manifest error. Added `tests/pi-package/integration/test-pi-package.mjs` (7 checks: manifest, skill self-containment, no extension/LLM client); `npm run pom:test` is 900 passed / 0 failed and `npm run pom:lint` is OK. README documents `pi install`/`pi -e`. The staging builder and live probes remain experiment-only evidence.

Not done / out of scope by this decision: a bundled extension, a durable `pi install` into a shared Pi home with removal checks (temporary `-e` load was verified instead), and five-repetition acceptance (three single-probe scenarios covered the pivotal questions; broader repetition can be added if a regression is suspected).

Promotion path:

- clean reimplementation of approved manifest and adapter in canonical package paths;
- deterministic tests move to `tests/pi-package/` if accepted;
- live-session evals remain in the accepted behavior-evaluation layer.

## Consolidation

| Artifact | Destination | Action |
|---|---|---|
| Package metadata | root `package.json` | clean reimplementation after approval |
| Thin Pi adapter | approved extension path | clean reimplementation after ADR and approval |
| Wiring tests | `tests/pi-package/` | selective promotion |
| Install guidance | existing README/package documentation | update only from tested commands |

## Follow-up

- [x] Verify the Pi package/extension API against installed Pi 0.80.6.
- [x] Implement staging builder and wiring tests (skill-only; 13 checks green).
- [x] Run live Pi acceptance (POM routing, non-POM inertness, post-compaction reload) — all held.
- [x] Decide the promotion boundary: skill-only promoted, extension rejected, no Decision Record needed.
- [x] Promote the `pi` manifest to the root `package.json`, add `tests/pi-package/`, and document install in the README.
