import { setImmediate as waitImmediate } from 'node:timers/promises';

export function makeItems(count) {
  if (!Number.isInteger(count) || count < 1) throw new Error('count must be a positive integer');
  return Array.from({ length: count }, (_, index) => ({
    id: `route-${String(index + 1).padStart(3, '0')}`,
    reads: [`routes/route-${String(index + 1).padStart(3, '0')}.py`],
    writes: [],
    capacityKey: 'model-api',
  }));
}

export function analyzeDependencies(items) {
  const dataEdges = [];
  const mutationConflicts = [];
  const capacityGroups = new Map();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const group = capacityGroups.get(item.capacityKey) ?? [];
    group.push(item.id);
    capacityGroups.set(item.capacityKey, group);

    for (let j = i + 1; j < items.length; j++) {
      const other = items[j];
      const sharedWrites = item.writes.filter((resource) => other.writes.includes(resource));
      if (sharedWrites.length > 0) {
        mutationConflicts.push({ left: item.id, right: other.id, resources: sharedWrites });
      }
    }
  }

  return {
    dataEdges,
    mutationConflicts,
    capacityGroups: [...capacityGroups].map(([key, ids]) => ({ key, ids })),
  };
}

async function mapLimit(items, limit, worker) {
  if (!Number.isInteger(limit) || limit < 1) throw new Error('concurrency must be a positive integer');
  const outputs = new Array(items.length);
  let cursor = 0;
  let active = 0;
  let maxActive = 0;

  async function consume() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      active++;
      maxActive = Math.max(maxActive, active);
      try {
        outputs[index] = await worker(items[index], index);
      } finally {
        active--;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, consume));
  return { outputs: outputs.flatMap((output) => output ?? []), maxActive };
}

function injectedResults(item, index, scenario) {
  const base = { id: item.id, status: 'succeeded', issues: [] };
  if (scenario === 'missing' && index === 6) return [];
  if (scenario === 'duplicate' && index === 7) return [base, { ...base }];
  if (scenario === 'balanced' && index === 6) return [];
  if (scenario === 'balanced' && index === 7) return [base, { ...base }];
  if (scenario === 'failed' && index === 8) return [{ ...base, status: 'failed', error: 'controlled failure' }];
  if (scenario === 'timed_out' && index === 9) return [{ ...base, status: 'timed_out', error: 'controlled timeout' }];
  if (scenario === 'unknown' && index === 10) return [{ ...base, id: 'route-unknown' }];
  return [base];
}

export async function executeAudits(items, { concurrency, scenario }) {
  return mapLimit(items, concurrency, async (item, index) => {
    await waitImmediate();
    return injectedResults(item, index, scenario);
  });
}

export function reconcile(expectedIds, results, { allowPartial = false } = {}) {
  const expected = new Set(expectedIds);
  const byId = new Map();

  for (const result of results) {
    const matches = byId.get(result.id) ?? [];
    matches.push(result);
    byId.set(result.id, matches);
  }

  const missing = expectedIds.filter((id) => !byId.has(id));
  const duplicate = [...byId].filter(([, matches]) => matches.length > 1).map(([id]) => id).sort();
  const unknown = [...byId.keys()].filter((id) => !expected.has(id)).sort();
  const uniqueExpectedResults = [...byId]
    .filter(([id, matches]) => expected.has(id) && matches.length === 1)
    .map(([, matches]) => matches[0]);
  const failed = uniqueExpectedResults.filter((result) => result.status === 'failed').map((result) => result.id).sort();
  const timedOut = uniqueExpectedResults.filter((result) => result.status === 'timed_out').map((result) => result.id).sort();
  const cancelled = uniqueExpectedResults.filter((result) => result.status === 'cancelled').map((result) => result.id).sort();
  const nonSuccess = uniqueExpectedResults.filter((result) => result.status !== 'succeeded').map((result) => result.id).sort();
  const invalid = duplicate.length > 0 || unknown.length > 0;
  const complete = !invalid && missing.length === 0 && nonSuccess.length === 0;
  const unresolved = [...new Set([...missing, ...duplicate, ...unknown, ...nonSuccess])].sort();

  return {
    expectedCount: expectedIds.length,
    observedCount: results.length,
    uniqueObservedCount: byId.size,
    missing,
    duplicate,
    unknown,
    failed,
    timedOut,
    cancelled,
    unresolved,
    complete,
    canSynthesize: complete || (allowPartial && !invalid),
    label: complete ? 'complete' : 'incomplete',
  };
}

function chunk(values, size) {
  if (!Number.isInteger(size) || size < 1) throw new Error('batchSize must be a positive integer');
  const batches = [];
  for (let index = 0; index < values.length; index += size) batches.push(values.slice(index, index + size));
  return batches;
}

export function summarizeInLayers(expectedIds, results, batchSize) {
  const resultById = new Map(results.map((result) => [result.id, result]));
  const batches = chunk(expectedIds, batchSize).map((ids, index) => {
    const representedIds = ids.filter((id) => resultById.has(id));
    const statusCounts = {};
    for (const id of representedIds) {
      const status = resultById.get(id).status;
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    }
    return {
      batchId: `batch-${String(index + 1).padStart(3, '0')}`,
      expectedCount: ids.length,
      representedCount: representedIds.length,
      representedIds,
      statusCounts,
    };
  });

  const representedIds = batches.flatMap((batch) => batch.representedIds);
  const finalReconciliation = reconcile(expectedIds, representedIds.map((id) => resultById.get(id)));
  return { batches, finalReconciliation };
}

export async function runExperiment({
  count = 60,
  batchSize = 20,
  concurrency = 8,
  scenario = 'happy',
  allowPartial = false,
} = {}) {
  const items = makeItems(count);
  const dependencyAnalysis = analyzeDependencies(items);
  const execution = await executeAudits(items, { concurrency, scenario });
  const expectedIds = items.map((item) => item.id);
  const accounting = reconcile(expectedIds, execution.outputs, { allowPartial });

  let layered = null;
  if (accounting.complete) layered = summarizeInLayers(expectedIds, execution.outputs, batchSize);

  return {
    config: { count, batchSize, concurrency, scenario, allowPartial },
    dependencyAnalysis,
    maxActive: execution.maxActive,
    accounting,
    layered,
    report: accounting.complete && layered?.finalReconciliation.complete
      ? { label: 'complete', expectedCount: count, batchCount: layered.batches.length }
      : accounting.canSynthesize
        ? { label: 'incomplete', expectedCount: count, unresolved: accounting.unresolved }
        : null,
  };
}
