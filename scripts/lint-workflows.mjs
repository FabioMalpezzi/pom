#!/usr/bin/env node
//
// lint-workflows.mjs - validator for POM workflow YAML models.
// Scope: validator for POM workflow YAML models (workflows + pipelines).
// Implements Error-level + Warning-level rules and, when --mermaid-dir is
// passed, also generates `<name>.mmd` for each YAML processed.
//
// Usage:
//   node scripts/lint-workflows.mjs <file.yaml> [<file2.yaml> ...] \
//     [--out <report.md>] [--mermaid-dir <dir>]
//
// Exit code: 0 if all files pass (warnings allowed), 1 if any file has at
// least one Error, 2 on argument/parse misuse.
//
// Reference: specs/SPEC-0006-workflow-modeling.md

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join, isAbsolute, basename } from 'node:path';
import yaml from './require-yaml.mjs';
import { renderModelMermaid } from './mermaid.mjs';
import { validateDynamicWorkflowHandles } from './workflow-dynamic-handles.mjs';
import { ERROR_HELP } from './workflow-error-help.mjs';

const ERROR_RULES = {
  E000: 'The file could not be read as a workflow YAML mapping.',
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
  E029: 'Pipeline declares native asynchronous composition (mode: async / parallel), which is outside the POM workflow model.',
  E030: 'A state invoke block has no "workflow" path or a non-string path.',
  E031: 'A state invoke references a workflow file that does not exist on disk.',
  E032: 'A state invoke has no "on_completion" or it is empty.',
  E033: 'A state invoke on_completion[].terminal_state does not exist as is_final: true in the child workflow.',
  E034: 'A state invoke on_completion[].next_event does not exist in the parent workflow events.',
  E035: 'A state declares invoke but is is_final: true (terminal states cannot host an invoke).',
  E036: 'A state invoke declares native asynchronous composition (mode: async / parallel), which is outside the POM workflow model.',
  E040: 'A transition invoke block has no "workflow" path or a non-string path.',
  E041: 'A transition invoke references a workflow file that does not exist on disk.',
  E042: 'A transition invoke has no "on_completion" or it is empty.',
  E043: 'A transition invoke on_completion[].terminal_state does not exist as is_final: true in the child workflow.',
  E044: 'A transition invoke on_completion[].target does not exist as a state in the parent workflow.',
  E045: 'A transition declares both invoke and "to". A transition has exactly one of: a direct "to", or an invoke whose on_completion provides the targets.',
  E046: 'A transition invoke declares native asynchronous composition (mode: async / parallel), which is outside the POM workflow model.',
  E050: 'context_schema.input[] entry has no "name" or a non-string name.',
  E051: 'context_schema.input[] entry has no "type" or a non-string type.',
  E052: 'context_schema.output_by_terminal key does not name an is_final: true state of this workflow.',
  E053: 'context_schema.output_by_terminal[<terminal>][] entry has no "name" or a non-string name.',
  E054: 'context_schema.output_by_terminal[<terminal>][] entry has no "type" or a non-string type.',
  E055: 'invoke.input field name is not declared in the child workflow context_schema.input.',
  E056: 'on_completion[].assign value references a "child.<field>" path whose <field> is not declared in the child workflow context_schema.output_by_terminal[terminal_state].',
  E057: 'invoke.input or on_completion[].assign value is not a non-empty string (must be a documental path).',
  E058: 'invoke.input or on_completion[].assign is declared but child workflow has no context_schema (cannot validate nominal coherence).',
  E060: 'loop_guard must be a mapping when declared on a state.',
  E061: 'loop_guard must declare at least one bound: max_visits or max_duration.',
  E062: 'loop_guard.max_visits must be an integer greater than or equal to 1.',
  E063: 'loop_guard.max_duration must use an unambiguous duration: <N>s, <N>min, <N>h, <N>d, or ISO 8601.',
  E064: 'loop_guard.on_exhaustion is required and must reference a declared state.',
  E065: 'loop_guard cause-specific exhaustion target must reference a declared state.',
  E070: 'timeout must be a mapping when declared on a state.',
  E071: 'timeout.duration is required and must use an unambiguous duration: <N>s, <N>min, <N>h, <N>d, or ISO 8601.',
  E072: 'timeout.on_timeout is required and must reference a declared state.',
  E073: 'A state cannot declare both loop_guard and timeout; loop_guard bounds a loop, timeout bounds non-loop residence.',
  E080: 'fan_out_launch must be a mapping when declared on a state.',
  E081: 'fan_out_launch.workflow is required and must be a non-empty string.',
  E082: 'fan_out_launch.handle is required and must be a snake_case identifier.',
  E083: 'fan_out_launch.handle must be unique within the workflow.',
  E084: 'await must be a mapping when declared on a state.',
  E085: 'await.handles must be a non-empty list of snake_case handle identifiers.',
  E086: 'await.handles must reference handles declared by an earlier fan_out_launch.',
  E087: 'cancel_handles must be a non-empty list of declared active handles.',
  E088: 'detach_handles must be a non-empty list of declared active handles.',
  E089: 'A final state is reachable with active handles that were not awaited, cancelled, or detached.',
};

