"""Workflow Runtime Template — Python.

Use this as a starting point inside a Target Project when a POM workflow,
Dynamic Workflow, or loop/goal YAML FSM needs executable integration points.
Define and validate the FSM with any YAML that follows the POM workflow
schema; WORKFLOW_TEMPLATE.yaml is only a reference starting point. Then run
pom:workflow:lint and implement these protocols with target infrastructure.
POM does not own these services at runtime.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Protocol

Json = dict[str, Any]


@dataclass
class WorkflowHandle:
    name: str
    workflow: str | None = None
    external_id: str | None = None
    status: str | None = None


@dataclass
class WorkflowSnapshot:
    workflow: str
    version: int
    state: str
    context: Json
    in_flight: list[WorkflowHandle] = field(default_factory=list)


class ExecutionPort(Protocol):
    def dispatch(self, event: str, context: Json) -> Json: ...


class PersistencePort(Protocol):
    def save_snapshot(self, key: str, snapshot: WorkflowSnapshot) -> None: ...
    def load_snapshot(self, key: str) -> WorkflowSnapshot | None: ...


class TimerPort(Protocol):
    def schedule(self, key: str, delay: str, event: str) -> None: ...
    def cancel(self, key: str) -> None: ...
    def now(self) -> datetime: ...


class RetryPolicy(Protocol):
    def can_retry(self, key: str, context: Json) -> bool: ...
    def record_attempt(self, key: str, context: Json) -> Json: ...
    def next_delay(self, key: str, context: Json) -> str | None: ...


class ToolPort(Protocol):
    def call_tool(self, name: str, input: Json) -> Json: ...


class SideEffectPort(Protocol):
    def publish(self, event: str, payload: Json) -> None: ...
    def compensate(self, step: str, context: Json) -> None: ...


@dataclass
class RuntimePorts:
    execution: ExecutionPort
    persistence: PersistencePort
    timer: TimerPort
    retry: RetryPolicy
    tools: ToolPort
    side_effects: SideEffectPort


class WorkflowRuntime:
    def __init__(self, ports: RuntimePorts):
        self.ports = ports

    def step(self, key: str, event: str, snapshot: WorkflowSnapshot) -> WorkflowSnapshot:
        context = self.ports.execution.dispatch(event, snapshot.context)
        next_snapshot = WorkflowSnapshot(
            workflow=snapshot.workflow,
            version=snapshot.version,
            state=snapshot.state,
            context=context,
            in_flight=snapshot.in_flight,
        )
        self.ports.persistence.save_snapshot(key, next_snapshot)
        self.ports.side_effects.publish(
            "workflow.step",
            {"key": key, "workflow": next_snapshot.workflow, "state": next_snapshot.state, "event": event},
        )
        return next_snapshot

    def schedule_timeout(self, key: str, delay: str, event: str) -> None:
        self.ports.timer.schedule(key, delay, event)

    def call_tool(self, name: str, input: Json) -> Json:
        return self.ports.tools.call_tool(name, input)
