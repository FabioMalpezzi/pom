#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractArtifact, validateArtifact } from './validate.mjs';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures.json', import.meta.url), 'utf8'));
const byId = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
let passed = 0;

function scenario(name, test) {
  test();
  passed++;
  console.log(`✓ ${name}`);
}

function dynamicArtifact() {
  return {
    schema_version: '0.4',
    mode: 'design',
    workflow_kind: 'dynamic',
    dependencies: {
      parallel_units: true,
      edges: [{ from: 'audits', to: 'report', type: 'data', reason: 'report consumes audit results' }],
      capacity_constraints: [],
    },
    dynamic: {
      batch: { handle: 'audit_batch', identity_domain: 'route_audit', item_identity_source: 'route_audit_launch_snapshot' },
      await: {
        join: 'all',
        k: null,
        quorum_basis: null,
        eligible_identity_source: 'route_audit_launch_snapshot',
        eligible_statuses: ['succeeded', 'failed', 'cancelled', 'timed_out'],
        wake_event: 'audit_batch_settled',
      },
      accounting: {
        expected_identity_source: 'route_audit_launch_snapshot',
        observed_record_scope: 'all_received_records_including_unknown',
        terminal_statuses: ['succeeded', 'failed', 'cancelled', 'timed_out'],
        duplicate_policy: 'open',
        unknown_policy: 'open',
        failure_policy: 'open',
        partial_policy: 'open',
        complete_label_requires: ['expected_vs_represented', 'no_duplicates', 'no_unknown_identities', 'terminal_status_accounted', 'no_unresolved_identities'],
      },
      reductions: [],
      final_reconciliation: {
        expected_summary_identity_source: 'route_audit_launch_snapshot',
        observed_summary_source: 'received_route_audit_result_records',
        represented_identity_derivation: 'from_observed_summaries',
        checks: ['expected_vs_represented', 'duplicate', 'unknown', 'terminal_status', 'unresolved'],
      },
    },
    open_points: [
      { key: 'duplicate_policy', question: 'Do duplicates invalidate synthesis?' },
      { key: 'unknown_policy', question: 'Do unknown identities invalidate synthesis?' },
      { key: 'failure_policy', question: 'How do failures affect reporting?' },
      { key: 'partial_policy', question: 'May an incomplete report be published?' },
    ],
    scenarios: [
      { kind: 'positive', expected: 'complete_after_full_reconciliation' },
      { kind: 'missing', expected: 'missing_expected_identity_blocks_complete' },
      { kind: 'duplicate', expected: 'duplicate_blocks_complete' },
      { kind: 'failed', expected: 'failed_identity_blocks_complete' },
      { kind: 'timed_out', expected: 'timed_out_identity_blocks_complete' },
      { kind: 'unknown', expected: 'unknown_record_represented_excluded_from_join_blocks_complete' },
      { kind: 'partial_refused', expected: 'hypothetical_refusal_if_policy_rejects' },
      { kind: 'partial_allowed', expected: 'hypothetical_incomplete_label_if_policy_allows' },
    ],
    boundary: {
      control_plane: ['launch', 'await', 'accounting', 'reconciliation'],
      target_data_plane: ['workers', 'scheduling', 'persistence'],
    },
  };
}

function ordinaryArtifact() {
  return {
    schema_version: '0.4',
    mode: 'design',
    workflow_kind: 'ordinary',
    dependencies: {
      parallel_units: false,
      edges: [{ from: 'review', to: 'accepted', type: 'ordering_authority', reason: 'reviewer authority' }],
      capacity_constraints: [],
    },
    dynamic: null,
    open_points: [],
    scenarios: [{ kind: 'ordinary_transition', expected: 'declared_transition_outcome' }],
    boundary: { control_plane: ['state transitions'], target_data_plane: [] },
  };
}

scenario('valid dynamic artifact passes', () => {
  assert.deepEqual(validateArtifact(dynamicArtifact(), byId.get('independent-data-work')).errors, []);
});

scenario('valid ordinary artifact passes without Dynamic Workflow fields', () => {
  assert.equal(validateArtifact(ordinaryArtifact(), byId.get('ordinary-workflow-regression')).valid, true);
});

scenario('per-item handles are rejected as undeclared structure', () => {
  const artifact = dynamicArtifact();
  artifact.dynamic.batch.item_handles = ['route_001', 'route_002'];
  const result = validateArtifact(artifact, byId.get('independent-data-work'));
  assert(result.errors.some((error) => error.includes('item_handles: undeclared key')));
});

scenario('open policy without a matching open point is rejected', () => {
  const artifact = dynamicArtifact();
  artifact.open_points = artifact.open_points.filter((point) => point.key !== 'partial_policy');
  const result = validateArtifact(artifact, byId.get('independent-data-work'));
  assert(result.errors.some((error) => error.includes('missing entry for open partial_policy')));
});

