// workflow-loader.ts — carica il workflow POM dal file YAML e costruisce
// la transition table {from, event} -> {to} usata dal Pattern A.
// Nessuna validazione semantica qui: lo schema POM viene già verificato
// dal validator (`pom:workflow:lint`); questo modulo si fida del file.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import yaml from 'js-yaml';

const here = dirname(fileURLToPath(import.meta.url));

export type StateName = string;
export type EventName = string;

export interface WorkflowState {
  name: StateName;
  description?: string;
  is_final?: boolean;
}

export interface WorkflowTransition {
  from: StateName;
  to: StateName;
  event: EventName;
}

export interface Workflow {
  workflow: string;
  version: number;
  description?: string;
  initial_state: StateName;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  // altri campi del YAML (events, guards, context_schema, invariants, metadata)
  // sono presenti ma il runtime Pattern A non li richiede.
  [key: string]: unknown;
}

export type TransitionTable = Map<StateName, Map<EventName, StateName>>;

export function loadWorkflow(relativePath: string): Workflow {
  const abs = resolve(here, relativePath);
  const raw = readFileSync(abs, 'utf8');
  const parsed = yaml.load(raw) as Workflow;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`YAML non valido o vuoto: ${abs}`);
  }
  if (!parsed.initial_state || !Array.isArray(parsed.states) || !Array.isArray(parsed.transitions)) {
    throw new Error(`Workflow malformato in ${abs}`);
  }
  return parsed;
}

export function buildTransitionTable(workflow: Workflow): TransitionTable {
  const table: TransitionTable = new Map();
  for (const t of workflow.transitions) {
    if (!table.has(t.from)) table.set(t.from, new Map());
    table.get(t.from)!.set(t.event, t.to);
  }
  return table;
}

export function isFinal(workflow: Workflow, state: StateName): boolean {
  const s = workflow.states.find((x) => x.name === state);
  return !!s?.is_final;
}

export function next(
  table: TransitionTable,
  state: StateName,
  event: EventName
): StateName | undefined {
  return table.get(state)?.get(event);
}
