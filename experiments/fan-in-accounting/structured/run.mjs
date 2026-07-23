#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractArtifact, validateArtifact } from './validate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXPERIMENT_ROOT = resolve(HERE, '..');
const REPO_ROOT = resolve(HERE, '../../..');
const contract = readFileSync(join(HERE, 'contract.md'), 'utf8');
const fixtures = JSON.parse(readFileSync(join(HERE, 'fixtures.json'), 'utf8'));
const RUNNER_REVISION = '0.11';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function parseArgs(argv) {
  const options = {
    models: ['gpt-5.4-mini', 'gpt-5.4'],
    provider: 'openai-codex',
    repetitions: 1,
    concurrency: 2,
    timeoutMs: 120_000,
    output: join(EXPERIMENT_ROOT, 'evidence-structured'),
    dryRun: false,
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const value = argv[index + 1];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--models') { options.models = value.split(',').filter(Boolean); index++; }
    else if (arg === '--provider') { options.provider = value; index++; }
    else if (arg === '--repetitions') { options.repetitions = Number(value); index++; }
    else if (arg === '--concurrency') { options.concurrency = Number(value); index++; }
    else if (arg === '--timeout-ms') { options.timeoutMs = Number(value); index++; }
    else if (arg === '--output') { options.output = resolve(value); index++; }
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (options.models.length < 1) throw new Error('at least one model is required');
  for (const [name, value] of [['repetitions', options.repetitions], ['concurrency', options.concurrency]]) {
    if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  }
  return options;
}

function validateFixtures() {
  const ids = new Set();
  for (const fixture of fixtures) {
    if (!fixture.id || ids.has(fixture.id)) throw new Error(`invalid or duplicate fixture id: ${fixture.id}`);
    ids.add(fixture.id);
    if (!['design', 'scenarios'].includes(fixture.mode)) throw new Error(`${fixture.id}: invalid mode`);
    if (!fixture.task || !fixture.expect?.workflow_kind) throw new Error(`${fixture.id}: incomplete fixture`);
  }
  if (!contract.includes('One `fan_out_launch` has exactly one named batch `handle`')) throw new Error('contract lacks the batch-handle invariant');
  if (!contract.includes('Final reconciliation receives both the expected summary manifest and distinct observed summary records')) throw new Error('contract lacks final observed-summary reconciliation');
  if (!contract.includes('represented identities must be extracted from records actually received')) throw new Error('contract lacks observed-result provenance');
  if (!contract.includes('A quorum must declare `quorum_basis`')) throw new Error('contract lacks explicit quorum semantics');
  if (!contract.includes('never invent a limit from cardinality')) throw new Error('contract permits invented capacity');
  if (!contract.includes('A shared-write conflict is a `mutation` edge, not a capacity constraint')) throw new Error('contract conflates mutation with capacity');
  if (!contract.includes('unknown_record_represented_excluded_from_join_blocks_complete')) throw new Error('contract lacks fixed unknown-identity outcome');
  if (!contract.includes('every identity, result, status, unresolved, and summary source name must contain that exact domain token')) throw new Error('contract lacks task-grounded provenance');
  if (!contract.includes('a `capacity` scenario is forbidden when the task declares no capacity')) throw new Error('contract lacks bidirectional capacity scenarios');
  if (!contract.includes('Every Dynamic Workflow artifact includes')) throw new Error('contract lacks mandatory scenario disclosure');
  if (!contract.includes('Every Dynamic Workflow boundary lists at least')) throw new Error('contract lacks Dynamic Workflow boundary ownership');
  if (!contract.includes('For an ordinary workflow use the same top-level keys and no additional structure')) throw new Error('contract lacks closed ordinary-workflow shape');
}

function initialPrompt(fixture) {
  return `Create the workflow control-plane artifact requested below. Follow the experimental contract exactly. Return one JSON object only.\n\n${contract}\n\n--- TASK ---\nMode: ${fixture.mode}\n${fixture.task}`;
}

function repairPrompt(fixture, priorResponse, errors) {
  return `Repair a workflow control-plane artifact. Return one corrected JSON object only. Do not explain the repair. Do not invent unresolved business policy.\n\n${contract}\n\n--- TASK ---\nMode: ${fixture.mode}\n${fixture.task}\n\n--- PRIOR RESPONSE ---\n${priorResponse}\n\n--- MANDATORY VALIDATOR ERRORS TO FIX ---\n${errors.map((error) => `- ${error}`).join('\n')}\n\nBefore returning JSON, check every listed error one by one against the corrected object. Fix all of them in this single response. Preserve already-valid fields. For an exact expected value, replace the prior value; for a missing matching open point, add it; for an undeclared or task-undeclared field, remove it.`;
}

function runPi(prompt, model, options) {
  const args = [
    '--provider', options.provider,
    '--model', model,
    '--mode', 'text',
    '--no-session',
    '--no-context-files',
    '--no-skills',
    '--no-extensions',
    '--no-prompt-templates',
    '--no-themes',
    '--no-tools',
    '--system-prompt', 'You produce machine-validated workflow control-plane JSON. Follow the supplied contract exactly.',
    '-p', prompt,
  ];
  return new Promise((resolveRun) => {
    const child = spawn('pi', args, { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 2_000).unref();
    }, options.timeoutMs);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolveRun({ code, stdout, stderr, timedOut });
    });
  });
}

function redact(text) {
  return text
    .replaceAll(process.env.HOME ?? '__NO_HOME__', '~')
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, '[REDACTED]')
    .replace(/(?:api[_-]?key|token|authorization)\s*[:=]\s*[^\s]+/gi, '$1=[REDACTED]');
}

