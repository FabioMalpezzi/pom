#!/usr/bin/env node
//
// lint-workflows.mjs - validator for POM workflow YAML models.
//
// Scope of this pass: Error-level rules + Warning-level rules.
// Info-level rules, Mermaid generation, and scenario generation are out of
// scope and will be added in later iterations of the experiment.
//
// Usage:
//   node lint-workflows.mjs <file.yaml> [--out <report.md>]
//   node lint-workflows.mjs <file1.yaml> <file2.yaml> ...
//
// Exit code: 0 if all files pass (warnings allowed), 1 if any file has at
// least one Error, 2 on argument/parse misuse.
//
// This script lives in experiments/workflow-modeling/scripts-candidate/ and
// uses a local node_modules (js-yaml) isolated from the POM main repo.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join, isAbsolute } from 'node:path';
import yaml from 'js-yaml';

const ERROR_RULES = {
  E000: 'YAML parse error or root is not a mapping.',
  E001: 'Workflow name is missing or not a non-empty string.',
  E002: 'initial_state is missing or not a non-empty string.',
  E003: 'initial_state is not declared in states.',
  E004: 'states is missing or empty.',
  E005: 'A state entry has no name or a non-string name.',
  E006: 'An event entry has no name or a non-string name.',
  E007: 'A guard entry has no name or a non-string name.',
  E008: 'Duplicate state name.',
  E009: 'Duplicate event name.',
  E010: 'Duplicate guard name.',
  E011: 'A transition has no "from".',
  E012: 'A transition has no "to".',
  E013: 'A transition has no "event".',
  E014: 'A transition "from" references a state not declared in states.',
  E015: 'A transition "to" references a state not declared in states.',
  E016: 'A transition "event" references an event not declared in events.',
  E017: 'A transition "guard" references a guard not declared in guards.',
  E020: 'Pipeline name is missing or not a non-empty string.',
  E021: 'Pipeline sequence is missing or empty.',
  E022: 'A pipeline member has no "workflow" path or a non-string path.',
  E023: 'A pipeline member references a workflow file that does not exist on disk.',
  E024: 'A pipeline member has no "completes_on" or it is empty.',
  E025: 'A pipeline member completes_on[].state does not exist as is_final: true in the referenced workflow.',
  E026: 'A pipeline member completes_on[].next is not null and does not reference another member of the same pipeline.',
  E027: 'Cycle detected in the pipeline (a member is reachable from itself).',
  E028: 'Pipeline file declares both "workflow" and "pipeline" root keys (must be exactly one).',
  E029: 'Pipeline declares an asynchronous mode (mode: async / parallel). Asynchronous composition is out of scope; use Pattern C (XState invoke/spawn).',
  E030: 'A state invoke block has no "workflow" path or a non-string path.',
  E031: 'A state invoke references a workflow file that does not exist on disk.',
  E032: 'A state invoke has no "on_completion" or it is empty.',
  E033: 'A state invoke on_completion[].terminal_state does not exist as is_final: true in the child workflow.',
  E034: 'A state invoke on_completion[].next_event does not exist in the parent workflow events.',
  E035: 'A state declares invoke but is is_final: true (terminal states cannot host an invoke).',
  E036: 'A state invoke declares an asynchronous mode (mode: async / parallel). Asynchronous composition is out of scope; use Pattern C (XState invoke/spawn).',
};

const WARNING_RULES = {
  W001: 'Unreachable state: declared but not reachable from initial_state by any transition path.',
  W002: 'Silent dead-end: non-final state with no outgoing transitions.',
  W003: 'Final state has at least one outgoing transition (re-entry from terminal). Suppressed when the state declares re_entry_allowed: true.',
  W004: 'Non-deterministic transition: same (from, event) declared more than once with ambiguous guard coverage.',
};

function err(code, where, extra) {
  return { code, where, extra: extra ?? '' };
}

