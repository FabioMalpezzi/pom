# Suspend / restore evidence — Python single machine

Same case as `evidence/typescript/spec-evolution-suspend/`, in idiomatic Python (3.10+ for `match`/`case` and `Literal`). Demonstrates that the Pattern A snapshot-and-restore shape is language-agnostic.

- `suspend.py`: `MachineSnapshot` dataclass, `serialize` / `deserialize` via `json` stdlib, `assert_snapshot_matches_model` with the same three invariants. No best-effort restore.
- `test_suspend.py`: 6 unittest tests parallel one-to-one to the TypeScript suite.

The Pattern A code from `evidence/python/spec-evolution/` is reused verbatim via `sys.path` manipulation (no installer needed).

## Reproduce

```bash
python3 -m unittest test_suspend.py -v
```

Expected: 6 tests pass, exit 0. Recorded output is in `test-output.txt`.
