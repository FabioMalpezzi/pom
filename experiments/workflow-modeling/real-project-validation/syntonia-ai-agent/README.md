# Real-project validation — Syntonia ai-agent

External validation exercise: take the three FSMs declared in a real codebase that the user already maintains, model them with the POM workflow schema as it stands at the end of round 2, and document honestly what fits, what bends, and what does not fit.

Goal: stress the expressivity of the POM workflow schema against machines that exist *for domain reasons*, not because they were designed to demonstrate the schema.

## Source project

Path: `/Users/fabio/WA/Syntonia/ai-agent/src/server`

The ai-agent project is a text-to-SQL canonical server with three named state machines:

| FSM | Source file | What it does |
|---|---|---|
| Operational FSM | `pipeline/family/operational-fsm.ts` | Orchestrates the seven pipeline steps from `safety_pre_screen` to `output_generator`; declares early-stop exits and per-step loop guards. |
| Analyzer FSM | `pipeline/analyzer/analyzer-fsm.ts` | Internal FSM of the analyzer step (LLM #1), with 13 sub-steps, retry loops on parse/coherence errors, and seven termination outcomes. |
| Semantic Family rules | `pipeline-contract/family-state-rules.ts` | Declarative registry that decides which "semantic family" a user question belongs to. Drives `FamilyState` (7 canonical states) via 40+ guards and 20+ precedence rules across 13 candidate families. |

Other consulted files for context:
- `pipeline/family/README.md`
- `pipeline/analyzer/README.md`
- `pipeline-contract/README.md`
- `pipeline-contract/types.ts` (for `FamilyId`, `FamilyState`, `FamilyRuleRecord` shapes)

## What we model and how

| File | Subject | Approach |
|---|---|---|
| `operational-fsm.yaml` | Operational FSM | Direct mapping. 7 active states + 7 terminal stop-exits, linear progression plus early-stop transitions. The `analyzer` state declares a **synchronous state-invoke** of the analyzer FSM, mapping each analyzer terminal to a parent next_event. |
| `analyzer-fsm.yaml` | Analyzer FSM | Direct mapping. 13 active states + 7 terminal stop-exits. Retry loop modeled as a cyclic transition from `parse_and_validate` back to `llm_call` (and similarly from `coherence_validation`). The bounded retry count (`MAX_LLM_ATTEMPTS = 3`) is declared as an **open point** in metadata: POM does not have a "bounded loop with counter" primitive; the budget lives in target code. |
| `semantic-family-rules.yaml` | Semantic Family rules | Forced mapping (as requested). 7 `FamilyState` values become states; transitions are derived from the rule structure (`entryGuards`, `clarificationGuards`, `readyGuards`, `blockGuards`). The 40+ guard names are declared nominally; the 20+ precedence rules are documented in metadata.open_points because POM has no primitive to express priority ordering between guards. Multiple competing family rules per turn are also out-of-scope. |
| `FINDINGS.md` | Honest verdict | Per-FSM verdict (clean, adapted, forced, declined), with citations to the source files (`file:line` form) and open points discovered. |

## What this exercise is and is not

This is **not** a proposal to adopt POM workflow in the ai-agent project. The ai-agent has its own runtime model (state runners with patches, declarative transition graphs, typed payloads) that is more expressive than the POM YAML in places that matter for that domain. The exercise tests how much of the real machinery the POM schema captures, and where it stops.

A successful outcome of this exercise is **either**:

- "POM models these N FSMs cleanly enough to be a credible source of authority for documentation, design review, and target-code guidance" (positive), **or**
- "POM models X cleanly, requires adaptation for Y, and falls short of Z; here is what would need to grow in POM to cover Z" (mixed, with concrete open points), **or**
- "POM is wrong shape for this class of machine; here is why" (negative, but useful).

`FINDINGS.md` records which of these landed for each FSM.
