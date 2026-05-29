// mermaid.mjs — shared Mermaid stateDiagram-v2 renderer for POM
// workflow and pipeline YAML models. Imported by to-mermaid.mjs (CLI)
// and by lint-workflows.mjs (validator with --mermaid-dir option).
//
// Rendering goals (the user explicitly asked: "more beautiful, better
// understood"):
//   - explicit `direction LR` for layouts that read left-to-right;
//   - human-readable Title Case labels on every state via the
//     `state "Title" as id` form;
//   - transitions labels formatted as `event\n[guard]` so the guard
//     stays visible without cluttering the arrow line;
//   - structured notes for state-invokes (parent state hosting a
//     synchronous child) listing the child workflow and the terminal
//     -> next_event mapping in a clean two-line block;
//   - event-invokes (transitions that run a child synchronously) get
//     one labeled arrow per child terminal, with the child name
//     surfaced after a vertical bar so the reader sees the boundary;
//   - pipeline files render as a linear chain with the member's short
//     workflow name as label, not the synthetic member_<i>_<id> form;
//   - the header comment shows the workflow id and the first sentence
//     of the description (full stop trimmed to avoid mid-sentence cuts).

import { basename } from 'node:path';

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function memberKeyFromPath(workflowPath) {
  return basename(workflowPath).replace(/\.ya?ml$/, '').replace(/[^A-Za-z0-9_]/g, '_');
}

function titleCase(snake) {
  return snake
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function firstSentence(text) {
  if (!isNonEmptyString(text)) return '';
  const collapsed = text.replace(/\s+/g, ' ').trim();
  const m = collapsed.match(/^([^.!?]+[.!?])/);
  const sentence = (m ? m[1] : collapsed).trim();
  if (sentence.length > 100) return sentence.slice(0, 100).replace(/\s+\S*$/, '').trim() + '…';
  return sentence;
}

function transitionLabel(event, guard) {
  const ev = event;
  if (isNonEmptyString(guard)) return `${ev}\\n[${guard}]`;
  return ev;
}

function stateLabel(stateName, isFinal, reEntry) {
  const title = titleCase(stateName);
  if (isFinal && reEntry) return `${title} ⤴`;
  if (isFinal) return `${title} ●`;
  return title;
}

export function renderWorkflowMermaid(model) {
  const out = [];
  out.push('stateDiagram-v2');
  out.push('  direction LR');
  out.push('');

  const wfId = model.workflow ?? '?';
  out.push(`  %% Workflow: ${wfId}`);
  const headline = firstSentence(model.description);
  if (headline) out.push(`  %% ${headline}`);
  out.push('');

  const states = Array.isArray(model.states) ? model.states : [];
  const transitions = Array.isArray(model.transitions) ? model.transitions : [];

  const terminalSet = new Set(
    states.filter((s) => s?.is_final === true).map((s) => s.name),
  );
  const reEntrySet = new Set(
    states.filter((s) => s?.is_final === true && s?.re_entry_allowed === true).map((s) => s.name),
  );

  // 1) Declare every non-final state and every is_final-with-re_entry
  //    state with a human-readable title. Pure terminals are not
  //    declared (they render via the `--> [*]` form below).
  for (const s of states) {
    if (!s?.name) continue;
    if (terminalSet.has(s.name) && !reEntrySet.has(s.name)) continue;
    const label = stateLabel(s.name, s.is_final === true, reEntrySet.has(s.name));
    out.push(`  state "${label}" as ${s.name}`);
  }
  if (states.length > 0) out.push('');

  // 2) Initial arrow.
  if (isNonEmptyString(model.initial_state)) {
    out.push(`  [*] --> ${model.initial_state}`);
  }
  out.push('');

  // 3) Transitions. For event-invokes, one arrow per child terminal,
  //    annotated with the child workflow name so the reader sees the
  //    boundary at a glance.
  for (const t of transitions) {
    if (!t || !isNonEmptyString(t.from) || !isNonEmptyString(t.event)) continue;

    if (t.invoke && typeof t.invoke === 'object') {
      const child = memberKeyFromPath(t.invoke.workflow ?? '?');
      for (const c of t.invoke.on_completion ?? []) {
        if (!isNonEmptyString(c?.target)) continue;
        const target = terminalSet.has(c.target) && !reEntrySet.has(c.target) ? '[*]' : c.target;
        out.push(`  ${t.from} --> ${target} : ${t.event}\\n↪ ${child}: ${c.terminal_state}`);
      }
      continue;
    }

    if (!isNonEmptyString(t.to)) continue;
    const target = terminalSet.has(t.to) && !reEntrySet.has(t.to) ? '[*]' : t.to;
    out.push(`  ${t.from} --> ${target} : ${transitionLabel(t.event, t.guard)}`);
  }

  // 4) Notes for state-invokes (and for re-entry terminals).
  let firstNote = true;
  for (const s of states) {
    if (!s?.name) continue;

    if (s.invoke && typeof s.invoke === 'object') {
      const child = memberKeyFromPath(s.invoke.workflow ?? '?');
      const branches = (s.invoke.on_completion ?? [])
        .map((c) => `${c.terminal_state} → ${c.next_event ?? '?'}`)
        .join(', ');
      if (firstNote) { out.push(''); firstNote = false; }
      out.push(`  note right of ${s.name}`);
      out.push(`    invokes ${child}`);
      if (branches) out.push(`    ${branches}`);
      out.push('  end note');
    } else if (reEntrySet.has(s.name)) {
      if (firstNote) { out.push(''); firstNote = false; }
      out.push(`  note right of ${s.name}`);
      out.push(`    terminal with documented re-entry`);
      out.push('  end note');
    }
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

export function renderPipelineMermaid(model) {
  const out = [];
  out.push('stateDiagram-v2');
  out.push('  direction LR');
  out.push('');

  const pId = model.pipeline ?? '?';
  out.push(`  %% Pipeline: ${pId}`);
  const headline = firstSentence(model.description);
  if (headline) out.push(`  %% ${headline}`);
  out.push('');

  const sequence = Array.isArray(model.sequence) ? model.sequence : [];
  if (sequence.length === 0) {
    out.push('  [*] --> pipeline_empty');
    out.push('  state "Empty Pipeline" as pipeline_empty');
    return out.join('\n') + '\n';
  }

  // The member's "short name" is the workflow file basename without
  // suffix. We use it both as id and (Title Case) as the label.
  const shortIdByPath = new Map();
  for (const m of sequence) {
    shortIdByPath.set(m.workflow, memberKeyFromPath(m.workflow));
  }

  for (const m of sequence) {
    const id = shortIdByPath.get(m.workflow);
    out.push(`  state "${titleCase(id)}" as ${id}`);
  }
  out.push('');

  out.push(`  [*] --> ${shortIdByPath.get(sequence[0].workflow)}`);
  out.push('');

  for (const m of sequence) {
    const here = shortIdByPath.get(m.workflow);
    for (const c of m.completes_on ?? []) {
      if (!isNonEmptyString(c?.state)) continue;
      if (c.next == null) {
        out.push(`  ${here} --> [*] : ${c.state}`);
      } else if (shortIdByPath.has(c.next)) {
        out.push(`  ${here} --> ${shortIdByPath.get(c.next)} : ${c.state}`);
      }
    }
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

export function renderModelMermaid(model) {
  return 'pipeline' in (model ?? {})
    ? renderPipelineMermaid(model)
    : renderWorkflowMermaid(model);
}
