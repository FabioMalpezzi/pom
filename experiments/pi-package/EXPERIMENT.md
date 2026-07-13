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

## Outcome

Decision: pending. Active extension promotion requires a Decision Record; no canonical package metadata or extension will be changed before the experiment closes.

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

- [ ] Wait for the accepted compact-router contract.
- [ ] Define package fixtures and staging manifest template.
- [ ] Implement staging builder and wiring tests.
- [ ] Run live Pi acceptance and decide promotion boundary.
