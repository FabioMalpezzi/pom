function err(code, where, extra) {
  return { code, where, extra: extra ?? '' };
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isPlainObject(v) {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function isSnakeCaseIdentifier(v) {
  return isNonEmptyString(v) && /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(v);
}

function stableSetKey(values) {
  return [...values].sort().join(',');
}

function validateFanOut(value, where, declaredHandles, errors) {
  if (!isPlainObject(value)) {
    errors.push(err('E080', where));
    return null;
  }
  if (!isNonEmptyString(value.workflow)) {
    errors.push(err('E081', `${where}.workflow`));
  }
  const handle = value.handle;
  if (!isSnakeCaseIdentifier(handle)) {
    errors.push(err('E082', `${where}.handle`, `value=${handle ?? ''}`));
    return null;
  }
  if (declaredHandles.has(handle)) {
    errors.push(err('E083', `${where}.handle`, `handle=${handle}`));
    return null;
  }
  declaredHandles.add(handle);
  return handle;
}

function referenceList(value, where, code, errors) {
  const handles = Array.isArray(value) ? value : [];
  if (handles.length === 0 || handles.some((h) => !isSnakeCaseIdentifier(h))) {
    errors.push(err(code, where));
    return [];
  }
  return handles;
}

function consumedAwaitHandles(awaitBlock, handles) {
  const join = awaitBlock?.join ?? 'all';
  if (join === 'first') return handles.slice(0, 1);
  if (join === 'quorum') return handles.slice(0, awaitBlock?.k ?? handles.length);
  return handles;
}

function pathLabel(path) {
  return path.join(' -> ');
}

function addPathError(errors, seenPathErrors, code, where, extra) {
  const key = `${code}|${where}|${extra ?? ''}`;
  if (seenPathErrors.has(key)) return;
  seenPathErrors.add(key);
  errors.push(err(code, where, extra ?? ''));
}

function terminalActiveHandleExtra(active, finalState, path, launchOrigins) {
  const handles = [...active].sort();
  const origins = handles
    .map((handle) => `${handle}@${launchOrigins.get(handle) ?? 'unknown'}`)
    .join(',');
  return `handles=${handles.join(',')}; final=${finalState}; launched_at=${origins}; path=${pathLabel(path)}`;
}

export function validateDynamicWorkflowHandles(model) {
  const errors = [];
  const states = Array.isArray(model?.states) ? model.states : [];
  const transitions = Array.isArray(model?.transitions) ? model.transitions : [];
  const stateByName = new Map(states.filter((s) => isNonEmptyString(s?.name)).map((s, i) => [s.name, { state: s, index: i }]));
  const declaredHandles = new Set();
  const launchOrigins = new Map();
  const stateLaunchHandles = new Map();
  const transitionLaunchHandles = new Map();

  for (let i = 0; i < states.length; i++) {
    const s = states[i];
    if (!isNonEmptyString(s?.name)) continue;
    if (s.fan_out_launch != null) {
      const handle = validateFanOut(s.fan_out_launch, `states[${i}].fan_out_launch`, declaredHandles, errors);
      if (handle) {
        stateLaunchHandles.set(s.name, handle);
        launchOrigins.set(handle, `states[${i}].fan_out_launch`);
      }
    }
  }

  for (let i = 0; i < transitions.length; i++) {
    const t = transitions[i];
    if (t?.launch != null) {
      const handle = validateFanOut(t.launch, `transitions[${i}].launch`, declaredHandles, errors);
      if (handle) {
        transitionLaunchHandles.set(i, handle);
        launchOrigins.set(handle, `transitions[${i}].launch`);
      }
    }
  }

  const initial = model?.initial_state;
  if (!isNonEmptyString(initial) || !stateByName.has(initial)) return { errors };

  const seen = new Set();
  const seenPathErrors = new Set();
  const queue = [{ name: initial, active: new Set(), path: [initial] }];

  while (queue.length > 0) {
    const current = queue.shift();
    const key = `${current.name}|${stableSetKey(current.active)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const entry = stateByName.get(current.name);
    if (!entry) continue;
    const { state, index } = entry;
    const active = new Set(current.active);
    const where = `states[${index}]`;

    const launched = stateLaunchHandles.get(state.name);
    if (launched) active.add(launched);

    let timeoutEvent = null;
    let timeoutActive = null;

    if (state.await != null) {
      const awaitWhere = `${where}.await`;
      if (!isPlainObject(state.await)) {
        addPathError(errors, seenPathErrors, 'E084', awaitWhere);
      } else {
        timeoutEvent = isNonEmptyString(state.await.on_timeout) ? state.await.on_timeout : null;
        timeoutActive = new Set(active);
        const handles = referenceList(state.await.handles, `${awaitWhere}.handles`, 'E085', errors);
        for (const h of handles) {
          if (!declaredHandles.has(h)) {
            addPathError(
              errors,
              seenPathErrors,
              'E086',
              `${awaitWhere}.handles`,
              `handle=${h}; path=${pathLabel(current.path)}`,
            );
          }
        }
        for (const h of consumedAwaitHandles(state.await, handles)) active.delete(h);
      }
    }

    if (state.cancel_handles != null) {
      const handles = referenceList(state.cancel_handles, `${where}.cancel_handles`, 'E087', errors);
      for (const h of handles) {
        if (!declaredHandles.has(h) || !active.has(h)) {
          addPathError(
            errors,
            seenPathErrors,
            'E087',
            `${where}.cancel_handles`,
            `handle=${h}; path=${pathLabel(current.path)}`,
          );
        }
        active.delete(h);
      }
    }

    if (state.detach_handles != null) {
      const handles = referenceList(state.detach_handles, `${where}.detach_handles`, 'E088', errors);
      for (const h of handles) {
        if (!declaredHandles.has(h) || !active.has(h)) {
          addPathError(
            errors,
            seenPathErrors,
            'E088',
            `${where}.detach_handles`,
            `handle=${h}; path=${pathLabel(current.path)}`,
          );
        }
        active.delete(h);
      }
    }

    if (state.is_final === true) {
      if (active.size > 0) {
        addPathError(
          errors,
          seenPathErrors,
          'E089',
          'states',
          terminalActiveHandleExtra(active, state.name, current.path, launchOrigins),
        );
      }
      continue;
    }

    for (let i = 0; i < transitions.length; i++) {
      const t = transitions[i];
      if (t?.from !== state.name || !isNonEmptyString(t?.to)) continue;
      const baseActive = timeoutEvent && t.event === timeoutEvent && timeoutActive ? timeoutActive : active;
      const nextActive = new Set(baseActive);
      const transitionLaunch = transitionLaunchHandles.get(i);
      if (transitionLaunch) nextActive.add(transitionLaunch);
      queue.push({ name: t.to, active: nextActive, path: [...current.path, t.to] });
    }
  }

  return { errors };
}
