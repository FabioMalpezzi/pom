# Dynamic Workflow candidate models (test copy)

Copied verbatim from `experiments/dynamic-workflows/workflows-candidate/` at
commit `96bf1a8` ("Extend dynamic workflow control plane", 2026-06-01), the
last commit that touched that directory as of `66b6d04`.

The whole directory is copied because models reference each other by relative
path (for example `14-handle-lifecycle.yaml` launches `01-task-pipeline.yaml`),
and the reference executors resolve those paths against the parent's directory.

Used by:
- `tests/dynamic-workflows/integration/test-reference-executors.mjs` (every file)
- `tests/workflow-validator/integration/test-dynamic-handles.mjs` (14, 15)
- `tests/workflow-validator/integration/test-verification-and-runtime-loop.mjs` (14)
