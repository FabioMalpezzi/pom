#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const POM_ROOT = process.cwd();

let passed = 0;
let failed = 0;

function assert(name, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}${detail ? ` - ${detail}` : ""}`);
    failed++;
  }
}

function createTempProject() {
  const dir = mkdtempSync(join(tmpdir(), "pom-project-reader-test-"));
  for (const path of ["doc/generated", "adr", "tasks", "src", "wiki"]) {
    mkdirSync(join(dir, path), { recursive: true });
  }
  writeFileSync(join(dir, "pom.config.json"), `${JSON.stringify({
    documentation: { existingRoots: ["doc"] },
    decisions: { root: "adr" },
    taskPlans: { root: "tasks" },
    source: { roots: ["src"] },
    artifactPolicy: { generated: ["doc/generated/**"] },
  }, null, 2)}\n`);
  writeFileSync(join(dir, "doc", "manual.md"), `# Manual

## Summary

Reader test document.

| Item | Count |
| --- | ---: |
| ok | 7 |

\`\`\`ts
export const value = 7;
\`\`\`
`);
  writeFileSync(join(dir, "doc", "generated", "out.md"), "# Generated\n\nGENERATED_ONLY\n");
  writeFileSync(join(dir, "adr", "ADR-0001-test.md"), "# Decision\n\nA decision.\n");
  writeFileSync(join(dir, "tasks", "P0-test.md"), "# Task\n\nA task.\n");
  writeFileSync(join(dir, "src", "app.ts"), "export function answer() { return 42; }\n");
  writeFileSync(join(dir, "src", "huge.ts"), `${"x".repeat(1_000_001)}\n`);
  writeFileSync(join(dir, "src", "binary.ts"), Buffer.from([0, 1, 2, 3, 4]));
  writeFileSync(join(dir, "wiki", "log.md"), "# Log\n\nWIKI_LOG_ONLY\n");
  return dir;
}

function cleanup(dir, child) {
  if (child && !child.killed) child.kill("SIGTERM");
  rmSync(dir, { recursive: true, force: true });
}

function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolvePort(port));
    });
  });
}

