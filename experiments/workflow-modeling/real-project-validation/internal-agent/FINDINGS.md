# FINDINGS — Real-project validation on internal AI agent

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

### 2.bis Analyzer FSM — clean-family-repair as a third level

The user asked: is the generated YAML compatible with the **repair FSM**? Honest answer: the first pass was **incomplete**. The analyzer's `family_enforcement` state in the source synchronously runs `runCleanFamilyRepair`, an inner loop bounded by `MAX_FAMILY_REPAIR_ATTEMPTS = 3` (`clean-family-repair.ts:122, 188`), and the analyzer-fsm.yaml initially modeled `family_enforcement` as a flat linear state. That collapsed a sub-FSM into a single state without reason.

**Fix**: model the repair as an autonomous sub-FSM and have the analyzer's `family_enforcement` state declare a state-invoke on it. Result:

- new file `clean-family-repair-fsm.yaml` with the repair as a 7-state, 7-event, 7-transition workflow (one of the transitions is the bounded retry cycle on `evaluating_attempt`);
- `analyzer-fsm.yaml`'s `family_enforcement` state updated to `invoke:` the repair FSM with full context injection (input: question + parsed_output + semantic_hints + question_signals + ctx; on_completion: 5 child terminals all mapped to the parent's `family_enforced` event);
- both files PASS clean against the validator after the change;
- `operational-fsm.yaml` is unchanged and continues to PASS clean — the modification was local to the analyzer level.

**What this demonstrates**

The POM round 2 schema **carries a three-level invoke chain on a real production system**:

```
operational-fsm                 (level 1: pipeline orchestrator)
  └── invoke: analyzer-fsm      (level 2: sub-pipeline)
        └── invoke: clean-family-repair-fsm  (level 3: bounded-retry sub-FSM)
```

Three nested workflows, three context_schemas with input + per-terminal output, three sets of state-invoke + on_completion mappings — all validated clean by the post-round-2 validator without changes to the schema.

**What it confirms**

- **Composition depth scales**: the operational → analyzer state-invoke (single level) and the analyzer → repair state-invoke (second level) use the same primitive at different depths. The schema does not have an arbitrary depth limit; the validator resolves child files relative to the parent's directory at any nesting level.
- **The bounded-retry open point applies at every level**: parse_retry / coherence_retry in the analyzer FSM and the attempt_suggested_family cycle in the repair FSM are all the same class of unbounded-in-schema, bounded-in-target-code cycles. One single `loop_guard` primitive in a future round would address all of them.

**What it does not change**

- The expressivity line is unchanged. The repair was already a flat-FSM by structure; adding it as a third level is faithfulness gained, not new POM territory.
- The semantic family rule engine (section 3) still does not fit, for the same reasons documented there. The repair is a flat sub-FSM with a bounded loop, not a rule engine.

**Statistical update**

| Metric | Before (first pass) | After (with repair) | Δ |
|---|---|---|---|
| YAML files in the internal AI agent validation | 3 (+ 8 push) | 4 (+ 8 push) = 12 | +1 |
| Composition depth max | 2 (operational → analyzer) | 3 (operational → analyzer → repair) | +1 |
| State-invokes on production code | 1 | 2 | +1 |
| Bounded-loop cycles in modeled FSMs | 2 (parse_retry, coherence_retry) | 3 (+ attempt_suggested_family) | +1 |
| FSMs faithfully covered from the analyzer module | 2 of 2 (with repair gap acknowledged) | 3 of 3 (gap filled) | +1 |
| Validator clean | yes | yes | unchanged |

**Conclusion**: the first-pass YAML was incompatible with the repair FSM (it omitted it). The corrected YAML is **fully compatible**: the repair becomes a first-class POM workflow invoked at the right point in the analyzer. POM round 2 supports the three-level depth without modification, and the bounded-retry gap reappears identically on the third level — same problem, same proposal, same level of priority for a future round.

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

### 3.bis Semantic Family — pushed modeling (added after the user request)

The user asked to push the modeling further: not accept the forced flat fit, but try whether POM round 2 can in fact carry the rule engine when each candidate family is an autonomous workflow and a master FSM orchestrates them in precedence order.

Result: **the round-2 schema accepts the construction in full**. Seven family workflows + one master FSM with seven consecutive state-invokes, all eight PASS clean. Files under `semantic-family-pushed/`.

**Pattern used**

