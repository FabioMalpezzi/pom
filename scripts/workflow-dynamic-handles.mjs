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

function validateHandleReferenceList(value, where, code, declaredHandles, activeHandles, errors) {
  const handles = Array.isArray(value) ? value : [];
  if (handles.length === 0 || handles.some((h) => !isSnakeCaseIdentifier(h))) {
    errors.push(err(code, where));
    return [];
  }

  for (const h of handles) {
    if (!declaredHandles.has(h) || (activeHandles && !activeHandles.has(h))) {
      errors.push(err(code, where, `handle=${h}`));
    }
  }
  return handles;
}

export function validateDynamicWorkflowHandles(model) {
  const errors = [];
  const states = Array.isArray(model?.states) ? model.states : [];
  const transitions = Array.isArray(model?.transitions) ? model.transitions : [];
  const declaredHandles = new Set();
  const activeHandles = new Set();

  for (let i = 0; i < states.length; i++) {
    const s = states[i];
    if (!isNonEmptyString(s?.name)) continue;
    const where = `states[${i}]`;

    if (s.fan_out_launch != null) {
      const flWhere = `${where}.fan_out_launch`;
      if (!isPlainObject(s.fan_out_launch)) {
        errors.push(err('E080', flWhere, `name=${s.name}`));
      } else {
        if (!isNonEmptyString(s.fan_out_launch.workflow)) {
          errors.push(err('E081', `${flWhere}.workflow`));
        }
        const handle = s.fan_out_launch.handle;
        if (!isSnakeCaseIdentifier(handle)) {
          errors.push(err('E082', `${flWhere}.handle`, `value=${handle ?? ''}`));
        } else if (declaredHandles.has(handle)) {
          errors.push(err('E083', `${flWhere}.handle`, `handle=${handle}`));
        } else {
          declaredHandles.add(handle);
          activeHandles.add(handle);
        }
      }
    }

    if (s.await != null) {
      const awaitWhere = `${where}.await`;
      if (!isPlainObject(s.await)) {
        errors.push(err('E084', awaitWhere, `name=${s.name}`));
      } else {
        const handles = validateHandleReferenceList(
          s.await.handles,
          `${awaitWhere}.handles`,
          'E085',
          declaredHandles,
          null,
          errors,
        );
        for (const h of handles) {
          if (!declaredHandles.has(h)) {
            errors.push(err('E086', `${awaitWhere}.handles`, `handle=${h}`));
          } else {
            activeHandles.delete(h);
          }
        }
      }
    }

    if (s.cancel_handles != null) {
      const handles = validateHandleReferenceList(s.cancel_handles, `${where}.cancel_handles`, 'E087', declaredHandles, activeHandles, errors);
      for (const h of handles) activeHandles.delete(h);
    }

    if (s.detach_handles != null) {
      const handles = validateHandleReferenceList(s.detach_handles, `${where}.detach_handles`, 'E088', declaredHandles, activeHandles, errors);
      for (const h of handles) activeHandles.delete(h);
    }
  }

  const finalNames = new Set(
    states
      .filter((s) => isNonEmptyString(s?.name) && s?.is_final === true)
      .map((s) => s.name),
  );
  const terminalReachable = transitions.some((t) => finalNames.has(t?.to));
  if (activeHandles.size > 0 && (terminalReachable || states.some((s) => s?.is_final === true))) {
    errors.push(err('E089', 'states', `active_handles=${[...activeHandles].sort().join(',')}`));
  }

  return { errors };
}
