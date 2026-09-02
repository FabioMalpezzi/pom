#!/usr/bin/env node
// to-mermaid.mjs — convert a POM workflow or pipeline YAML into a
// Mermaid `stateDiagram-v2` block. For integrated generation use
// `pom:workflow:lint --mermaid-dir <dir>`.
//
// Usage: node scripts/to-mermaid.mjs <yaml> [--out <file.mmd>]

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import yaml from './require-yaml.mjs';
import { positionalArgs, readRawArg, unknownOptions } from './lib/cli-args.mjs';

import { renderModelMermaid } from './mermaid.mjs';

const OPTIONS = ['out'];

function parseArgs(argv) {
  const unknown = unknownOptions(argv, OPTIONS);
  if (unknown.length > 0) { console.error(`Unknown option: ${unknown[0]}`); process.exit(2); }
  return { file: positionalArgs(argv, OPTIONS)[0] ?? null, out: readRawArg('out', argv) || null };
}

function main() {
  const { file, out } = parseArgs(process.argv.slice(2));
  if (!file) {
    console.error('Usage: node scripts/to-mermaid.mjs <workflow-or-pipeline.yaml> [--out <output.mmd>]');
    process.exit(2);
  }
  const raw = readFileSync(resolve(file), 'utf8');
  const model = yaml.load(raw);
  if (!model || typeof model !== 'object') { console.error('YAML root is not a mapping.'); process.exit(1); }
  const text = renderModelMermaid(model);
  if (out) { mkdirSync(dirname(resolve(out)), { recursive: true }); writeFileSync(resolve(out), text, 'utf8'); console.log(`Wrote: ${out}`); }
  else process.stdout.write(text);
}

main();
