"""Suspend / restore plumbing for the Python spec-evolution example.

Same shape as the TypeScript evidence at
evidence/typescript/spec-evolution-suspend/suspend.ts:
- WORKFLOW_NAME / WORKFLOW_VERSION constants;
- MachineSnapshot @dataclass with workflow, version, state, context;
- serialize / deserialize using json (stdlib);
- assert_snapshot_matches_model with three invariants (workflow name,
  version, state in model). No best-effort restore.
"""

import json
import sys
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any

# Allow importing from ../spec-evolution/ when this folder is on sys.path.
_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE.parent / "spec-evolution"))

from spec_evolution import State, TransitionContext  # noqa: E402


WORKFLOW_NAME = "spec_evolution"
WORKFLOW_VERSION = 1

KNOWN_STATES: frozenset[str] = frozenset({
    "draft",
    "under_review",
    "accepted",
    "complete",
    "superseded",
    "withdrawn",
    "rejected",
})


@dataclass
class MachineSnapshot:
    workflow: str
    version: int
    state: State
    context: TransitionContext = field(default_factory=dict)


def serialize(snap: MachineSnapshot) -> str:
    return json.dumps(asdict(snap), indent=2)


def deserialize(raw: str) -> MachineSnapshot:
    obj = json.loads(raw)
    assert_snapshot_matches_model(obj)
    return MachineSnapshot(
        workflow=obj["workflow"],
        version=obj["version"],
        state=obj["state"],
        context=obj.get("context") or {},
    )


def assert_snapshot_matches_model(snap: Any) -> None:
    if not isinstance(snap, dict):
        raise ValueError("snapshot: not an object")
    if snap.get("workflow") != WORKFLOW_NAME:
        raise ValueError(
            f"snapshot.workflow mismatch: expected {WORKFLOW_NAME}, got {snap.get('workflow')}"
        )
    if snap.get("version") != WORKFLOW_VERSION:
        raise ValueError(
            f"snapshot.version mismatch: expected {WORKFLOW_VERSION}, got {snap.get('version')}"
        )
    state = snap.get("state")
    if not isinstance(state, str) or state not in KNOWN_STATES:
        raise ValueError(f"snapshot.state not in model: {state}")
    if not isinstance(snap.get("context"), dict):
        raise ValueError("snapshot.context not an object")


def initial_snapshot() -> MachineSnapshot:
    return MachineSnapshot(
        workflow=WORKFLOW_NAME,
        version=WORKFLOW_VERSION,
        state="draft",
        context={},
    )
