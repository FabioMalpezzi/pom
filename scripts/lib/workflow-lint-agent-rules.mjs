// Agent-shaped workflow rules.
//
// These validators cover the parts of a workflow that a purely domain state
// machine never had to express: who judges produced work and on what context,
// and how a runtime re-enters the workflow. They live outside
// workflow-lint-core.mjs for the same reason workflow-dynamic-handles.mjs
// does: one responsibility per file, and the core stays under the POM source
// size target.

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

const EVIDENCE_SOURCES = new Set(['deterministic', 'model_judgment', 'human']);

/**
 * Verification evidence rules.
 *
 * A guard may declare where its pass/fail decision actually comes from. The
 * block is optional so existing models keep validating unchanged, but once a
 * guard says it is judged by a model, the model must also say whether that
 * judgement runs on a context independent from the one that produced the work.
 * A verifier sharing the executor's context agrees with itself instead of
 * verifying.
 */
export function validateVerificationEvidence(model) {
  const errors = [];
  const warnings = [];
  const guards = Array.isArray(model?.guards) ? model.guards : [];
  const states = Array.isArray(model?.states) ? model.states : [];
  const transitions = Array.isArray(model?.transitions) ? model.transitions : [];

  const declaredGuards = new Set();
  const guardsWithEvidence = new Set();

  for (let i = 0; i < guards.length; i++) {
    const g = guards[i];
    if (!isNonEmptyString(g?.name)) continue;
    declaredGuards.add(g.name);
    if (g.evidence == null) continue;

    const where = `guards[${i}].evidence`;
    if (!isPlainObject(g.evidence)) {
      errors.push(err('E090', where, `name=${g.name}`));
      continue;
    }
    guardsWithEvidence.add(g.name);

    const source = g.evidence.source;
    if (!isNonEmptyString(source) || !EVIDENCE_SOURCES.has(source)) {
      errors.push(err('E090', `${where}.source`, `name=${g.name}, value=${source ?? ''}`));
      continue;
    }

    const independent = g.evidence.independent_context;
    if (independent != null && typeof independent !== 'boolean') {
      errors.push(err('E091', `${where}.independent_context`, `name=${g.name}, value=${independent}`));
      continue;
    }

    if (source === 'model_judgment' && independent !== true) {
      warnings.push(warn('W005', where, `name=${g.name}`));
    }
  }

  const awaitStates = new Set(
    states
      .filter((s) => isNonEmptyString(s?.name) && isPlainObject(s?.await))
      .map((s) => s.name),
  );
  if (awaitStates.size > 0) {
    for (let i = 0; i < transitions.length; i++) {
      const t = transitions[i];
      if (!isNonEmptyString(t?.from) || !awaitStates.has(t.from)) continue;
      if (!isNonEmptyString(t?.guard) || !declaredGuards.has(t.guard)) continue;
      if (!guardsWithEvidence.has(t.guard)) {
        warnings.push(warn('W006', `transitions[${i}]`, `from=${t.from}, guard=${t.guard}`));
      }
    }
  }

  return { errors, warnings };
}

const RUNTIME_LOOP_TRIGGERS = new Set(['user_request', 'schedule', 'event', 'evidence_failure']);

/**
 * Runtime loop contract.
 *
 * The block is optional. It records how the target project's runtime re-enters
 * this workflow and what closes a cycle, which the state graph alone cannot
 * express: the graph says which transitions are legal, not what starts another
 * cycle, what evidence decides success, what a failed cycle hands to the next
 * one, or who receives the run when the budget is gone.
 *
 * Once declared, the block must be complete enough to be a contract. Stop
 * targets must be declared states; if a stop target is not reachable through
 * transitions, W001 reports it as unreachable and that is a real finding.
 */
export function validateRuntimeLoop(model, stateNames) {
  const errors = [];
  const warnings = [];
  const loop = model?.runtime_loop;
  if (loop == null) return { errors, warnings };

  if (!isPlainObject(loop)) {
    errors.push(err('E100', 'runtime_loop'));
    return { errors, warnings };
  }

  if (!isPlainObject(loop.trigger) || !isNonEmptyString(loop.trigger.kind)
    || !RUNTIME_LOOP_TRIGGERS.has(loop.trigger.kind)) {
    errors.push(err('E101', 'runtime_loop.trigger', `kind=${loop.trigger?.kind ?? ''}`));
  }

  if (!isNonEmptyString(loop.goal)) {
    errors.push(err('E102', 'runtime_loop.goal'));
  }

  if (!isNonEmptyString(loop.evidence)) {
    errors.push(err('E103', 'runtime_loop.evidence'));
  }

  if (!isPlainObject(loop.stop)) {
    errors.push(err('E104', 'runtime_loop.stop'));
  } else {
    if (!isNonEmptyString(loop.stop.on_success) || !stateNames.has(loop.stop.on_success)) {
      errors.push(err('E105', 'runtime_loop.stop.on_success', `value=${loop.stop.on_success ?? ''}`));
    }
    if (!isNonEmptyString(loop.stop.on_exhaustion) || !stateNames.has(loop.stop.on_exhaustion)) {
      errors.push(err('E106', 'runtime_loop.stop.on_exhaustion', `value=${loop.stop.on_exhaustion ?? ''}`));
    }
    if (!isNonEmptyString(loop.stop.escalation)) {
      warnings.push(warn('W008', 'runtime_loop.stop'));
    }
  }

  if (!isNonEmptyString(loop.feedback)) {
    warnings.push(warn('W007', 'runtime_loop'));
  }

  return { errors, warnings };
}
