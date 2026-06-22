// Workflow Runtime Template — TypeScript
//
// Use this as a starting point inside a Target Project when a POM workflow,
// Dynamic Workflow, or loop/goal YAML FSM needs executable integration points.
// Define and validate the FSM with any YAML that follows the POM workflow
// schema; WORKFLOW_TEMPLATE.yaml is only a reference starting point. Then run
// pom:workflow:lint and implement the ports below with target infrastructure.
// POM does not own these services at runtime.

export type Json = Record<string, unknown>;

export interface WorkflowSnapshot {
  workflow: string;
  version: number;
  state: string;
  context: Json;
  inFlight?: WorkflowHandle[];
}

export interface WorkflowHandle {
  name: string;
  workflow?: string;
  externalId?: string;
  status?: "active" | "awaited" | "cancelled" | "detached" | "suspended";
}

export interface ExecutionPort {
  dispatch(event: string, context: Json): Promise<Json> | Json;
}

export interface PersistencePort {
  saveSnapshot(key: string, snapshot: WorkflowSnapshot): Promise<void> | void;
  loadSnapshot(key: string): Promise<WorkflowSnapshot | undefined> | WorkflowSnapshot | undefined;
}

export interface TimerPort {
  schedule(key: string, delay: string, event: string): Promise<void> | void;
  cancel(key: string): Promise<void> | void;
  now(): Date;
}

export interface RetryPolicy {
  canRetry(key: string, context: Json): boolean;
  recordAttempt(key: string, context: Json): Json;
  nextDelay(key: string, context: Json): string | undefined;
}

export interface ToolPort {
  callTool(name: string, input: Json): Promise<Json>;
}

export interface SideEffectPort {
  publish(event: string, payload: Json): Promise<void> | void;
  compensate(step: string, context: Json): Promise<void> | void;
}

export interface RuntimePorts {
  execution: ExecutionPort;
  persistence: PersistencePort;
  timer: TimerPort;
  retry: RetryPolicy;
  tools: ToolPort;
  sideEffects: SideEffectPort;
}

export class WorkflowRuntime {
  constructor(private readonly ports: RuntimePorts) {}

  async step(key: string, event: string, snapshot: WorkflowSnapshot): Promise<WorkflowSnapshot> {
    const context = await this.ports.execution.dispatch(event, snapshot.context);
    const next: WorkflowSnapshot = { ...snapshot, context };
    await this.ports.persistence.saveSnapshot(key, next);
    await this.ports.sideEffects.publish("workflow.step", { key, workflow: next.workflow, state: next.state, event });
    return next;
  }

  async scheduleTimeout(key: string, delay: string, event: string): Promise<void> {
    await this.ports.timer.schedule(key, delay, event);
  }

  async callTool(name: string, input: Json): Promise<Json> {
    return this.ports.tools.callTool(name, input);
  }
}
