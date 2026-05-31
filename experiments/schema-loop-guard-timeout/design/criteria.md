---
experiment: schema-loop-guard-timeout
ambito: 1
created: 2026-05-31
status: accepted
---

## Contesto

- SUT: the POM workflow schema primitives `loop_guard` and `timeout`, as a candidate extension from SPEC-0006 toward SPEC-0007.
- Sperimentatore: user + coding agent in session; the agent executes implementation and verification after criteria are frozen, while the user stays in the loop for criteria and final Adopt/Refine/Reject.
- Iterazione: one complete modify-and-verify cycle: schema/validator or fixture change, relevant test run, result read, and decision to fix, add a case, or stop.
- Goal del SUT: n/a (the SUT has no goal of its own; it is a schema rule, not an executing workflow).

## Obiettivo

Dimostrare che `loop_guard` e `timeout` possono essere aggiunti allo schema workflow POM come primitive distinte, validabili staticamente e traducibili in guida d'implementazione target, senza introdurre runtime ownership in POM.

## Out of scope

- Durable scheduler, timer service, queue, sleep, or runtime persistence inside POM.
- Active-time-only duration semantics distinct from wall-clock elapsed time.
- Native parallelism, dynamic fan-out execution, or target queue mechanics.
- Migrating existing canonical workflow examples to use `loop_guard` or `timeout` before the spec is accepted.

## Metriche gate (non-regressione)

| Nome | Strumento | Soglia | Baseline | Legame con obiettivo |
|---|---|---|---|---|
| POM test suite | `npm run pom:test` | Exit code 0 | 148 passed, 0 failed | A schema extension is not acceptable if it regresses the existing POM toolchain. |
| Governance lint | `npm run pom:lint` | 0 errors; warnings allowed only if explained | 0 errors, 1 known `docs-without-adr` warning | SPEC-0007 and related artifacts must remain inside POM governance. |
| H6/H7 workflow validation | `npm run pom:workflow:lint` on new valid examples and broken fixtures | Valid examples PASS; invalid fixtures FAIL with expected rule codes | TBD calibrated at run 1 | This is the central proof that the primitives are statically validable. |

## Metriche signal (progresso)

| Nome | Strumento | Direzione | Trend (assoluto/relativo/statistico) | Baseline | Legame con obiettivo |
|---|---|---|---|---|---|
| H6/H7 rule coverage | Fixture/evidence table plus `pom:workflow:lint` output | ↑ | assoluto: delta >= 1 covered rule per iteration from run 2 onward, until the run-1 calibrated rule list is complete | TBD calibrated at run 1 | Each covered rule makes `loop_guard` and `timeout` more precise, less ambiguous, and more safely implementable in target code. |

## Open point gate

Open points are not a numeric progress signal. They are a final gate:
there must be no blocking open point left in the SPEC-0007 candidate.

The initial open-point list to validate or revise during run 1 is:

- duration grammar for `loop_guard.max_duration` and `timeout.duration`;
- semantic distinction between `loop_guard` and `timeout`;
- exhaustion routing through `on_exhaustion`, `on_visits_exhausted`, and `on_duration_exhausted`;
- counter reset and accumulation semantics;
- wall-clock behavior across suspend/restore;
- static validator boundary versus runtime target responsibility;
- Pattern A/B/C target implementation guidance.

## Condizioni di uscita del loop

- Raggiunto: all gates are green, H6/H7 rule coverage is complete against the run-1 calibrated rule list, SPEC-0007 candidate distinguishes `loop_guard` and `timeout`, and no blocking open point remains.
- Forfait per stallo: from run 2 onward, 3 consecutive iterations do not increase H6/H7 rule coverage and do not close any blocking open point.
- Forfait per budget: after run 1, evaluate the observed cycle time and set or accept the remaining time budget before continuing.
- Falsificazione: the hypothesis is false if static validation of `loop_guard` or `timeout` requires runtime ownership in POM, or if the two primitives cannot be defined as distinguishable schema concepts. Falsifies: the validator must simulate elapsed runtime or own a scheduler to decide whether `timeout` is valid. Does not falsify: the validator checks shape, duration grammar, declared targets, and documental coherence while target code owns timers and counters.

## Consistency Check

- C-a budget vs loop_guard: warning accepted: no numeric budget is frozen before run 1; the first cycle intentionally calibrates realistic cycle time.
- C-b signal vs gate: OK. H6/H7 rule coverage can increase from run 2 onward; repo tests and lint remain gates.
- C-c falsificazione vs backlog: OK. The falsification excludes expected H6/H7 schema work and targets only runtime ownership or non-distinguishability.
- C-d obiettivo vs backlog: OK. The objective matches the opened experiment and is not broader than SPEC-0007 candidate work.

## Acceptance

- Accettato il: 2026-05-31
- Accettato da: user
- Congelato fino a: chiusura esperimento o supersedere esplicito.
