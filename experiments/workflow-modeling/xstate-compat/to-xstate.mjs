#!/usr/bin/env node
//
// to-xstate.mjs — convert a POM workflow or pipeline YAML into an
// XState v5 input MachineConfig JSON.
//
// Round 2 coverage:
//   - state-invoke         -> XState invoke on the state node, with
//                             onDone branches discriminated by the
//                             child's terminal state via _terminal guards;
//   - event-invoke         -> rewritten as an intermediate __invoking_*
//                             state with an invoke, since XState attaches
//                             invokes to state nodes, not to transitions;
//   - pipeline             -> root machine with one __member_<idx> state
//                             per pipeline member, each invoking the
//                             corresponding child workflow and using
//                             onDone branches keyed by terminal_state to
//                             move to the next member or to a final
//                             pipeline state;
//   - context_schema       -> preserved under meta.pom.context_schema;
//                             a documentary "input" example is also
//                             surfaced for stately.ai;
//   - invoke input/assign  -> mapped to invoke.input (input) and
//                             actions: assign (assign), keys preserved
//                             verbatim, values as documental strings.
//
// Output is JSON that can be pasted into stately.ai to obtain a
// visualization + offline-style review of the machine. The script does
// NOT call createMachine() and does NOT add a dependency to the POM repo.
//
// Usage:
//   node to-xstate.mjs <workflow-or-pipeline.yaml> [--out <output.json>]

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
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

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function srcName(workflowPath) {
  // Strip directories and trailing .yaml to get a short actor name.
  const base = basename(workflowPath).replace(/\.ya?ml$/, '');
  return base.replace(/[^A-Za-z0-9_]/g, '_');
}

// ─── Workflow → MachineConfig ────────────────────────────────────────

function buildOnDoneBranches(invoke) {
  const branches = [];
  for (const c of invoke.on_completion ?? []) {
    if (!c || typeof c !== 'object') continue;
    const branch = {
      guard: `_terminal_eq_${c.terminal_state}`,
    };
    if (isNonEmptyString(c.target)) {
      branch.target = c.target;
    }
    if (c.assign && typeof c.assign === 'object') {
      branch.actions = {
        type: 'assign',
        params: { ...c.assign },
      };
    }
    if (isNonEmptyString(c.next_event)) {
      // Round-2 state-invoke uses next_event to dispatch a parent
      // transition. XState does not have "raise a parent event from
      // onDone" as a single primitive; we annotate it as an action
      // with a documentary type. Target code uses raise(next_event).
      branch.actions = branch.actions ?? [];
      const actArr = Array.isArray(branch.actions)
        ? branch.actions
        : [branch.actions];
      actArr.push({
        type: 'raise',
        params: { event: { type: c.next_event } },
      });
      branch.actions = actArr;
    }
    branches.push(branch);
  }
  return branches;
}

function buildStateInvoke(stateName, invoke) {
  return {
    id: `invoke_${stateName}`,
    src: srcName(invoke.workflow),
    input: invoke.input && typeof invoke.input === 'object'
      ? { ...invoke.input }
      : undefined,
    onDone: buildOnDoneBranches(invoke),
  };
}

function processWorkflow(model) {
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

  // Pre-process states to spot event-invokes; we will inject one
  // intermediate __invoking_* state per event-invoke into the
  // containing state.
  const intermediateStates = []; // {name, from, invoke}

  for (const s of model.states ?? []) {
    const node = {};

    if (isNonEmptyString(s.description)) {
      node.description = s.description.trim();
    }

    const reEntry = s.re_entry_allowed === true;
    if (s.is_final === true && !reEntry) {
      node.type = 'final';
    }

    // State-level invoke: XState invoke goes directly on this node.
    if (s.invoke && typeof s.invoke === 'object') {
      node.invoke = buildStateInvoke(s.name, s.invoke);
    }

    // External transitions grouped by event.
    const onEntries = {};
    for (let i = 0; i < (model.transitions ?? []).length; i++) {
      const t = model.transitions[i];
      if (t.from !== s.name) continue;

      // Event-invoke on a transition: synthesize an intermediate state.
      if (t.invoke && typeof t.invoke === 'object') {
        const interName = `__invoking_${t.event}_from_${s.name}`;
        intermediateStates.push({ name: interName, invoke: t.invoke });

        const branchEntry = { target: interName };
        if (isNonEmptyString(t.guard)) branchEntry.guard = t.guard;
        if (isNonEmptyString(t.description)) branchEntry.description = t.description.trim();
        appendOn(onEntries, t.event, branchEntry);
        continue;
      }

      // Plain transition.
      const branchEntry = {};
      if (isNonEmptyString(t.to)) branchEntry.target = t.to;
      if (isNonEmptyString(t.guard)) branchEntry.guard = t.guard;
      if (isNonEmptyString(t.description)) branchEntry.description = t.description.trim();
      const compact =
        Object.keys(branchEntry).length === 1 && branchEntry.target
          ? branchEntry.target
          : branchEntry;
      appendOn(onEntries, t.event, compact);
    }

    if (Object.keys(onEntries).length > 0) node.on = onEntries;

    const stateMeta = {};
    if (s.is_final === true) stateMeta.is_final = true;
    if (reEntry) stateMeta.re_entry_allowed = true;
    if (Object.keys(stateMeta).length > 0) {
      node.meta = { pom: stateMeta };
    }

    machine.states[s.name] = node;
  }

  // Materialize intermediate states for event-invokes.
  for (const { name, invoke } of intermediateStates) {
    machine.states[name] = {
      description: `Synthetic intermediate state for event-invoke on ${invoke.workflow}`,
      invoke: buildStateInvoke(name, invoke),
      meta: { pom: { synthetic_event_invoke: true } },
    };
  }

  // Machine-level meta.
  const meta = { pom: {} };
  if (typeof model.version !== 'undefined') meta.pom.version = model.version;
  if (isNonEmptyString(model.description)) meta.pom.description = model.description.trim();
  if (eventsByName.size > 0) {
    meta.pom.events = [...eventsByName.values()].map((e) => ({
      name: e.name,
      description: (e.description ?? '').trim() || undefined,
    }));
  }
  if (guardsByName.size > 0) {
    meta.pom.guards = [...guardsByName.values()].map((g) => ({
      name: g.name,
      description: (g.description ?? '').trim() || undefined,
    }));
  }
  if (Array.isArray(model.invariants) && model.invariants.length > 0) {
    meta.pom.invariants = model.invariants.map((i) =>
      typeof i?.description === 'string' ? i.description.trim() : i,
    );
  }
  if (model.context_schema && typeof model.context_schema === 'object') {
    meta.pom.context_schema = model.context_schema;
  }
  if (model.metadata?.open_points) meta.pom.open_points = model.metadata.open_points;
  if (model.metadata?.closed_points) meta.pom.closed_points = model.metadata.closed_points;
  machine.meta = meta;

  return machine;
}

