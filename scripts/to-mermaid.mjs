#!/usr/bin/env node
// to-mermaid.mjs — convert a POM workflow or pipeline YAML into a
// Mermaid `stateDiagram-v2` block. For integrated generation use
// `pom:workflow:lint --mermaid-dir <dir>`.
//
// Usage: node scripts/to-mermaid.mjs <yaml> [--out <file.mmd>]

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from './require-yaml.mjs';

import { renderModelMermaid } from './mermaid.mjs';

function parseArgs(argv) {
  const args = { file: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a.startsWith('--')) { console.error(`Unknown option: ${a}`); process.exit(2); }
    else args.file = a;
  }
  return args;
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
  if (out) { writeFileSync(resolve(out), text, 'utf8'); console.log(`Wrote: ${out}`); }
  else process.stdout.write(text);
}

main();
