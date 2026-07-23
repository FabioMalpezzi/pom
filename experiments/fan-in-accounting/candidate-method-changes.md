# Candidate method changes — fan-in accounting

These are experiment-local proposals. They are not POM rules until the experiment is evaluated and promotion is explicitly approved.

## Candidate addition to `prompts/27-workflow-modeling.md` — design mode

Before turning “and then” into an edge, record why the downstream unit must wait. Check four dependency classes:

1. **Data:** does the downstream unit consume the upstream output?
2. **Mutation:** can both units write the same file, record, branch, or other mutable resource?
3. **Capacity:** do they compete for a bounded API quota, worker pool, connection pool, budget, or human role?
4. **Ordering/authority:** does an external side effect, approval, security boundary, or irreversible action require ordering?

If none applies, do not invent a sequential dependency. For Dynamic Workflow fan-out, record unresolved worker, queue, scheduler, persistence, timeout, cancellation, retry, idempotency, concurrency-limit, backpressure, and shared-resource decisions as open points owned by the Target Project data plane.

For every fan-in, identify:

- the source of the expected identity set or expected cardinality;
- how each result preserves its source identity and terminal status;
- whether duplicate or unknown identities invalidate synthesis;
- whether failed, cancelled, or timed-out work counts as settled;
- whether partial synthesis is forbidden or explicitly allowed and visibly labelled incomplete;
- whether raw output volume requires hierarchical reduction.

A `fan_out_launch` creates one named handle for the launched batch. Work-item identities belong in the batch's expected/result manifest; do not model one workflow handle per item.

Do not infer accounting policies from `join: all | quorum | first`. State the distinction explicitly: satisfying the join threshold may wake the control plane, but it does not by itself authorize a report labelled complete. Result-accounting completeness is a separate decision.

Before finishing any Dynamic Workflow design or scenario response, state these control-plane invariants explicitly:

- one `fan_out_launch` produces one named batch handle; never call work-item identities or child results "handles";
- the batch manifest carries the expected work-item identities and terminal statuses;
- every hierarchical reduction layer reconciles its expected identities, represented identities, status counts, and unresolved identities, and the final reducer reconciles the batch summaries again;
- capacity is a dependency to surface in the model, while physical concurrency limits, rate limiting, and backpressure enforcement remain Target Project data-plane responsibilities.

## Candidate addition to `prompts/27-workflow-modeling.md` — scenarios mode

For every Dynamic Workflow fan-in, derive scenarios for:

- all expected identities received exactly once with successful status;
- one expected identity missing;
- one identity duplicated, including a duplicate that masks a different missing identity while preserving the total count;
- one explicit failed result;
- one timed-out or cancelled result;
- one unknown identity not present in the launch snapshot;
- partial synthesis refused when partial output is not allowed;
- partial synthesis, when explicitly allowed, labelled incomplete with every unresolved identity and status;
- hierarchical fan-in preserving expected counts and identity provenance at each reduction layer;
- shared-resource pressure respecting the declared concurrency or capacity limit.

A scenario must not treat `results.length == expected_count` as sufficient evidence of completeness.

## Candidate addition to `templates/WORKFLOW_IMPLEMENTATION_GUIDE.md`

### Dynamic fan-out and fan-in accounting

Treat `fan_out_launch` and `await` as control-plane boundaries, not permission to start every child simultaneously. The Target Project implementation owns bounded concurrency and backpressure. Choose a limit from actual worker, API, database, cost, and human-capacity constraints; do not use unbounded `Promise.all`, `asyncio.gather`, or equivalent merely because tasks have no data edges.

Snapshot stable work identities before launch. Keep those identities inside the batch manifest: `fan_out_launch.handle` names the batch, not each individual work item. Every terminal child result should carry:

- the original identity;
- a terminal status such as `succeeded`, `failed`, `cancelled`, or `timed_out`;
- an idempotency key or equivalent deduplication identity when retries are possible;
- output or a structured error appropriate to that status.

At fan-in, reconcile identity sets rather than scalar counts. Report missing, duplicate, unknown, failed, cancelled, and timed-out identities explicitly. A result set is complete only when the declared completion policy is satisfied; partial output must be an explicit, visibly incomplete outcome.

For output volumes that cannot safely enter one synthesis context, reduce hierarchically. Each batch summary preserves its batch identity, expected count, represented identity set, status counts, and unresolved identities. The final reducer reconciles batch summaries before synthesizing them. Summaries must not erase provenance or turn incomplete child work into an apparently complete parent report.

Keep physical scheduling, queues, retries, rate limiting, persistence, and idempotency storage in the Target Project data plane. POM may require those decisions to be explicit but does not implement them.

## Schema question reserved for later evaluation

Do not add fields yet. After evidence, compare the smallest alternatives:

1. guidance and generated scenarios only;
2. existing `context_schema`, guards, and invariants;
3. additive fan-in accounting declarations that static lint can verify.

Any schema proposal must distinguish static control-plane claims from runtime observations and update the existing draft `specs/SPEC-0008-workflow-control-plane-verification.md` rather than creating a parallel spec.
