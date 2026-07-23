#!/usr/bin/env node
import assert from 'node:assert/strict';
import { runExperiment } from './experiment.mjs';

let passed = 0;

async function scenario(name, test) {
  await test();
  passed++;
  console.log(`✓ ${name}`);
}

await scenario('60 independent audits produce three reconciled layers within the concurrency ceiling', async () => {
  const result = await runExperiment({ count: 60, batchSize: 20, concurrency: 8 });
  assert.equal(result.report.label, 'complete');
  assert.equal(result.report.batchCount, 3);
  assert.equal(result.accounting.complete, true);
  assert.equal(result.layered.finalReconciliation.complete, true);
  assert.equal(result.maxActive, 8);
  assert.equal(result.dependencyAnalysis.dataEdges.length, 0);
  assert.equal(result.dependencyAnalysis.mutationConflicts.length, 0);
  assert.equal(result.dependencyAnalysis.capacityGroups[0].ids.length, 60);
});

await scenario('100 audits remain complete with bounded concurrency and four batch summaries', async () => {
  const result = await runExperiment({ count: 100, batchSize: 25, concurrency: 10 });
  assert.equal(result.report.label, 'complete');
  assert.equal(result.report.batchCount, 4);
  assert.equal(result.maxActive, 10);
  assert.deepEqual(result.layered.batches.map((batch) => batch.expectedCount), [25, 25, 25, 25]);
});

await scenario('a missing result blocks strict synthesis', async () => {
  const result = await runExperiment({ scenario: 'missing' });
  assert.equal(result.report, null);
  assert.deepEqual(result.accounting.missing, ['route-007']);
  assert.equal(result.accounting.label, 'incomplete');
});

await scenario('a duplicate blocks synthesis', async () => {
  const result = await runExperiment({ scenario: 'duplicate' });
  assert.equal(result.report, null);
  assert.deepEqual(result.accounting.duplicate, ['route-008']);
});

await scenario('identity reconciliation catches a duplicate masking a missing result at equal scalar count', async () => {
  const result = await runExperiment({ scenario: 'balanced' });
  assert.equal(result.accounting.observedCount, result.accounting.expectedCount);
  assert.deepEqual(result.accounting.missing, ['route-007']);
  assert.deepEqual(result.accounting.duplicate, ['route-008']);
  assert.equal(result.report, null);
});

await scenario('an explicit failed result blocks strict synthesis', async () => {
  const result = await runExperiment({ scenario: 'failed' });
  assert.equal(result.report, null);
  assert.deepEqual(result.accounting.failed, ['route-009']);
});

await scenario('a timed-out result blocks strict synthesis', async () => {
  const result = await runExperiment({ scenario: 'timed_out' });
  assert.equal(result.report, null);
  assert.deepEqual(result.accounting.timedOut, ['route-010']);
});

await scenario('an unknown identity blocks synthesis and exposes the displaced expected identity', async () => {
  const result = await runExperiment({ scenario: 'unknown' });
  assert.equal(result.report, null);
  assert.deepEqual(result.accounting.unknown, ['route-unknown']);
  assert.deepEqual(result.accounting.missing, ['route-011']);
});

await scenario('explicitly allowed partial synthesis remains labelled incomplete', async () => {
  const result = await runExperiment({ scenario: 'missing', allowPartial: true });
  assert.equal(result.report.label, 'incomplete');
  assert.deepEqual(result.report.unresolved, ['route-007']);
  assert.equal(result.accounting.complete, false);
  assert.equal(result.layered, null);
});

console.log(`Results: ${passed} passed, 0 failed`);
