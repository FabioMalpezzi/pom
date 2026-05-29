// Composed suspend/restore: the snapshot is a stack of frames, one
// per active invoke level. Following the convention documented in
// WORKFLOW_IMPLEMENTATION_GUIDE.md "Suspend and Restore" section.
//
// Two frames are exercised by the test: the parent (state_invoke_parent)
// is suspended while it is in "validating" and the child
// (state_invoke_child) is in some non-terminal state. Restore walks
// the stack outward: progress only on the leaf, and propagate when the
// leaf reaches a terminal that maps to a parent event.

export interface MachineFrame<S = string, C = Record<string, unknown>> {
  workflow: string;
  version: number;
  state: S;
  context: C;
}

export interface StackSnapshot {
  stack: MachineFrame[];
}

export function serialize(s: StackSnapshot): string {
  return JSON.stringify(s, null, 2);
}

export function deserialize(raw: string, expectedWorkflows: ReadonlySet<string>): StackSnapshot {
  const obj = JSON.parse(raw);
  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.stack)) {
    throw new Error('snapshot.stack must be an array');
  }
  if (obj.stack.length === 0) {
    throw new Error('snapshot.stack is empty');
  }
  for (let i = 0; i < obj.stack.length; i++) {
    const f = obj.stack[i];
    if (!f || typeof f.workflow !== 'string' || typeof f.state !== 'string') {
      throw new Error(`frame[${i}]: missing workflow or state`);
    }
    if (!expectedWorkflows.has(f.workflow)) {
      throw new Error(`frame[${i}]: unknown workflow ${f.workflow}`);
    }
  }
  return obj as StackSnapshot;
}

export function leafFrame(s: StackSnapshot): MachineFrame {
  return s.stack[s.stack.length - 1];
}

export function popFrame(s: StackSnapshot): StackSnapshot {
  return { stack: s.stack.slice(0, -1) };
}

export function replaceLeaf(s: StackSnapshot, next: MachineFrame): StackSnapshot {
  const stack = s.stack.slice();
  stack[stack.length - 1] = next;
  return { stack };
}

export function pushFrame(s: StackSnapshot, f: MachineFrame): StackSnapshot {
  return { stack: [...s.stack, f] };
}