function warn(code, where, extra) {
  return { code, where, extra: extra ?? '' };
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function findReachableStates(initialState, transitions, stateNames) {
  if (!stateNames.has(initialState)) return new Set();
  const reachable = new Set([initialState]);
  const queue = [initialState];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const t of transitions) {
      if (t?.from === current && isNonEmptyString(t?.to) && stateNames.has(t.to) && !reachable.has(t.to)) {
        reachable.add(t.to);
        queue.push(t.to);
      }
    }
  }
  return reachable;
}

function validateErrors(model) {
  const errors = [];

  if (!isNonEmptyString(model?.workflow)) {
    errors.push(err('E001', 'workflow'));
  }

  if (!Array.isArray(model?.states) || model.states.length === 0) {
    errors.push(err('E004', 'states'));
  }

  const stateNames = new Set();
  if (Array.isArray(model?.states)) {
    for (let i = 0; i < model.states.length; i++) {
      const s = model.states[i];
      if (!isNonEmptyString(s?.name)) {
        errors.push(err('E005', `states[${i}]`));
        continue;
      }
      if (stateNames.has(s.name)) {
        errors.push(err('E008', `states[${i}]`, `name=${s.name}`));
      } else {
        stateNames.add(s.name);
      }
    }
  }

  const eventNames = new Set();
  if (Array.isArray(model?.events)) {
    for (let i = 0; i < model.events.length; i++) {
      const e = model.events[i];
      if (!isNonEmptyString(e?.name)) {
        errors.push(err('E006', `events[${i}]`));
        continue;
      }
      if (eventNames.has(e.name)) {
        errors.push(err('E009', `events[${i}]`, `name=${e.name}`));
      } else {
        eventNames.add(e.name);
      }
    }
  }

  const guardNames = new Set();
  if (Array.isArray(model?.guards)) {
    for (let i = 0; i < model.guards.length; i++) {
      const g = model.guards[i];
      if (!isNonEmptyString(g?.name)) {
        errors.push(err('E007', `guards[${i}]`));
        continue;
      }
      if (guardNames.has(g.name)) {
        errors.push(err('E010', `guards[${i}]`, `name=${g.name}`));
      } else {
        guardNames.add(g.name);
      }
    }
  }

  if (!isNonEmptyString(model?.initial_state)) {
    errors.push(err('E002', 'initial_state'));
  } else if (stateNames.size > 0 && !stateNames.has(model.initial_state)) {
    errors.push(err('E003', 'initial_state', `value=${model.initial_state}`));
  }

  if (Array.isArray(model?.transitions)) {
    for (let i = 0; i < model.transitions.length; i++) {
      const t = model.transitions[i];
      const where = `transitions[${i}]`;

      if (!isNonEmptyString(t?.from)) {
        errors.push(err('E011', where));
      } else if (stateNames.size > 0 && !stateNames.has(t.from)) {
        errors.push(err('E014', where, `from=${t.from}`));
      }

      if (!isNonEmptyString(t?.to)) {
        errors.push(err('E012', where));
      } else if (stateNames.size > 0 && !stateNames.has(t.to)) {
        errors.push(err('E015', where, `to=${t.to}`));
      }

      if (!isNonEmptyString(t?.event)) {
        errors.push(err('E013', where));
      } else if (eventNames.size > 0 && !eventNames.has(t.event)) {
        errors.push(err('E016', where, `event=${t.event}`));
      }

      if (t?.guard != null) {
        if (!isNonEmptyString(t.guard) || (guardNames.size > 0 && !guardNames.has(t.guard))) {
          errors.push(err('E017', where, `guard=${t.guard}`));
        }
      }
    }
  }

  return { errors, stateNames, eventNames, guardNames };
}

