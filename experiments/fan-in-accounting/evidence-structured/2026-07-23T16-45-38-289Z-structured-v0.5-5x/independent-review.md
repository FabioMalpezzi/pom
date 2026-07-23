# Independent adversarial review — structured contract revision 0.5

## Verdict

**PASS as experiment evidence; not canonically ready.**

Recomputed results match the report:

- `gpt-5.4-mini`: 34/40 first-pass valid; 40/40 validator-valid after one repair;
- `gpt-5.4`: 38/40 first-pass valid; 40/40 validator-valid after one repair;
- no dropped calls.

## Verified improvements

No final artifact contained:

- per-item workflow handles;
- exact identity-source mismatches between batch, await, and accounting;
- non-open accounting policies where the fixture required open decisions;
- prohibited placeholder tokens;
- Dynamic Workflow contamination in ordinary workflows.

First-pass failures were concentrated around dependency classification:

- `gpt-5.4-mini` missed the shared-write mutation edge in 5/5 repetitions and the ordinary ordering-authority edge once;
- `gpt-5.4` missed the shared-write mutation edge in 2/5 repetitions;
- one validator feedback cycle repaired every reported structural failure.

## Remaining semantic gaps

- `gpt-5.4-mini/hierarchical-fan-in/rep-5` reused expected launch identities as represented identities at both reduction layers. The validator proves source-field presence and string linkage, not that summaries actually represent observed results.
- The same artifact classified final-model context capacity as entirely enforced by the Target Project data plane. Context-shaping is partly a control-plane/model-input concern, unlike physical scheduling, rate limiting, and backpressure.
- Quorum eligibility remains undecided: two of ten outcomes counted only successful statuses, while eight counted every terminal status. The fixture fixes `k=6` but does not define which statuses are eligible, so the evidence cannot determine the correct semantics.
- Scenario expectations remain non-empty prose; their domain truth is not statically proved.

Semantic final validity is therefore at most 79/80, with ten quorum outcomes not semantically decidable from the current fixture.

## Supported conclusions

1. For these fixtures, a structured artifact plus deterministic validator and one repair cycle is materially more reliable than relying on prose instructions alone for handle cardinality, open policies, identity linkage, boundaries, and required scenarios. The experiments are not a perfectly contemporaneous A/B, so the exact improvement size is not established.
2. `gpt-5.4` has a descriptive first-pass advantage in this sample: 95% versus 85%, mainly because it misses fewer mutation edges. Forty runs per model are insufficient for a general model-quality claim.
3. An experiment-local POM schema/lint direction deserves further design. Quorum semantics, observed-result provenance, capacity classification, and scenario semantics must be resolved before any canonical proposal.
