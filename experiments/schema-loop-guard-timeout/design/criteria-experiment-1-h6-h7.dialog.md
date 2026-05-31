---
experiment: schema-loop-guard-timeout
hypothesis: H6/H7
traces: criteria.md
date: 2026-05-31
---

# Traccia del confronto — H6/H7

## Conseguenze segnalate durante il dialogo

- SUT as schema primitives, not workflows -> metrics focus on grammar, validator behavior, fixtures, and implementation guidance rather than runtime success.
- Sperimentatore as user + coding agent -> the agent can implement after criteria freeze, but semantic choices remain user-governed.
- Iteration as modify-and-verify cycle -> signal is measured by verified coverage growth, not by commits or isolated file edits.
- Goal del SUT as n/a -> falsification must target schema validity, static validation, and runtime ownership boundaries.
- Scope excludes scheduler/runtime in POM -> needing such runtime ownership becomes a falsification or follow-up, not scope expansion.
- Open points as final gate, not progress signal -> avoids optimizing a subjective ambiguity count.
- Budget calibrated at run 1 -> avoids forcing a time estimate before observing a real semantic-validation cycle.

## Domande emerse fuori griglia

- The user asked for a concrete case to understand why a schema primitive has no goal of its own. Resolved with a `timeout` example on `waiting_human_review`, distinguishing a grammar rule from a workflow execution goal.
- The user asked how to generate an explicit open-point list. Resolved by deriving an initial list from prior evidence and treating it as a run-1 calibration object rather than a frozen numeric metric.

## Calibrazioni e correzioni dell'utente

- Initial "Goal del SUT: n/a" was unclear -> clarified through the "grammar rule" framing; user chose the grammar-rule framing.
- Baseline proposal with numeric open-point count was hard to evaluate a priori -> changed to run-1 calibration plus final gate "no blocking open points".
- Budget was impossible to set upfront -> changed to one real cycle first, then evaluate observed cycle time.

## Consigli del valutatore accolti

- None. This is the first criteria round for this experiment.
