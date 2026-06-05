import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import yaml from '../require-yaml.mjs';
import { renderModelMermaid } from '../mermaid.mjs';
import { err, isPipelineModel, validatePipelineModel, validateWorkflowModel } from './workflow-lint-core.mjs';
import { formatWorkflowReport } from './workflow-lint-report.mjs';

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

export function runWorkflowLintCli(argv = process.argv.slice(2)) {
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
      const v = validatePipelineModel(model, dirname(source));
      errors = v.errors;
    } else {
      const v = validateWorkflowModel(model, dirname(source));
      errors = v.errors;
      warnings = v.warnings;
    }
    totalErrors += errors.length;

    const report = formatWorkflowReport({ source: file, model: model ?? {}, errors, warnings, kind });
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
