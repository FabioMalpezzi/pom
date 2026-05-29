// Composed suspend/restore test.
//
// Scenario: the parent state_invoke_parent is in "validating", which
// has an invoke on state_invoke_child. We push the child frame, drive
// the child to a non-terminal state, suspend the stack to disk,
// "restart" in a fresh process, restore the stack, drive the child to
// "validated", pop the child frame, dispatch the on_completion event
// (validation_passed) to the parent, drive the parent to "done".

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  PARENT_TRANSITIONS,
  CHILD_TRANSITIONS,
  ON_COMPLETION,
  CHILD_TERMINAL_STATES,
  PARENT_TERMINAL_STATES,
  step,
  type ParentState,
  type ParentEvent,
  type ChildState,
  type ChildEvent,
} from './parent-child.ts';

import {
  type StackSnapshot,
  type MachineFrame,
  serialize,
  deserialize,
  leafFrame,
  popFrame,
  replaceLeaf,
  pushFrame,
} from './composed-suspend.ts';

const KNOWN_WORKFLOWS = new Set(['state_invoke_parent', 'state_invoke_child']);
const TMP = mkdtempSync(join(tmpdir(), 'pom-composed-suspend-'));
const SNAPSHOT_PATH = join(TMP, 'composed.snapshot.json');

function makeInitialStack(): StackSnapshot {
  return { stack: [
    { workflow: 'state_invoke_parent', version: 1, state: 'idle', context: {} },
  ] };
}

function suspend(s: StackSnapshot): void {
  writeFileSync(SNAPSHOT_PATH, serialize(s), 'utf8');
}

function restoreFromDisk(): StackSnapshot {
  return deserialize(readFileSync(SNAPSHOT_PATH, 'utf8'), KNOWN_WORKFLOWS);
}

test('parent suspends while child is mid-execution; restore continues, child terminates, parent completes', () => {
  // 1) Fresh start. Parent in idle.
  let s = makeInitialStack();
  assert.equal(leafFrame(s).workflow, 'state_invoke_parent');
  assert.equal(leafFrame(s).state, 'idle');

  // 2) Parent receives "start", moves to validating, opens the child.
  let leaf = leafFrame(s) as MachineFrame<ParentState>;
  let r = step<ParentState, ParentEvent>(leaf.state, 'start', PARENT_TRANSITIONS);
  assert.equal(r.kind, 'allowed');
  s = replaceLeaf(s, { ...leaf, state: (r as { kind: 'allowed'; next: ParentState }).next });
  assert.equal(leafFrame(s).state, 'validating');

  // 3) Push the child frame (state_invoke_child starts at "start").
  s = pushFrame(s, {
    workflow: 'state_invoke_child',
    version: 1,
    state: 'start',
    context: {},
  });
  assert.equal(s.stack.length, 2);
  assert.equal(leafFrame(s).workflow, 'state_invoke_child');
  assert.equal(leafFrame(s).state, 'start');

  // 4) SUSPEND. Child is at "start", parent at "validating".
  suspend(s);

  // 5) Simulate restart. Restore from disk.
  s = restoreFromDisk();
  assert.equal(s.stack.length, 2);
  assert.equal(leafFrame(s).workflow, 'state_invoke_child');
  assert.equal(leafFrame(s).state, 'start');

  // 6) Drive the child to "validated".
  let childLeaf = leafFrame(s) as MachineFrame<ChildState>;
  r = step<ChildState, ChildEvent>(childLeaf.state, 'finish_ok', CHILD_TRANSITIONS) as
    | { kind: 'allowed'; next: ChildState }
    | { kind: 'refused'; reason: string };
  assert.equal(r.kind, 'allowed');
  s = replaceLeaf(s, { ...childLeaf, state: (r as { kind: 'allowed'; next: ChildState }).next });
  assert.equal(leafFrame(s).state, 'validated');

  // 7) Child reached a terminal. Pop the frame, look up on_completion.
  const childTerminal = leafFrame(s).state as ChildState;
  assert.equal(CHILD_TERMINAL_STATES.has(childTerminal), true);
  const parentEvent = ON_COMPLETION[childTerminal];
  assert.equal(parentEvent, 'validation_passed');
  s = popFrame(s);
  assert.equal(s.stack.length, 1);

  // 8) Dispatch the parent event. Parent transitions to "done".
  leaf = leafFrame(s) as MachineFrame<ParentState>;
  r = step<ParentState, ParentEvent>(leaf.state, parentEvent as ParentEvent, PARENT_TRANSITIONS);
  assert.equal(r.kind, 'allowed');
  s = replaceLeaf(s, { ...leaf, state: (r as { kind: 'allowed'; next: ParentState }).next });
  assert.equal(leafFrame(s).state, 'done');
  assert.equal(PARENT_TERMINAL_STATES.has(leafFrame(s).state as ParentState), true);
});

test('child refusal propagates correctly via on_completion mapping', () => {
  // Bring the parent into validating with a child at "start", suspend, restore, refuse.
  let s = makeInitialStack();
  let leaf = leafFrame(s) as MachineFrame<ParentState>;
  s = replaceLeaf(s, { ...leaf, state: 'validating' });
  s = pushFrame(s, { workflow: 'state_invoke_child', version: 1, state: 'start', context: {} });
  suspend(s);

  s = restoreFromDisk();
  const r = step<ChildState, ChildEvent>('start', 'finish_ko', CHILD_TRANSITIONS) as
    | { kind: 'allowed'; next: ChildState }
    | { kind: 'refused'; reason: string };
  assert.equal(r.kind, 'allowed');
  s = replaceLeaf(s, { ...(leafFrame(s) as MachineFrame<ChildState>), state: (r as { kind: 'allowed'; next: ChildState }).next });
  assert.equal(leafFrame(s).state, 'refused');

  const parentEvent = ON_COMPLETION['refused' as ChildState];
  assert.equal(parentEvent, 'validation_failed');
  s = popFrame(s);

  leaf = leafFrame(s) as MachineFrame<ParentState>;
  const r2 = step<ParentState, ParentEvent>(leaf.state, parentEvent as ParentEvent, PARENT_TRANSITIONS);
  assert.equal(r2.kind, 'allowed');
  s = replaceLeaf(s, { ...leaf, state: (r2 as { kind: 'allowed'; next: ParentState }).next });
  assert.equal(leafFrame(s).state, 'rejected');
});

test('stack snapshot round-trip preserves frame order and content', () => {
  const original: StackSnapshot = {
    stack: [
      { workflow: 'state_invoke_parent', version: 1, state: 'validating', context: { tenant: 'X' } },
      { workflow: 'state_invoke_child',  version: 1, state: 'start',      context: { token: 'abc' } },
    ],
  };
  const round = deserialize(serialize(original), KNOWN_WORKFLOWS);
  assert.deepEqual(round, original);
});

test('restore rejects an empty stack', () => {
  assert.throws(
    () => deserialize(JSON.stringify({ stack: [] }), KNOWN_WORKFLOWS),
    /stack is empty/,
  );
});

test('restore rejects a frame with an unknown workflow', () => {
  const bad = { stack: [{ workflow: 'ghost_workflow', version: 1, state: 'idle', context: {} }] };
  assert.throws(
    () => deserialize(JSON.stringify(bad), KNOWN_WORKFLOWS),
    /unknown workflow/,
  );
});

process.on('exit', () => {
  try { rmSync(TMP, { recursive: true, force: true }); } catch {}
});
