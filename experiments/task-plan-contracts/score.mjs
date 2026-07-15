#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const options = { input: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--input") options.input = resolve(argv[(i += 1)] || "");
    else if (a === "--json") options.json = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!options.input || !existsSync(options.input)) throw new Error("--input <parent-output-dir> is required and must exist");
  return options;
}

function expectedFor(fixture) {
  return JSON.parse(readFileSync(join(ROOT, "expected", `${fixture}.json`), "utf8"));
}

function collectPlans(dir) {
  const plans = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    for (const entry of readdirSync(cur)) {
      const full = join(cur, entry);
      if (statSync(full).isDirectory()) stack.push(full);
      else if (entry === "meta.json") {
        const meta = JSON.parse(readFileSync(full, "utf8"));
        const planPath = join(dirname(full), "plan.md");
        plans.push({ meta, plan: existsSync(planPath) ? readFileSync(planPath, "utf8") : "" });
      }
    }
  }
  return plans;
}

function anyPresent(text, tokens) {
  const lower = text.toLowerCase();
  return tokens.some((t) => lower.includes(t.toLowerCase()));
}

function countTasks(plan) {
  // Deliverable count = number of sub-task sections. Plans wrap sub-tasks as level-1 headings
  // "# TASK-A" or "# TASK-0001-A" (a trailing letter suffix), under a parent "# TASK-0001".
  // A single-task plan has only the parent and counts as 1. Also accept "# Task A" (space form).
  const ids = new Set();
  for (const m of plan.matchAll(/^#\s+TASK-(?:\d+-)?([A-Z])\b/gim)) ids.add(m[1].toUpperCase());
  for (const m of plan.matchAll(/^#{1,4}\s+Task\s+([A-Z0-9]+)\b/gim)) ids.add(m[1].toUpperCase());
  if (ids.size > 0) return ids.size;
  // No sub-task sections: a single-task plan if it has a TASK-NNNN title, else count headings.
  if (/^#\s+TASK-\d+\b/im.test(plan)) return 1;
  const headings = plan.match(/^#{1,4}\s+(Task|Step)\b.*$/gim) || [];
  return headings.length || (/\bTASK-\d+\b/i.test(plan) ? 1 : 0);
}

function scorePlan(plan, expected) {
  const checks = [];
  const add = (id, ok, detail) => checks.push({ id, ok, detail: detail || null });

  // 1. Exact constraint propagation.
  let constraintsHit = 0;
  for (const c of expected.exactConstraints) {
    const ok = anyPresent(plan, c.anyOf);
    if (ok) constraintsHit += 1;
    add(`constraint:${c.label}`, ok);
  }
  const constraintRate = expected.exactConstraints.length ? constraintsHit / expected.exactConstraints.length : 1;

  // 2. Interface consistency.
  if (expected.interfaceApplicable) {
    const sigHit = expected.interfaceSignatures.filter((s) => plan.includes(s)).length;
    const sigOk = sigHit === expected.interfaceSignatures.length;
    add("interface:signatures-present", sigOk, `${sigHit}/${expected.interfaceSignatures.length}`);
    const drift = (expected.interfaceDriftSignals || []).filter((d) => plan.includes(d));
    add("interface:no-drift", drift.length === 0, drift.join(", ") || null);
    if (expected.orderingSignals) add("interface:ordering-expressed", anyPresent(plan, expected.orderingSignals));
  }

  // 3. not-applicable handling + no fabrication.
  if (expected.mustStateNotApplicable) {
    add("not-applicable-stated", anyPresent(plan, ["not applicable", "n/a", "non applicabile"]));
    const fabricated = (expected.fabricatedInterfaceSignals || []).filter((f) => plan.includes(f));
    if (expected.fabricatedInterfaceSignals) add("no-fabricated-interface", fabricated.length === 0, fabricated.join(", ") || null);
    const frag = (expected.overFragmentationSignals || []).filter((f) => plan.includes(f));
    if (expected.overFragmentationSignals) add("no-over-fragmentation", frag.length === 0, frag.join(", ") || null);
  }

  // 4. Task count within expected range.
  const tasks = countTasks(plan);
  const countOk = tasks >= expected.expectedTaskCount.min && tasks <= expected.expectedTaskCount.max;
  add("task-count", countOk, `got ${tasks}, want ${expected.expectedTaskCount.min}-${expected.expectedTaskCount.max}`);

  // 5. Verification retained.
  if (expected.verificationRequired) {
    add("verification-retained", /verification|goal-backward|scenario test|done criteria|acceptance/i.test(plan));
  }

  const passed = checks.filter((c) => c.ok).length;
  return { checks, passed, total: checks.length, constraintRate, taskCount: tasks };
}

function aggregate(plans, group) {
  // group: {fixture, variant} plans
  const byFixtureVariant = new Map();
  for (const p of plans) {
    const key = `${p.meta.fixture}::${p.meta.variant}`;
    if (!byFixtureVariant.has(key)) byFixtureVariant.set(key, []);
    byFixtureVariant.get(key).push(p);
  }
  const rows = [];
  for (const [key, group] of byFixtureVariant) {
    const [fixture, variant] = key.split("::");
    const expected = expectedFor(fixture);
    const scored = group.map((p) => scorePlan(p.plan, expected));
    const reps = scored.length;
    const mean = (f) => scored.reduce((s, x) => s + f(x), 0) / reps;
    // per-check pass rate
    const checkIds = scored[0]?.checks.map((c) => c.id) || [];
    const checkRates = {};
    for (const id of checkIds) checkRates[id] = scored.filter((s) => s.checks.find((c) => c.id === id)?.ok).length / reps;
    rows.push({
      fixture,
      variant,
      reps,
      meanConstraintRate: Number(mean((s) => s.constraintRate).toFixed(3)),
      meanPassRate: Number(mean((s) => s.passed / s.total).toFixed(3)),
      meanTaskCount: Number(mean((s) => s.taskCount).toFixed(2)),
      checkRates,
    });
  }
  return rows.sort((a, b) => (a.fixture + a.variant).localeCompare(b.fixture + b.variant));
}

function printComparison(rows) {
  const byFixture = new Map();
  for (const r of rows) {
    if (!byFixture.has(r.fixture)) byFixture.set(r.fixture, {});
    byFixture.get(r.fixture)[r.variant] = r;
  }
  console.log("Task Plan contract scoring — baseline vs candidate");
  for (const [fixture, variants] of byFixture) {
    const b = variants.baseline;
    const c = variants.candidate;
    console.log(`\n## ${fixture}`);
    for (const [name, r] of Object.entries(variants)) {
      console.log(`- ${name} (${r.reps} reps): constraint ${r.meanConstraintRate}, overall ${r.meanPassRate}, tasks ${r.meanTaskCount}`);
    }
    if (b && c) {
      const ids = new Set([...Object.keys(b.checkRates), ...Object.keys(c.checkRates)]);
      for (const id of ids) {
        const bv = b.checkRates[id] ?? 0;
        const cv = c.checkRates[id] ?? 0;
        if (bv !== cv) console.log(`    ${cv > bv ? "+" : "-"} ${id}: baseline ${bv} -> candidate ${cv}`);
      }
    }
  }
}

const options = parseArgs(process.argv.slice(2));
const plans = collectPlans(options.input);
if (plans.length === 0) throw new Error(`No generated plans under ${options.input}`);
const rows = aggregate(plans);
const report = { generatedFrom: plans.length, rows };
writeFileSync(join(options.input, "score.json"), `${JSON.stringify(report, null, 2)}\n`);
if (options.json) console.log(JSON.stringify(report, null, 2));
else {
  printComparison(rows);
  console.log(`\n- machine-readable: ${join(options.input, "score.json")}`);
}