const WARNING_RULES = {
  W001: 'Unreachable state: declared but not reachable from initial_state by any transition path.',
  W002: 'Silent dead-end: non-final state with no outgoing transitions.',
  W003: 'Final state has at least one outgoing transition (re-entry from terminal). Suppressed when the state declares re_entry_allowed: true.',
  W004: 'Non-deterministic transition: same (from, event) declared more than once with ambiguous guard coverage.',
  W060: 'loop_guard declares a cause-specific exhaustion target for a bound dimension that is not present.',
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

function validate(model, sourceDir = '.') {
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
      const help = ERROR_HELP[e.code];
      if (help) lines.push(`  Suggested fix: ${help}`);
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
  lines.push('_Generated by scripts/lint-workflows.mjs (Error + Warning rules)._');
  lines.push('');
  return lines.join('\n');
}

function parseArgs(argv) {
  const args = { files: [], out: null, mermaidDir: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') {
      args.out = argv[++i];
    } else if (a === '--mermaid-dir') {
      args.mermaidDir = argv[++i];
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
    console.error('Usage: node lint-workflows.mjs <file.yaml> [<file2.yaml> ...] [--out <report.md>] [--mermaid-dir <dir>]');
    console.error('When multiple files are provided, --out is ignored and each report goes to stdout.');
    console.error('When --mermaid-dir is provided, a Mermaid stateDiagram-v2 is written for each YAML file.');
    process.exit(2);
  }
  const { files, out, mermaidDir } = parseArgs(argv);

  let totalErrors = 0;
  const reports = [];

  for (const file of files) {
    const source = resolve(file);
    let model = null;
    let parseError = null;
    let readError = null;
    if (!existsSync(source)) {
      readError = new Error(`File does not exist: ${source}`);
    } else {
      try {
        const raw = readFileSync(source, 'utf8');
        try {
          model = yaml.load(raw);
        } catch (e) {
          parseError = e;
        }
      } catch (e) {
        readError = e;
      }
    }

    let errors = [];
    let warnings = [];
    let kind = 'workflow';
    if (readError) {
      errors.push(err('E000', 'file', readError.message));
    } else if (parseError) {
      errors.push(err('E000', 'parse', parseError.message));
    } else if (model == null || typeof model !== 'object') {
      errors.push(err('E000', 'root', 'YAML root is not a mapping.'));
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

    // Optional Mermaid generation alongside the validation report.
    if (mermaidDir && model && typeof model === 'object') {
      try {
        mkdirSync(resolve(mermaidDir), { recursive: true });
        const mmdName = basename(file).replace(/\.ya?ml$/, '') + '.mmd';
        const mmdPath = resolve(mermaidDir, mmdName);
        writeFileSync(mmdPath, renderModelMermaid(model), 'utf8');
        console.log(`Mermaid: ${mmdPath}`);
      } catch (e) {
        console.error(`Mermaid generation failed for ${file}: ${e.message}`);
      }
    }
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
