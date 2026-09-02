#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createAnnotationController } from "../../../scripts/project-reader/public/annotations.js";

import { createHarness, makeSandbox, removeSandbox } from "../../lib/harness.mjs";

const POM_ROOT = process.cwd();

const { assert, banner, summary } = createHarness({ name: "POM Project Reader Tests" });

function createTempProject() {
  const dir = makeSandbox("pom-project-reader-test-").dir;
  for (const path of ["doc/generated", "adr", "tasks", "src/nested", "wiki"]) {
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
  writeFileSync(join(dir, "src", "nested", "deep.ts"), "export const nested = true;\n");
  writeFileSync(join(dir, "src", "huge.ts"), `${"x".repeat(1_000_001)}\n`);
  writeFileSync(join(dir, "src", "binary.ts"), Buffer.from([0, 1, 2, 3, 4]));
  writeFileSync(join(dir, "wiki", "log.md"), "# Log\n\nWIKI_LOG_ONLY\n");
  return dir;
}

function createGenericProject() {
  const dir = makeSandbox("project-reader-generic-").dir;
  for (const path of ["knowledge/generated", "src", "tests"]) {
    mkdirSync(join(dir, path), { recursive: true });
  }
  writeFileSync(join(dir, ".project-reader.json"), `${JSON.stringify({
    sources: [
      { root: "knowledge", kind: "project_doc", exts: [".md"] },
      { root: "src", kind: "source", exts: [".js"] },
      { root: "tests", kind: "test", exts: [".js"] },
    ],
    generated: ["knowledge/generated/**"],
  }, null, 2)}\n`);
  writeFileSync(join(dir, "knowledge", "guide.md"), "# Generic Guide\n\nGENERIC_NEEDLE\n");
  writeFileSync(join(dir, "knowledge", "generated", "out.md"), "# Generated\n\nGENERIC_GENERATED_ONLY\n");
  writeFileSync(join(dir, "src", "main.js"), "export const app = 'GENERIC_SOURCE';\n");
  writeFileSync(join(dir, "tests", "main.test.js"), "export const test = true;\n");
  return dir;
}

function createLargeSourceProject(fileCount = 1105) {
  const dir = makeSandbox("pom-project-reader-large-").dir;
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "pom.config.json"), `${JSON.stringify({
    source: { roots: ["src"] },
  }, null, 2)}\n`);
  for (let index = 0; index < fileCount; index += 1) {
    const id = String(index).padStart(4, "0");
    writeFileSync(
      join(dir, "src", `file-${id}.ts`),
      `export const marker${id} = "NEEDLE_${id}";\n`,
    );
  }
  return dir;
}

// A project whose docs contain symlinks that escape the root (the audit case:
// docs/hosts.md -> /etc/hosts, docs/etcdir -> /etc), plus a symlinked top-level
// root and one internal symlink that must keep working. The temp directory on
// macOS is itself a symlink (/var -> /private/var), which exercises the
// "root is a symlink" comparison.
function createSymlinkProject() {
  const dir = makeSandbox("pom-project-reader-symlink-").dir;
  const outside = makeSandbox("pom-project-reader-outside-").dir;
  mkdirSync(join(dir, "docs"), { recursive: true });
  mkdirSync(join(outside, "tree"), { recursive: true });
  writeFileSync(join(outside, "secret.md"), "# Secret\n\nOUTSIDE_FILE_NEEDLE\n");
  writeFileSync(join(outside, "tree", "leaf.md"), "# Leaf\n\nOUTSIDE_TREE_NEEDLE\n");
  writeFileSync(join(dir, "pom.config.json"), `${JSON.stringify({
    documentation: { existingRoots: ["docs", "linkedroot"] },
  }, null, 2)}\n`);
  writeFileSync(join(dir, "docs", "inside.md"), "# Inside\n\nINSIDE_NEEDLE\n");
  symlinkSync(join(outside, "secret.md"), join(dir, "docs", "hosts.md"));
  symlinkSync(join(outside, "tree"), join(dir, "docs", "etcdir"));
  symlinkSync(join(outside, "tree"), join(dir, "linkedroot"));
  symlinkSync(join(dir, "docs", "inside.md"), join(dir, "docs", "alias.md"));
  return { dir, outside };
}