- Each of the 7 representative families (gating_or_clarification, cascade_bridge, yoy_driver_diagnosis, rolling_trend_tradeoff, benchmark_vs_media, ratio_threshold_ranking, single_kpi_snapshot) is an autonomous workflow with 5 states, 4 events, 4 guards, 4 transitions, and per-terminal `context_schema.output_by_terminal`.
- The master FSM `semantic-family-master.yaml` has 7 `evaluating_<family>` states, each declaring a state-invoke on the corresponding child. The cascade order matches `FAMILY_PRECEDENCE_RULE_SEQUENCE` in the source.
- On every child's `not_matched` terminal the master moves to the next family in the cascade; on `matched` / `needs_scope_clarification` / `needs_semantic_clarification` / `blocked` it jumps to the matching master terminal.

**Faithfulness gained over the flat forced fit**

1. **Each family is a first-class autonomous workflow** with its own state graph, guards, terminals, and output spec — not a collapsed "any_*" guard.
2. **The precedence order is explicitly encoded** as the sequence of evaluating_* states in the master, not lost in metadata.
3. **Per-family output payloads** are now expressible via context_schema, so a future implementation guide can write the right TS discriminated unions.
4. **The control-mode distinction** (terminator vs analytical) is faithfully represented: only `family_gating_or_clarification` has a `blocked` terminal mapped to the master's `blocked` state, the analytical families do not.
5. **The "first match wins" semantics** of the rule engine is preserved by the cascade structure: every evaluating_* state only proceeds to the next on `not_matched`.

**Faithfulness still missing (and why)**

1. **Non-linear precedence rules**. The source has precedence rules like `yoy_driver_diagnosis_on_consecutive_years` whose meaning is "if cue X AND family A and family B both compete, choose A". A simple cascade can encode "A before B in the queue" but not "B is the right pick when condition Y is true and A actually fired first". The push cannot reach that level of precedence without violating the four pillars.
2. **The 40 guard names are still nominal**. The actual evaluation of each guard against signals + scope_context lives in target code. This is consistent with POM's "documentation, not runtime" stance, so it is a design feature rather than a defect.
3. **Concurrent evaluation observability**. The source evaluates all 13 candidates and can report on all of them; the master picks the first match in the declared order and the others are never invoked. Trace-wise the master is less informative.
4. **13 → 7 simplification**. Six of the source's 13 families were not modeled in this push (only the 7 most representative). The pattern scales (each new family is a single new YAML + a new evaluating_* state in the master), but the 13-family roster was not produced because it would have been mechanical repetition without new information.

**What this confirms about round 2**

The push validates a previously unproven capability: **POM round 2 schema can host a dispatcher pattern of N synchronous child workflows under one parent**. The original real-project-validation pass had only one state-invoke (operational → analyzer); this push uses seven. The schema scales without modification, the validator handles the deeper file resolution (master → 7 children, each with its own `context_schema`), the context injection mechanism (input + assign nominal coherence) covers a multi-child case with the same conventions used in `loan-application`.

**What this confirms about the limit**

The push closes the question "could POM model the family rules if we tried harder?" with a precise answer:

- **YES** for the structural shape, the precedence order as linear sequence, the per-family autonomous evaluation, the per-family output spec, and the control-mode distinction;
- **NO** for non-linear precedence rules that depend on the conjunction of two or more candidate-family outcomes (the cross-family logic that makes the source a rule engine and not a switch).

The line drawn by the four-pillar invariant of round 2 (no parallel regions, no shared state) holds where it was supposed to hold. The push moves the modeling much further than the flat forced fit; it does not move the line of expressivity.

**Statistical update**

| Metric | Forced fit | Pushed modeling | Delta |
|---|---|---|---|
| YAML files | 1 | 8 (7 families + 1 master) | +7 |
| State-invokes used | 0 | 7 | +7 |
| Per-family context_schema declared | 0 | 7 | +7 |
| Per-family output payload spec | 0 | 7 | +7 |
| Control modes faithfully represented | 0 of 2 | 2 of 2 | +2 |
| Precedence-rule positions faithfully encoded | 0 | 7 (linear) | +7 |
| Source guards visible to schema | 0 | 7 × 4 = 28 (nominal) | +28 |
| Non-linear precedence rules expressible | 0 | 0 | 0 |
| Concurrent multi-candidate observability | no | no | unchanged |
| Validator clean | yes | yes | unchanged |

The push moved every metric except the two that the four-pillar invariant forbids by design.

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
