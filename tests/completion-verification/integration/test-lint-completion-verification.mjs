#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

function writeFile(projectDir, filename, body) {
  writeFileSync(join(projectDir, filename), body.trimStart());
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

function scenarioMetadataIgnoresLaterTables() {
  console.log("\nScenario 4: ADR metadata ignores later content tables");
  const dir = createTempProject();

  try {
    writeAdr(
      dir,
      "ADR-0004-metadata-table.md",
      `
# ADR Metadata Table

| Field | Value |
|---|---|
| Date | 2026-05-16 |
| Status | Draft |
| Category | governance |
| Area | lint |
| Summary | ADR with later tables that reuse metadata-like labels |

## Impacts

| Area | Impact |
|---|---|
| Wiki | Updated |
| Docs | Updated |
`,
    );

    const result = runLint(dir);
    const index = readFileSync(join(dir, "decisions", "DECISIONS_INDEX.md"), "utf8");

    assert("lint exits without errors", result.status === 0, `expected exit 0, got ${result.status}\n${result.stdout}\n${result.stderr}`);
    assert("ADR index uses opening Area metadata", index.includes("### governance / lint"), index);
    assert("ADR index ignores later Area table", !index.includes("### governance / Impact"), index);
  } finally {
    cleanup(dir);
  }
}

function scenarioLocalizedTemplatesAndIndexesWork() {
  console.log("\nScenario 5: localized templates and configured indexes work");
  const dir = mkdtempSync(join(tmpdir(), "pom-localized-test-"));

  try {
    execFileSync("ln", ["-s", POM_ROOT, join(dir, "pom")]);
    mkdirSync(join(dir, "project-templates"), { recursive: true });
    mkdirSync(join(dir, "decisions"), { recursive: true });
    mkdirSync(join(dir, "tasks", "area", "P0"), { recursive: true });
    mkdirSync(join(dir, "analysis", "topic"), { recursive: true });
    mkdirSync(join(dir, "docs"), { recursive: true });

    writeFile(
      dir,
      "pom.config.json",
      JSON.stringify(
        {
          ownership: { mode: "owned" },
          adoption: {
            profile: "custom",
            wiki: "disabled",
            decisions: "enabled",
            analysis: "enabled",
            docs: "enabled",
            mockups: "disabled",
            planning: "structured",
            tasks: "structured",
            tests: "disabled",
          },
          root: { allowedMarkdown: ["README.md"] },
          templates: {
            adr: "project-templates/ADR_TEMPLATE_IT.md",
            taskPlan: "project-templates/TASK_PLAN_TEMPLATE_IT.md",
            doc: "project-templates/DOC_TEMPLATE_IT.md",
          },
          analysis: {
            root: "analysis",
            allowedDirs: [],
            allowMarkdownAtRoot: false,
            indexPath: "analysis/ANALYSIS_INDEX.md",
          },
          documentation: {
            officialRoot: "docs",
            existingRoots: [],
            knownRootCandidates: ["docs"],
            preferExistingStructure: true,
            requireApprovalBeforeMigratingDocs: true,
            severity: "warning",
          },
          source: {
            roots: [],
            knownRootCandidates: [],
            preferExistingStructure: true,
            requireApprovalBeforeMigratingSources: true,
            severity: "warning",
          },
          decisions: {
            root: "decisions",
            adrPathPattern: "^decisions/ADR-\\d{4}-.+\\.md$",
            datePattern: "\\| Data \\|\\s*\\d{4}-\\d{2}-\\d{2}\\s*\\|",
            indexPath: "decisions/INDICE_ADR.md",
            categoryField: "Categoria",
            areaField: "Area",
            docsPathsRequiringAdr: [],
            requireTemplateSections: true,
          },
          taskPlans: {
            root: "tasks",
            taskPathPattern: "^tasks/.+\\.md$",
            indexPath: "tasks/TASKS_INDEX.md",
            requireTemplateSections: true,
          },
        },
        null,
        2,
      ) + "\n",
    );

    writeFile(
      dir,
      "project-templates/ADR_TEMPLATE_IT.md",
      `
# ADR-0000 - Titolo Decisione

| Campo | Valore |
|---|---|
| Data | YYYY-MM-DD |
| Stato | Bozza |
| Categoria | governance |
| Area | documentazione |
| Summary | sintesi breve |

## Contesto

Descrivere il problema.

## Decisione

Descrivere la decisione.

## Verifica Di Completamento

### Tesi

Tesi.

### Antitesi

Antitesi confutata.

Motivo eccezione: _nessuna_
`,
    );
    writeFile(
      dir,
      "project-templates/TASK_PLAN_TEMPLATE_IT.md",
      `
# TASK-0000 - Titolo Task

| Campo | Valore |
|---|---|
| Stato | Pianificato |

## Origine

Fonte del lavoro.

## Obiettivo

Descrivere l'obiettivo.

## Verifica

Verifica del task.
`,
    );
    writeFile(
      dir,
      "project-templates/DOC_TEMPLATE_IT.md",
      `
# Titolo Documento

## Scopo

Descrivere lo scopo.

## Fonti

Elencare le fonti.
`,
    );
    writeFile(
      dir,
      "decisions/ADR-0001-scelta-iniziale.md",
      `
# ADR-0001 - Scelta Iniziale

| Campo | Valore |
|---|---|
| Data | 2026-05-16 |
| Stato | Accettata |
| Categoria | governance |
| Area | documentazione |
| Summary | decisione di prova con template italiano |

## Contesto

Contesto della decisione.

## Decisione

Decisione di prova.

## Verifica Di Completamento

### Tesi

La decisione e valida per il caso di prova.

### Antitesi

La decisione potrebbe non essere indicizzabile.

Confutazione: il lint genera l'indice ADR dai metadati iniziali.

Motivo eccezione: _nessuna_
`,
    );
    writeFile(
      dir,
      "tasks/area/P0/TASK-0001-prova.md",
      `
# TASK-0001 - Prova

| Campo | Valore |
|---|---|
| Stato | Pianificato |

## Origine

Specifica di prova.

## Obiettivo

Verificare che il template tradotto venga letto dal lint.

## Verifica

Controllare che non manchino sezioni richieste.
`,
    );
    writeFile(
      dir,
      "docs/manuale.md",
      `
# Manuale

## Scopo

Documento di prova.

## Fonti

- Fonte di prova.
`,
    );
    writeFile(dir, "analysis/topic/nota.md", "# Nota Di Analisi\n\nContenuto minimo della nota di analisi.\n");

    const result = runLint(dir);
    const adrIndex = readFileSync(join(dir, "decisions", "INDICE_ADR.md"), "utf8");
    const taskIndex = readFileSync(join(dir, "tasks", "TASKS_INDEX.md"), "utf8");
    const analysisIndex = readFileSync(join(dir, "analysis", "ANALYSIS_INDEX.md"), "utf8");

    assert("lint exits without errors", result.status === 0, `expected exit 0, got ${result.status}\n${result.stdout}\n${result.stderr}`);
    assert("localized ADR sections are accepted", !result.stdout.includes("adr-required-section"), result.stdout);
    assert("localized task sections are accepted", !result.stdout.includes("task-required-section"), result.stdout);
    assert("localized docs sections are accepted", !result.stdout.includes("docs-sources"), result.stdout);
    assert("generated analysis index is allowed at analysis root", !result.stdout.includes("analysis-root-file"), result.stdout);
    assert("ADR index uses localized metadata fields", adrIndex.includes("### governance / documentazione"), adrIndex);
    assert("task index links localized task", taskIndex.includes("area/P0/TASK-0001-prova.md"), taskIndex);
    assert("analysis index links analysis note", analysisIndex.includes("topic/nota.md"), analysisIndex);
  } finally {
    cleanup(dir);
  }
}

console.log("Completion Verification Lint Tests");
console.log("==================================");

scenarioMissingVerificationWarns();
scenarioValidVerificationDoesNotWarn();
scenarioExceptionReasonWarns();
scenarioMetadataIgnoresLaterTables();
scenarioLocalizedTemplatesAndIndexesWork();

console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}

if (!existsSync(join(POM_ROOT, "scripts", "lint-doc-governance.ts"))) {
  process.exit(1);
}
