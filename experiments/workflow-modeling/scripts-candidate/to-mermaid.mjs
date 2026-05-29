#!/usr/bin/env node
//
// to-mermaid.mjs — CLI wrapper that converts a single POM workflow or
// pipeline YAML into a Mermaid `stateDiagram-v2` block. For batch /
// integrated generation use lint-workflows.mjs with --mermaid-dir.
//
// Usage:
//   node to-mermaid.mjs <workflow-or-pipeline.yaml> [--out <output.mmd>]

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderModelMermaid } from './mermaid.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const yaml = (await import(join(here, 'node_modules', 'js-yaml', 'dist', 'js-yaml.mjs'))).default;

function parseArgs(argv) {
  const args = { file: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a.startsWith('--')) {
      console.error(`Unknown option: ${a}`);
      process.exit(2);
    } else args.file = a;
  }
  return args;
}

function main() {
  const { file, out } = parseArgs(process.argv.slice(2));
  if (!file) {
    console.error('Usage: node to-mermaid.mjs <workflow-or-pipeline.yaml> [--out <output.mmd>]');
    process.exit(2);
  }
  const raw = readFileSync(resolve(file), 'utf8');
  const model = yaml.load(raw);
  if (!model || typeof model !== 'object') {
    console.error('YAML root is not a mapping.');
    process.exit(1);
  }
  const text = renderModelMermaid(model);
  if (out) {
    writeFileSync(resolve(out), text, 'utf8');
    console.log(`Wrote: ${out}`);
  } else {
    process.stdout.write(text);
  }
}

main();