function appendOn(onEntries, event, compact) {
  const prior = onEntries[event];
  if (prior === undefined) {
    onEntries[event] = compact;
  } else if (Array.isArray(prior)) {
    prior.push(compact);
  } else {
    onEntries[event] = [prior, compact];
  }
}

// ─── Pipeline → MachineConfig ────────────────────────────────────────

function processPipeline(model) {
  const sequence = Array.isArray(model.sequence) ? model.sequence : [];
  const pipelineId = model.pipeline;

  // Each member becomes a state __member_<index>_<name>.
  const stateNameFor = (i, path) =>
    `__member_${i}_${srcName(path)}`;

  const machine = {
    id: pipelineId,
    initial: sequence.length > 0 ? stateNameFor(0, sequence[0].workflow) : '__pipeline_empty',
    states: {},
  };

  for (let i = 0; i < sequence.length; i++) {
    const member = sequence[i];
    const memberStateName = stateNameFor(i, member.workflow);

    // Build onDone branches: one per completes_on entry.
    const branches = [];
    for (const c of member.completes_on ?? []) {
      const branch = { guard: `_terminal_eq_${c.state}` };
      if (c.next == null) {
        branch.target = '__pipeline_completed';
      } else {
        // Find the index of c.next in the sequence by workflow path.
        const nextIdx = sequence.findIndex((m) => m.workflow === c.next);
        if (nextIdx >= 0) {
          branch.target = stateNameFor(nextIdx, sequence[nextIdx].workflow);
        } else {
          // Should not happen if the pipeline validates.
          branch.target = '__pipeline_completed';
        }
      }
      branches.push(branch);
    }

    machine.states[memberStateName] = {
      description: `Pipeline member ${i + 1}: ${member.workflow}`,
      invoke: {
        id: `invoke_${memberStateName}`,
        src: srcName(member.workflow),
        onDone: branches,
      },
    };
  }

  machine.states.__pipeline_completed = {
    type: 'final',
    description: 'Pipeline terminated. Specific outcome lives in the last member output.',
  };

  if (sequence.length === 0) {
    machine.states.__pipeline_empty = { type: 'final', description: 'Empty pipeline.' };
  }

  const meta = { pom: { kind: 'pipeline' } };
  if (isNonEmptyString(model.description)) meta.pom.description = model.description.trim();
  if (model.version !== undefined) meta.pom.version = model.version;
  if (Array.isArray(model.sequence)) {
    meta.pom.member_paths = model.sequence.map((m) => m?.workflow);
  }
  if (model.metadata?.open_points) meta.pom.open_points = model.metadata.open_points;
  machine.meta = meta;

  return machine;
}

// ─── Main ────────────────────────────────────────────────────────────

function main() {
  const { file, out } = parseArgs(process.argv.slice(2));
  if (!file) {
    console.error('Usage: node to-xstate.mjs <workflow-or-pipeline.yaml> [--out <output.json>]');
    process.exit(2);
  }
  const raw = readFileSync(resolve(file), 'utf8');
  const model = yaml.load(raw);
  if (!model || typeof model !== 'object') {
    console.error('YAML root is not a mapping.');
    process.exit(1);
  }
  const isPipeline = 'pipeline' in model;
  const config = isPipeline ? processPipeline(model) : processWorkflow(model);
  const json = JSON.stringify(config, null, 2) + '\n';
  if (out) {
    writeFileSync(resolve(out), json, 'utf8');
    console.log(`Wrote: ${out}`);
  } else {
    process.stdout.write(json);
  }
}

main();
