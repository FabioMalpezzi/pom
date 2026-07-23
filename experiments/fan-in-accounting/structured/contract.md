# Experimental Structured Fan-In Contract 0.4

Return exactly one JSON object and no prose or Markdown fences.

The artifact records POM control-plane design decisions. It does not execute workers or prove runtime behavior. When the task does not decide a business policy, use `"open"` and add a matching entry to `open_points`; never choose a policy merely to make the object complete.

## Shape

```json
{
  "schema_version": "0.4",
  "mode": "design",
  "workflow_kind": "dynamic",
  "dependencies": {
    "parallel_units": true,
    "edges": [
      {
        "from": "unit_or_group",
        "to": "dependent_unit_or_group",
        "type": "data",
        "reason": "why the downstream unit must wait"
      }
    ],
    "capacity_constraints": [
      {
        "resource": "external_api",
        "limit": "10 concurrent requests",
        "capacity_class": "data_plane_execution",
        "enforcement_owner": "target_data_plane"
      }
    ]
  },
  "dynamic": {
    "batch": {
      "handle": "one_snake_case_batch_handle",
      "identity_domain": "route_audit",
      "item_identity_source": "route_audit_launch_snapshot"
    },
    "await": {
      "join": "all",
      "k": null,
      "quorum_basis": null,
      "eligible_identity_source": "route_audit_launch_snapshot",
      "eligible_statuses": ["succeeded", "failed", "cancelled", "timed_out"],
      "wake_event": "audit_batch_settled"
    },
    "accounting": {
      "expected_identity_source": "route_audit_launch_snapshot",
      "observed_record_scope": "all_received_records_including_unknown",
      "terminal_statuses": ["succeeded", "failed", "cancelled", "timed_out"],
      "duplicate_policy": "open",
      "unknown_policy": "open",
      "failure_policy": "open",
      "partial_policy": "open",
      "complete_label_requires": [
        "expected_vs_represented",
        "no_duplicates",
        "no_unknown_identities",
        "terminal_status_accounted",
        "no_unresolved_identities"
      ]
    },
    "reductions": [
      {
        "name": "batch_summary_layer",
        "expected_identity_source": "route_audit_launch_snapshot",
        "observed_result_source": "received_route_audit_result_records",
        "represented_identity_source": "route_audit_identities_from_received_results",
        "represented_identity_derivation": "from_observed_results",
        "status_count_source": "statuses_from_received_route_audit_results",
        "unresolved_identity_source": "expected_minus_observed_route_audit_identities",
        "output_summary_identity_source": "emitted_route_audit_batch_summary_manifest"
      }
    ],
    "final_reconciliation": {
      "expected_summary_identity_source": "emitted_route_audit_batch_summary_manifest",
      "observed_summary_source": "received_route_audit_batch_summary_records",
      "represented_identity_derivation": "from_observed_summaries",
      "checks": [
        "expected_vs_represented",
        "duplicate",
        "unknown",
        "terminal_status",
        "unresolved"
      ]
    }
  },
  "open_points": [
    {
      "key": "failure_policy",
      "question": "Does any failed item block synthesis?"
    }
  ],
  "scenarios": [
    {
      "kind": "positive",
      "expected": "complete_after_full_reconciliation"
    }
  ],
  "boundary": {
    "control_plane": ["launch", "await", "accounting", "reconciliation", "control_plane_input_capacity"],
    "target_data_plane": ["workers", "scheduling", "persistence", "rate_limiting", "backpressure"]
  }
}
```

## Ordinary workflow variant

For an ordinary workflow use the same top-level keys and no additional structure. Represent states and authority through dependency edges and the required scenario; do not add state machines, transition objects, queues, workers, or Dynamic Workflow fields.

```json
{
  "schema_version": "0.4",
  "mode": "design",
  "workflow_kind": "ordinary",
  "dependencies": {
    "parallel_units": false,
    "edges": [
      {
        "from": "submitted_for_review",
        "to": "reviewer_decision",
        "type": "ordering_authority",
        "reason": "the declared reviewer decides accept or reject"
      }
    ],
    "capacity_constraints": []
  },
  "dynamic": null,
  "open_points": [],
  "scenarios": [
    {
      "kind": "ordinary_transition",
      "expected": "declared_transition_outcome"
    }
  ],
  "boundary": {
    "control_plane": ["state_transitions", "declared_authority"],
    "target_data_plane": []
  }
}
```

## Rules

