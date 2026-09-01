#!/usr/bin/env node

// Integration test for scripts/to-mermaid.mjs (CLI) and scripts/mermaid.mjs
// (shared renderer): POM workflow / pipeline YAML -> Mermaid stateDiagram-v2.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import yaml from "../../../scripts/require-yaml.mjs";
import { renderModelMermaid, renderPipelineMermaid, renderWorkflowMermaid } from "../../../scripts/mermaid.mjs";

const POM_ROOT = process.cwd();
const SCRIPT = join("scripts", "to-mermaid.mjs");

const WORKFLOW_INPUTS = [
  join("templates", "WORKFLOW_TEMPLATE.yaml"),
  join("templates", "examples", "workflow", "document-approval.yaml"),
  join("templates", "examples", "workflow", "spec-evolution.yaml"),
  join("templates", "examples", "workflow", "ticket-lifecycle.yaml"),
];
const PIPELINE_INPUT = join("templates", "PIPELINE_TEMPLATE.yaml");

let passed = 0;
let failed = 0;

function assert(name, condition, detail) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name} - ${detail}`);
    failed++;
  }
}

function runToMermaid(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: POM_ROOT, encoding: "utf8" });
}

function loadYaml(relativePath) {
  return yaml.load(readFileSync(join(POM_ROOT, relativePath), "utf8"));
}

function memberKey(workflowPath) {
  return basename(workflowPath).replace(/\.ya?ml$/, "").replace(/[^A-Za-z0-9_]/g, "_");
}

function scenarioWorkflow(relativePath) {
  console.log(`\nScenario: workflow ${relativePath}`);
  const model = loadYaml(relativePath);
  const result = runToMermaid([relativePath]);

  assert("exit code is 0", result.status === 0, `status=${result.status} stderr=${result.stderr}`);
  const text = result.stdout;
  assert("output starts with stateDiagram-v2", text.startsWith("stateDiagram-v2\n"), text.slice(0, 40));
  assert("output declares direction LR", text.includes("  direction LR"), text.slice(0, 80));
  assert("header comment names the workflow id", text.includes(`%% Workflow: ${model.workflow}`), text.slice(0, 200));
  assert("initial arrow points to initial_state", text.includes(`[*] --> ${model.initial_state}`), text);

  // Pure terminals are rendered as `[*]`, so only non-terminal and re-entry
  // states are declared with a `state "Title" as id` line.
  const isPureTerminal = (s) => s.is_final === true && s.re_entry_allowed !== true;
  const declared = model.states.filter((s) => !isPureTerminal(s));
  const undeclared = declared.filter((s) => !new RegExp(`^  state ".*" as ${s.name}$`, "m").test(text));
  assert(
    `all ${declared.length} non-terminal or re-entry states are declared`,
    undeclared.length === 0,
    undeclared.map((s) => s.name).join(","),
  );
  const pureTerminals = model.states.filter(isPureTerminal);
  assert(
    "pure terminal states are not declared as nodes",
    pureTerminals.every((s) => !text.includes(` as ${s.name}\n`)),
    pureTerminals.map((s) => s.name).join(","),
  );

  const terminalNames = new Set(pureTerminals.map((s) => s.name));
  const plain = (model.transitions ?? []).filter((t) => !t.invoke && t.to);
  const missing = plain.filter((t) => {
    const target = terminalNames.has(t.to) ? "[*]" : t.to;
    return !text.includes(`  ${t.from} --> ${target} : ${t.event}`);
  });
  assert(`all ${plain.length} plain transitions are drawn`, missing.length === 0, missing.map((t) => `${t.from}-${t.event}`).join(","));

  const guarded = plain.filter((t) => typeof t.guard === "string" && t.guard.trim());
  const guardMissing = guarded.filter((t) => !text.includes(`${t.event}\\n[${t.guard}]`));
  assert("guards appear in transition labels", guardMissing.length === 0, guardMissing.map((t) => t.guard).join(","));

  const eventInvokes = (model.transitions ?? []).filter((t) => t.invoke && typeof t.invoke === "object");
  for (const t of eventInvokes) {
    const child = memberKey(t.invoke.workflow);
    assert(
      `event-invoke ${t.from}/${t.event} draws one arrow per child terminal of ${child}`,
      (t.invoke.on_completion ?? []).every((c) => text.includes(`: ${t.event}\\n↪ ${child}: ${c.terminal_state}`)),
      text,
    );
  }
  const stateInvokes = model.states.filter((s) => s.invoke && typeof s.invoke === "object");
  for (const s of stateInvokes) {
    assert(
      `state-invoke on ${s.name} gets a note naming the child`,
      text.includes(`note right of ${s.name}`) && text.includes(`invokes ${memberKey(s.invoke.workflow)}`),
      text,
    );
  }

  assert(
    "renderWorkflowMermaid() returns the same text as the CLI",
    renderWorkflowMermaid(model) === text && renderModelMermaid(model) === text,
    "renderer output differs from CLI stdout",
  );
}

function scenarioPipeline() {
  console.log(`\nScenario: pipeline ${PIPELINE_INPUT}`);
  const model = loadYaml(PIPELINE_INPUT);
  const result = runToMermaid([PIPELINE_INPUT]);

  assert("exit code is 0", result.status === 0, `status=${result.status} stderr=${result.stderr}`);
  const text = result.stdout;
  assert("output starts with stateDiagram-v2", text.startsWith("stateDiagram-v2\n"), text.slice(0, 40));
  assert("header comment names the pipeline id", text.includes(`%% Pipeline: ${model.pipeline}`), text.slice(0, 200));

  const ids = model.sequence.map((m) => memberKey(m.workflow));
  assert("every member is declared with its short id", ids.every((id) => text.includes(` as ${id}\n`)), text);
  assert("initial arrow points to the first member", text.includes(`[*] --> ${ids[0]}`), text);

  const edgesOk = model.sequence.every((m) =>
    (m.completes_on ?? []).every((c) => {
      const from = memberKey(m.workflow);
      const to = c.next == null ? "[*]" : memberKey(c.next);
      return text.includes(`  ${from} --> ${to} : ${c.state}`);
    }),
  );
  assert("every completes_on entry is drawn as an edge labeled by terminal state", edgesOk, text);
  assert(
    "renderPipelineMermaid() returns the same text as the CLI",
    renderPipelineMermaid(model) === text && renderModelMermaid(model) === text,
    "renderer output differs from CLI stdout",
  );
}

// The shipped templates carry no event-invoke; a synthetic fixture covers
// the one-arrow-per-child-terminal rendering and the re-entry note.
const SYNTHETIC_WORKFLOW = `workflow: synthetic_invokes
initial_state: start
states:
  - name: start
  - name: done
    is_final: true
  - name: failed
    is_final: true
    re_entry_allowed: true
