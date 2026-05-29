// Minimal in-file model for the composed suspend/restore evidence.
// We do not import from the toy YAML examples on disk (no validator
// here, no js-yaml dependency). The two machines below mirror the
// examples/invoke-state-toy/{state-invoke-parent,state-invoke-child}
// .yaml files used in round 2.

export type ParentState = 'idle' | 'validating' | 'done' | 'rejected';
export type ParentEvent = 'start' | 'validation_passed' | 'validation_failed';

export type ChildState = 'start' | 'validated' | 'refused';
export type ChildEvent = 'finish_ok' | 'finish_ko';

interface Transition<S, E> { from: S; to: S; event: E; }

export const PARENT_TRANSITIONS: ReadonlyArray<Transition<ParentState, ParentEvent>> = [
  { from: 'idle',       to: 'validating', event: 'start' },
  { from: 'validating', to: 'done',       event: 'validation_passed' },
  { from: 'validating', to: 'rejected',   event: 'validation_failed' },
];

export const CHILD_TRANSITIONS: ReadonlyArray<Transition<ChildState, ChildEvent>> = [
  { from: 'start', to: 'validated', event: 'finish_ok' },
  { from: 'start', to: 'refused',   event: 'finish_ko' },
];

export const PARENT_TERMINAL_STATES: ReadonlySet<ParentState> = new Set(['done', 'rejected']);
export const CHILD_TERMINAL_STATES: ReadonlySet<ChildState> = new Set(['validated', 'refused']);

// Map child terminal -> parent event, as declared in state-invoke-parent.yaml.
export const ON_COMPLETION: Record<ChildState, ParentEvent | null> = {
  validated: 'validation_passed',
  refused: 'validation_failed',
  start: null,
};

export type Result<S> = { kind: 'allowed'; next: S } | { kind: 'refused'; reason: string };

export function step<S, E>(
  state: S,
  event: E,
  transitions: ReadonlyArray<Transition<S, E>>,
): Result<S> {
  const t = transitions.find((x) => x.from === state && x.event === event);
  if (t) return { kind: 'allowed', next: t.to };
  return { kind: 'refused', reason: 'no_matching_transition' };
}
