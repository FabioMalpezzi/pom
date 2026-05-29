// Tests derived from experiments/workflow-modeling/examples/spec-evolution.yaml.
// Categories follow the prompt's `scenarios` mode:
// - positive transitions (allowed),
// - refused (from, event) pairs (not declared in the model),
// - guard true / guard false branches for guarded transitions,
// - terminal-state checks (no transition out, except where
//   re_entry_allowed: true is declared).
//
// Run: node --test --experimental-strip-types spec-evolution.test.ts

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyTransition,
  TERMINAL_STATES,
  RE_ENTRY_ALLOWED_STATES,
  type State,
  type Event,
} from './spec-evolution.ts';

const ALL_EVENTS: readonly Event[] = [
  'submit_for_review',
  'request_changes',
  'accept',
  'reject',
  'implement_and_verify',
  'supersede',
  'withdraw',
];

// ---- Positive transitions ---------------------------------------------------

test('draft -> under_review on submit_for_review', () => {
  const r = applyTransition('draft', 'submit_for_review');
  assert.deepEqual(r, { kind: 'allowed', next: 'under_review' });
});

test('under_review -> draft on request_changes', () => {
  const r = applyTransition('under_review', 'request_changes');
  assert.deepEqual(r, { kind: 'allowed', next: 'draft' });
});

test('under_review -> accepted on accept', () => {
  const r = applyTransition('under_review', 'accept');
  assert.deepEqual(r, { kind: 'allowed', next: 'accepted' });
});

test('under_review -> rejected on reject', () => {
  const r = applyTransition('under_review', 'reject');
  assert.deepEqual(r, { kind: 'allowed', next: 'rejected' });
});

test('draft -> withdrawn on withdraw', () => {
  const r = applyTransition('draft', 'withdraw');
  assert.deepEqual(r, { kind: 'allowed', next: 'withdrawn' });
});

// ---- Guard true / guard false ----------------------------------------------

test('accepted -> complete on implement_and_verify with guard true', () => {
  const r = applyTransition('accepted', 'implement_and_verify', {
    hasCompletionVerificationGate: true,
  });
  assert.deepEqual(r, { kind: 'allowed', next: 'complete' });
});

test('accepted -> complete refused when guard has_completion_verification_gate is false', () => {
  const r = applyTransition('accepted', 'implement_and_verify', {
    hasCompletionVerificationGate: false,
  });
  assert.deepEqual(r, { kind: 'refused', reason: 'guard_false' });
});

test('accepted -> superseded on supersede with guard true', () => {
  const r = applyTransition('accepted', 'supersede', {
    supersedingSpecAccepted: true,
  });
  assert.deepEqual(r, { kind: 'allowed', next: 'superseded' });
});

test('accepted -> superseded refused when guard superseding_spec_accepted is false', () => {
  const r = applyTransition('accepted', 'supersede', {
    supersedingSpecAccepted: false,
  });
  assert.deepEqual(r, { kind: 'refused', reason: 'guard_false' });
});

test('complete -> superseded on supersede with guard true (re_entry_allowed path)', () => {
  const r = applyTransition('complete', 'supersede', {
    supersedingSpecAccepted: true,
  });
  assert.deepEqual(r, { kind: 'allowed', next: 'superseded' });
});

// ---- Refused: (from, event) pairs not declared ------------------------------

test('draft does not accept accept', () => {
  const r = applyTransition('draft', 'accept');
  assert.deepEqual(r, { kind: 'refused', reason: 'no_matching_transition' });
});

test('accepted does not accept submit_for_review', () => {
  const r = applyTransition('accepted', 'submit_for_review');
  assert.deepEqual(r, { kind: 'refused', reason: 'no_matching_transition' });
});

test('accepted does not accept withdraw (after review starts the spec cannot be retracted quietly)', () => {
  const r = applyTransition('accepted', 'withdraw');
  assert.deepEqual(r, { kind: 'refused', reason: 'no_matching_transition' });
});

// ---- Terminal-state checks --------------------------------------------------

test('terminal states without re_entry_allowed reject every event', () => {
  const reEntryAllowed = new Set<State>(RE_ENTRY_ALLOWED_STATES);
  for (const state of TERMINAL_STATES) {
    if (reEntryAllowed.has(state)) continue;
    for (const event of ALL_EVENTS) {
      const r = applyTransition(state, event, {
        hasCompletionVerificationGate: true,
        supersedingSpecAccepted: true,
      });
      assert.equal(
        r.kind,
        'refused',
        `expected ${state} on ${event} to be refused`,
      );
    }
  }
});

test('complete (re_entry_allowed) refuses every event except supersede with guard true', () => {
  for (const event of ALL_EVENTS) {
    const r = applyTransition('complete', event, {
      hasCompletionVerificationGate: true,
      supersedingSpecAccepted: true,
    });
    if (event === 'supersede') {
      assert.deepEqual(r, { kind: 'allowed', next: 'superseded' });
    } else {
      assert.equal(r.kind, 'refused');
    }
  }
});
