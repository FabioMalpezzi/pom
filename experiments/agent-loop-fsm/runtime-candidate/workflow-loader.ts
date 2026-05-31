// workflow-loader.ts — carica il workflow POM dal file YAML e costruisce
// la transition table {from, event} -> {to} usata dal Pattern A.
// Nessuna validazione semantica qui: lo schema POM viene già verificato
// dal validator (`pom:workflow:lint`); questo modulo si fida del file.

import { readFileSync, existsSync } from 'node:fs';
import { resolve, isAbsolute, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const here = dirname(fileURLToPath(import.meta.url));

// Trova la root POM cercando verso l'alto due possibili marker:
//   1. `pom.config.json` — caso target POM-installato (root del progetto)
//   2. `package.json` con `name: "project-operating-memory"` — caso
//      repo POM sorgente (root del repo POM stesso)
// Risolvere i path dei workflow rispetto a questa root rende il runtime
// indipendente dalla sua collocazione fisica.
function findPomRoot(startDir: string): string {
  let cur = startDir;
  while (cur !== dirname(cur)) {
    if (existsSync(join(cur, 'pom.config.json'))) return cur;
    const pkgPath = join(cur, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { name?: string };
        if (pkg.name === 'project-operating-memory') return cur;
      } catch {
        // package.json corrotto: ignora e continua a risalire
      }
    }
    cur = dirname(cur);
  }
  throw new Error(
    'Non trovo né `pom.config.json` né il `package.json` del repo POM ' +
      'risalendo da ' + startDir + '. Questo runtime deve girare dentro un repo POM ' +
      'o dentro un progetto target POM-installato.'
  );
}

const POM_ROOT = findPomRoot(here);

// Risolve un path workflow con queste regole, in ordine:
//   1. Assoluto → uso tale e quale.
//   2. Esiste rispetto al cwd → uso tale e quale (caso shell-friendly).
//   3. Esiste rispetto alla POM root → risolvo da lì (caso canonico).
//   4. Esiste rispetto allo script (`here`) → risolvo da lì (legacy).
//   Altrimenti errore esplicito.
function resolveWorkflowPath(pathSpec: string): string {
  if (isAbsolute(pathSpec) && existsSync(pathSpec)) return pathSpec;
  const fromCwd = resolve(process.cwd(), pathSpec);
  if (existsSync(fromCwd)) return fromCwd;
  const fromPomRoot = resolve(POM_ROOT, pathSpec);
  if (existsSync(fromPomRoot)) return fromPomRoot;
  const fromHere = resolve(here, pathSpec);
  if (existsSync(fromHere)) return fromHere;
  throw new Error(
    `Workflow non trovato: ${pathSpec}\n` +
      `  cwd:     ${fromCwd}\n` +
      `  pomroot: ${fromPomRoot}\n` +
      `  script:  ${fromHere}`
  );
}

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

export function loadWorkflow(pathSpec: string): Workflow {
  const abs = resolveWorkflowPath(pathSpec);
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