// A wiki nested under the documentation root, declared through wiki.root.
function createConfiguredWikiProject() {
  const dir = makeSandbox("pom-project-reader-wikiroot-").dir;
  const wikiRoot = "doc/tech/wiki";
  mkdirSync(join(dir, wikiRoot, "_site"), { recursive: true });
  writeFileSync(join(dir, "pom.config.json"), `${JSON.stringify({
    documentation: { officialRoot: "doc/tech", existingRoots: ["doc"] },
    wiki: { root: wikiRoot },
  }, null, 2)}\n`);
  writeFileSync(join(dir, "doc", "tech", "roadmap.md"), "# Roadmap\n\nOfficial document.\n");
  writeFileSync(join(dir, wikiRoot, "index.md"), "# Wiki Index\n\n## Overview\n\nStart with [[overview]] or [[overview|the overview page]].\n");
  writeFileSync(join(dir, wikiRoot, "overview.md"), "# Overview\n\nNESTED_WIKI_NEEDLE\n");
  writeFileSync(join(dir, wikiRoot, "log.md"), "# Wiki Log\n\nNESTED_WIKI_LOG_ONLY\n");
  writeFileSync(join(dir, wikiRoot, "_site", "index.html"), "<p>NESTED_WIKI_SITE_ONLY</p>\n");
  return { dir, wikiRoot };
}

function cleanup(dir, child) {
  if (child && !child.killed) child.kill("SIGTERM");
  removeSandbox(dir);
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

function listenOnLoopback(server, port = 0) {
  return new Promise((resolvePort, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      resolvePort(server.address().port);
    });
  });
}

function closeServer(server) {
  return new Promise((resolveClose) => {
    server.close(() => resolveClose());
  });
}

function isListenPermissionError(error) {
  if (!error || typeof error !== "object") return false;
  return (
    (error.code === "EPERM" || error.code === "EACCES") &&
    error.syscall === "listen" &&
    (error.address === "127.0.0.1" || error.address === "::1" || error.address === "0.0.0.0" || !error.address)
  );
}

