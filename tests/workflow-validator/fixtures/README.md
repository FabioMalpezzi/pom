# Workflow validator fixtures

`core.*`, `evidence.*` and `runtime-loop.*` are native to this directory.

The following files are verbatim copies taken from `experiments/` so the test
suite does not depend on that tree (last commit touching each source directory
as of `66b6d04`):

| Files | Source | Commit |
|---|---|---|
| `handle.broken-E08x-*.yaml`, `state-invoke-parallel-E036.yaml` | `experiments/dynamic-workflows/broken-fixtures/` | `96bf1a8` (Extend dynamic workflow control plane, 2026-06-01) |
| `loop-guard-timeout.yaml`, `loop-guard-unused-override-warning.yaml` | `experiments/schema-loop-guard-timeout/examples/` | `850456a` (Adopt workflow loop guard and timeout, 2026-05-31) |
| `loop-guard.broken-*.yaml`, `duration.broken-*.yaml`, `timeout.broken-*.yaml`, `state.broken-E073-*.yaml` | `experiments/schema-loop-guard-timeout/broken-fixtures/` | `850456a` |

Consumers: `test-dynamic-handles.mjs`, `test-temporal-primitives.mjs`.
