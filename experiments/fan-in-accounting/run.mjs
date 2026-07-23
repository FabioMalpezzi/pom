#!/usr/bin/env node
import { runExperiment } from './experiment.mjs';

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const result = await runExperiment({
  count: Number(option('--count', 60)),
  batchSize: Number(option('--batch-size', 20)),
  concurrency: Number(option('--concurrency', 8)),
  scenario: option('--scenario', 'happy'),
  allowPartial: process.argv.includes('--allow-partial'),
});

console.log(JSON.stringify(result, null, 2));
if (!result.report) process.exitCode = 1;
