#!/usr/bin/env node
//
// to-xstate.mjs — convert a POM workflow YAML into an XState v5 input
// MachineConfig JSON.
//
// Usage:
//   node to-xstate.mjs <workflow.yaml> [--out <output.json>]
//
// Mapping rules are documented in COMPATIBILITY.md (same folder).
// POM-specific metadata (event/guard descriptions, invariants,
// re_entry_allowed, open/closed points) is preserved under the `meta`
// field that XState accepts as an open object.
//
// This script reuses the experiment's local js-yaml from
// scripts-candidate/node_modules; it does not add its own dependency.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const yaml = (await import(
  join(here, '..', 'scripts-candidate', 'node_modules', 'js-yaml', 'dist', 'js-yaml.mjs')
)).default;

function parseArgs(argv) {
  const args = { file: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a.startsWith('--')) {
      console.error(`Unknown option: ${a}`);
      process.exit(2);
    } else args.file = a;
  }
  return args;
}

function toXState(model) {
  const machine = {
    id: model.workflow,
    initial: model.initial_state,
    states: {},
  };

  const eventsByName = new Map(
    (model.events ?? []).map((e) => [e.name, e]),
  );
  const guardsByName = new Map(
    (model.guards ?? []).map((g) => [g.name, g]),
  );

  for (const s of model.states ?? []) {
    const node = {};

    if (typeof s.description === 'string' && s.description.trim()) {
      node.description = s.description.trim();
    }

    // Terminal handling:
    //   is_final + no re_entry_allowed  -> XState "final" state (no outgoing).
    //   is_final + re_entry_allowed     -> atomic state with on{}, POM intent in meta.
    //   not final                       -> atomic state.
    const reEntry = s.re_entry_allowed === true;
    if (s.is_final === true && !reEntry) {
      node.type = 'final';
    }

    const onEntries = {};
    for (const t of model.transitions ?? []) {
      if (t.from !== s.name) continue;
      const transitionObj = { target: t.to };
      if (typeof t.guard === 'string' && t.guard.trim()) {
        transitionObj.guard = t.guard;
      }
      if (typeof t.description === 'string' && t.description.trim()) {
        transitionObj.description = t.description.trim();
      }
      const onlyHasTarget =
        Object.keys(transitionObj).length === 1 && transitionObj.target;

      const prior = onEntries[t.event];
      const compact = onlyHasTarget ? transitionObj.target : transitionObj;

      if (prior === undefined) {
        onEntries[t.event] = compact;
      } else if (Array.isArray(prior)) {
        prior.push(compact);
      } else {
        onEntries[t.event] = [prior, compact];
      }
    }

    if (Object.keys(onEntries).length > 0) {
      node.on = onEntries;
    }

    const stateMeta = {};
    if (s.is_final === true) stateMeta.is_final = true;
    if (reEntry) stateMeta.re_entry_allowed = true;
    if (Object.keys(stateMeta).length > 0) {
      node.meta = { pom: stateMeta };
    }

    machine.states[s.name] = node;
  }

  // Machine-level meta with POM concepts that have no XState slot.
  const machineMeta = { pom: {} };
  if (typeof model.version !== 'undefined') {
    machineMeta.pom.version = model.version;
  }
  if (typeof model.description === 'string' && model.description.trim()) {
    machineMeta.pom.description = model.description.trim();
  }
  if (eventsByName.size > 0) {
    machineMeta.pom.events = [...eventsByName.values()].map((e) => ({
      name: e.name,
      description: (e.description ?? '').trim() || undefined,
    }));
  }
  if (guardsByName.size > 0) {
    machineMeta.pom.guards = [...guardsByName.values()].map((g) => ({
      name: g.name,
      description: (g.description ?? '').trim() || undefined,
    }));
  }
  if (Array.isArray(model.invariants) && model.invariants.length > 0) {
    machineMeta.pom.invariants = model.invariants.map((i) =>
      typeof i?.description === 'string' ? i.description.trim() : i,
    );
  }
  if (model.metadata?.open_points) {
    machineMeta.pom.open_points = model.metadata.open_points;
  }
  if (model.metadata?.closed_points) {
    machineMeta.pom.closed_points = model.metadata.closed_points;
  }
  machine.meta = machineMeta;

  return machine;
}

function main() {
  const { file, out } = parseArgs(process.argv.slice(2));
  if (!file) {
    console.error('Usage: node to-xstate.mjs <workflow.yaml> [--out <output.json>]');
    process.exit(2);
  }
  const raw = readFileSync(resolve(file), 'utf8');
  const model = yaml.load(raw);
  if (!model || typeof model !== 'object') {
    console.error('YAML root is not a mapping.');
    process.exit(1);
  }
  const config = toXState(model);
  const json = JSON.stringify(config, null, 2) + '\n';
  if (out) {
    writeFileSync(resolve(out), json, 'utf8');
    console.log(`Wrote: ${out}`);
  } else {
    process.stdout.write(json);
  }
}

main();
