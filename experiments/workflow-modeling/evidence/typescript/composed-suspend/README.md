# Suspend / restore evidence — TypeScript composed (state-invoke stack)

Demonstrates the **composed case** of the Suspend and Restore section: a parent workflow is mid-execution while a child workflow it invoked is also mid-execution; both must survive a process restart, and restore must continue from the leaf and propagate the result back up the stack when the leaf reaches a terminal.

The model mirrors `examples/invoke-state-toy/{state-invoke-parent,state-invoke-child}.yaml` from round 2. The transition tables are hand-encoded in `parent-child.ts` to keep the evidence dependency-free (no YAML parser).

- `parent-child.ts`: parent and child transitions, on_completion mapping (child terminal → parent event), terminal sets.
- `composed-suspend.ts`: `StackSnapshot` shape (a stack of `MachineFrame`), `serialize`, `deserialize` with frame-by-frame validation against an expected-workflows set, helpers `leafFrame`, `popFrame`, `replaceLeaf`, `pushFrame`.
- `composed-suspend.test.ts`: 5 tests:
  1. The happy path: parent reaches `validating`, child is pushed at `start`, snapshot to disk, restart from disk, child reaches `validated`, pop the frame, dispatch `validation_passed` to the parent, parent reaches `done`.
  2. The refusal path: same shape but child reaches `refused`, parent reaches `rejected` via `validation_failed`.
  3. Round-trip identity of a two-frame snapshot.
  4. Restore rejects an empty stack.
  5. Restore rejects a frame referencing an unknown workflow.

## Reproduce

```bash
node --test --experimental-strip-types composed-suspend.test.ts
```

Expected: 5 tests pass, exit 0. Recorded output is in `test-output.txt`.
