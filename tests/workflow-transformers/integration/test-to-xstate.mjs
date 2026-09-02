#!/usr/bin/env node

// Integration test for scripts/to-xstate.mjs: the POM workflow / pipeline
// YAML -> XState v5 MachineConfig JSON transformer. The contract lives in
// docs/workflow-xstate-compatibility.md.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import yaml from "../../../scripts/require-yaml.mjs";

import { createHarness, makeSandbox, removeSandbox, runNode } from "../../lib/harness.mjs";

const POM_ROOT = process.cwd();
const SCRIPT = join("scripts", "to-xstate.mjs");

const WORKFLOW_INPUTS = [
  join("templates", "WORKFLOW_TEMPLATE.yaml"),
  join("templates", "examples", "workflow", "document-approval.yaml"),
  join("templates", "examples", "workflow", "spec-evolution.yaml"),
  join("templates", "examples", "workflow", "ticket-lifecycle.yaml"),
];
const PIPELINE_INPUT = join("templates", "PIPELINE_TEMPLATE.yaml");

const { assert, section, banner, summary } = createHarness({ name: "Workflow Transformers: to-xstate Tests" });

function runToXstate(args, options = {}) {
  return runNode([SCRIPT, ...args], { cwd: POM_ROOT, ...options });
}

function loadYaml(relativePath) {
  return yaml.load(readFileSync(join(POM_ROOT, relativePath), "utf8"));
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function srcName(workflowPath) {
  return basename(workflowPath).replace(/\.ya?ml$/, "").replace(/[^A-Za-z0-9_]/g, "_");
}

// A transition target in the generated `on` map can be a string, an object,
// or an array of those when several transitions share (from, event).
function onTargets(onEntry) {
  const entries = Array.isArray(onEntry) ? onEntry : [onEntry];
  return entries.map((entry) => (typeof entry === "string" ? entry : entry?.target));
}

function scenarioWorkflow(relativePath) {
  section(`Scenario: workflow ${relativePath}`);
  const model = loadYaml(relativePath);
  const result = runToXstate([relativePath]);

  assert("exit code is 0", result.status === 0, `status=${result.status} stderr=${result.stderr}`);
  const machine = parseJson(result.stdout);
  assert("stdout is parsable JSON", machine !== undefined, result.stdout.slice(0, 200));
  if (!machine) return;

  assert("id matches `workflow`", machine.id === model.workflow, `id=${machine.id}`);
  assert("initial matches `initial_state`", machine.initial === model.initial_state, `initial=${machine.initial}`);

  const declared = model.states.map((s) => s.name);
  const eventInvokes = (model.transitions ?? []).filter((t) => t.invoke && typeof t.invoke === "object");
  const expectedCount = declared.length + eventInvokes.length;
  const generated = Object.keys(machine.states);
  assert(
    `state count is ${expectedCount} (${declared.length} declared + ${eventInvokes.length} synthetic)`,
    generated.length === expectedCount,
    `generated=${generated.join(",")}`,
  );
  assert(
    "every declared state is a key under states",
    declared.every((name) => name in machine.states),
    declared.filter((name) => !(name in machine.states)).join(","),
  );
  assert("initial state exists in states", machine.initial in machine.states, machine.initial);

  for (const t of eventInvokes) {
    const synthetic = `__invoking_${t.event}_from_${t.from}`;
    assert(
      `event-invoke ${t.from}/${t.event} produces synthetic state ${synthetic}`,
      machine.states[synthetic]?.meta?.pom?.synthetic_event_invoke === true &&
        machine.states[synthetic]?.invoke?.src === srcName(t.invoke.workflow),
      JSON.stringify(machine.states[synthetic]),
    );
  }

  const pureFinals = model.states.filter((s) => s.is_final === true && s.re_entry_allowed !== true);
  assert(
    "pure terminal states are type final",
    pureFinals.every((s) => machine.states[s.name].type === "final"),
    pureFinals.map((s) => `${s.name}:${machine.states[s.name].type}`).join(","),
  );
  const reEntry = model.states.filter((s) => s.is_final === true && s.re_entry_allowed === true);
  assert(
    "re-entry terminals are not final and keep meta.pom.re_entry_allowed",
    reEntry.every((s) => machine.states[s.name].type !== "final" && machine.states[s.name].meta?.pom?.re_entry_allowed === true),
    reEntry.map((s) => JSON.stringify(machine.states[s.name])).join(","),
  );

  const plain = (model.transitions ?? []).filter((t) => !t.invoke && t.to);
  const missing = plain.filter((t) => !onTargets(machine.states[t.from]?.on?.[t.event]).includes(t.to));
  assert(
    `all ${plain.length} plain transitions are reachable under states[from].on[event]`,
    missing.length === 0,
    missing.map((t) => `${t.from}-${t.event}->${t.to}`).join(","),
  );

  const guarded = plain.filter((t) => typeof t.guard === "string" && t.guard.trim());
  const guardMissing = guarded.filter((t) => {
    const entries = machine.states[t.from]?.on?.[t.event];
    const list = Array.isArray(entries) ? entries : [entries];
    return !list.some((e) => typeof e === "object" && e?.target === t.to && e?.guard === t.guard);
  });
  assert("guards are carried on transition objects", guardMissing.length === 0, guardMissing.map((t) => t.guard).join(","));

  const eventNames = (model.events ?? []).map((e) => e.name);
  assert(
    "meta.pom.events lists the declared events",
    eventNames.length === 0 || (machine.meta?.pom?.events ?? []).map((e) => e.name).join(",") === eventNames.join(","),
    JSON.stringify(machine.meta?.pom?.events),
  );
  const guardNames = (model.guards ?? []).map((g) => g.name);
  assert(
    "meta.pom.guards lists the declared guards",
    guardNames.length === 0 || (machine.meta?.pom?.guards ?? []).map((g) => g.name).join(",") === guardNames.join(","),
    JSON.stringify(machine.meta?.pom?.guards),
  );
  if (model.version !== undefined) {
    assert("meta.pom.version preserves `version`", machine.meta?.pom?.version === model.version, String(machine.meta?.pom?.version));
  }
}

function scenarioPipeline() {
  section(`Scenario: pipeline ${PIPELINE_INPUT}`);
  const model = loadYaml(PIPELINE_INPUT);
  const result = runToXstate([PIPELINE_INPUT]);

  assert("exit code is 0", result.status === 0, `status=${result.status} stderr=${result.stderr}`);
  const machine = parseJson(result.stdout);
  assert("stdout is parsable JSON", machine !== undefined, result.stdout.slice(0, 200));
  if (!machine) return;

  assert("id matches `pipeline`", machine.id === model.pipeline, machine.id);
  assert("meta.pom.kind is pipeline", machine.meta?.pom?.kind === "pipeline", JSON.stringify(machine.meta));

  const memberStates = model.sequence.map((m, i) => `__member_${i}_${srcName(m.workflow)}`);
  assert("initial is the first member state", machine.initial === memberStates[0], machine.initial);
  assert(
    `state count is ${model.sequence.length + 1} (members + __pipeline_completed)`,
    Object.keys(machine.states).length === model.sequence.length + 1,
    Object.keys(machine.states).join(","),
  );
  assert(
    "every member has a state invoking its workflow",
    memberStates.every((name, i) => machine.states[name]?.invoke?.src === srcName(model.sequence[i].workflow)),
    JSON.stringify(machine.states),
  );
  assert("__pipeline_completed is final", machine.states.__pipeline_completed?.type === "final", JSON.stringify(machine.states.__pipeline_completed));

  const nextTargetsOk = model.sequence.every((m, i) =>
    (m.completes_on ?? []).every((c) => {
      const branch = machine.states[memberStates[i]].invoke.onDone.find((b) => b.guard === `_terminal_eq_${c.state}`);
      if (!branch) return false;
      if (c.next == null) return branch.target === "__pipeline_completed";
      const nextIdx = model.sequence.findIndex((other) => other.workflow === c.next);
      return branch.target === memberStates[nextIdx];
    }),
  );
  assert("completes_on entries map to onDone branches keyed by terminal state", nextTargetsOk, JSON.stringify(machine.states));
  assert(
    "meta.pom.member_paths preserves the sequence paths",
    JSON.stringify(machine.meta?.pom?.member_paths) === JSON.stringify(model.sequence.map((m) => m.workflow)),
    JSON.stringify(machine.meta?.pom?.member_paths),
  );
}

// The shipped templates only carry a state-invoke; a synthetic fixture
// exercises the event-invoke rewrite, assign/raise actions and invoke input.
const SYNTHETIC_WORKFLOW = `workflow: synthetic_invokes
version: 3
initial_state: start
states:
  - name: start
  - name: hosting
    invoke:
      workflow: children/child-a.yaml
      input:
        amount: order.total
      on_completion:
        - terminal_state: ok
          next_event: child_ok
        - terminal_state: ko
          next_event: child_ko
  - name: done
    is_final: true
  - name: failed
    is_final: true
    re_entry_allowed: true
events:
  - name: go
  - name: child_ok
  - name: child_ko
  - name: retry
transitions:
  - from: start
    to: hosting
    event: go
  - from: hosting
    to: done
    event: child_ok
  - from: hosting
    to: failed
    event: child_ko
  - from: failed
    event: retry
    invoke:
      workflow: children/child-b.yaml
      on_completion:
        - terminal_state: fixed
          target: done
          assign:
            fixed_by: child.output
        - terminal_state: unfixed
          target: failed
`;

function scenarioSyntheticInvokes() {
  section("Scenario: synthetic fixture with state-invoke and event-invoke");
  const dir = makeSandbox("pom-to-xstate-synthetic-").dir;
  try {
    const file = join(dir, "synthetic-invokes.yaml");
    writeFileSync(file, SYNTHETIC_WORKFLOW);
    const result = runToXstate([file]);
    assert("exit code is 0", result.status === 0, `status=${result.status} stderr=${result.stderr}`);
    const machine = parseJson(result.stdout);
    if (!machine) {
      assert("stdout is parsable JSON", false, result.stdout.slice(0, 200));
      return;
    }

    const synthetic = "__invoking_retry_from_failed";
    assert("5 states: 4 declared + 1 synthetic", Object.keys(machine.states).length === 5, Object.keys(machine.states).join(","));
    assert("event-invoke source state targets the synthetic state", machine.states.failed?.on?.retry?.target === synthetic, JSON.stringify(machine.states.failed));
    const synth = machine.states[synthetic];
    assert("synthetic state invokes child-b with id invoke_<state>", synth?.invoke?.src === "child_b" && synth?.invoke?.id === `invoke_${synthetic}`, JSON.stringify(synth));
    assert("synthetic state is flagged meta.pom.synthetic_event_invoke", synth?.meta?.pom?.synthetic_event_invoke === true, JSON.stringify(synth?.meta));
    const fixedBranch = synth?.invoke?.onDone?.find((b) => b.guard === "_terminal_eq_fixed");
    assert(
      "on_completion target + assign map to branch.target and actions: assign",
      fixedBranch?.target === "done" && fixedBranch?.actions?.type === "assign" && fixedBranch?.actions?.params?.fixed_by === "child.output",
      JSON.stringify(fixedBranch),
    );
    const unfixedBranch = synth?.invoke?.onDone?.find((b) => b.guard === "_terminal_eq_unfixed");
    assert("on_completion without assign carries only the target", unfixedBranch?.target === "failed" && unfixedBranch?.actions === undefined, JSON.stringify(unfixedBranch));

    const hosting = machine.states.hosting;
    assert("state-invoke keeps invoke.input verbatim", hosting?.invoke?.input?.amount === "order.total", JSON.stringify(hosting?.invoke));
    const okBranch = hosting?.invoke?.onDone?.find((b) => b.guard === "_terminal_eq_ok");
    assert(
      "state-invoke next_event becomes a raise action",
      Array.isArray(okBranch?.actions) && okBranch.actions.some((a) => a.type === "raise" && a.params?.event?.type === "child_ok"),
      JSON.stringify(okBranch),
    );
    assert("state-invoke branches keep the parent transitions under on", machine.states.hosting?.on?.child_ok === "done" && machine.states.hosting?.on?.child_ko === "failed", JSON.stringify(hosting?.on));
    assert("re-entry terminal keeps its outgoing transition and is not final", machine.states.failed?.type !== "final" && machine.states.failed?.meta?.pom?.is_final === true, JSON.stringify(machine.states.failed));
    assert("pure terminal has no on map", machine.states.done?.type === "final" && machine.states.done?.on === undefined, JSON.stringify(machine.states.done));
    assert("meta.pom.version is 3", machine.meta?.pom?.version === 3, JSON.stringify(machine.meta));
  } finally {
    removeSandbox(dir);
  }
}

function scenarioOutFlag() {
  section("Scenario: --out writes the JSON file and reports it");
  const dir = makeSandbox("pom-to-xstate-test-").dir;
  try {
    const out = join(dir, "workflows", "generated", "spec-evolution.xstate.json");
    const result = runToXstate([WORKFLOW_INPUTS[2], "--out", out]);
    assert("exit code is 0", result.status === 0, `status=${result.status} stderr=${result.stderr}`);
    assert("stdout reports Wrote: <path>", result.stdout.includes(`Wrote: ${out}`), result.stdout);
    assert("stdout does not carry the JSON when --out is used", !result.stdout.trimStart().startsWith("{"), result.stdout.slice(0, 80));
    assert("output file exists (parent directory created on demand)", existsSync(out), out);
    if (existsSync(out)) {
      const machine = parseJson(readFileSync(out, "utf8"));
      assert("output file is parsable JSON with the workflow id", machine?.id === "spec_evolution", readFileSync(out, "utf8").slice(0, 120));
    }

    const stdoutResult = runToXstate([WORKFLOW_INPUTS[2]]);
    assert(
      "without --out the same JSON goes to stdout",
      stdoutResult.status === 0 && stdoutResult.stdout === readFileSync(out, "utf8"),
      `status=${stdoutResult.status}`,
    );
  } finally {
    removeSandbox(dir);
  }
}

function scenarioInvalidInputs() {
  section("Scenario: invalid inputs exit non-zero with a clear message");
  const dir = makeSandbox("pom-to-xstate-invalid-").dir;
  try {
    const noArgs = runToXstate([]);
    assert("no arguments exits with 1", noArgs.status === 1, `status=${noArgs.status}`);
    assert("no arguments prints usage on stderr", noArgs.stderr.includes("Usage:") && noArgs.stderr.includes("--out"), noArgs.stderr);
    assert("no arguments prints nothing on stdout", noArgs.stdout === "", noArgs.stdout);

    const missing = runToXstate([join(dir, "does-not-exist.yaml")]);
    assert("missing file exits non-zero", missing.status !== 0, `status=${missing.status}`);
    assert("missing file names the problem", missing.stderr.includes("does not exist"), missing.stderr);

    const scalar = join(dir, "scalar.yaml");
    writeFileSync(scalar, "just a string\n");
    const scalarResult = runToXstate([scalar]);
    assert("scalar YAML root exits non-zero", scalarResult.status !== 0, `status=${scalarResult.status}`);
    assert("scalar YAML root says the root is not a mapping", scalarResult.stderr.includes("not a mapping"), scalarResult.stderr);

    const malformed = join(dir, "malformed.yaml");
    writeFileSync(malformed, "workflow: x\nstates: [\n");
    const malformedResult = runToXstate([malformed]);
    assert("malformed YAML exits non-zero", malformedResult.status !== 0, `status=${malformedResult.status}`);
    assert("malformed YAML reports a parse problem", malformedResult.stderr.includes("Cannot parse YAML"), malformedResult.stderr);

    const incomplete = join(dir, "incomplete.yaml");
    writeFileSync(incomplete, "workflow: broken\nstates:\n  - name: a\n");
    const incompleteResult = runToXstate([incomplete]);
    assert("workflow without initial_state exits non-zero", incompleteResult.status !== 0, `status=${incompleteResult.status}`);
    assert("the message names the missing field", incompleteResult.stderr.includes("initial_state"), incompleteResult.stderr);

    const unknownInitial = join(dir, "unknown-initial.yaml");
    writeFileSync(unknownInitial, "workflow: broken\ninitial_state: nope\nstates:\n  - name: a\n");
    const unknownInitialResult = runToXstate([unknownInitial]);
    assert("initial_state not declared exits non-zero", unknownInitialResult.status !== 0, `status=${unknownInitialResult.status}`);
    assert("the message names the undeclared initial state", unknownInitialResult.stderr.includes("nope"), unknownInitialResult.stderr);

    const badPipeline = join(dir, "bad-pipeline.yaml");
    writeFileSync(badPipeline, "pipeline: p\nsequence: not-a-list\n");
    const badPipelineResult = runToXstate([badPipeline]);
    assert("pipeline with non-list sequence exits non-zero", badPipelineResult.status !== 0, `status=${badPipelineResult.status}`);
    assert("the message names `sequence`", badPipelineResult.stderr.includes("sequence"), badPipelineResult.stderr);

    const unknownOption = runToXstate(["--bogus", WORKFLOW_INPUTS[0]]);
    assert("unknown option exits non-zero", unknownOption.status !== 0, `status=${unknownOption.status}`);
    assert("unknown option is reported", unknownOption.stderr.includes("Unknown option: --bogus"), unknownOption.stderr);
  } finally {
    removeSandbox(dir);
  }
}

banner();

for (const input of WORKFLOW_INPUTS) scenarioWorkflow(input);
scenarioPipeline();
scenarioSyntheticInvokes();
scenarioOutFlag();
scenarioInvalidInputs();

summary();
