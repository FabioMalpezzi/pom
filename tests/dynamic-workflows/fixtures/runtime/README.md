# Reference executors (test copy)

Copied verbatim from `experiments/dynamic-workflows/runtime/` at commit
`edae837` ("fix(deps): update js-yaml to 5.2.2", 2026-07-24), the last commit
that touched that directory as of `66b6d04`.

- `dynamic-workflow.ts` — TypeScript reference executor (run with
  `node --experimental-strip-types`, needs `js-yaml`).
- `dynamic_workflow.py` — Python reference executor (needs PyYAML; the test
  skips it when no interpreter with `yaml` is found).

Used by `tests/dynamic-workflows/integration/test-reference-executors.mjs`.
These copies exist so the test suite does not depend on `experiments/`.
