#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXPERIMENT_ROOT = resolve(HERE, '..');
const REPO_ROOT = resolve(HERE, '../../..');
const fixtures = JSON.parse(readFileSync(join(HERE, 'fixtures.json'), 'utf8'));
const baselineProcedure = readFileSync(join(REPO_ROOT, 'prompts/27-workflow-modeling.md'), 'utf8');
const candidateAdditions = readFileSync(join(EXPERIMENT_ROOT, 'candidate-method-changes.md'), 'utf8');
const EVALUATOR_REVISION = '0.2';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function parseArgs(argv) {
  const options = {
    variants: ['baseline', 'candidate'],
    repetitions: 1,
    concurrency: 2,
    timeoutMs: 120_000,
    provider: 'openai-codex',
    model: 'gpt-5.4-mini',
    output: join(EXPERIMENT_ROOT, 'evidence'),
    dryRun: false,
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const value = argv[index + 1];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--variant') {
      if (!['baseline', 'candidate', 'both'].includes(value)) throw new Error(`unsupported variant: ${value}`);
      options.variants = value === 'both' ? ['baseline', 'candidate'] : [value];
      index++;
    } else if (arg === '--repetitions') { options.repetitions = Number(value); index++; }
    else if (arg === '--concurrency') { options.concurrency = Number(value); index++; }
    else if (arg === '--timeout-ms') { options.timeoutMs = Number(value); index++; }
    else if (arg === '--provider') { options.provider = value; index++; }
    else if (arg === '--model') { options.model = value; index++; }
    else if (arg === '--output') { options.output = resolve(value); index++; }
    else throw new Error(`unknown argument: ${arg}`);
  }
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
    if (!['design', 'scenarios'].includes(fixture.mode)) throw new Error(`${fixture.id}: unsupported mode`);
    if (!fixture.task || !Array.isArray(fixture.checks) || fixture.checks.length < 2) throw new Error(`${fixture.id}: incomplete fixture`);
    for (const check of fixture.checks) {
      if (!check.id || (!Array.isArray(check.any) && !Array.isArray(check.all))) throw new Error(`${fixture.id}: invalid check`);
      for (const pattern of [...(check.any ?? []), ...(check.all ?? []), ...(check.none ?? [])]) new RegExp(pattern, 'is');
    }
    const plantedBad = evaluate(fixture, 'Everything is complete because the result count matches. Run all work sequentially.');
    if (plantedBad.pass) throw new Error(`${fixture.id}: planted bad response was not rejected`);
  }
  if (!candidateAdditions.includes('satisfying the join threshold may wake the control plane') ||
      !candidateAdditions.includes('do not model one workflow handle per item')) {
    throw new Error('candidate additions do not contain the central accounting and batch-handle distinctions');
  }
}

function procedureFor(variant) {
  if (variant === 'baseline') return baselineProcedure;
  return `${baselineProcedure}\n\n--- EXPERIMENTAL CANDIDATE ADDITIONS ---\n\n${candidateAdditions}`;
}

function buildPrompt(fixture, variant) {
  return `Follow the workflow-modeling procedure below. This is a read-only behavioral evaluation: do not use tools, edit files, or invent missing business rules. Treat pom.config.json as already read with workflows.enabled: true and workflows.dynamic.enabled: true; do not stop to request config confirmation.\n\n${procedureFor(variant)}\n\n--- EVALUATION TASK ---\n\nMode: ${fixture.mode}\n\n${fixture.task}\n\nReturn a concise design/review with these headings: Dependency shape, Shared resources, Fan-in and completion, Scenarios, Open points, POM boundary. Do not discuss this evaluation or compare prompt variants.`;
}

