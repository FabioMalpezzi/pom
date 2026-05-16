#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const POM_ROOT = process.cwd();

let passed = 0;
let failed = 0;

function createTempProject() {
  const dir = mkdtempSync(join(tmpdir(), "pom-completion-test-"));
  execFileSync("ln", ["-s", POM_ROOT, join(dir, "pom")]);
  execFileSync("git", ["init"], { cwd: dir, stdio: "ignore" });
  writeFileSync(join(dir, "package.json"), JSON.stringify({ type: "module" }, null, 2) + "\n");
  writeFileSync(
    join(dir, "pom.config.json"),
    JSON.stringify(
      {
        root: {
          allowedMarkdown: ["README.md"],
        },
        adoption: {
          profile: "decisions",
          wiki: "disabled",
          decisions: "enabled",
          analysis: "optional",
          docs: "optional",
          mockups: "disabled",
          planning: "light",
          tasks: "light",
          tests: "disabled",
        },
        decisions: {
          root: "decisions",
          adrPathPattern: "^decisions/ADR-\\d{4}-.+\\.md$",
          datePattern: "\\| Date \\|\\s*\\d{4}-\\d{2}-\\d{2}\\s*\\|",
          indexPath: "decisions/DECISIONS_INDEX.md",
          categoryField: "Category",
          areaField: "Area",
          docsPathsRequiringAdr: [],
          requireTemplateSections: false,
        },
        tests: {
          root: "tests",
          areas: [],
          recommendedLayout: ["e2e", "integration", "fixtures", "evidence"],
          crossSystemDir: "cross-system",
          preferExistingStructure: true,
          requireApprovalBeforeMigratingExistingTests: true,
          severity: "warning",
        },
      },
      null,
      2,
    ) + "\n",
  );
  execFileSync("mkdir", ["-p", "decisions"], { cwd: dir });
  return dir;
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

function runLint(projectDir) {
  return spawnSync("node", ["--experimental-strip-types", "pom/scripts/lint-doc-governance.ts"], {
    cwd: projectDir,
    encoding: "utf8",
  });
}

function writeAdr(projectDir, filename, body) {
  writeFileSync(join(projectDir, "decisions", filename), body.trimStart());
}

function assert(name, condition, detail) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name} - ${detail}`);
    failed++;
  }
}

function scenarioMissingVerificationWarns() {
  console.log("\nScenario 1: accepted ADR without completion verification warns");
  const dir = createTempProject();

  try {
    writeAdr(
      dir,
      "ADR-0001-missing-verification.md",
      `
# ADR Missing Verification

| Field | Value |
|---|---|
| Date | 2026-05-16 |
| Status | Accepted |
| Category | governance |
| Area | lint |
| Summary | Accepted decision without a completion verification section |
`,
    );

    const result = runLint(dir);

    assert("lint exits with warnings only", result.status === 0, `expected exit 0, got ${result.status}\n${result.stdout}\n${result.stderr}`);
    assert("missing verification warning emitted", result.stdout.includes("completion-verification-missing"), result.stdout);
  } finally {
    cleanup(dir);
  }
}

function scenarioValidVerificationDoesNotWarn() {
  console.log("\nScenario 2: accepted ADR with thesis and antithesis is accepted");
  const dir = createTempProject();

  try {
    writeAdr(
      dir,
      "ADR-0002-valid-verification.md",
      `
# ADR Valid Verification

| Field | Value |
|---|---|
| Date | 2026-05-16 |
| Status | Accepted |
| Category | governance |
| Area | lint |
| Summary | Accepted decision with semantic validation |

## Completion Verification

### Step 0 - Goal-backward

What must be true: the decision is represented with evidence and a rejected alternative.

### Thesis

The decision is valid because the governed document carries the needed rationale.

### Antithesis

The decision could be treated as informal prose.

Confutation: informal prose would not be discoverable by governance checks.

### Exception

Exception reason: _none_
`,
    );

    const result = runLint(dir);

    assert("lint exits without warnings", result.status === 0, `expected exit 0, got ${result.status}\n${result.stdout}\n${result.stderr}`);
    assert("no completion verification warning emitted", !result.stdout.includes("completion-verification-"), result.stdout);
  } finally {
    cleanup(dir);
  }
}

function scenarioExceptionReasonWarns() {
  console.log("\nScenario 3: accepted ADR with exception reason warns");
  const dir = createTempProject();

  try {
    writeAdr(
      dir,
      "ADR-0003-exception-verification.md",
      `
# ADR Exception Verification

| Field | Value |
|---|---|
| Date | 2026-05-16 |
| Status | Accepted with exceptions |
| Category | governance |
| Area | lint |
| Summary | Accepted decision with an explicit exception |

## Completion Verification

Exception reason: external evidence is not available in this repository.
`,
    );

    const result = runLint(dir);

    assert("lint exits with warnings only", result.status === 0, `expected exit 0, got ${result.status}\n${result.stdout}\n${result.stderr}`);
    assert("exception warning emitted", result.stdout.includes("completion-verification-exception"), result.stdout);
  } finally {
    cleanup(dir);
  }
}

console.log("Completion Verification Lint Tests");
console.log("==================================");

scenarioMissingVerificationWarns();
scenarioValidVerificationDoesNotWarn();
scenarioExceptionReasonWarns();

console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}

if (!existsSync(join(POM_ROOT, "scripts", "lint-doc-governance.ts"))) {
  process.exit(1);
}