function assessResponse(response, fixture) {
  const extracted = extractArtifact(response);
  if (extracted.parseError) return { valid: false, errors: [extracted.parseError], artifact: null };
  const validation = validateArtifact(extracted.artifact, fixture);
  return { ...validation, artifact: extracted.artifact };
}

async function mapLimit(items, limit, worker) {
  const output = new Array(items.length);
  let cursor = 0;
  async function consume() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      output[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, consume));
  return output;
}

function summarize(outcomes) {
  const models = {};
  for (const model of [...new Set(outcomes.map((outcome) => outcome.model))]) {
    const selected = outcomes.filter((outcome) => outcome.model === model);
    const firstValid = selected.filter((outcome) => outcome.first.valid).length;
    const finalValid = selected.filter((outcome) => outcome.final.valid).length;
    const dropped = selected.filter((outcome) => outcome.first.status !== 'completed' || (outcome.repair && outcome.repair.status !== 'completed')).length;
    models[model] = {
      runs: selected.length,
      firstValid,
      firstPassRate: firstValid / selected.length,
      finalValid,
      afterRepairPassRate: finalValid / selected.length,
      repaired: selected.filter((outcome) => !outcome.first.valid && outcome.final.valid).length,
      dropped,
    };
  }
  return { models };
}

function markdown(report) {
  const lines = [
    '# Structured fan-in contract model comparison',
    '',
    `Run: \`${report.runId}\``,
    '',
    '| Model | First-pass valid | After one repair | Repaired | Dropped |',
    '|---|---:|---:|---:|---:|',
  ];
  for (const [model, summary] of Object.entries(report.summary.models)) {
    lines.push(`| ${model} | ${summary.firstValid}/${summary.runs} (${(summary.firstPassRate * 100).toFixed(1)}%) | ${summary.finalValid}/${summary.runs} (${(summary.afterRepairPassRate * 100).toFixed(1)}%) | ${summary.repaired} | ${summary.dropped} |`);
  }
  lines.push('', '## Outcomes', '');
  for (const outcome of report.outcomes) {
    lines.push(`- ${outcome.model}/${outcome.fixtureId}/rep-${outcome.repetition}: first=${outcome.first.valid ? 'PASS' : 'FAIL'}, final=${outcome.final.valid ? 'PASS' : 'FAIL'}${outcome.final.valid ? '' : `; errors=${outcome.final.errors.join(' | ')}`}`);
  }
  return `${lines.join('\n')}\n`;
}

const options = parseArgs(process.argv.slice(2));
validateFixtures();
if (options.dryRun) {
  console.log(`Structured contract dry run: OK (${fixtures.length} fixtures; models ${options.models.join(', ')})`);
  process.exit(0);
}

const jobs = [];
for (const model of options.models) {
  for (const fixture of fixtures) {
    for (let repetition = 1; repetition <= options.repetitions; repetition++) jobs.push({ model, fixture, repetition });
  }
}

const startedAt = new Date().toISOString();
const runId = `${startedAt.replace(/[:.]/g, '-')}-structured-v${RUNNER_REVISION}-${options.repetitions}x`;
const outcomes = await mapLimit(jobs, options.concurrency, async ({ model, fixture, repetition }) => {
  const firstCommand = await runPi(initialPrompt(fixture), model, options);
  const firstResponse = redact(firstCommand.stdout || firstCommand.stderr);
  const firstStatus = firstCommand.timedOut ? 'timed_out' : firstCommand.code === 0 ? 'completed' : 'failed';
  const firstAssessment = firstStatus === 'completed'
    ? assessResponse(firstResponse, fixture)
    : { valid: false, errors: [`first call ${firstStatus}`], artifact: null };

  let repair = null;
  let final = firstAssessment;
  if (!firstAssessment.valid && firstStatus === 'completed') {
    const repairCommand = await runPi(repairPrompt(fixture, firstResponse, firstAssessment.errors), model, options);
    const repairResponse = redact(repairCommand.stdout || repairCommand.stderr);
    const repairStatus = repairCommand.timedOut ? 'timed_out' : repairCommand.code === 0 ? 'completed' : 'failed';
    const repairAssessment = repairStatus === 'completed'
      ? assessResponse(repairResponse, fixture)
      : { valid: false, errors: [`repair call ${repairStatus}`], artifact: null };
    repair = { status: repairStatus, response: repairResponse, ...repairAssessment };
    final = repairAssessment;
  }

  return {
    model,
    fixtureId: fixture.id,
    repetition,
    first: { status: firstStatus, response: firstResponse, ...firstAssessment },
    repair,
    final,
  };
});

const report = {
  runId,
  startedAt,
  finishedAt: new Date().toISOString(),
  environment: {
    piVersion: '0.81.1',
    provider: options.provider,
    models: options.models,
    repetitions: options.repetitions,
    runnerRevision: RUNNER_REVISION,
    contractSha256: sha256(contract),
    fixturesSha256: sha256(JSON.stringify(fixtures)),
  },
  summary: summarize(outcomes),
  outcomes,
};
const runDir = join(options.output, runId);
mkdirSync(runDir, { recursive: true });
writeFileSync(join(runDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(join(runDir, 'report.md'), markdown(report));
console.log(markdown(report));
console.log(`Evidence: ${relative(REPO_ROOT, runDir)}`);
if (Object.values(report.summary.models).some((model) => model.dropped > 0 || model.afterRepairPassRate < 1)) process.exitCode = 1;