function runPi(prompt, options) {
  const args = [
    '--provider', options.provider,
    '--model', options.model,
    '--mode', 'text',
    '--no-session',
    '--no-context-files',
    '--no-skills',
    '--no-extensions',
    '--no-prompt-templates',
    '--no-themes',
    '--no-tools',
    '--system-prompt', 'You are a precise workflow-modeling agent. Follow the supplied procedure and answer only the requested task.',
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

function matches(pattern, response) {
  return new RegExp(pattern, 'is').test(response);
}

function evaluate(fixture, response) {
  const checks = fixture.checks.map((check) => {
    const anyPass = !check.any || check.any.some((pattern) => matches(pattern, response));
    const allPass = !check.all || check.all.every((pattern) => matches(pattern, response));
    const nonePass = !check.none || check.none.every((pattern) => !matches(pattern, response));
    return { id: check.id, pass: anyPass && allPass && nonePass };
  });
  return { pass: checks.every((check) => check.pass), checks };
}

function redact(text) {
  return text
    .replaceAll(process.env.HOME ?? '__NO_HOME__', '~')
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, '[REDACTED]')
    .replace(/(?:api[_-]?key|token|authorization)\s*[:=]\s*[^\s]+/gi, '$1=[REDACTED]');
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
  const variants = {};
  for (const variant of [...new Set(outcomes.map((outcome) => outcome.variant))]) {
    const selected = outcomes.filter((outcome) => outcome.variant === variant);
    const completed = selected.filter((outcome) => outcome.status === 'completed');
    const checks = completed.flatMap((outcome) => outcome.evaluation.checks);
    variants[variant] = {
      runs: selected.length,
      completed: completed.length,
      scenarioPasses: completed.filter((outcome) => outcome.evaluation.pass).length,
      scenarioPassRate: completed.length ? completed.filter((outcome) => outcome.evaluation.pass).length / completed.length : 0,
      checkPassRate: checks.length ? checks.filter((check) => check.pass).length / checks.length : 0,
    };
  }
  const baseline = variants.baseline;
  const candidate = variants.candidate;
  const delta = baseline && candidate ? candidate.checkPassRate - baseline.checkPassRate : null;
  return {
    variants,
    delta,
    gate: candidate && baseline
      ? {
          noDroppedRuns: candidate.completed === candidate.runs && baseline.completed === baseline.runs,
          candidateCheckRateAtLeast090: candidate.checkPassRate >= 0.90,
          targetedImprovementAtLeast010: delta >= 0.10,
        }
      : null,
  };
}

function markdownReport(report) {
  const lines = ['# Fan-in accounting prompt A/B report', '', `Run: \`${report.runId}\``, '', '| Variant | Completed | Scenario pass rate | Check pass rate |', '|---|---:|---:|---:|'];
  for (const [variant, value] of Object.entries(report.summary.variants)) {
    lines.push(`| ${variant} | ${value.completed}/${value.runs} | ${(value.scenarioPassRate * 100).toFixed(1)}% | ${(value.checkPassRate * 100).toFixed(1)}% |`);
  }
  if (report.summary.delta !== null) lines.push('', `Candidate check-rate delta: **${(report.summary.delta * 100).toFixed(1)} percentage points**.`);
  if (report.summary.gate) {
    lines.push('', '## Gate', '');
    for (const [name, pass] of Object.entries(report.summary.gate)) lines.push(`- ${pass ? 'PASS' : 'FAIL'} — ${name}`);
  }
  lines.push('', '## Scenario outcomes', '');
  for (const outcome of report.outcomes) {
    const failed = outcome.evaluation?.checks.filter((check) => !check.pass).map((check) => check.id).join(', ') || 'none';
    lines.push(`- ${outcome.variant}/${outcome.fixtureId}/rep-${outcome.repetition}: ${outcome.evaluation?.pass ? 'PASS' : 'FAIL'}; failed checks: ${failed}`);
  }
  return `${lines.join('\n')}\n`;
}

const options = parseArgs(process.argv.slice(2));
validateFixtures();
if (options.dryRun) {
  console.log(`A/B dry run: OK (${fixtures.length} fixtures, ${options.variants.join(' vs ')})`);
  process.exit(0);
}

const jobs = [];
for (const variant of options.variants) {
  for (const fixture of fixtures) {
    for (let repetition = 1; repetition <= options.repetitions; repetition++) jobs.push({ variant, fixture, repetition });
  }
}

const startedAt = new Date().toISOString();
const runId = `${startedAt.replace(/[:.]/g, '-')}-ab-v${EVALUATOR_REVISION}-${options.repetitions}x`;
const outcomes = await mapLimit(jobs, options.concurrency, async ({ variant, fixture, repetition }) => {
  const command = await runPi(buildPrompt(fixture, variant), options);
  const response = redact(command.stdout || command.stderr);
  const status = command.timedOut ? 'timed_out' : command.code === 0 ? 'completed' : 'failed';
  return {
    variant,
    fixtureId: fixture.id,
    critical: fixture.critical,
    repetition,
    status,
    exitCode: command.code,
    evaluation: status === 'completed' ? evaluate(fixture, response) : { pass: false, checks: fixture.checks.map((check) => ({ id: check.id, pass: false })) },
    response,
  };
});

const report = {
  runId,
  startedAt,
  finishedAt: new Date().toISOString(),
  environment: {
    piVersion: '0.81.1',
    provider: options.provider,
    model: options.model,
    repetitions: options.repetitions,
    evaluatorRevision: EVALUATOR_REVISION,
    fixtureSha256: sha256(JSON.stringify(fixtures)),
    baselinePromptSha256: sha256(baselineProcedure),
    candidateAdditionsSha256: sha256(candidateAdditions),
  },
  summary: summarize(outcomes),
  outcomes,
};
const runDir = join(options.output, runId);
mkdirSync(runDir, { recursive: true });
writeFileSync(join(runDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(join(runDir, 'report.md'), markdownReport(report));
console.log(markdownReport(report));
console.log(`Evidence: ${relative(REPO_ROOT, runDir)}`);
if (report.summary.gate && Object.values(report.summary.gate).some((pass) => !pass)) process.exitCode = 1;
