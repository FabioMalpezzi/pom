"""Suspend / restore tests for the Python spec-evolution example.

Same scenarios as the TypeScript evidence at
evidence/typescript/spec-evolution-suspend/suspend.test.ts:
1) draft -> under_review (suspend) -> accepted (suspend) -> complete;
2) snapshot round-trip is identity;
3) restore rejects wrong workflow name / wrong version / unknown state
   / malformed shape.

Run: python3 -m unittest test_suspend.py -v
"""

import json
import sys
import tempfile
import unittest
from dataclasses import replace
from pathlib import Path

_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE.parent / "spec-evolution"))

from spec_evolution import apply_transition, Allowed  # noqa: E402

from suspend import (
    MachineSnapshot,
    WORKFLOW_NAME,
    WORKFLOW_VERSION,
    assert_snapshot_matches_model,
    deserialize,
    initial_snapshot,
    serialize,
)


def step(snap: MachineSnapshot, event: str) -> MachineSnapshot:
    r = apply_transition(snap.state, event, snap.context)
    if not isinstance(r, Allowed):
        raise RuntimeError(f"refused: {event} on {snap.state} ({r.reason})")
    return replace(snap, state=r.next_state)


class TestSuspendRestoreFlow(unittest.TestCase):
    def test_three_step_suspend_restore(self):
        with tempfile.TemporaryDirectory() as tmpd:
            path = Path(tmpd) / "spec-evolution.snapshot.json"

            # Process A: from initial to under_review, suspend.
            snap = initial_snapshot()
            snap = step(snap, "submit_for_review")
            self.assertEqual(snap.state, "under_review")
            path.write_text(serialize(snap), encoding="utf-8")

            # Process B: simulate restart, restore, drive to accepted.
            snap = deserialize(path.read_text(encoding="utf-8"))
            self.assertEqual(snap.state, "under_review")
            snap = step(snap, "accept")
            self.assertEqual(snap.state, "accepted")
            path.write_text(serialize(snap), encoding="utf-8")

            # Process C: restart again, set guard in context, drive to complete.
            snap = deserialize(path.read_text(encoding="utf-8"))
            self.assertEqual(snap.state, "accepted")
            snap.context["has_completion_verification_gate"] = True
            snap = step(snap, "implement_and_verify")
            self.assertEqual(snap.state, "complete")


class TestSerializeRoundTrip(unittest.TestCase):
    def test_round_trip_is_identity(self):
        original = MachineSnapshot(
            workflow=WORKFLOW_NAME,
            version=WORKFLOW_VERSION,
            state="accepted",
            context={
                "has_completion_verification_gate": True,
                "superseding_spec_accepted": False,
            },
        )
        roundtrip = deserialize(serialize(original))
        self.assertEqual(roundtrip, original)


class TestRestoreInvariants(unittest.TestCase):
    def test_wrong_workflow_name_rejected(self):
        bad = {"workflow": "other_workflow", "version": 1, "state": "draft", "context": {}}
        with self.assertRaisesRegex(ValueError, "workflow mismatch"):
            assert_snapshot_matches_model(bad)

    def test_wrong_version_rejected(self):
        bad = {"workflow": WORKFLOW_NAME, "version": 999, "state": "draft", "context": {}}
        with self.assertRaisesRegex(ValueError, "version mismatch"):
            assert_snapshot_matches_model(bad)

    def test_unknown_state_rejected(self):
        bad = {"workflow": WORKFLOW_NAME, "version": WORKFLOW_VERSION, "state": "flying", "context": {}}
        with self.assertRaisesRegex(ValueError, "state not in model"):
            assert_snapshot_matches_model(bad)

    def test_malformed_rejected(self):
        with self.assertRaisesRegex(ValueError, "not an object"):
            assert_snapshot_matches_model(None)
        with self.assertRaisesRegex(ValueError, "not an object"):
            assert_snapshot_matches_model("not-a-dict")
        bad = {"workflow": WORKFLOW_NAME, "version": WORKFLOW_VERSION, "state": "draft", "context": None}
        with self.assertRaisesRegex(ValueError, "context not an object"):
            assert_snapshot_matches_model(bad)


if __name__ == "__main__":
    unittest.main()
