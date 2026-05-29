// Suspend / restore test for the spec-evolution single-machine
// example. Simulates two-process suspend/restore by writing the
// snapshot to /tmp between turns.
//
// Run: node --test --experimental-strip-types suspend.test.ts

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  applyTransition,
  type State,
} from '../spec-evolution/spec-evolution.ts';
import {
  type MachineSnapshot,
  serialize,
  deserialize,
  assertSnapshotMatchesModel,
  initialSnapshot,
  WORKFLOW_NAME,
  WORKFLOW_VERSION,
} from './suspend.ts';

const TMP = mkdtempSync(join(tmpdir(), 'pom-suspend-'));
const SNAPSHOT_PATH = join(TMP, 'spec-evolution.snapshot.json');

function suspend(snap: MachineSnapshot): void {
  writeFileSync(SNAPSHOT_PATH, serialize(snap), 'utf8');
}

function restore(): MachineSnapshot {
  return deserialize(readFileSync(SNAPSHOT_PATH, 'utf8'));
}

function step(snap: MachineSnapshot, event: string): MachineSnapshot {
  const r = applyTransition(snap.state, event as Parameters<typeof applyTransition>[1], snap.context);
  if (r.kind === 'refused') {
    throw new Error(`refused: ${event} on ${snap.state} (${r.reason})`);
  }
  return { ...snap, state: r.next };
}

test('three-step suspend/restore: draft -> under_review -> accepted -> complete', () => {
  // Process A: from initial to under_review, suspend.
  let snap = initialSnapshot();
  snap = step(snap, 'submit_for_review');
  assert.equal(snap.state, 'under_review');
  suspend(snap);

  // Process B: simulate restart, restore from snapshot, advance to accepted.
  snap = restore();
  assert.equal(snap.state, 'under_review');
  snap = step(snap, 'accept');
  assert.equal(snap.state, 'accepted');
  suspend(snap);

  // Process C: another restart, set the guard in context, drive to complete.
  snap = restore();
  assert.equal(snap.state, 'accepted');
  snap = { ...snap, context: { ...snap.context, hasCompletionVerificationGate: true } };
  snap = step(snap, 'implement_and_verify');
  assert.equal(snap.state, 'complete');
});

test('snapshot round-trip: serialize -> deserialize is identity', () => {
  const original: MachineSnapshot = {
    workflow: WORKFLOW_NAME,
    version: WORKFLOW_VERSION,
    state: 'accepted' as State,
    context: { hasCompletionVerificationGate: true, supersedingSpecAccepted: false },
  };
  const round = deserialize(serialize(original));
  assert.deepEqual(round, original);
});

test('restore rejects a snapshot with wrong workflow name', () => {
  const bad = { workflow: 'other_workflow', version: 1, state: 'draft', context: {} };
  assert.throws(
    () => assertSnapshotMatchesModel(bad),
    /workflow mismatch/,
  );
});

test('restore rejects a snapshot with wrong version', () => {
  const bad = { workflow: WORKFLOW_NAME, version: 999, state: 'draft', context: {} };
  assert.throws(
    () => assertSnapshotMatchesModel(bad),
    /version mismatch/,
  );
});

test('restore rejects a snapshot whose state is not in the model', () => {
  const bad = { workflow: WORKFLOW_NAME, version: WORKFLOW_VERSION, state: 'flying', context: {} };
  assert.throws(
    () => assertSnapshotMatchesModel(bad),
    /state not in model/,
  );
});

test('restore rejects a malformed snapshot', () => {
  assert.throws(() => assertSnapshotMatchesModel(null), /not an object/);
  assert.throws(() => assertSnapshotMatchesModel('not-json'), /not an object/);
  assert.throws(
    () => assertSnapshotMatchesModel({ workflow: WORKFLOW_NAME, version: WORKFLOW_VERSION, state: 'draft', context: null }),
    /context not an object/,
  );
});

// Cleanup the tmp dir at process exit. node:test does not need explicit
// teardown for our usage; mkdtempSync gives us a fresh dir per run.
process.on('exit', () => {
  try { rmSync(TMP, { recursive: true, force: true }); } catch {}
});