function validateWarnings(model, stateNames) {
  const warnings = [];
  const transitions = Array.isArray(model?.transitions) ? model.transitions : [];
  const states = Array.isArray(model?.states) ? model.states : [];

  if (isNonEmptyString(model?.initial_state) && stateNames.has(model.initial_state)) {
    const reachable = findReachableStates(model.initial_state, transitions, stateNames);
    for (let i = 0; i < states.length; i++) {
      const s = states[i];
      if (!isNonEmptyString(s?.name) || !stateNames.has(s.name)) continue;
      if (!reachable.has(s.name)) {
        warnings.push(warn('W001', `states[${i}]`, `name=${s.name}`));
      }
    }
  }

  for (let i = 0; i < states.length; i++) {
    const s = states[i];
    if (!isNonEmptyString(s?.name)) continue;
    const hasOutgoing = transitions.some((t) => t?.from === s.name);
    if (s.is_final === true && hasOutgoing) {
      if (s.re_entry_allowed !== true) {
        warnings.push(warn('W003', `states[${i}]`, `name=${s.name}`));
      }
    } else if (s.is_final !== true && !hasOutgoing) {
      warnings.push(warn('W002', `states[${i}]`, `name=${s.name}`));
    }
  }

  const groups = new Map();
  for (let i = 0; i < transitions.length; i++) {
    const t = transitions[i];
    if (!isNonEmptyString(t?.from) || !isNonEmptyString(t?.event)) continue;
    const key = `${t.from}|${t.event}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ idx: i, guard: t.guard ?? null });
  }
  for (const [key, group] of groups) {
    if (group.length < 2) continue;
    const unguardedCount = group.filter((g) => !isNonEmptyString(g.guard)).length;
    const ambiguous = unguardedCount >= 1;
    if (ambiguous) {
      const indices = group.map((g) => `transitions[${g.idx}]`).join(', ');
      const [fromState, eventName] = key.split('|');
      warnings.push(warn('W004', indices, `from=${fromState}, event=${eventName}`));
    }
  }

  return warnings;
}

function validateStateInvokes(model, sourceDir) {
  const errors = [];
  const states = Array.isArray(model?.states) ? model.states : [];
  const eventNames = new Set(
    (Array.isArray(model?.events) ? model.events : [])
      .filter((e) => isNonEmptyString(e?.name))
      .map((e) => e.name),
  );

  for (let i = 0; i < states.length; i++) {
    const s = states[i];
    if (!s || s.invoke == null) continue;
    const where = `states[${i}].invoke`;
    const inv = s.invoke;

    if (s.is_final === true) {
      errors.push(err('E035', `states[${i}]`, `name=${s.name ?? '?'}`));
    }

    if (inv.mode === 'async' || inv.mode === 'parallel') {
      errors.push(err('E036', `${where}.mode`, `value=${inv.mode}`));
    }

    if (!isNonEmptyString(inv.workflow)) {
      errors.push(err('E030', where));
      continue;
    }

    const absPath = isAbsolute(inv.workflow)
      ? inv.workflow
      : join(sourceDir, inv.workflow);

    let childTerminals = null;
    if (!existsSync(absPath)) {
      errors.push(err('E031', where, `path=${inv.workflow}`));
    } else {
      const child = loadWorkflowSafe(absPath);
      if (child && Array.isArray(child.states)) {
        childTerminals = new Set();
        for (const cs of child.states) {
          if (isNonEmptyString(cs?.name) && cs?.is_final === true) {
            childTerminals.add(cs.name);
          }
        }
      }
    }

    if (!Array.isArray(inv.on_completion) || inv.on_completion.length === 0) {
      errors.push(err('E032', where));
      continue;
    }

    for (let j = 0; j < inv.on_completion.length; j++) {
      const c = inv.on_completion[j];
      const cwhere = `${where}.on_completion[${j}]`;

      if (!isNonEmptyString(c?.terminal_state)) {
        errors.push(err('E033', cwhere, 'terminal_state missing'));
      } else if (childTerminals && !childTerminals.has(c.terminal_state)) {
        errors.push(err('E033', cwhere, `terminal_state=${c.terminal_state}`));
      }

      if (!isNonEmptyString(c?.next_event)) {
        errors.push(err('E034', cwhere, 'next_event missing'));
      } else if (eventNames.size > 0 && !eventNames.has(c.next_event)) {
        errors.push(err('E034', cwhere, `next_event=${c.next_event}`));
      }
    }
  }

  return errors;
}

function validate(model, sourceDir = '.') {
  const { errors, stateNames } = validateErrors(model);
  const invokeErrors = validateStateInvokes(model, sourceDir);
  errors.push(...invokeErrors);
  const warnings = errors.some((e) => ['E004', 'E005'].includes(e.code))
    ? []
    : validateWarnings(model, stateNames);
  return { errors, warnings };
}

function loadWorkflowSafe(absPath) {
  try {
    const raw = readFileSync(absPath, 'utf8');
    const parsed = yaml.load(raw);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    return null;
  }
  return null;
}

function validatePipeline(model, sourceDir) {
  const errors = [];

  if ('workflow' in (model ?? {}) && 'pipeline' in (model ?? {})) {
    errors.push(err('E028', 'root'));
  }

  if (!isNonEmptyString(model?.pipeline)) {
    errors.push(err('E020', 'pipeline'));
  }

  if (model?.mode === 'async' || model?.mode === 'parallel') {
    errors.push(err('E029', 'mode', `value=${model.mode}`));
  }

  if (!Array.isArray(model?.sequence) || model.sequence.length === 0) {
    errors.push(err('E021', 'sequence'));
    return { errors };
  }

  // Resolve member workflow files and collect their terminal state names.
  const members = [];
  const memberByPath = new Map();
  for (let i = 0; i < model.sequence.length; i++) {
    const m = model.sequence[i];
    const where = `sequence[${i}]`;

    if (!isNonEmptyString(m?.workflow)) {
      errors.push(err('E022', where));
      members.push(null);
      continue;
    }

    const absPath = isAbsolute(m.workflow)
      ? m.workflow
      : join(sourceDir, m.workflow);

    if (!existsSync(absPath)) {
      errors.push(err('E023', where, `path=${m.workflow}`));
      members.push({ path: m.workflow, absPath, model: null, terminalNames: new Set() });
      memberByPath.set(m.workflow, i);
      continue;
    }

    const childModel = loadWorkflowSafe(absPath);
    const terminalNames = new Set();
    if (childModel && Array.isArray(childModel.states)) {
      for (const s of childModel.states) {
        if (isNonEmptyString(s?.name) && s?.is_final === true) {
          terminalNames.add(s.name);
        }
      }
    }
    members.push({ path: m.workflow, absPath, model: childModel, terminalNames });
    memberByPath.set(m.workflow, i);
  }

  // Validate completes_on per member, and build the successor graph for
  // cycle detection.
  const graph = new Map(); // memberIndex -> Set<memberIndex>
  for (let i = 0; i < model.sequence.length; i++) {
    const m = model.sequence[i];
    const where = `sequence[${i}]`;
    const member = members[i];
    graph.set(i, new Set());

    if (m?.mode === 'async' || m?.mode === 'parallel') {
      errors.push(err('E029', where + '.mode', `value=${m.mode}`));
    }

    if (!Array.isArray(m?.completes_on) || m.completes_on.length === 0) {
      errors.push(err('E024', where));
      continue;
    }

    for (let j = 0; j < m.completes_on.length; j++) {
      const c = m.completes_on[j];
      const cwhere = `${where}.completes_on[${j}]`;

      if (!isNonEmptyString(c?.state)) {
        errors.push(err('E025', cwhere, 'state missing'));
      } else if (member?.model && !member.terminalNames.has(c.state)) {
        errors.push(err('E025', cwhere, `state=${c.state}`));
      }

      if (c?.next == null) continue;
      if (!isNonEmptyString(c.next)) {
        errors.push(err('E026', cwhere, 'next is not a string or null'));
        continue;
      }
      if (!memberByPath.has(c.next)) {
        errors.push(err('E026', cwhere, `next=${c.next}`));
        continue;
      }
      graph.get(i).add(memberByPath.get(c.next));
    }
  }

  // Cycle detection (DFS coloring).
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Array(model.sequence.length).fill(WHITE);
  let cycleFound = false;
  function dfs(u) {
    if (cycleFound) return;
    color[u] = GRAY;
    for (const v of graph.get(u) ?? []) {
      if (color[v] === GRAY) { cycleFound = true; return; }
      if (color[v] === WHITE) dfs(v);
    }
    color[u] = BLACK;
  }
  for (let i = 0; i < model.sequence.length; i++) {
    if (color[i] === WHITE) dfs(i);
    if (cycleFound) break;
  }
  if (cycleFound) {
    errors.push(err('E027', 'sequence'));
  }

  return { errors };
}

function isPipelineModel(model) {
  return model && typeof model === 'object' && 'pipeline' in model;
}

function formatReport({ source, model, errors, warnings, kind }) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  let verdict;
  if (errors.length > 0) {
    verdict = 'FAIL';
  } else if (warnings.length > 0) {
    verdict = 'PASS WITH WARNINGS';
  } else {
    verdict = 'PASS';
  }
  const lines = [];
  const titleName = kind === 'pipeline'
    ? model?.pipeline ?? '(unknown)'
    : model?.workflow ?? '(unknown)';
  const titleKind = kind === 'pipeline' ? 'Pipeline' : 'Workflow';
  lines.push(`# ${titleKind} validation report - ${titleName}`);
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('|---|---|');
  lines.push(`| Source | \`${source}\` |`);
  lines.push(`| Generated | ${now} (UTC) |`);
  lines.push(`| Errors | ${errors.length} |`);
  lines.push(`| Warnings | ${warnings.length} |`);
  lines.push(`| Verdict | **${verdict}** |`);
  lines.push('');

  lines.push('## Errors');
  lines.push('');
  if (errors.length === 0) {
    lines.push('_None._');
  } else {
    for (const e of errors) {
      const desc = ERROR_RULES[e.code] ?? '';
      const extra = e.extra ? ` (${e.extra})` : '';
      lines.push(`- **${e.code}** \`${e.where}\`${extra} — ${desc}`);
    }
  }
  lines.push('');

  lines.push('## Warnings');
  lines.push('');
  if (warnings.length === 0) {
    lines.push('_None._');
  } else {
    for (const w of warnings) {
      const desc = WARNING_RULES[w.code] ?? '';
      const extra = w.extra ? ` (${w.extra})` : '';
      lines.push(`- **${w.code}** \`${w.where}\`${extra} — ${desc}`);
    }
  }
  lines.push('');

  lines.push('---');
  lines.push('_Generated by experiments/workflow-modeling/scripts-candidate/lint-workflows.mjs (Error + Warning rules)._');
  lines.push('');
  return lines.join('\n');
}

function parseArgs(argv) {
  const args = { files: [], out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') {
      args.out = argv[++i];
    } else if (a.startsWith('--')) {
      console.error(`Unknown option: ${a}`);
      process.exit(2);
    } else {
      args.files.push(a);
    }
  }
  return args;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.error('Usage: node lint-workflows.mjs <file.yaml> [<file2.yaml> ...] [--out <report.md>]');
    console.error('When multiple files are provided, --out is ignored and each report goes to stdout.');
    process.exit(2);
  }
  const { files, out } = parseArgs(argv);

  let totalErrors = 0;
  const reports = [];

  for (const file of files) {
    const source = resolve(file);
    let model = null;
    let parseError = null;
    try {
      const raw = readFileSync(source, 'utf8');
      model = yaml.load(raw);
    } catch (e) {
      parseError = e;
    }

    let errors = [];
    let warnings = [];
    let kind = 'workflow';
    if (parseError) {
      errors.push(err('E000', 'parse', parseError.message));
    } else if (model == null || typeof model !== 'object') {
      errors.push(err('E000', 'parse', 'YAML root is not a mapping.'));
    } else if (isPipelineModel(model)) {
      kind = 'pipeline';
      const v = validatePipeline(model, dirname(source));
      errors = v.errors;
    } else {
      const v = validate(model, dirname(source));
      errors = v.errors;
      warnings = v.warnings;
    }
    totalErrors += errors.length;

    const report = formatReport({ source: file, model: model ?? {}, errors, warnings, kind });
    reports.push({ file, report });
  }

  if (out && files.length === 1) {
    writeFileSync(out, reports[0].report, 'utf8');
    console.log(`Wrote: ${out}`);
  } else {
    for (const r of reports) {
      console.log(r.report);
      console.log('');
    }
  }

  process.exit(totalErrors === 0 ? 0 : 1);
}

main();