- `mode` is `design` or `scenarios`.
- `workflow_kind` is `ordinary` or `dynamic`.
- `dependencies.edges[].type` is `data`, `mutation`, or `ordering_authority`. Capacity constraints are not edges.
- `capacity_class` is `control_plane_input` or `data_plane_execution`. Context windows, prompt size, and fan-in input budgets are `control_plane_input` owned by `control_plane`; workers, queues, API quotas, scheduling, rate limiting, retry, persistence, and backpressure are `data_plane_execution` owned by `target_data_plane`. Declare only a capacity constraint supplied by the task. Item count alone is not a capacity limit; never invent a limit from cardinality. A shared-write conflict is a `mutation` edge, not a capacity constraint: do not invent a single-writer limit, lock, serialization policy, or dedicated writer unless the task supplies that decision.
- For an ordinary workflow, `dynamic` must be `null`.
- For a Dynamic Workflow, `dynamic` is required. One `fan_out_launch` has exactly one named batch `handle`. Work-item identities are data in the batch manifest, never workflow handles. `batch.identity_domain` is a task-specific singular snake-case noun such as `security_check`, `classification_task`, or `file_audit`; every identity, result, status, unresolved, and summary source name must contain that exact domain token. Example names are illustrative and must be replaced rather than copied across domains.
- `await.join` is `all`, `quorum`, `first`, or `open`. `k` is a positive integer only for `quorum`; otherwise it is `null`.
- A quorum must declare `quorum_basis`. `successful_outcomes` requires exactly `["succeeded"]`; `terminal_outcomes` requires all four terminal statuses. For non-quorum joins, `quorum_basis` is `null`.
- `await.eligible_identity_source` must equal both `batch.item_identity_source` and `accounting.expected_identity_source`; unknown identities can never satisfy a join. `wake_event` names the control-plane event.
- Join readiness only wakes the control plane. The `complete` label always requires every item in `complete_label_requires`; therefore missing, duplicate, failed, timed-out, or unknown accounting always blocks that label. Open `failure_policy` or `partial_policy` decides whether synthesis is refused or an explicitly `incomplete` report may be emitted; it never permits an incomplete report to be called complete.
- `accounting.observed_record_scope` is exactly `all_received_records_including_unknown`: every received record remains represented for reconciliation, while an unknown identity is excluded from join eligibility because it is absent from the expected identity source.
- All four terminal statuses are mandatory.
- Accounting policy values are `open`, `reject`, or `allow_incomplete`. Use `open` whenever the task does not decide the policy.
- Every reduction receives an expected identity source and a distinct observed-result source. `represented_identity_derivation` is exactly `from_observed_results`: represented identities must be extracted from records actually received, never copied from the expected manifest. The first reduction consumes the accounting identity source; every later reduction consumes the previous layer's output summary manifest.
- Final reconciliation receives both the expected summary manifest and distinct observed summary records. `represented_identity_derivation` is exactly `from_observed_summaries`. Its expected source equals the last reduction output, or the accounting identity source when there is no reduction.
- Source names and events must be stable identifiers or meaningful descriptions, never placeholders such as `open`, `unknown`, `tbd`, or `...`.
- `scenarios[].kind` is one of `positive`, `missing`, `duplicate`, `failed`, `timed_out`, `unknown`, `partial_refused`, `partial_allowed`, `capacity`, or `ordinary_transition`. Its `expected` value is fixed by kind: `complete_after_full_reconciliation`, `missing_expected_identity_blocks_complete`, `duplicate_blocks_complete`, `failed_identity_blocks_complete`, `timed_out_identity_blocks_complete`, `unknown_record_represented_excluded_from_join_blocks_complete`, `hypothetical_refusal_if_policy_rejects`, `hypothetical_incomplete_label_if_policy_allows`, `declared_capacity_respected_by_its_owner`, or `declared_transition_outcome`, respectively. These are assertions for validation, not runtime execution.
- Every Dynamic Workflow artifact includes `positive`, `missing`, `duplicate`, `failed`, `timed_out`, `unknown`, `partial_refused`, and `partial_allowed` scenarios. The first six assert accounting and complete-label invariants; the two partial scenarios test both sides of unresolved publication policy without deciding it. A capacity constraint requires exactly one `capacity` scenario, and a `capacity` scenario is forbidden when the task declares no capacity.
- Every Dynamic Workflow boundary lists at least `workers`, `scheduling`, and `persistence` under `target_data_plane`; physical execution capacity remains there, while control-plane input capacity remains under `control_plane`.
- Every ordinary workflow artifact includes `ordinary_transition`. Its boundary describes ordinary state transitions and must not contain Dynamic Workflow infrastructure unless the task declares it.
- Do not add undeclared keys as a workaround. Keep unresolved business rules in `open_points`.
