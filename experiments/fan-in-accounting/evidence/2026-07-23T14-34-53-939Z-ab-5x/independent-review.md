# Independent adversarial review — five-repetition prompt A/B

## Verdict

**FAIL — not ready for canonical promotion.**

The frozen run completed all 80 sessions and improved candidate check rate by 16.3 percentage points, but the candidate recorded 83.7%, below the provisional 90% gate. Manual review does not rewrite that score.

## Failed-check classification

The independent verifier classified 22 candidate failed checks:

- 4 genuine behavioral failures;
- 18 evaluator lexical false negatives.

### Genuine behavioral failures

- `hierarchical-fan-in` repetition 2, `reconcile-layers`: staged reduction did not preserve and reconcile expected counts, represented identities, status counts, and unresolved identities at every layer.
- `hierarchical-fan-in` repetition 4, `reconcile-layers`: chunking omitted per-layer provenance/accounting and final reconciliation of chunk summaries.
- `hierarchical-fan-in` repetition 3, `one-batch-handle`: the response launched 100 audits without establishing the required single named batch handle.
- `hierarchical-fan-in` repetition 5, `one-batch-handle`: the response named an audit batch without defining or tracking its one workflow handle.

### Evaluator lexical false negatives

The responses satisfied the semantic check intent using wording not recognized by the frozen matchers:

- `independent-data-work`: repetition 2 `parallel`; repetitions 2 and 4 `no-false-edge`.
- `shared-write-conflict`: repetitions 1–5 `not-a-data-edge`; repetition 5 `coordination`.
- `shared-api-capacity`: repetition 1 `bounded-concurrency`.
- `hierarchical-fan-in`: repetition 1 `reconcile-layers`.
- `balanced-missing-duplicate`: repetitions 1 and 3 `count-insufficient`.
- `quorum-vs-completeness`: repetition 1 `separate-completeness`; repetition 5 `quorum-readiness`.
- `ambiguous-partial-policy`: repetitions 1, 2, and 5 `do-not-invent`.

These are instrumentation defects, not retroactive passes. Matcher corrections require a new evaluator iteration applied identically to baseline and candidate.

## Material unscored violations

- Per-item workflow handles instead of one named batch handle appeared in five outcomes: `independent-data-work` repetition 4; `shared-write-conflict` repetitions 3 and 5; `shared-api-capacity` repetition 3; `quorum-vs-completeness` repetition 3.
- Runtime-boundary ambiguity appeared in `shared-api-capacity` repetitions 3 and 4: physical capacity enforcement was not assigned clearly to the Target Project data plane.
- No material unscored failure was found for join-readiness versus reporting-completeness separation or for invented business rules.

## Required next iteration

1. Preserve this run unchanged as iteration 1.
2. Strengthen the experiment-local candidate so every Dynamic Workflow design explicitly states one named batch handle, keeps item identities in the result manifest, reconciles every hierarchical layer, and assigns physical capacity enforcement to the Target Project data plane.
3. Correct only the independently identified lexical instrumentation defects, for both baseline and candidate.
4. Record an evaluator revision in the next report.
5. Dry-run, rerun five repetitions, and compare the new run without rewriting iteration 1.
