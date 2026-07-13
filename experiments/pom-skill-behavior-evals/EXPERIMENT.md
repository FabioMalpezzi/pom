# Experiment - Real Behavioral Evaluations For POM Skills

| Field | Value |
|---|---|
| Date | 2026-07-13 |
| Type | LLM model / benchmark / research |
| Status | under evaluation |
| Branch / Path | `exp/pom-skill-evolution` / `experiments/pom-skill-behavior-evals/` |
| Isolation | branch + experiment-local runner and fixtures |
| Owner | POM maintainer |

## Objective

Determine whether real agent sessions can evaluate POM skill routing, source reads, action ordering, adoption guards, and completion claims more reliably than the current structural fixtures. This experiment supplies the baseline and evaluator used by the bootstrap, Task Plan, and Pi-package experiments in `tasks/TASK-0004-behavior-bootstrap-task-contracts-pi-package.md`.

## Hypotheses

- A scenario contract combining deterministic filesystem assertions with transcript checks can distinguish compliant routing from plausible but unsafe behavior.
- A deliberately broken POM variant will fail at least one critical scenario; if it does not, the evaluator is not fit for promotion decisions.
- Five fresh sessions per critical scenario will expose variance hidden by one-shot smoke tests.

Minimum value criterion:

- dry-run validation proves every fixture is isolated and complete;
- the evaluator records pass, fail, skipped, timed-out, and indeterminate outcomes;
- at least one planted routing or safety violation is detected;
- baseline runs can be reproduced with the same POM commit, Pi version, model, and scenario set.

## Scope

Included:

- English and Italian routing scenarios;
- enabled and disabled adoption modules;
- `using-pom` followed by the selected skill and canonical prompt;
- evidence-first debugging, defer routing, completion verification, ambiguity handling, and post-compaction routing;
- Pi as the first real-session backend;
- deterministic assertions, sanitized transcripts, and provider usage metadata when available.

Excluded:

- claims about unsupported harnesses or models;
- CI runs that require committed credentials;
- replacing existing deterministic tests;
- automatic changes to canonical POM method files;
- a general-purpose LLM benchmark platform.

## Isolation Plan

- Branch or worktree: current checkout on `exp/pom-skill-evolution`; no separate worktree by user decision.
- Temporary path: one fresh temporary project and Pi session per scenario repetition.
- Dependency isolation: no new root runtime dependency; experiment-local dependencies require separate approval.
- Environment/config isolation: credentials remain in environment variables; fixed model and Pi version recorded per run.
- Service/data isolation: public synthetic fixtures only; no client or private repository content.
- Import/build guardrail: stable source and tests must not import from `experiments/`.

## Commands / Procedure

Planned interface:

```bash
node experiments/pom-skill-behavior-evals/run.mjs --dry-run --suite core
node experiments/pom-skill-behavior-evals/run.mjs --backend pi --variant baseline --suite core --repetitions 5
node experiments/pom-skill-behavior-evals/report.mjs --input <run-directory>
```

Procedure:

1. define scenario and outcome schemas;
2. build the ten core scenarios from TASK-0004;
3. implement fixture setup, timeout, cleanup, and dry-run validation;
4. implement Pi session execution without embedding model credentials;
5. run the known-bad control;
6. freeze the current POM baseline before candidate wording is written.

## Evidence

Baseline before experiment artifacts:

- branch start: `bb1c368`;
- `npm run pom:test`: 893 passed, 0 failed across 11 suites on 2026-07-13;
- `npm run pom:lint`: OK on 2026-07-13;
- current routing fixtures are structural and do not run a real agent session.

Current experiment evidence:

- scenario and outcome schemas;
- ten core scenario contracts: nine critical, one non-critical, in English and Italian;
- structural dry-run accepts the core matrix;
- intentionally invalid fixture is rejected because `expect.route` is missing.

Still planned:

- machine-readable real-session summaries;
- sanitized excerpts required to explain behavioral verdicts;
- behavioral known-bad variant result;
- baseline variance report.

Raw full transcripts, credentials, and private environment details remain local.

## Falsification And Promotion Gate

Discard or redesign the evaluator if any of these occur:

- the known-bad variant passes the critical suite;
- outcome classification silently drops failed or indeterminate runs;
- fresh sessions cannot be isolated reliably;
- deterministic assertions disagree with the reported verdict without surfacing the conflict;
- reproduction requires adding an LLM client to POM runtime dependencies.

Promotion is allowed only when the runner detects the planted failure, baseline metadata is complete, critical scenarios have five repetitions, and an independent review confirms that evidence supports each verdict.

## Risks

| Area | Risk | Mitigation |
|---|---|---|
| Security | Runner exposes credentials through commands or logs | Environment-only credentials; redact command environment and provider headers |
| Privacy | Full transcripts preserve private prompts or paths | Synthetic fixtures; raw transcripts local; sanitized committed excerpts |
| License | External evaluator code is copied without review | Implement from documented behavior or verify license and attribution before reuse |
| Costs | Repetition matrix consumes excessive model budget | Small core suite; dry-run first; five repetitions only at promotion gates |
| Maintainability | Evaluator becomes another runtime framework | Pi adapter first; narrow scenario schema; no generic orchestration features |
| Validity | LLM judge confirms its own preference | Prefer deterministic assertions; plant known-bad variants; independent read-back |

## Outcome

Decision: pending.

Promotion path:

- deterministic stable adapters and fixtures may move to `tests/` after approval;
- credentialed real-session execution may remain an on-demand or external evaluation layer;
- no canonical prompt or skill change is promoted from this experiment directly.

## Consolidation

| Artifact | Destination | Action |
|---|---|---|
| Stable deterministic scenario checks | `tests/skill-behavior/` if justified | selective promotion after experiment closure |
| Real-session runner | on-demand experiment or external eval package | decide from maintenance and dependency evidence |
| Reusable evaluation rule | `prompts/25-self-improvement-loop.md` or `prompts/12-extend-pom.md` | clean reimplementation only after approval |

## Follow-up

- [x] Define scenario and outcome schemas.
- [x] Add the core scenario matrix.
- [ ] Implement disposable fixture setup and behavioral planted-failure checks.
- [ ] Implement and run the Pi baseline.
