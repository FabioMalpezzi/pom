const TOP_KEYS = ['schema_version', 'mode', 'workflow_kind', 'dependencies', 'dynamic', 'open_points', 'scenarios', 'boundary'];
const EDGE_TYPES = new Set(['data', 'mutation', 'ordering_authority']);
const JOINS = new Set(['all', 'quorum', 'first', 'open']);
const QUORUM_BASES = new Set(['successful_outcomes', 'terminal_outcomes']);
const CAPACITY_OWNERS = { control_plane_input: 'control_plane', data_plane_execution: 'target_data_plane' };
const POLICIES = new Set(['open', 'reject', 'allow_incomplete']);
const STATUSES = ['succeeded', 'failed', 'cancelled', 'timed_out'];
const COMPLETE_CHECKS = ['expected_vs_represented', 'no_duplicates', 'no_unknown_identities', 'terminal_status_accounted', 'no_unresolved_identities'];
const FINAL_CHECKS = ['expected_vs_represented', 'duplicate', 'unknown', 'terminal_status', 'unresolved'];
const SCENARIO_EXPECTED = {
  positive: 'complete_after_full_reconciliation',
  missing: 'missing_expected_identity_blocks_complete',
  duplicate: 'duplicate_blocks_complete',
  failed: 'failed_identity_blocks_complete',
  timed_out: 'timed_out_identity_blocks_complete',
  unknown: 'unknown_record_represented_excluded_from_join_blocks_complete',
  partial_refused: 'hypothetical_refusal_if_policy_rejects',
  partial_allowed: 'hypothetical_incomplete_label_if_policy_allows',
  capacity: 'declared_capacity_respected_by_its_owner',
  ordinary_transition: 'declared_transition_outcome',
};
const SCENARIO_KINDS = new Set(Object.keys(SCENARIO_EXPECTED));
const REQUIRED_DYNAMIC_SCENARIOS = ['positive', 'missing', 'duplicate', 'failed', 'timed_out', 'unknown', 'partial_refused', 'partial_allowed'];
const POLICY_KEYS = ['duplicate_policy', 'unknown_policy', 'failure_policy', 'partial_policy'];

function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function meaningful(value) {
  return nonEmpty(value) && !/^(?:open|unknown|tbd|todo|none|null|n\/a|\.{3})$/i.test(value.trim());
}