transitions:
  - from: start
    to: failed
    event: fail
  - from: failed
    event: retry
    invoke:
      workflow: children/child-b.yaml
      on_completion:
        - terminal_state: fixed
          target: done
        - terminal_state: unfixed
          target: failed
`;

function scenarioSyntheticInvokes() {
  console.log("\nScenario: synthetic fixture with event-invoke and re-entry terminal");
  const dir = mkdtempSync(join(tmpdir(), "pom-to-mermaid-synthetic-"));
  try {
    const file = join(dir, "synthetic-invokes.yaml");
    writeFileSync(file, SYNTHETIC_WORKFLOW);
    const result = runToMermaid([file]);
    assert("exit code is 0", result.status === 0, `status=${result.status} stderr=${result.stderr}`);
    const text = result.stdout;
    assert("event-invoke arrow to a pure terminal goes to [*] with the child terminal", text.includes("  failed --> [*] : retry\\n↪ child_b: fixed"), text);
    assert("event-invoke arrow back to the re-entry terminal keeps its name", text.includes("  failed --> failed : retry\\n↪ child_b: unfixed"), text);
    assert("re-entry terminal is declared with the ⤴ marker", text.includes('state "Failed ⤴" as failed'), text);
    assert("re-entry terminal gets the documented re-entry note", text.includes("note right of failed") && text.includes("terminal with documented re-entry"), text);
    assert("pure terminal is not declared", !text.includes(" as done\n"), text);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function scenarioOutFlag() {
  console.log("\nScenario: --out writes the .mmd file");
  const dir = mkdtempSync(join(tmpdir(), "pom-to-mermaid-test-"));
  try {
    const out = join(dir, "spec-evolution.mmd");
    const result = runToMermaid([WORKFLOW_INPUTS[2], "--out", out]);
    assert("exit code is 0", result.status === 0, `status=${result.status} stderr=${result.stderr}`);
    assert("stdout reports Wrote: <path>", result.stdout.includes(`Wrote: ${out}`), result.stdout);
    assert("file exists", existsSync(out), out);
    if (existsSync(out)) {
      const written = readFileSync(out, "utf8");
      const direct = runToMermaid([WORKFLOW_INPUTS[2]]).stdout;
      assert("file content equals the stdout rendering", written === direct && written.startsWith("stateDiagram-v2"), written.slice(0, 80));
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function scenarioInvalidInputs() {
  console.log("\nScenario: invalid inputs exit non-zero");
  const dir = mkdtempSync(join(tmpdir(), "pom-to-mermaid-invalid-"));
  try {
    const noArgs = runToMermaid([]);
    assert("no arguments exits non-zero", noArgs.status !== 0, `status=${noArgs.status}`);
    assert("no arguments prints usage on stderr", noArgs.stderr.includes("Usage:"), noArgs.stderr);

    const missing = runToMermaid([join(dir, "does-not-exist.yaml")]);
    assert("missing file exits non-zero", missing.status !== 0, `status=${missing.status}`);

    const scalar = join(dir, "scalar.yaml");
    writeFileSync(scalar, "just a string\n");
    const scalarResult = runToMermaid([scalar]);
    assert("scalar YAML root exits non-zero", scalarResult.status !== 0, `status=${scalarResult.status}`);
    assert("scalar YAML root says the root is not a mapping", scalarResult.stderr.includes("not a mapping"), scalarResult.stderr);

    const malformed = join(dir, "malformed.yaml");
    writeFileSync(malformed, "workflow: x\nstates: [\n");
    const malformedResult = runToMermaid([malformed]);
    assert("malformed YAML exits non-zero", malformedResult.status !== 0, `status=${malformedResult.status}`);

    const unknownOption = runToMermaid(["--bogus", WORKFLOW_INPUTS[0]]);
    assert("unknown option exits non-zero", unknownOption.status !== 0, `status=${unknownOption.status}`);
    assert("unknown option is reported", unknownOption.stderr.includes("Unknown option: --bogus"), unknownOption.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log("Workflow Transformers: to-mermaid Tests");
console.log("=======================================");

for (const input of WORKFLOW_INPUTS) scenarioWorkflow(input);
scenarioPipeline();
scenarioSyntheticInvokes();
scenarioOutFlag();
scenarioInvalidInputs();

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
