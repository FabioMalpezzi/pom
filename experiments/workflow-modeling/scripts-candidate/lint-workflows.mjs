#!/usr/bin/env node
//
// lint-workflows.mjs - first-pass validator for POM workflow YAML models.
//
// Scope of this pass: Error-level rules only. Warning, Info, Mermaid
// generation, and scenario generation are out of scope and will be added in
// later iterations of the experiment.
//
// Usage:
//   node lint-workflows.mjs <file.yaml> [--out <report.md>]
//   node lint-workflows.mjs <file1.yaml> <file2.yaml> ...
//
// Exit code: 0 if all files pass, 1 if any file has at least one Error,
// 2 on argument/parse misuse.
//
// This script lives in experiments/workflow-modeling/scripts-candidate/ and
// uses a local node_modules (js-yaml) isolated from the POM main repo.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
};

function err(code, where, extra) {
  return { code, where, extra: extra ?? '' };
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function validate(model) {
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

  return { errors };
}

function formatReport({ source, model, errors }) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const verdict = errors.length === 0 ? 'PASS' : 'FAIL';
  const lines = [];
  lines.push(`# Workflow validation report - ${model?.workflow ?? '(unknown)'}`);
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('|---|---|');
  lines.push(`| Source | \`${source}\` |`);
  lines.push(`| Generated | ${now} (UTC) |`);
  lines.push(`| Errors | ${errors.length} |`);
  lines.push('| Warnings | 0 (not implemented in this pass) |');
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
  lines.push('---');
  lines.push('_Generated by experiments/workflow-modeling/scripts-candidate/lint-workflows.mjs (Error rules only)._');
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
    if (parseError) {
      errors.push(err('E000', 'parse', parseError.message));
    } else if (model == null || typeof model !== 'object') {
      errors.push(err('E000', 'parse', 'YAML root is not a mapping.'));
    } else {
      const v = validate(model);
      errors = v.errors;
    }
    totalErrors += errors.length;

    const report = formatReport({ source: file, model: model ?? {}, errors });
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
