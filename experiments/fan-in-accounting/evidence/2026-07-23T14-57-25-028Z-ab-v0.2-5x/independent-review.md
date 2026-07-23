# Independent adversarial review — evaluator revision 0.2

## Verdict

**FAIL — aggregate gates pass, but promotion is not justified.**

Recorded results are numerically correct:

- 80/80 sessions completed;
- candidate check rate 94.8%;
- baseline check rate 71.9%;
- candidate improvement +23.0 percentage points;
- candidate scenario passes 34/40, or 85%;
- all three coded aggregate gates pass.

The aggregate gates are not sufficient because all eight fixtures are critical, the stated acceptance condition requires no critical failures across five repetitions, and passing matcher outcomes contain material semantic violations.

## Candidate failed-check classification

Seven candidate failed checks were reviewed:

- 3 genuine semantic failures;
- 4 evaluator lexical false negatives.

### Genuine semantic failures

- `hierarchical-fan-in` repetition 1, `reconcile-layers`: the response did not reconcile all required accounting fields at every layer and again at the final reducer.
- `hierarchical-fan-in` repetition 1, `one-batch-handle`: no single named launch handle was established.
- `hierarchical-fan-in` repetition 4, `one-batch-handle`: the response mentioned an audit batch but never defined its required single named handle.

### Evaluator lexical false negatives

- `shared-write-conflict` repetitions 1, 3, and 4, `coordination`: each response provided a semantically valid single-writer or per-worker-output-and-merge strategy using unmatched wording.
- `balanced-missing-duplicate` repetition 2, `count-insufficient`: the response explicitly said that 60 received records and count alone were insufficient.

These false negatives do not retroactively change the frozen report.

## Material unscored violations

- Per-item handles instead of one named batch handle appeared in `independent-data-work` repetition 5, `shared-write-conflict` repetitions 2 and 5.
- Passing `hierarchical-fan-in` repetitions 2, 4, and 5 still omitted required per-layer fields or final re-reconciliation.
- `shared-write-conflict` repetitions 1–3 prescribed failure-reporting outcomes while also stating that the completion and partial-report policies were undecided; these are invented business rules.
- No material failure was found for join-readiness versus report-completeness separation.
- No response assigned physical concurrency or rate-limit enforcement to POM; Target Project data-plane ownership held.

Manual semantic review found critical violations in nine distinct candidate outcomes.

## Conclusion

Revision 0.2 demonstrates a strong relative improvement but not reliable rule adherence. The candidate is not ready for canonical promotion. A third iteration would need an explicit methodological decision: either strengthen the response contract further and accept the additional method weight, or keep the current POM method and discard/defer this candidate. Lowering the threshold or tuning matchers to obtain a pass would invalidate the experiment.
