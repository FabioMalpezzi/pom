// Suspend / restore plumbing for the spec-evolution single-machine
// example. Documents the simplest case of the Suspend and Restore
// section of WORKFLOW_IMPLEMENTATION_GUIDE.md: one workflow, no
// composition, snapshot is { workflow, version, state, context }.
//
// The model lives in ../spec-evolution/spec-evolution.ts. We import
// only the types and helpers needed for validation.

import {
  type State,
  type TransitionContext,
} from '../spec-evolution/spec-evolution.ts';

export const WORKFLOW_NAME = 'spec_evolution';
export const WORKFLOW_VERSION = 1;

const KNOWN_STATES: ReadonlySet<State> = new Set([
  'draft',
  'under_review',
  'accepted',
  'complete',
  'superseded',
  'withdrawn',
  'rejected',
]);

export interface MachineSnapshot {
  workflow: string;
  version: number;
  state: State;
  context: TransitionContext;
}

export function serialize(snap: MachineSnapshot): string {
  return JSON.stringify(snap, null, 2);
}

export function deserialize(raw: string): MachineSnapshot {
  const obj = JSON.parse(raw);
  assertSnapshotMatchesModel(obj);
  return obj as MachineSnapshot;
}

// Three-invariant check. Throws if any fails. No best-effort restore.
export function assertSnapshotMatchesModel(snap: unknown): asserts snap is MachineSnapshot {
  if (snap == null || typeof snap !== 'object') {
    throw new Error('snapshot: not an object');
  }
  const s = snap as Record<string, unknown>;
  if (s.workflow !== WORKFLOW_NAME) {
    throw new Error(`snapshot.workflow mismatch: expected ${WORKFLOW_NAME}, got ${String(s.workflow)}`);
  }
  if (s.version !== WORKFLOW_VERSION) {
    throw new Error(`snapshot.version mismatch: expected ${WORKFLOW_VERSION}, got ${String(s.version)}`);
  }
  if (typeof s.state !== 'string' || !KNOWN_STATES.has(s.state as State)) {
    throw new Error(`snapshot.state not in model: ${String(s.state)}`);
  }
  if (s.context == null || typeof s.context !== 'object') {
    throw new Error('snapshot.context not an object');
  }
}

export function initialSnapshot(): MachineSnapshot {
  return {
    workflow: WORKFLOW_NAME,
    version: WORKFLOW_VERSION,
    state: 'draft',
    context: {},
  };
}
