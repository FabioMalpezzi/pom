# FINDINGS — Real-project validation on Syntonia ai-agent

This is the honest verdict of the exercise. Each FSM is judged on three axes: **structural fit** (do states/transitions/composition map?), **expressivity fit** (does POM capture the meaning, not just the shape?), and **what's missing** (what would need to grow in POM to model the FSM faithfully?).

## Summary table

| FSM | Source | POM verdict | Validator | Schema growth needed? |
|---|---|---|---|---|
| Operational FSM | `pipeline/family/operational-fsm.ts` | **Clean fit** | PASS, 0 errors, 0 warnings | Loop-guard primitive (cosmetic) |
| Analyzer FSM | `pipeline/analyzer/analyzer-fsm.ts` | **Adapted fit** | PASS, 0 errors, 0 warnings | Bounded-retry primitive (real gap) |
| Semantic Family rules | `pipeline-contract/family-state-rules.ts` | **Forced fit, lossy** | PASS, 0 errors, 0 warnings | Multiple — rule engine, parallel families, precedence (POM is wrong tool) |

All three YAML files validate clean against the post-round-2 schema. **Validator clean is not the success criterion**: the criterion is whether the YAML captures the source faithfully.

---

## 1. Operational FSM — clean fit

**Verdict**: the POM model captures the source structure pretty much one-to-one.

**Structural fit** (high)

- 7 active states map to the 7 `PipelineStepName` values (`operational-fsm.ts:33-41`).
- 6 stop-exit ids (`PipelineStopExitId`, `:43-50`) plus the `loop_guard_exhausted` terminal map to 7 final states.
- The linear progression in `PIPELINE_STEP_TRANSITION_RULES` (`:88-95`) becomes the spine of transitions.
- The 5 `PIPELINE_STOP_EXIT_RULES` entries (`:112-169`) become per-step early-stop transitions.
- The `analyzer` step invokes the analyzer FSM synchronously: this is **exactly the POM state-invoke primitive** introduced in round 2, used here on a real production-grade boundary. The 7 analyzer terminals are mapped to 4 parent next_events (`analyzer_done_full_pipeline`, `analyzer_done_direct_output`, `analyzer_block_signal`, plus the three exhaustion variants collapsed to `analyzer_block_signal`).
- Context injection: the parent declares its own input (turn_id, tenant_id, role_family, question) and per-terminal output (final_answer, output_classification, block_reason, etc).

**Expressivity fit** (medium-high)

- The structural shape and the state-invoke pattern are captured faithfully.
- The rendering logic (`buildFinalAnswer` functions, `outputClassification`, `blockCategory`) is **deliberately not captured** — it belongs to target code under the POM "documentation, not runtime" stance. This is consistent with the design, not a gap.

**What's missing**

- **Loop guard with per-step visit budget**. The source has `PIPELINE_LOOP_GUARD_EXIT_RULES` (`:209-265`) that distinguish three exhaustion causes (`analyzer_cycle_exhausted`, `sql_generation_cycle_exhausted`, `sql_repair_cycle_exhausted`) via `stepPathTail` / `stepPathContains` patterns. POM collapses them into a single `loop_guard_exhausted` terminal with the exhausted step name in the output payload. Cosmetic loss; the structure is there.
- A POM schema extension would be a `loop_guard:` block on a state with `max_visits` and named per-cycle exhaustion exits. Not necessary for the operational FSM to be "modelable", but it would tighten the fidelity.

**Conclusion**: this FSM is **in the POM-workflow sweet spot**. The exercise confirms that POM's round-2 primitives (state-invoke + context injection) handle a real production orchestrator at first try.

---

## 2. Analyzer FSM — adapted fit

**Verdict**: structure fits, but the **retry budget** does not.

**Structural fit** (high)