scenario('hierarchical reduction missing provenance fields is rejected', () => {
  const artifact = dynamicArtifact();
  artifact.dynamic.reductions = [{ name: 'batch_summaries', expected_identity_source: 'route_audit_launch_snapshot' }];
  const result = validateArtifact(artifact, byId.get('hierarchical-fan-in'));
  assert(result.errors.some((error) => error.includes('observed_result_source: missing')));
  assert(result.errors.some((error) => error.includes('represented_identity_derivation: missing')));
});

scenario('data-plane execution capacity cannot be assigned to the control plane', () => {
  const artifact = dynamicArtifact();
  artifact.dependencies.capacity_constraints = [{
    resource: 'external_api', limit: '10 concurrent', capacity_class: 'data_plane_execution', enforcement_owner: 'control_plane',
  }];
  artifact.scenarios.push({ kind: 'capacity', expected: 'declared_capacity_respected_by_its_owner' });
  const result = validateArtifact(artifact, byId.get('shared-api-capacity'));
  assert(result.errors.some((error) => error.includes('must be owned by target_data_plane')));
});

scenario('control-plane input capacity cannot be assigned to the data plane', () => {
  const artifact = dynamicArtifact();
  artifact.dependencies.capacity_constraints = [{
    resource: 'final_model_context', limit: 'bounded prompt input', capacity_class: 'control_plane_input', enforcement_owner: 'target_data_plane',
  }];
  artifact.scenarios.push({ kind: 'capacity', expected: 'declared_capacity_respected_by_its_owner' });
  const result = validateArtifact(artifact, byId.get('hierarchical-fan-in'));
  assert(result.errors.some((error) => error.includes('must be owned by control_plane')));
});

scenario('mandatory Dynamic Workflow scenarios are enforced', () => {
  const artifact = dynamicArtifact();
  artifact.scenarios = [{ kind: 'positive', expected: 'complete_after_full_reconciliation' }];
  const result = validateArtifact(artifact, byId.get('balanced-missing-duplicate'));
  assert(result.errors.some((error) => error.includes('Dynamic Workflow missing duplicate')));
  assert(result.errors.some((error) => error.includes('Dynamic Workflow missing partial_refused')));
});

scenario('placeholder wake events and identity sources are rejected', () => {
  const artifact = dynamicArtifact();
  artifact.dynamic.await.wake_event = 'open';
  artifact.dynamic.await.eligible_identity_source = 'unknown';
  const result = validateArtifact(artifact, byId.get('independent-data-work'));
  assert(result.errors.some((error) => error.includes('eligible_identity_source: expected meaningful source')));
  assert(result.errors.some((error) => error.includes('wake_event: expected meaningful event')));
});

scenario('successful quorum accepts only succeeded outcomes', () => {
  const artifact = dynamicArtifact();
  artifact.dynamic.await.join = 'quorum';
  artifact.dynamic.await.k = 6;
  artifact.dynamic.await.quorum_basis = 'successful_outcomes';
  artifact.dynamic.await.eligible_statuses = ['succeeded', 'failed'];
  const result = validateArtifact(artifact, byId.get('quorum-vs-completeness'));
  assert(result.errors.some((error) => error.includes('successful_outcomes permits only succeeded')));
});

scenario('quorum identity source must equal the expected batch source', () => {
  const artifact = dynamicArtifact();
  artifact.dynamic.await.join = 'quorum';
  artifact.dynamic.await.k = 6;
  artifact.dynamic.await.quorum_basis = 'successful_outcomes';
  artifact.dynamic.await.eligible_statuses = ['succeeded'];
  artifact.dynamic.await.eligible_identity_source = 'all_observed_results';
  const result = validateArtifact(artifact, byId.get('quorum-vs-completeness'));
  assert(result.errors.some((error) => error.includes('must equal dynamic.batch.item_identity_source')));
});

scenario('represented identities cannot be copied from the expected manifest', () => {
  const artifact = dynamicArtifact();
  artifact.dynamic.reductions = [{
    name: 'batch_summaries',
    expected_identity_source: 'route_audit_launch_snapshot',
    observed_result_source: 'received_route_audit_results',
    represented_identity_source: 'route_audit_launch_snapshot',
    represented_identity_derivation: 'from_observed_results',
    status_count_source: 'received_route_audit_statuses',
    unresolved_identity_source: 'expected_minus_observed_route_audits',
    output_summary_identity_source: 'emitted_route_audit_batch_summary_manifest',
  }];
  artifact.dynamic.final_reconciliation.expected_summary_identity_source = 'emitted_route_audit_batch_summary_manifest';
  artifact.scenarios.push({ kind: 'capacity', expected: 'declared_capacity_respected_by_its_owner' });
  artifact.dependencies.capacity_constraints.push({
    resource: 'final_model_context', limit: 'bounded prompt input', capacity_class: 'control_plane_input', enforcement_owner: 'control_plane',
  });
  const result = validateArtifact(artifact, byId.get('hierarchical-fan-in'));
  assert(result.errors.some((error) => error.includes('must derive from observed results')));
});

