# Suspend / restore evidence — TypeScript single machine

Demonstrates the simplest case of the Suspend and Restore section of `templates-candidate/WORKFLOW_IMPLEMENTATION_GUIDE.md`: one workflow, no composition, snapshot is `{ workflow, version, state, context }`.

The Pattern A code from `evidence/typescript/spec-evolution/` is reused verbatim. This evidence adds only the persistence plumbing:

- `suspend.ts`: `MachineSnapshot`, `serialize`, `deserialize`, `assertSnapshotMatchesModel`, `initialSnapshot`. Three invariants enforced on restore: workflow name, version, state existence.
- `suspend.test.ts`: 6 tests covering the three-step suspend/restore flow (draft → under_review → accepted → complete across three simulated process restarts), the round-trip identity, and the four rejection paths (wrong workflow, wrong version, unknown state, malformed shape).

Tests use a temporary directory under `os.tmpdir()` for the snapshot file, mirroring what production code would do against a DB column or a KV store.

## Reproduce

```bash
node --test --experimental-strip-types suspend.test.ts
```

Expected: 6 tests pass, exit 0. Recorded output is in `test-output.txt`.
