import { readFileSync, existsSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import yaml from '../require-yaml.mjs';
import { validateDynamicWorkflowHandles } from '../workflow-dynamic-handles.mjs';

export function err(code, where, extra) {
  return { code, where, extra: extra ?? '' };
}

function warn(code, where, extra) {
  return { code, where, extra: extra ?? '' };
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isPlainObject(v) {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function isValidDuration(v) {
  if (!isNonEmptyString(v)) return false;
  if (/^[1-9]\d*(s|min|h|d)$/.test(v)) return true;
  return /^P(?=\d|T)(?:(?:[1-9]\d*)D)?(?:T(?:(?:[1-9]\d*)H)?(?:(?:[1-9]\d*)M)?(?:(?:[1-9]\d*)S)?)?$/.test(v);
}

function implicitTargetsForState(state) {
  const targets = [];
  if (isPlainObject(state?.loop_guard)) {
    for (const field of ['on_exhaustion', 'on_visits_exhausted', 'on_duration_exhausted']) {
      if (isNonEmptyString(state.loop_guard[field])) targets.push(state.loop_guard[field]);
    }
  }
  if (isPlainObject(state?.timeout) && isNonEmptyString(state.timeout.on_timeout)) {
    targets.push(state.timeout.on_timeout);
  }
  return targets;
}

function findReachableStates(initialState, states, transitions, stateNames) {
  if (!stateNames.has(initialState)) return new Set();
  const stateByName = new Map(
    states
      .filter((s) => isNonEmptyString(s?.name))
      .map((s) => [s.name, s]),
  );
  const reachable = new Set([initialState]);
  const queue = [initialState];
  while (queue.length > 0) {
    const current = queue.shift();
    const state = stateByName.get(current);
    const implicitTargets = implicitTargetsForState(state);
    for (const tgt of implicitTargets) {
      if (stateNames.has(tgt) && !reachable.has(tgt)) {
        reachable.add(tgt);
        queue.push(tgt);
      }
    }
    for (const t of transitions) {
      if (t?.from !== current) continue;
      const targets = [];
      if (isNonEmptyString(t?.to)) targets.push(t.to);
      if (t?.invoke?.on_completion && Array.isArray(t.invoke.on_completion)) {
        for (const c of t.invoke.on_completion) {
          if (isNonEmptyString(c?.target)) targets.push(c.target);
        }
      }
      for (const tgt of targets) {
        if (stateNames.has(tgt) && !reachable.has(tgt)) {
          reachable.add(tgt);
          queue.push(tgt);
        }
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
      const hasInvoke = t?.invoke != null && typeof t.invoke === 'object';

      if (!isNonEmptyString(t?.from)) {
        errors.push(err('E011', where));
      } else if (stateNames.size > 0 && !stateNames.has(t.from)) {
        errors.push(err('E014', where, `from=${t.from}`));
      }

      if (hasInvoke && isNonEmptyString(t?.to)) {
        errors.push(err('E045', where));
      } else if (!hasInvoke) {
        if (!isNonEmptyString(t?.to)) {
          errors.push(err('E012', where));
        } else if (stateNames.size > 0 && !stateNames.has(t.to)) {
          errors.push(err('E015', where, `to=${t.to}`));
        }
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
    const reachable = findReachableStates(model.initial_state, states, transitions, stateNames);
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
    let childModel = null;
    if (!existsSync(absPath)) {
      errors.push(err('E031', where, `path=${inv.workflow}`));
    } else {
      childModel = loadWorkflowSafe(absPath);
      if (childModel && Array.isArray(childModel.states)) {
        childTerminals = new Set();
        for (const cs of childModel.states) {
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

    if (childModel) {
      errors.push(...validateInvokeContext(inv, where, childModel));
    }
  }

  return errors;
}

function validateTransitionInvokes(model, sourceDir) {
  const errors = [];
  const transitions = Array.isArray(model?.transitions) ? model.transitions : [];
  const stateNames = new Set(
    (Array.isArray(model?.states) ? model.states : [])
      .filter((s) => isNonEmptyString(s?.name))
      .map((s) => s.name),
  );

  for (let i = 0; i < transitions.length; i++) {
    const t = transitions[i];
    if (!t || t.invoke == null) continue;
    const where = `transitions[${i}].invoke`;
    const inv = t.invoke;

    if (inv.mode === 'async' || inv.mode === 'parallel') {
      errors.push(err('E046', `${where}.mode`, `value=${inv.mode}`));
    }

    if (!isNonEmptyString(inv.workflow)) {
      errors.push(err('E040', where));
      continue;
    }

    const absPath = isAbsolute(inv.workflow)
      ? inv.workflow
      : join(sourceDir, inv.workflow);

    let childTerminals = null;
    let childModel = null;
    if (!existsSync(absPath)) {
      errors.push(err('E041', where, `path=${inv.workflow}`));
    } else {
      childModel = loadWorkflowSafe(absPath);
      if (childModel && Array.isArray(childModel.states)) {
        childTerminals = new Set();
        for (const cs of childModel.states) {
          if (isNonEmptyString(cs?.name) && cs?.is_final === true) {
            childTerminals.add(cs.name);
          }
        }
      }
    }

    if (!Array.isArray(inv.on_completion) || inv.on_completion.length === 0) {
      errors.push(err('E042', where));
      continue;
    }

    for (let j = 0; j < inv.on_completion.length; j++) {
      const c = inv.on_completion[j];
      const cwhere = `${where}.on_completion[${j}]`;

      if (!isNonEmptyString(c?.terminal_state)) {
        errors.push(err('E043', cwhere, 'terminal_state missing'));
      } else if (childTerminals && !childTerminals.has(c.terminal_state)) {
        errors.push(err('E043', cwhere, `terminal_state=${c.terminal_state}`));
      }

      if (!isNonEmptyString(c?.target)) {
        errors.push(err('E044', cwhere, 'target missing'));
      } else if (stateNames.size > 0 && !stateNames.has(c.target)) {
        errors.push(err('E044', cwhere, `target=${c.target}`));
      }
    }

    if (childModel) {
      errors.push(...validateInvokeContext(inv, where, childModel));
    }
  }

  return errors;
}

export function validateWorkflowModel(model, sourceDir = '.') {
  const { errors, stateNames } = validateErrors(model);
  const ctxSchemaErrors = validateContextSchemaSelf(model);
  const stateInvokeErrors = validateStateInvokes(model, sourceDir);
  const transitionInvokeErrors = validateTransitionInvokes(model, sourceDir);
  const temporal = validateTemporalPrimitives(model, stateNames);
  const dynamicHandles = validateDynamicWorkflowHandles(model);
  errors.push(...ctxSchemaErrors, ...stateInvokeErrors, ...transitionInvokeErrors, ...temporal.errors, ...dynamicHandles.errors);
  const warnings = errors.some((e) => ['E004', 'E005'].includes(e.code))
    ? []
    : [...validateWarnings(model, stateNames), ...temporal.warnings];
  return { errors, warnings };
}

function validateTemporalPrimitives(model, stateNames) {
  const errors = [];
  const warnings = [];
  const states = Array.isArray(model?.states) ? model.states : [];

  for (let i = 0; i < states.length; i++) {
    const s = states[i];
    if (!isNonEmptyString(s?.name)) continue;
    const where = `states[${i}]`;

    if (s.loop_guard != null && s.timeout != null) {
      errors.push(err('E073', where, `name=${s.name}`));
    }

    if (s.loop_guard != null) {
      const lgWhere = `${where}.loop_guard`;
      if (!isPlainObject(s.loop_guard)) {
        errors.push(err('E060', lgWhere, `name=${s.name}`));
      } else {
        validateLoopGuard(s.loop_guard, lgWhere, stateNames, errors, warnings);
      }
    }

    if (s.timeout != null) {
      const timeoutWhere = `${where}.timeout`;
      if (!isPlainObject(s.timeout)) {
        errors.push(err('E070', timeoutWhere, `name=${s.name}`));
      } else {
        validateTimeout(s.timeout, timeoutWhere, stateNames, errors);
      }
    }
  }

  return { errors, warnings };
}

function validateLoopGuard(loopGuard, where, stateNames, errors, warnings) {
  const hasMaxVisits = loopGuard.max_visits != null;
  const hasMaxDuration = loopGuard.max_duration != null;

  if (!hasMaxVisits && !hasMaxDuration) {
    errors.push(err('E061', where));
  }

  if (hasMaxVisits && (!Number.isInteger(loopGuard.max_visits) || loopGuard.max_visits < 1)) {
    errors.push(err('E062', `${where}.max_visits`, `value=${loopGuard.max_visits}`));
  }

  if (hasMaxDuration && !isValidDuration(loopGuard.max_duration)) {
    errors.push(err('E063', `${where}.max_duration`, `value=${loopGuard.max_duration}`));
  }

  if (!isNonEmptyString(loopGuard.on_exhaustion) || !stateNames.has(loopGuard.on_exhaustion)) {
    errors.push(err('E064', `${where}.on_exhaustion`, `value=${loopGuard.on_exhaustion ?? ''}`));
  }

  for (const [field, hasBound] of [
    ['on_visits_exhausted', hasMaxVisits],
    ['on_duration_exhausted', hasMaxDuration],
  ]) {
    if (loopGuard[field] == null) continue;
    if (!isNonEmptyString(loopGuard[field]) || !stateNames.has(loopGuard[field])) {
      errors.push(err('E065', `${where}.${field}`, `value=${loopGuard[field]}`));
    } else if (!hasBound) {
      warnings.push(warn('W060', `${where}.${field}`, `${field} has no corresponding bound`));
    }
  }
}

function validateTimeout(timeout, where, stateNames, errors) {
  if (!isValidDuration(timeout.duration)) {
    errors.push(err('E071', `${where}.duration`, `value=${timeout.duration ?? ''}`));
  }
  if (!isNonEmptyString(timeout.on_timeout) || !stateNames.has(timeout.on_timeout)) {
    errors.push(err('E072', `${where}.on_timeout`, `value=${timeout.on_timeout ?? ''}`));
  }
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

function extractContextSchema(workflowModel) {
  const cs = workflowModel?.context_schema;
  if (!cs || typeof cs !== 'object') return null;
  const inputNames = new Set(
    (Array.isArray(cs.input) ? cs.input : [])
      .filter((f) => isNonEmptyString(f?.name))
      .map((f) => f.name),
  );
  const outputByTerminal = new Map();
  if (cs.output_by_terminal && typeof cs.output_by_terminal === 'object') {
    for (const [terminal, fields] of Object.entries(cs.output_by_terminal)) {
      const names = new Set(
        (Array.isArray(fields) ? fields : [])
          .filter((f) => isNonEmptyString(f?.name))
          .map((f) => f.name),
      );
      outputByTerminal.set(terminal, names);
    }
  }
  return { inputNames, outputByTerminal };
}

function validateContextSchemaSelf(model) {
  const errors = [];
  const cs = model?.context_schema;
  if (!cs || typeof cs !== 'object') return errors;

  if (Array.isArray(cs.input)) {
    for (let i = 0; i < cs.input.length; i++) {
      const f = cs.input[i];
      const where = `context_schema.input[${i}]`;
      if (!isNonEmptyString(f?.name)) errors.push(err('E050', where));
      if (!isNonEmptyString(f?.type)) errors.push(err('E051', where, f?.name ? `name=${f.name}` : ''));
    }
  }

  const terminalNames = new Set(
    (Array.isArray(model?.states) ? model.states : [])
      .filter((s) => isNonEmptyString(s?.name) && s?.is_final === true)
      .map((s) => s.name),
  );

  if (cs.output_by_terminal && typeof cs.output_by_terminal === 'object') {
    for (const [terminal, fields] of Object.entries(cs.output_by_terminal)) {
      if (!terminalNames.has(terminal)) {
        errors.push(err('E052', `context_schema.output_by_terminal.${terminal}`, `terminal=${terminal}`));
      }
      if (Array.isArray(fields)) {
        for (let i = 0; i < fields.length; i++) {
          const f = fields[i];
          const where = `context_schema.output_by_terminal.${terminal}[${i}]`;
          if (!isNonEmptyString(f?.name)) errors.push(err('E053', where));
          if (!isNonEmptyString(f?.type)) errors.push(err('E054', where, f?.name ? `name=${f.name}` : ''));
        }
      }
    }
  }
  return errors;
}

function validateInvokeContext(invokeBlock, where, childModel) {
  const errors = [];
  const childSchema = extractContextSchema(childModel);

  const hasInput = invokeBlock?.input != null && typeof invokeBlock.input === 'object';
  const hasAssign = Array.isArray(invokeBlock?.on_completion)
    && invokeBlock.on_completion.some((c) => c?.assign != null && typeof c.assign === 'object');

  if ((hasInput || hasAssign) && !childSchema) {
    errors.push(err('E058', where, 'child workflow has no context_schema'));
    return errors;
  }

  if (hasInput) {
    for (const [k, v] of Object.entries(invokeBlock.input)) {
      const w = `${where}.input.${k}`;
      if (!childSchema.inputNames.has(k)) {
        errors.push(err('E055', w, `field=${k}`));
      }
      if (!isNonEmptyString(v)) {
        errors.push(err('E057', w, `field=${k}`));
      }
    }
  }

  if (Array.isArray(invokeBlock?.on_completion)) {
    for (let i = 0; i < invokeBlock.on_completion.length; i++) {
      const c = invokeBlock.on_completion[i];
      if (!c?.assign || typeof c.assign !== 'object') continue;
      const terminal = c.terminal_state;
      const declared = childSchema.outputByTerminal.get(terminal);
      for (const [k, v] of Object.entries(c.assign)) {
        const w = `${where}.on_completion[${i}].assign.${k}`;
        if (!isNonEmptyString(v)) {
          errors.push(err('E057', w, `field=${k}`));
          continue;
        }
        // Extract the child output field name from a "child.<field>" path.
        const m = v.match(/^child\.([A-Za-z_][A-Za-z0-9_]*)$/);
        if (m && declared && !declared.has(m[1])) {
          errors.push(err('E056', w, `value=${v} (child output field "${m[1]}" not declared for terminal=${terminal})`));
        }
      }
    }
  }
  return errors;
}

export function validatePipelineModel(model, sourceDir) {
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

export function isPipelineModel(model) {
  return model && typeof model === 'object' && 'pipeline' in model;
}