function exactKeys(errors, value, expected, path) {
  if (!object(value)) {
    errors.push(`${path}: expected object`);
    return false;
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  for (const key of wanted) if (!(key in value)) errors.push(`${path}.${key}: missing`);
  for (const key of actual) if (!wanted.includes(key)) errors.push(`${path}.${key}: undeclared key`);
  return true;
}

function stringArray(errors, value, path) {
  if (!Array.isArray(value) || value.some((entry) => !nonEmpty(entry))) {
    errors.push(`${path}: expected array of non-empty strings`);
    return [];
  }
  return value;
}

function requireSet(errors, actual, expected, path) {
  const values = stringArray(errors, actual, path);
  for (const item of expected) if (!values.includes(item)) errors.push(`${path}: missing ${item}`);
}

function validateDependencies(errors, value) {
  if (!exactKeys(errors, value, ['parallel_units', 'edges', 'capacity_constraints'], 'dependencies')) return;
  if (typeof value.parallel_units !== 'boolean') errors.push('dependencies.parallel_units: expected boolean');
  if (!Array.isArray(value.edges)) errors.push('dependencies.edges: expected array');
  else value.edges.forEach((edge, index) => {
    const path = `dependencies.edges[${index}]`;
    if (!exactKeys(errors, edge, ['from', 'to', 'type', 'reason'], path)) return;
    for (const key of ['from', 'to', 'reason']) if (!nonEmpty(edge[key])) errors.push(`${path}.${key}: expected non-empty string`);
    if (!EDGE_TYPES.has(edge.type)) errors.push(`${path}.type: unsupported ${edge.type}`);
  });
  if (!Array.isArray(value.capacity_constraints)) errors.push('dependencies.capacity_constraints: expected array');
  else value.capacity_constraints.forEach((constraint, index) => {
    const path = `dependencies.capacity_constraints[${index}]`;
    if (!exactKeys(errors, constraint, ['resource', 'limit', 'capacity_class', 'enforcement_owner'], path)) return;
    if (!meaningful(constraint.resource)) errors.push(`${path}.resource: expected meaningful value`);
    if (!meaningful(constraint.limit)) errors.push(`${path}.limit: expected meaningful value`);
    const expectedOwner = CAPACITY_OWNERS[constraint.capacity_class];
    if (!expectedOwner) errors.push(`${path}.capacity_class: unsupported ${constraint.capacity_class}`);
    else if (constraint.enforcement_owner !== expectedOwner) errors.push(`${path}.enforcement_owner: ${constraint.capacity_class} must be owned by ${expectedOwner}`);
  });
}

function validateDynamic(errors, value, openPointKeys) {
  if (!exactKeys(errors, value, ['batch', 'await', 'accounting', 'reductions', 'final_reconciliation'], 'dynamic')) return;

  if (exactKeys(errors, value.batch, ['handle', 'identity_domain', 'item_identity_source'], 'dynamic.batch')) {
    if (!nonEmpty(value.batch.handle) || !/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(value.batch.handle)) errors.push('dynamic.batch.handle: expected one snake_case batch handle');
    if (!nonEmpty(value.batch.identity_domain) || !/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(value.batch.identity_domain)) errors.push('dynamic.batch.identity_domain: expected task-specific snake_case noun');
    if (!meaningful(value.batch.item_identity_source)) errors.push('dynamic.batch.item_identity_source: expected meaningful source');
  }

  if (exactKeys(errors, value.await, ['join', 'k', 'quorum_basis', 'eligible_identity_source', 'eligible_statuses', 'wake_event'], 'dynamic.await')) {
    if (!JOINS.has(value.await.join)) errors.push(`dynamic.await.join: unsupported ${value.await.join}`);
    if (value.await.join === 'quorum') {
      if (!Number.isInteger(value.await.k) || value.await.k < 1) errors.push('dynamic.await.k: quorum requires a positive integer');
      if (!QUORUM_BASES.has(value.await.quorum_basis)) errors.push(`dynamic.await.quorum_basis: unsupported ${value.await.quorum_basis}`);
    } else {
      if (value.await.k !== null) errors.push('dynamic.await.k: must be null unless join is quorum');
      if (value.await.quorum_basis !== null) errors.push('dynamic.await.quorum_basis: must be null unless join is quorum');
    }
    if (!meaningful(value.await.eligible_identity_source)) errors.push('dynamic.await.eligible_identity_source: expected meaningful source');
    const eligibleStatuses = stringArray(errors, value.await.eligible_statuses, 'dynamic.await.eligible_statuses');
    if (eligibleStatuses.length === 0) errors.push('dynamic.await.eligible_statuses: at least one status required');
    for (const status of eligibleStatuses) if (!STATUSES.includes(status)) errors.push(`dynamic.await.eligible_statuses: unsupported ${status}`);
    if (value.await.quorum_basis === 'successful_outcomes') requireSet(errors, eligibleStatuses, ['succeeded'], 'dynamic.await.eligible_statuses');
    if (value.await.quorum_basis === 'successful_outcomes' && eligibleStatuses.some((status) => status !== 'succeeded')) errors.push('dynamic.await.eligible_statuses: successful_outcomes permits only succeeded');
    if (value.await.quorum_basis === 'terminal_outcomes') requireSet(errors, eligibleStatuses, STATUSES, 'dynamic.await.eligible_statuses');
    if (!meaningful(value.await.wake_event)) errors.push('dynamic.await.wake_event: expected meaningful event');
  }

  if (exactKeys(errors, value.accounting, ['expected_identity_source', 'observed_record_scope', 'terminal_statuses', ...POLICY_KEYS, 'complete_label_requires'], 'dynamic.accounting')) {
    if (!meaningful(value.accounting.expected_identity_source)) errors.push('dynamic.accounting.expected_identity_source: expected meaningful source');
    if (value.accounting.observed_record_scope !== 'all_received_records_including_unknown') errors.push('dynamic.accounting.observed_record_scope: must be all_received_records_including_unknown');
    requireSet(errors, value.accounting.terminal_statuses, STATUSES, 'dynamic.accounting.terminal_statuses');
    requireSet(errors, value.accounting.complete_label_requires, COMPLETE_CHECKS, 'dynamic.accounting.complete_label_requires');
    for (const key of POLICY_KEYS) {
      const policy = value.accounting[key];
      if (!POLICIES.has(policy)) errors.push(`dynamic.accounting.${key}: unsupported ${policy}`);
      if (policy === 'open' && !openPointKeys.has(key)) errors.push(`open_points: missing entry for open ${key}`);
    }
  }

  if (!Array.isArray(value.reductions)) errors.push('dynamic.reductions: expected array');
  else value.reductions.forEach((reduction, index) => {
    const path = `dynamic.reductions[${index}]`;
    const keys = ['name', 'expected_identity_source', 'observed_result_source', 'represented_identity_source', 'represented_identity_derivation', 'status_count_source', 'unresolved_identity_source', 'output_summary_identity_source'];
    if (!exactKeys(errors, reduction, keys, path)) return;
    for (const key of keys.filter((key) => key !== 'represented_identity_derivation')) if (!meaningful(reduction[key])) errors.push(`${path}.${key}: expected meaningful value`);
    if (reduction.represented_identity_derivation !== 'from_observed_results') errors.push(`${path}.represented_identity_derivation: must be from_observed_results`);
    if (reduction.observed_result_source === reduction.expected_identity_source) errors.push(`${path}.observed_result_source: must differ from expected_identity_source`);
    if (reduction.represented_identity_source === reduction.expected_identity_source) errors.push(`${path}.represented_identity_source: must derive from observed results, not expected identities`);
  });

  if (exactKeys(errors, value.final_reconciliation, ['expected_summary_identity_source', 'observed_summary_source', 'represented_identity_derivation', 'checks'], 'dynamic.final_reconciliation')) {
    if (!meaningful(value.final_reconciliation.expected_summary_identity_source)) errors.push('dynamic.final_reconciliation.expected_summary_identity_source: expected meaningful source');
    if (!meaningful(value.final_reconciliation.observed_summary_source)) errors.push('dynamic.final_reconciliation.observed_summary_source: expected meaningful source');
    if (value.final_reconciliation.observed_summary_source === value.final_reconciliation.expected_summary_identity_source) errors.push('dynamic.final_reconciliation.observed_summary_source: must differ from expected_summary_identity_source');
    if (value.final_reconciliation.represented_identity_derivation !== 'from_observed_summaries') errors.push('dynamic.final_reconciliation.represented_identity_derivation: must be from_observed_summaries');
    requireSet(errors, value.final_reconciliation.checks, FINAL_CHECKS, 'dynamic.final_reconciliation.checks');
  }

  const batchSource = value.batch?.item_identity_source;
  const identityDomain = value.batch?.identity_domain;
  if (meaningful(batchSource) && value.await?.eligible_identity_source !== batchSource) errors.push('dynamic.await.eligible_identity_source: must equal dynamic.batch.item_identity_source');
  if (meaningful(batchSource) && value.accounting?.expected_identity_source !== batchSource) errors.push('dynamic.accounting.expected_identity_source: must equal dynamic.batch.item_identity_source');
  if (Array.isArray(value.reductions)) {
    let expectedInput = value.accounting?.expected_identity_source;
    for (let index = 0; index < value.reductions.length; index++) {
      const reduction = value.reductions[index];
      if (reduction?.expected_identity_source !== expectedInput) errors.push(`dynamic.reductions[${index}].expected_identity_source: must equal ${expectedInput}`);
      expectedInput = reduction?.output_summary_identity_source;
    }
    if (value.final_reconciliation?.expected_summary_identity_source !== expectedInput) errors.push('dynamic.final_reconciliation.expected_summary_identity_source: must equal the final reduction output or accounting identity source');
  }
  if (nonEmpty(identityDomain)) {
    const sources = [
      ['dynamic.batch.item_identity_source', value.batch?.item_identity_source],
      ['dynamic.await.eligible_identity_source', value.await?.eligible_identity_source],
      ['dynamic.accounting.expected_identity_source', value.accounting?.expected_identity_source],
      ...((value.reductions ?? []).flatMap((reduction, index) => [
        [`dynamic.reductions[${index}].expected_identity_source`, reduction?.expected_identity_source],
        [`dynamic.reductions[${index}].observed_result_source`, reduction?.observed_result_source],
        [`dynamic.reductions[${index}].represented_identity_source`, reduction?.represented_identity_source],
        [`dynamic.reductions[${index}].status_count_source`, reduction?.status_count_source],
        [`dynamic.reductions[${index}].unresolved_identity_source`, reduction?.unresolved_identity_source],
        [`dynamic.reductions[${index}].output_summary_identity_source`, reduction?.output_summary_identity_source],
      ])),
      ['dynamic.final_reconciliation.expected_summary_identity_source', value.final_reconciliation?.expected_summary_identity_source],
      ['dynamic.final_reconciliation.observed_summary_source', value.final_reconciliation?.observed_summary_source],
    ];
    for (const [path, source] of sources) if (meaningful(source) && !source.includes(identityDomain)) errors.push(`${path}: must contain identity domain ${identityDomain}`);
  }
}

function validateOpenPoints(errors, value) {
  if (!Array.isArray(value)) {
    errors.push('open_points: expected array');
    return new Set();
  }
  const keys = new Set();
  value.forEach((point, index) => {
    const path = `open_points[${index}]`;
    if (!exactKeys(errors, point, ['key', 'question'], path)) return;
    if (!nonEmpty(point.key)) errors.push(`${path}.key: expected non-empty string`);
    else if (keys.has(point.key)) errors.push(`${path}.key: duplicate ${point.key}`);
    else keys.add(point.key);
    if (!nonEmpty(point.question)) errors.push(`${path}.question: expected non-empty string`);
  });
  return keys;
}

function validateScenarios(errors, value) {
  if (!Array.isArray(value)) {
    errors.push('scenarios: expected array');
    return;
  }
  value.forEach((scenario, index) => {
    const path = `scenarios[${index}]`;
    if (!exactKeys(errors, scenario, ['kind', 'expected'], path)) return;
    if (!SCENARIO_KINDS.has(scenario.kind)) errors.push(`${path}.kind: unsupported ${scenario.kind}`);
    else if (scenario.expected !== SCENARIO_EXPECTED[scenario.kind]) errors.push(`${path}.expected: ${scenario.kind} requires ${SCENARIO_EXPECTED[scenario.kind]}`);
  });
}

function validateBoundary(errors, value, dynamic) {
  if (!exactKeys(errors, value, ['control_plane', 'target_data_plane'], 'boundary')) return;
  const control = stringArray(errors, value.control_plane, 'boundary.control_plane');
  const target = stringArray(errors, value.target_data_plane, 'boundary.target_data_plane');
  if (dynamic) {
    for (const responsibility of ['workers', 'scheduling', 'persistence']) {
      if (!target.includes(responsibility)) errors.push(`boundary.target_data_plane: missing ${responsibility}`);
    }
  } else {
    const dynamicTerms = /fan.?out|launch|await|worker|queue|schedul|rate.?limit|backpressure/i;
    for (const entry of [...control, ...target]) if (dynamicTerms.test(entry)) errors.push(`boundary: ordinary workflow contains Dynamic Workflow responsibility ${entry}`);
  }
}

function validateFixtureExpectations(errors, artifact, fixture) {
  const expect = fixture.expect;
  if (artifact.mode !== fixture.mode) errors.push(`mode: expected ${fixture.mode}`);
  if (artifact.workflow_kind !== expect.workflow_kind) errors.push(`workflow_kind: expected ${expect.workflow_kind}`);
  if (typeof expect.parallel_units === 'boolean' && artifact.dependencies?.parallel_units !== expect.parallel_units) errors.push(`dependencies.parallel_units: expected ${expect.parallel_units}`);

  const edgeTypes = new Set((artifact.dependencies?.edges ?? []).map((edge) => edge.type));
  for (const type of expect.required_edge_types ?? []) if (!edgeTypes.has(type)) errors.push(`dependencies.edges: missing required ${type} edge`);

  if (expect.identity_domain && artifact.dynamic?.batch?.identity_domain !== expect.identity_domain) errors.push(`dynamic.batch.identity_domain: expected ${expect.identity_domain}`);
  if (expect.capacity_required && (artifact.dependencies?.capacity_constraints ?? []).length === 0) errors.push('dependencies.capacity_constraints: at least one required');
  const capacityClasses = new Set((artifact.dependencies?.capacity_constraints ?? []).map((constraint) => constraint.capacity_class));
  const expectedCapacityClasses = new Set(expect.required_capacity_classes ?? []);
  for (const capacityClass of expectedCapacityClasses) if (!capacityClasses.has(capacityClass)) errors.push(`dependencies.capacity_constraints: missing required ${capacityClass} class`);
  for (const capacityClass of capacityClasses) if (!expectedCapacityClasses.has(capacityClass)) errors.push(`dependencies.capacity_constraints: task does not declare ${capacityClass} capacity`);

  const kinds = new Set((artifact.scenarios ?? []).map((scenario) => scenario.kind));
  for (const kind of expect.required_scenarios ?? []) if (!kinds.has(kind)) errors.push(`scenarios: missing required ${kind}`);

  if (expect.workflow_kind === 'ordinary') {
    if (artifact.dynamic !== null) errors.push('dynamic: ordinary workflow requires null');
    return;
  }
  if (!object(artifact.dynamic)) {
    errors.push('dynamic: required for dynamic workflow');
    return;
  }
  if (expect.join && artifact.dynamic.await?.join !== expect.join) errors.push(`dynamic.await.join: expected ${expect.join}`);
  if (expect.k !== undefined && artifact.dynamic.await?.k !== expect.k) errors.push(`dynamic.await.k: expected ${expect.k}`);
  if (expect.quorum_basis && artifact.dynamic.await?.quorum_basis !== expect.quorum_basis) errors.push(`dynamic.await.quorum_basis: expected ${expect.quorum_basis}`);
  if (expect.eligible_statuses) {
    const actual = artifact.dynamic.await?.eligible_statuses ?? [];
    if (actual.length !== expect.eligible_statuses.length || expect.eligible_statuses.some((status) => !actual.includes(status))) errors.push(`dynamic.await.eligible_statuses: expected exactly ${expect.eligible_statuses.join(',')}`);
  }
  if ((artifact.dynamic.reductions ?? []).length < (expect.minimum_reductions ?? 0)) errors.push(`dynamic.reductions: expected at least ${expect.minimum_reductions}`);
  for (const key of expect.policies_open ?? []) {
    if (artifact.dynamic.accounting?.[key] !== 'open') errors.push(`dynamic.accounting.${key}: expected open`);
  }
}

export function validateArtifact(artifact, fixture) {
  const errors = [];
  if (!exactKeys(errors, artifact, TOP_KEYS, '$')) return { valid: false, errors };
  if (artifact.schema_version !== '0.4') errors.push('schema_version: expected 0.4');
  if (!['design', 'scenarios'].includes(artifact.mode)) errors.push(`mode: unsupported ${artifact.mode}`);
  if (!['ordinary', 'dynamic'].includes(artifact.workflow_kind)) errors.push(`workflow_kind: unsupported ${artifact.workflow_kind}`);
  validateDependencies(errors, artifact.dependencies);
  const openPointKeys = validateOpenPoints(errors, artifact.open_points);
  validateScenarios(errors, artifact.scenarios);
  const scenarioKinds = new Set(Array.isArray(artifact.scenarios) ? artifact.scenarios.map((scenario) => scenario?.kind) : []);
  if (artifact.workflow_kind === 'dynamic') {
    for (const kind of REQUIRED_DYNAMIC_SCENARIOS) if (!scenarioKinds.has(kind)) errors.push(`scenarios: Dynamic Workflow missing ${kind}`);
    if ((artifact.dependencies?.capacity_constraints ?? []).length > 0 && !scenarioKinds.has('capacity')) errors.push('scenarios: capacity constraint requires capacity');
    if ((artifact.dependencies?.capacity_constraints ?? []).length === 0 && scenarioKinds.has('capacity')) errors.push('scenarios: capacity is forbidden without a declared capacity constraint');
  } else if (!scenarioKinds.has('ordinary_transition')) errors.push('scenarios: ordinary workflow missing ordinary_transition');
  validateBoundary(errors, artifact.boundary, artifact.workflow_kind === 'dynamic');
  if (artifact.workflow_kind === 'dynamic') validateDynamic(errors, artifact.dynamic, openPointKeys);
  else if (artifact.dynamic !== null) errors.push('dynamic: ordinary workflow requires null');
  validateFixtureExpectations(errors, artifact, fixture);
  return { valid: errors.length === 0, errors };
}

export function extractArtifact(text) {
  const trimmed = text.trim();
  try {
    return { artifact: JSON.parse(trimmed), parseError: null };
  } catch (error) {
    return { artifact: null, parseError: `response must be exactly one JSON object: ${error.message}` };
  }
}