- 13 active states map directly to the 13 `AnalyzerStepName` values (`analyzer-fsm.ts:116-129`).
- 7 stop-exit ids (`AnalyzerStopExitId`, `:319-326`) map to 7 final states.
- Linear progression from `ANALYZER_TRANSITION_RULES` (`:386-399`) is faithfully reproduced.
- The two short-circuit exits (`deterministic_reply_check` → `deterministic_reply_resolved`; `pending_scope_resolution` → `pending_scope_resolved`) are modeled as dedicated events. Clean.
- The two retry loops (`parse_and_validate` → `llm_call`; `coherence_validation` → `llm_call`) are modeled as cyclic transitions. POM accepts cycles structurally.

**Expressivity fit** (medium)

The cycles are there, but **the bound on the cycles is not**. Source declares `MAX_LLM_ATTEMPTS = 3` (`analyzer-fsm.ts:354`) and the loop guard uses `maxVisitsPerStep = 3` and `maxTransitions = 36` (approx). The POM YAML can say "retry exists" but cannot say "retry up to 3 times". The `parse_attempts_exhausted` / `schema_attempts_exhausted` / `coherence_attempts_exhausted` events declare the exhaustion exits, but the *budget* lives in target code.

**What's missing**

- **Bounded loop with retry counter, real gap**. A POM schema extension would be a `loop_guard:` block declaring `max_visits` per cycle and an exhaustion target per exit. Without it, the YAML reader needs the source code to understand the actual retry behavior — and that's a non-trivial expressivity gap on a production analyzer where the retry policy *is* part of the contract.
- **Shared retry budget across causes**. `parse_retry` and `coherence_retry` share the same `MAX_LLM_ATTEMPTS` budget in source. The POM YAML treats them as independent cycles. Refinement of the same primitive.
- **AnalyzerState patch growth across steps**. The source grows `AnalyzerState` additively across steps via patch + merge (`:160+`). The POM `context_schema` captures only the boundary (input + per-terminal output), not the intermediate state growth. This is consistent with POM's "no shared global state" invariant and *not* a gap to be fixed — POM intentionally leaves intermediate state to target code.

**Conclusion**: structural fit is excellent; the **bounded-retry gap is a real candidate for POM schema growth**, motivated by a real production FSM. This is the kind of evidence the experiment was looking for.

---

## 3. Semantic Family rules — forced fit, lossy

**Verdict**: POM is the **wrong shape** for this artifact. The forced mapping validates clean but documents 5 fundamental losses.

**Structural fit** (low-medium)

- The 7 `FamilyState` values (`types.ts:95-102`) map to 7 states. OK.
- A small set of plausible transitions can be derived from the rule structure (`turn_received → family_candidate`, `family_candidate → needs_*_clarification | family_ready | blocked`, etc). OK.
- All five major source elements **do not map**:
  1. **40 guards** (`family-state-rules.ts:14-50`) — declared nominally in the YAML as composite "any_*" guards that collapse the real granularity.
  2. **19 precedence rules** (`:52-70`) — POM has no slot for cross-family priority ordering. Documented as open point.
  3. **13 family-rule records** (`:125+`) — each with its own guards and output spec. The POM YAML models one FSM, not 13 in competition.
  4. **Control modes** (`analytical` vs `terminator`, `:23-41` and `:105-123`) — terminator families short-circuit to blocked; analytical families proceed through ready. The composite block guard masks this distinction.
  5. **Per-family output spec** (analysisType + comparisonMode + expectedAnswerShape) — POM declares a single `completed` terminal output, not one per family.

**Expressivity fit** (very low)

The forced YAML captures **the silhouette of the state graph** and *none* of the rule engine that drives it. A reader of the YAML would have a misleading picture: they would see "7 states, 9 transitions, composite guards" and miss that the real logic is a 40×13 guard matrix with 19 precedence rules.

**Why POM is the wrong shape**

POM workflow is built on the **flat-FSM, single-machine, single-context** invariants of round 1 and the **synchronous composition + Result return + no shared state** invariants of round 2. The semantic family layer is none of these: it is a **rule engine that evaluates 13 candidate machines concurrently, applies precedence rules across them, and emits a dominant decision**. That is:

- multiple machines active at once → would require parallel regions (POM declared out of scope: pillar 1, no async / no parallel);
- cross-machine precedence → would require a meta-layer above workflows (no POM primitive);
- per-candidate output spec selection → would require parametric terminals (no POM primitive).

This is exactly the "Pattern C territory" the implementation guide rejects: XState parallel actors or a dedicated rule engine (jess, drools, OPA, custom). POM workflow is the wrong tool, and forcing it produces an **artifact that lies about the source**.

**What this finding means**

The exercise discovered a **negative result with value**: there is a concrete class of artifacts in real codebases (rule engines for classification + routing) that POM workflow should explicitly decline to model. Round 2 already declares the relevant invariants; this validation makes the consequence visible with a real-world citation.

**Conclusion**: not a candidate for POM schema growth. A candidate for a **dedicated "POM-rules" or "POM-decision-tables" companion artifact** at most, separate from POM-workflow.

---

## Cross-cutting observations

### What the exercise confirmed about POM round 2

- **State invoke** lands a real production state-step → sub-FSM boundary (the operational `analyzer` step → the analyzer FSM). This was the *exact* primitive needed.
- **Context injection (Result<Terminal, Output>)** matches the real shape of the analyzer's contract: input = question + context, output = `AnalyzerOutput | fallback_reason`, discriminator = stop-exit id.
- **No async / no parallel / no shared state** stands up against a real codebase. The two FSMs that fit cleanly (operational, analyzer) respect all four pillars; the one that does not fit (semantic family rules) does not respect parallel-regions.

### What the exercise pushed POM to consider

- **Loop guard with bounded retry**, motivated by `MAX_LLM_ATTEMPTS = 3` in the analyzer. Concrete, narrowly scoped, plausibly addable without violating the four pillars. Schema sketch: `loop_guard: { max_visits: N, on_exhaustion: { exit_target: ... } }` on a state or on a cycle anchor. Closed decision deferred to a future round.

### What the exercise pushed POM to decline

- **Rule engine on top of multiple FSMs** (the semantic family layer). POM workflow declines, and the decline is principled: it would require violating pillar 1 (parallel regions) and the four-pillar discipline that distinguishes POM from XState.

---

## Statistical summary

| Metric | Value |
|---|---|
| Source FSMs examined | 3 |
| FSMs that fit cleanly | 1 (operational) |
| FSMs that fit with one acknowledged gap | 1 (analyzer; bounded retry) |
| FSMs forced for evidence, with documented losses | 1 (semantic family) |
| POM YAML files produced | 3 |
| YAML files PASS clean against post-round-2 validator | 3 |
| State-invoke uses on real production boundary | 1 (operational → analyzer) |
| Context-injection cases with real input/output shapes | 3 (one per file) |
| Concrete POM schema growth candidates discovered | 1 (bounded retry / loop guard) |
| Concrete POM-out-of-scope confirmations discovered | 1 (rule engine for family classification) |

---

## What this means for round 2 consolidation

The validation produces three pieces of evidence directly relevant to the round-2 consolidation:

1. **Positive**: POM round 2 (state-invoke + event-invoke + context-injection + pipeline) handles a real production orchestrator + its synchronous sub-FSM without adaptation. This is stronger evidence for H1/H2/H3/H4 than any toy or synthetic example would produce.
2. **Specific schema growth proposal**: bounded retry / loop guard. Motivated by a real artifact, narrowly scoped, candidate for a future round.
3. **Specific scope confirmation**: rule engines for classification + routing remain Pattern C territory. The "forced fit" YAML documents the limit *and* the cost of crossing it (a misleading artifact).

These three findings make it onto the round-2 consolidation section of `EXPERIMENT.md` and the spec's "Implementation Status" / "Closed Decisions" sections.