async function startReader(projectDir, port) {
  const child = spawn(process.execPath, [
    "experiments/wiki-agent-orchestration/mini-ui/server.mjs",
    "--port",
    String(port),
    "--root",
    projectDir,
    "--annotations-dir",
    ".pom-reader/annotations",
  ], {
    cwd: POM_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/status`);
      if (response.ok) return child;
    } catch {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
    }
  }
  child.kill("SIGTERM");
  throw new Error(`Project Reader did not start:\n${output}`);
}

async function request(port, path, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, options);
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // Some checks intentionally read HTML or plain text.
  }
  return { response, text, json };
}

async function scenarioDocumentsAndSecurity() {
  console.log("\nScenario 1: reader classifies documents and applies local safety guards");
  const dir = createTempProject();
  const port = await freePort();
  let child = null;

  try {
    child = await startReader(dir, port);
    const home = await request(port, "/");
    const status = await request(port, "/api/status");
    const documents = await request(port, "/api/documents");
    const manual = await request(port, "/api/document?path=doc%2Fmanual.md");
    const huge = await request(port, "/api/document?path=src%2Fhuge.ts");
    const binary = await request(port, "/api/document?path=src%2Fbinary.ts");
    const generatedSearch = await request(port, "/api/search?q=GENERATED_ONLY&kind=project_doc");
    const wikiLogSearch = await request(port, "/api/search?q=WIKI_LOG_ONLY&kind=wiki");

    const paths = documents.json.map((doc) => doc.path);
    const byPath = new Map(documents.json.map((doc) => [doc.path, doc.kind]));

    assert("CSP header is present", home.response.headers.get("content-security-policy")?.includes("frame-ancestors 'none'"), home.text);
    assert("nosniff header is present", home.response.headers.get("x-content-type-options") === "nosniff", home.text);
    assert("status reports pom.config.json mode", status.json.documentSources.mode === "pom.config.json", JSON.stringify(status.json));
    assert("configured documentation is classified", byPath.get("doc/manual.md") === "project_doc", JSON.stringify(documents.json));
    assert("configured decision is classified", byPath.get("adr/ADR-0001-test.md") === "decision", JSON.stringify(documents.json));
    assert("configured task plan is classified", byPath.get("tasks/P0-test.md") === "task_plan", JSON.stringify(documents.json));
    assert("configured source is classified", byPath.get("src/app.ts") === "source", JSON.stringify(documents.json));
    assert("generated document is excluded", !paths.includes("doc/generated/out.md"), JSON.stringify(paths));
    assert("wiki log is excluded", !paths.includes("wiki/log.md"), JSON.stringify(paths));
    assert("Markdown tables render without inline style attributes", manual.json.html.includes('class="align-right"') && !manual.json.html.includes("style="), manual.json.html);
    assert("oversized source file is rejected", huge.response.status === 413, huge.text);
    assert("binary-looking source file is rejected", binary.response.status === 415, binary.text);
    assert("project search respects generated ignores", generatedSearch.json.resultCount === 0, JSON.stringify(generatedSearch.json));
    assert("project search respects reader-only wiki log exclusion", wikiLogSearch.json.resultCount === 0, JSON.stringify(wikiLogSearch.json));
  } finally {
    cleanup(dir, child);
  }
}

async function scenarioAnnotations() {
  console.log("\nScenario 2: annotation queue is file-based and protects processed records");
  const dir = createTempProject();
  const port = await freePort();
  let child = null;

  try {
    child = await startReader(dir, port);
    const create = await request(port, "/api/annotations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        target: { path: "doc/manual.md", kind: "project_doc" },
        selectedText: "Reader test document.",
        annotation: "Verify the manual summary.",
      }),
    });
    const crossOriginCreate = await request(port, "/api/annotations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://example.invalid",
      },
      body: JSON.stringify({
        target: { path: "doc/manual.md", kind: "project_doc" },
        annotation: "This should not be accepted cross-origin.",
      }),
    });
    const firstId = create.json.annotation.annotationId;
    const list = await request(port, "/api/annotations");
    const deletion = await request(port, `/api/annotation?id=${encodeURIComponent(firstId)}`, { method: "DELETE" });

    const createProcessed = await request(port, "/api/annotations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        target: { path: "doc/manual.md", kind: "project_doc" },
        annotation: "Record processed outcome.",
      }),
    });
    const processedId = createProcessed.json.annotation.annotationId;
    execFileSync(process.execPath, [
      "experiments/wiki-agent-orchestration/wiki-tools.mjs",
      "resolve",
      processedId,
      "--root",
      dir,
      "--annotations-dir",
      ".pom-reader/annotations",
      "--note",
      "Checked and closed.",
    ], { cwd: POM_ROOT, stdio: "pipe" });
    const processedDeletion = await request(port, `/api/annotation?id=${encodeURIComponent(processedId)}`, { method: "DELETE" });

    assert("annotation creation writes a JSON work record", create.response.status === 200 && firstId.startsWith("annotation-"), create.text);
    assert("cross-origin annotation writes are rejected", crossOriginCreate.response.status === 403, crossOriginCreate.text);
    assert("annotation list includes the open record", list.json.some((item) => item.annotationId === firstId), JSON.stringify(list.json));
    assert("open annotation can be deleted", deletion.response.status === 200 && deletion.json.deleted === true, deletion.text);
    assert("processed annotation cannot be deleted from the working queue", processedDeletion.response.status === 400, processedDeletion.text);
  } finally {
    cleanup(dir, child);
  }
}

console.log("POM Project Reader Tests");
console.log("========================");

await scenarioDocumentsAndSecurity();
await scenarioAnnotations();

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