scenario('hierarchical lineage must connect reductions to final reconciliation', () => {
  const artifact = dynamicArtifact();
  artifact.dynamic.reductions = [{
    name: 'batch_summaries',
    expected_identity_source: 'route_audit_launch_snapshot',
    observed_result_source: 'received_route_audit_results',
    represented_identity_source: 'route_audit_identities_from_received_results',
    represented_identity_derivation: 'from_observed_results',
    status_count_source: 'received_route_audit_statuses',
    unresolved_identity_source: 'expected_minus_observed_route_audits',
    output_summary_identity_source: 'emitted_route_audit_batch_summary_manifest',
  }];
  artifact.dynamic.final_reconciliation.expected_summary_identity_source = 'unrelated_summaries';
  const result = validateArtifact(artifact, byId.get('hierarchical-fan-in'));
  assert(result.errors.some((error) => error.includes('must equal the final reduction output')));
});

scenario('capacity cannot be invented from task cardinality', () => {
  const artifact = dynamicArtifact();
  artifact.dependencies.capacity_constraints = [{
    resource: 'forty_item_batch', limit: '40 records', capacity_class: 'control_plane_input', enforcement_owner: 'control_plane',
  }];
  artifact.scenarios.push({ kind: 'capacity', expected: 'declared_capacity_respected_by_its_owner' });
  const result = validateArtifact(artifact, byId.get('independent-data-work'));
  assert(result.errors.some((error) => error.includes('task does not declare control_plane_input capacity')));
});

scenario('shared-write mutation cannot be converted into an invented writer capacity', () => {
  const artifact = dynamicArtifact();
  artifact.dependencies.edges = [{ from: 'checks', to: 'report', type: 'mutation', reason: 'workers share report.md' }];
  artifact.dependencies.capacity_constraints = [{
    resource: 'report_writer', limit: 'one writer', capacity_class: 'data_plane_execution', enforcement_owner: 'target_data_plane',
  }];
  artifact.scenarios.push({ kind: 'capacity', expected: 'declared_capacity_respected_by_its_owner' });
  const result = validateArtifact(artifact, byId.get('shared-write-conflict'));
  assert(result.errors.some((error) => error.includes('task does not declare data_plane_execution capacity')));
});

scenario('capacity scenario is forbidden without a declared capacity constraint', () => {
  const artifact = dynamicArtifact();
  artifact.scenarios.push({ kind: 'capacity', expected: 'declared_capacity_respected_by_its_owner' });
  const result = validateArtifact(artifact, byId.get('independent-data-work'));
  assert(result.errors.some((error) => error.includes('capacity is forbidden without a declared capacity constraint')));
});

scenario('identity domain must be grounded in the task fixture', () => {
  const artifact = dynamicArtifact();
  const result = validateArtifact(artifact, byId.get('shared-write-conflict'));
  assert(result.errors.some((error) => error.includes('dynamic.batch.identity_domain: expected security_check')));
});

scenario('accounting must retain unknown received records for reconciliation', () => {
  const artifact = dynamicArtifact();
  artifact.dynamic.accounting.observed_record_scope = 'expected_identities_only';
  const result = validateArtifact(artifact, byId.get('independent-data-work'));
  assert(result.errors.some((error) => error.includes('must be all_received_records_including_unknown')));
});

scenario('scenario outcomes are fixed assertions rather than free prose', () => {
  const artifact = dynamicArtifact();
  artifact.scenarios.find((entry) => entry.kind === 'partial_allowed').expected = 'accepted_as_complete';
  const result = validateArtifact(artifact, byId.get('independent-data-work'));
  assert(result.errors.some((error) => error.includes('partial_allowed requires hypothetical_incomplete_label_if_policy_allows')));
});

scenario('ordinary workflow rejects Dynamic Workflow boundary boilerplate', () => {
  const artifact = ordinaryArtifact();
  artifact.boundary = { control_plane: ['launch', 'await'], target_data_plane: ['workers', 'scheduling'] };
  const result = validateArtifact(artifact, byId.get('ordinary-workflow-regression'));
  assert(result.errors.some((error) => error.includes('ordinary workflow contains Dynamic Workflow responsibility')));
});

scenario('response must be exactly one JSON object without prose or fences', () => {
  const source = `Here is the artifact:\n\`\`\`json\n${JSON.stringify(dynamicArtifact())}\n\`\`\``;
  const extracted = extractArtifact(source);
  assert.equal(extracted.artifact, null);
  assert(extracted.parseError.includes('response must be exactly one JSON object'));
});

console.log(`Results: ${passed} passed, 0 failed`);