async function startReader(projectDir, port) {
  const child = spawn(process.execPath, [
    "scripts/project-reader/server.mjs",
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

function waitForExit(child, timeoutMs = 5000) {
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });
  return new Promise((resolveExit, reject) => {
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Process did not exit:\n${output}`));
    }, timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", (code, signal) => {
      clearTimeout(timer);
      resolveExit({ code, signal, output });
    });
  });
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

async function waitForDocumentScan(port, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await request(port, "/api/documents");
    if (last.json?.scan?.complete) return last;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
  }
  throw new Error(`Document scan did not complete: ${JSON.stringify(last?.json)}`);
}

function documentPayloadDocs(payload) {
  return Array.isArray(payload.json) ? payload.json : payload.json.documents;
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
    const documents = await waitForDocumentScan(port);
    const manual = await request(port, "/api/document?path=doc%2Fmanual.md");
    const rootTree = await request(port, "/api/tree");
    const docTree = await request(port, "/api/tree?path=doc");
    const srcTree = await request(port, "/api/tree?path=src");
    const blockedTree = await request(port, "/api/tree?path=..");
    const huge = await request(port, "/api/document?path=src%2Fhuge.ts");
    const binary = await request(port, "/api/document?path=src%2Fbinary.ts");
    const generatedSearch = await request(port, "/api/search?q=GENERATED_ONLY&kind=project_doc");
    const wikiLogSearch = await request(port, "/api/search?q=WIKI_LOG_ONLY&kind=wiki");

    const docs = documentPayloadDocs(documents);
    const paths = docs.map((doc) => doc.path);
    const byPath = new Map(docs.map((doc) => [doc.path, doc.kind]));
    const rootTreePaths = rootTree.json.entries.map((entry) => entry.path);
    const docTreePaths = docTree.json.entries.map((entry) => entry.path);
    const srcTreePaths = srcTree.json.entries.map((entry) => entry.path);

    assert("CSP header is present", home.response.headers.get("content-security-policy")?.includes("frame-ancestors 'none'"), home.text);
    assert("nosniff header is present", home.response.headers.get("x-content-type-options") === "nosniff", home.text);
    assert("status reports pom.config.json mode", status.json.documentSources.mode === "pom.config.json", JSON.stringify(status.json));
    assert("status reports the default wiki root when wiki.root is not configured", status.json.wikiRoot === "wiki" && status.json.wikiIndexPath === "wiki/index.md", JSON.stringify(status.json));
    assert("configured documentation is classified", byPath.get("doc/manual.md") === "project_doc", JSON.stringify(docs));
    assert("configured decision is classified", byPath.get("adr/ADR-0001-test.md") === "decision", JSON.stringify(docs));
    assert("configured task plan is classified", byPath.get("tasks/P0-test.md") === "task_plan", JSON.stringify(docs));
    assert("configured source is classified", byPath.get("src/app.ts") === "source", JSON.stringify(docs));
    assert("generated document is excluded", !paths.includes("doc/generated/out.md"), JSON.stringify(paths));
    assert("wiki log is excluded", !paths.includes("wiki/log.md"), JSON.stringify(paths));
    assert("lazy tree exposes only allowed top-level roots", rootTreePaths.includes("doc") && rootTreePaths.includes("src"), JSON.stringify(rootTree.json));
    assert("lazy tree keeps generated directories out", !docTreePaths.includes("doc/generated"), JSON.stringify(docTree.json));
    assert("lazy tree lists one directory level", srcTreePaths.includes("src/app.ts") && srcTreePaths.includes("src/nested"), JSON.stringify(srcTree.json));
    assert("lazy tree blocks paths outside the project", blockedTree.response.status === 400, blockedTree.text);
    assert("Markdown tables render without inline style attributes", manual.json.html.includes('class="align-right"') && !manual.json.html.includes("style="), manual.json.html);
    assert("oversized source file is rejected", huge.response.status === 413, huge.text);
    assert("binary-looking source file is rejected", binary.response.status === 415, binary.text);
    assert("project search respects generated ignores", generatedSearch.json.resultCount === 0, JSON.stringify(generatedSearch.json));
    assert("project search respects reader-only wiki log exclusion", wikiLogSearch.json.resultCount === 0, JSON.stringify(wikiLogSearch.json));
  } finally {
    cleanup(dir, child);
  }
}

async function scenarioSymlinksStayInsideTheProject() {
  console.log("\nScenario 1b: symlinks that resolve outside the project root are neither served, listed, nor searched");
  const { dir, outside } = createSymlinkProject();
  const port = await freePort();
  let child = null;

  try {
    child = await startReader(dir, port);
    const documents = await waitForDocumentScan(port);
    const linkedFile = await request(port, "/api/document?path=docs%2Fhosts.md");
    const internalLink = await request(port, "/api/document?path=docs%2Falias.md");
    const rootTree = await request(port, "/api/tree");
    const docsTree = await request(port, "/api/tree?path=docs");
    const linkedDirTree = await request(port, "/api/tree?path=docs%2Fetcdir");
    const outsideFileSearch = await request(port, "/api/search?q=OUTSIDE_FILE_NEEDLE");
    const outsideTreeSearch = await request(port, "/api/search?q=OUTSIDE_TREE_NEEDLE");
    const insideSearch = await request(port, "/api/search?q=INSIDE_NEEDLE");
    const annotation = await request(port, "/api/annotations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target: { path: "docs/hosts.md", kind: "project_doc" }, annotation: "Should be refused." }),
    });

    const paths = documentPayloadDocs(documents).map((doc) => doc.path);
    const rootTreePaths = rootTree.json.entries.map((entry) => entry.path);
    const docsTreePaths = docsTree.json.entries.map((entry) => entry.path);

    assert("a symlinked document outside the root is refused", [400, 403].includes(linkedFile.response.status), linkedFile.text);
    assert("the refusal names the real-path guard", linkedFile.json?.error === "Path resolves outside the project root.", linkedFile.text);
    assert("a symlink to a file inside the root still opens", internalLink.response.status === 200 && internalLink.json.markdown.includes("INSIDE_NEEDLE"), internalLink.text);
    assert("navigation scan leaves the outside symlink out", !paths.includes("docs/hosts.md") && paths.includes("docs/inside.md"), JSON.stringify(paths));
    assert("lazy tree lists neither the outside file nor the outside directory", !docsTreePaths.includes("docs/hosts.md") && !docsTreePaths.includes("docs/etcdir"), JSON.stringify(docsTree.json));
    assert("lazy tree keeps the internal symlink", docsTreePaths.includes("docs/alias.md") && docsTreePaths.includes("docs/inside.md"), JSON.stringify(docsTree.json));
    assert("a symlinked directory outside the root cannot be listed", [400, 403].includes(linkedDirTree.response.status), linkedDirTree.text);
    assert("a configured root that is a symlink outside the project is dropped from the root tree", !rootTreePaths.includes("linkedroot"), JSON.stringify(rootTree.json));
    assert("search does not follow the outside file symlink", outsideFileSearch.json.resultCount === 0, JSON.stringify(outsideFileSearch.json));
    assert("search does not follow the outside directory or root symlinks", outsideTreeSearch.json.resultCount === 0, JSON.stringify(outsideTreeSearch.json));
    assert("search still finds documents inside the root", insideSearch.json.results.some((item) => item.path === "docs/inside.md"), JSON.stringify(insideSearch.json));
    assert("annotations share the same real-path guard", [400, 403].includes(annotation.response.status) && annotation.json?.error === "Path resolves outside the project root.", annotation.text);
  } finally {
    cleanup(dir, child);
    removeSandbox(outside);
  }
}

async function scenarioConfiguredWikiRoot() {
  console.log("\nScenario 1c: wiki.root in pom.config.json replaces the hard-coded wiki/ directory");
  const { dir, wikiRoot } = createConfiguredWikiProject();
  const port = await freePort();
  let child = null;

  try {
    child = await startReader(dir, port);
    const status = await request(port, "/api/status");
    const documents = await waitForDocumentScan(port);
    const index = await request(port, `/api/document?path=${encodeURIComponent(`${wikiRoot}/index.md`)}`);
    const log = await request(port, `/api/document?path=${encodeURIComponent(`${wikiRoot}/log.md`)}`);
    const wikiSearch = await request(port, "/api/search?q=NESTED_WIKI_NEEDLE&kind=wiki");
    const logSearch = await request(port, "/api/search?q=NESTED_WIKI_LOG_ONLY");
    const siteSearch = await request(port, "/api/search?q=NESTED_WIKI_SITE_ONLY");

    const docs = documentPayloadDocs(documents);
    const paths = docs.map((doc) => doc.path);
    const byPath = new Map(docs.map((doc) => [doc.path, doc.kind]));

    assert("status exposes the configured wiki root", status.json.wikiRoot === wikiRoot && status.json.wikiIndexPath === `${wikiRoot}/index.md`, JSON.stringify(status.json));
    assert("nested wiki pages are classified as wiki, not as official docs", byPath.get(`${wikiRoot}/index.md`) === "wiki" && byPath.get(`${wikiRoot}/overview.md`) === "wiki", JSON.stringify(docs));
    assert("official documents beside the wiki keep their kind", byPath.get("doc/tech/roadmap.md") === "project_doc", JSON.stringify(docs));
    assert("the configured wiki index is the entry document and no generated index is added", paths[0] === `${wikiRoot}/index.md` && !paths.includes("__project_index__.md"), JSON.stringify(paths));
    assert("wiki log and generated site stay out of navigation under the configured root", !paths.includes(`${wikiRoot}/log.md`) && !paths.includes(`${wikiRoot}/_site/index.html`), JSON.stringify(paths));
    assert("wiki log cannot be opened through the docs root either", log.response.status !== 200, log.text);
    assert("wikilinks resolve against the configured root", index.json.html.includes(`data-doc-path="${wikiRoot}/overview.md"`) && index.json.html.includes(">the overview page<"), index.json.html);
    assert("kind=wiki search covers the configured root", wikiSearch.json.results.some((item) => item.path === `${wikiRoot}/overview.md`), JSON.stringify(wikiSearch.json));
    assert("search ignores the nested wiki log and generated site", logSearch.json.resultCount === 0 && siteSearch.json.resultCount === 0, JSON.stringify({ log: logSearch.json, site: siteSearch.json }));
  } finally {
    cleanup(dir, child);
  }
}

async function scenarioAsyncNavigationAndDirectOpen() {
  console.log("\nScenario 2: large configured source roots load navigation asynchronously and allow direct opening");
  const dir = createLargeSourceProject();
  const port = await freePort();
  let child = null;

  try {
    child = await startReader(dir, port);
    const status = await request(port, "/api/status");
    const initialDocuments = await request(port, "/api/documents");
    const rootTree = await request(port, "/api/tree");
    const srcTree = await request(port, "/api/tree?path=src");
    const direct = await request(port, "/api/document?path=src%2Ffile-1104.ts");
    const search = await request(port, "/api/search?q=NEEDLE_1104&kind=source");
    const completedDocuments = await waitForDocumentScan(port);

    const initialDocs = documentPayloadDocs(initialDocuments);
    const completedDocs = documentPayloadDocs(completedDocuments);
    const sourceDocs = completedDocs.filter((doc) => doc.kind === "source" && doc.path.startsWith("src/"));
    const completedPaths = completedDocs.map((doc) => doc.path);
    const rootTreePaths = rootTree.json.entries.map((entry) => entry.path);
    const srcTreePaths = srcTree.json.entries.map((entry) => entry.path);

    assert("status reports cooperative document scanning", status.json.limits.documentScanYieldEvery === 250, JSON.stringify(status.json));
    assert("initial navigation response is not the final full tree", !initialDocuments.json.scan.complete && initialDocs.length < 1105, JSON.stringify(initialDocuments.json));
    assert("lazy root tree stays shallow on large projects", rootTreePaths.length === 1 && rootTreePaths[0] === "src", JSON.stringify(rootTree.json));
    assert("lazy directory tree can reveal a late file without waiting for global scan", srcTreePaths.includes("src/file-1104.ts"), JSON.stringify(srcTree.json).slice(0, 500));
    assert("completed navigation includes every configured source file", sourceDocs.length === 1105, `source docs: ${sourceDocs.length}`);
    assert("late source files become visible after async loading", completedPaths.includes("src/file-1104.ts"), JSON.stringify(completedPaths.slice(-5)));
    assert("a late source file still opens directly", direct.response.status === 200 && direct.json.markdown.includes("NEEDLE_1104"), direct.text);
    assert("project search still finds late source files", search.json.results.some((item) => item.path === "src/file-1104.ts"), JSON.stringify(search.json));
  } finally {
    cleanup(dir, child);
  }
}

async function scenarioGenericProfileAndCli() {
  console.log("\nScenario 3: generic profile supports .project-reader.json and standalone CLI commands");
  const dir = createGenericProject();
  const port = await freePort();
  let child = null;

  try {
    child = await startReader(dir, port);
    const status = await request(port, "/api/status");
    const documents = await waitForDocumentScan(port);
    const tree = await request(port, "/api/tree?path=knowledge");
    const generatedSearch = await request(port, "/api/search?q=GENERIC_GENERATED_ONLY&kind=project_doc");
    const openUrl = execFileSync(process.execPath, [
      "scripts/project-reader/cli.mjs",
      "open",
      "knowledge/guide.md",
      "--port",
      String(port),
    ], { cwd: POM_ROOT, encoding: "utf8" }).trim();
    const searchOutput = execFileSync(process.execPath, [
      "scripts/project-reader/cli.mjs",
      "search",
      "GENERIC_NEEDLE",
      "--root",
      dir,
      "--profile",
      "generic",
    ], { cwd: POM_ROOT, encoding: "utf8" });

    const docs = documentPayloadDocs(documents);
    const paths = docs.map((doc) => doc.path);
    const treePaths = tree.json.entries.map((entry) => entry.path);

    assert("auto profile uses generic config when .project-reader.json exists", status.json.documentSources.profile === "generic" && status.json.documentSources.mode === ".project-reader.json", JSON.stringify(status.json));
    assert("generic config classifies project docs", paths.includes("knowledge/guide.md"), JSON.stringify(paths));
    assert("generic config classifies source roots", docs.some((doc) => doc.path === "src/main.js" && doc.kind === "source"), JSON.stringify(docs));
    assert("generic generated roots stay out of navigation", !treePaths.includes("knowledge/generated"), JSON.stringify(tree.json));
    assert("generic generated roots stay out of search", generatedSearch.json.resultCount === 0, JSON.stringify(generatedSearch.json));
    assert("CLI open prints a deep link", openUrl === `http://127.0.0.1:${port}/?path=knowledge%2Fguide.md`, openUrl);
    assert("CLI search reads the project through the generic profile", searchOutput.includes("knowledge/guide.md:3"), searchOutput);
  } finally {
    cleanup(dir, child);
  }
}

async function scenarioAnnotations() {
  console.log("\nScenario 4: annotation queue is file-based and protects processed records");
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
      "scripts/project-reader/wiki-tools.mjs",
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

async function scenarioAnnotationDraftReset() {
  console.log("\nScenario 5: saving an annotation starts the next note with a clean draft");
  let savedPayload = null;
  const detailElement = { hidden: false, textContent: "" };
  const els = {
    selectedText: { value: "First selected passage." },
    intent: { value: "First note.", focus() {} },
    eventResult: { innerHTML: "" },
    annotationList: { innerHTML: "", append() {} },
    annotationDetail: detailElement,
    processedAnnotationList: { innerHTML: "", append() {} },
    processedAnnotationDetail: { hidden: false, textContent: "" },
  };
  const controller = createAnnotationController({
    els,
    state: { activeDocument: { path: "doc/manual.md", kind: "project_doc" } },
    t: (key) => key,
    escapeHtml: String,
    getJson: async () => [],
    postJson: async (_path, payload) => {
      savedPayload = payload;
      return { annotation: { annotationId: "annotation-test" }, path: ".pom-reader/annotations/annotation-test.json" };
    },
    deleteJson: async () => {},
    humanError: String,
    loadDocument: async () => {},
    renderLayoutState() {},
    setAgentTab() {},
  });

  await controller.saveAnnotation();

  assert("saved annotation keeps the selected passage", savedPayload?.selectedText === "First selected passage.", JSON.stringify(savedPayload));
  assert("next annotation does not retain the previous reference", els.selectedText.value === "" && els.intent.value === "", JSON.stringify({ selectedText: els.selectedText.value, intent: els.intent.value }));
}

async function scenarioStartupErrors() {
  console.log("\nScenario 6: startup errors give actionable local-server guidance");
  const blocker = createServer((_, response) => {
    response.end("occupied");
  });
  const port = await listenOnLoopback(blocker);

  try {
    const child = spawn(process.execPath, [
      "scripts/project-reader/server.mjs",
      "--port",
      String(port),
    ], {
      cwd: POM_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const result = await waitForExit(child);
    const suggestedPort = port >= 65535 ? 4173 : port + 1;

    assert("occupied port exits with failure", result.code !== 0, result.output);
    assert("occupied port message names the blocked address", result.output.includes(`127.0.0.1:${port}`), result.output);
    assert("occupied port message suggests a replacement port", result.output.includes(`npm run pom:reader -- --port ${suggestedPort}`), result.output);
    assert("occupied port message keeps the original error", result.output.includes("Original error:"), result.output);
  } finally {
    await closeServer(blocker);
  }
}

banner();

try {
  await scenarioDocumentsAndSecurity();
  await scenarioSymlinksStayInsideTheProject();
  await scenarioConfiguredWikiRoot();
  await scenarioAsyncNavigationAndDirectOpen();
  await scenarioGenericProfileAndCli();
  await scenarioAnnotations();
  await scenarioAnnotationDraftReset();
  await scenarioStartupErrors();
} catch (error) {
  if (isListenPermissionError(error)) {
    console.log("\nSkipped: environment does not permit binding HTTP servers on loopback for integration tests.");
  } else {
    throw error;
  }
}

summary();
