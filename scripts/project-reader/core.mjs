import { spawnSync } from "node:child_process";
import { closeSync, existsSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, join, normalize, relative, resolve } from "node:path";
import { setImmediate as yieldImmediate } from "node:timers/promises";
import { extractSummary, extractTitle, renderDocument } from "./render-document.mjs";

export const PROJECT_INDEX_PATH = "__project_index__.md";
export const MAX_DOCUMENT_BYTES = 1_000_000;
export const MAX_SUMMARY_BYTES = 64_000;
export const DOCUMENT_SCAN_YIELD_EVERY = 250;

const RG_GLOBS = [
  "!.git/**",
  "!node_modules/**",
  "!**/.DS_Store",
  "!scripts/project-reader/public/*.map",
];

export function createProjectReaderCore({ root, sourceContext }) {
  const projectRoot = resolve(String(root || "."));
  const scan = createDocumentScan();
  const readerTitle = sourceContext.readerTitle || "Project Reader";

  function status() {
    return {
      projectRoot,
      documentSources: {
        mode: sourceContext.mode,
        profile: sourceContext.profile,
        configFound: Boolean(sourceContext.configFound),
        configuredCount: sourceContext.configuredCount || 0,
        totalCount: sourceContext.docSources.length,
      },
      limits: {
        maxDocumentBytes: MAX_DOCUMENT_BYTES,
        maxSummaryBytes: MAX_SUMMARY_BYTES,
        documentScanYieldEvery: DOCUMENT_SCAN_YIELD_EVERY,
      },
    };
  }

  function listDocuments() {
    startDocumentScan();
    const docs = scannedDocuments();
    if (!hasWikiIndex(docs)) docs.push(projectIndexSummary(docs));
    return {
      documents: docs.sort(compareDocuments),
      scan: documentScanStatus(),
    };
  }

  function readDocument(path) {
    if (path === PROJECT_INDEX_PATH) {
      startDocumentScan();
      return projectIndexDocument(scannedDocuments(), documentScanStatus());
    }
    const safePath = requireAllowedPath(path);
    const content = readProjectText(safePath, { maxBytes: MAX_DOCUMENT_BYTES });
    return {
      path: safePath,
      kind: kindForPath(safePath),
      title: extractTitle(content, safePath),
      markdown: content,
      html: renderDocument(content, safePath),
    };
  }

  async function listTree(path = "") {
    const safePath = normalizeTreePath(path);
    if (!safePath) return rootTree();
    const absolute = resolve(projectRoot, safePath);
    assertInsideProject(absolute);
    if (!directoryMayContainAllowedPath(safePath)) throw httpError(403, "Path is not part of the Project Reader tree.");
    const directoryStat = await stat(absolute);
    if (!directoryStat.isDirectory()) throw httpError(400, "Tree path must be a directory.");
    const entries = await readdir(absolute, { withFileTypes: true });
    return {
      path: safePath,
      entries: entries
        .filter((entry) => !shouldSkipEntry(entry.name))
        .map((entry) => treeEntry(join(safePath, entry.name), entry))
        .filter(Boolean)
        .sort(compareTreeEntries),
    };
  }

  function search({ query, regex = false, maxResults = 50, kind = "all" } = {}) {
    const pattern = String(query || "").trim();
    if (!pattern) throw new Error("Search query is required");
    const roots = searchRootsForKind(kind).filter((path) => existsSync(join(projectRoot, path)));
    if (!roots.length) return emptySearchResult(pattern, regex, maxResults);
    const args = ["--json", "--line-number", "--column", "--color", "never", "--max-count", "20", "--max-filesize", "1M"];
    if (!regex) args.push("--fixed-strings");
    for (const glob of RG_GLOBS) args.push("--glob", glob);
    for (const glob of sourceContext.ignoreGlobs || []) args.push("--glob", glob);
    args.push("--", pattern, ...roots);

    const result = spawnSync("rg", args, {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: 5000,
      maxBuffer: 2_000_000,
    });
    if (result.error) throw new Error(`rg failed: ${result.error.message}`);
    if (result.status > 1) throw new Error((result.stderr || "rg search failed").trim());
    return parseRgResult(result.stdout, pattern, regex, maxResults);
  }

  function startDocumentScan() {
    if (scan.started) return;
    scan.started = true;
    scan.promise = yieldImmediate()
      .then(runDocumentScan)
      .catch((error) => {
        scan.error = error instanceof Error ? error.message : String(error);
      })
      .finally(() => {
        scan.complete = true;
      });
  }

  async function runDocumentScan() {
    for (const source of sourceContext.docSources) await scanSource(source);
  }

  async function scanSource(source) {
    const absolute = join(projectRoot, source.root);
    if (!existsSync(absolute)) return;
    const rootStat = await stat(absolute);
    if (rootStat.isFile()) {
      if (!pathIsSkipped(source.root, source)) addScannedDocument(source.root, source.kind);
      await yieldDocumentScan();
      return;
    }
    await scanDirectory(source.root, source);
  }

  async function scanDirectory(rootPath, source) {
    const entries = await readdir(join(projectRoot, rootPath), { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (shouldSkipEntry(entry.name) || source.skipFiles?.includes(entry.name)) continue;
      const child = join(rootPath, entry.name);
      if (entry.isDirectory()) {
        if (!source.skipDirs?.includes(entry.name)) await scanDirectory(child, source);
      } else if (!pathIsSkipped(child, source) && source.exts.includes(extname(child))) {
        addScannedDocument(child, source.kind);
      }
      await yieldDocumentScan();
    }
  }

  function addScannedDocument(path, kind) {
    if (!scan.docs.has(path)) scan.docs.set(path, documentSummary(path, kind));
  }

  async function yieldDocumentScan() {
    scan.operationCount += 1;
    if (scan.operationCount % DOCUMENT_SCAN_YIELD_EVERY === 0) await yieldImmediate();
  }

  function scannedDocuments() {
    return [...scan.docs.values()];
  }

  function documentScanStatus() {
    return { started: scan.started, complete: scan.complete, loadedCount: scan.docs.size, error: scan.error };
  }

  function documentSummary(path, kind) {
    if (usesLightweightSummary(path, kind)) return { path, kind, title: basename(path), summary: "Open directly to preview this file." };
    let content = "";
    let summary = "";
    try {
      content = readProjectText(path, { maxBytes: MAX_SUMMARY_BYTES, truncate: true });
      summary = extractSummary(content);
    } catch (error) {
      summary = error.expose ? error.message : "Document cannot be previewed by the reader.";
    }
    return { path, kind, title: extractTitle(content, path), summary };
  }

  function readProjectText(path, { maxBytes, truncate = false } = {}) {
    const absolute = join(projectRoot, path);
    const fileStat = statSync(absolute);
    if (fileStat.size > maxBytes && !truncate) throw httpError(413, `Document exceeds the reader limit of ${maxBytes} bytes.`);
    const buffer = truncate && fileStat.size > maxBytes ? readFileStart(absolute, maxBytes) : readFileSync(absolute);
    if (looksBinary(buffer)) throw httpError(415, "Document appears to be binary and cannot be rendered.");
    const slice = truncate && buffer.length > maxBytes ? buffer.subarray(0, maxBytes) : buffer;
    return slice.toString("utf8");
  }

  function requireAllowedPath(input) {
    if (!input) throw new Error("Missing path");
    const relativePath = requireProjectPath(input);
    const absolute = resolve(projectRoot, relativePath);
    const allowed = sourceContext.docSources.some((source) => (
      pathBelongsToSource(absolute, source) && !pathIsSkipped(relativePath, source) && pathExtAllowed(relativePath, source)
    )) || (sourceContext.extraAllowedPrefixes || []).some((prefix) => relativePath.startsWith(prefix));
    if (!allowed) throw new Error("Path is not part of the Project Reader document set");
    if (!existsSync(absolute) || !statSync(absolute).isFile()) throw new Error("Document not found");
    return relativePath;
  }

  function rootTree() {
    const entries = new Map();
    for (const source of sourceContext.docSources) {
      const rootPart = source.root.split("/")[0];
      const rootPath = rootPart || source.root;
      const absolute = join(projectRoot, rootPath);
      if (!rootPath || !existsSync(absolute) || shouldSkipEntry(rootPath)) continue;
      const entryStat = statSync(absolute);
      if (entryStat.isDirectory()) entries.set(rootPath, { name: rootPath, path: rootPath, type: "directory" });
      if (entryStat.isFile() && pathExtAllowed(rootPath, source)) entries.set(rootPath, treeFileEntry(rootPath));
    }
    return { path: "", entries: [...entries.values()].sort(compareTreeEntries) };
  }

  function treeEntry(path, entry) {
    if (entry.isDirectory()) {
      if (!directoryMayContainAllowedPath(path)) return null;
      return { name: entry.name, path, type: "directory" };
    }
    if (!fileAllowed(path)) return null;
    return treeFileEntry(path);
  }

  function treeFileEntry(path) {
    const kind = kindForPath(path);
    return { name: basename(path), path, type: "file", kind, title: basename(path) };
  }

  function directoryMayContainAllowedPath(path) {
    return sourceContext.docSources.some((source) => (
      source.root === path || source.root.startsWith(`${path}/`) || path === dirname(source.root) || pathBelongsToSource(resolve(projectRoot, path), source)
    )) && !sourceContext.isGeneratedPath?.(path);
  }

  function fileAllowed(path) {
    const absolute = resolve(projectRoot, path);
    return sourceContext.docSources.some((source) => (
      pathBelongsToSource(absolute, source) && !pathIsSkipped(path, source) && pathExtAllowed(path, source)
    ));
  }

  function kindForPath(path) {
    const absolute = resolve(projectRoot, path);
    const match = sourceContext.docSources.find((source) => (
      pathBelongsToSource(absolute, source) && !pathIsSkipped(path, source) && pathExtAllowed(path, source)
    ));
    return match?.kind || "other";
  }

  function searchRootsForKind(kind) {
    const selectedKind = String(kind || "all");
    return sourceContext.docSources
      .filter((source) => selectedKind === "all" || source.kind === selectedKind)
      .map((source) => source.root);
  }

  function pathIsSkipped(path, source) {
    if (sourceContext.isGeneratedPath?.(path)) return true;
    const parts = relative(source.root, path).split(/[\\/]+/).filter(Boolean);
    return parts.some((part) => source.skipDirs?.includes(part)) || source.skipFiles?.includes(basename(path));
  }

  function requireProjectPath(input) {
    const normalized = normalize(String(input));
    if (isAbsolute(normalized)) throw new Error("Absolute paths are not allowed");
    const absolute = resolve(projectRoot, normalized);
    assertInsideProject(absolute);
    return relative(projectRoot, absolute);
  }

  function normalizeTreePath(input) {
    const value = String(input || "").trim();
    return value ? requireProjectPath(value) : "";
  }

  function assertInsideProject(absolute) {
    const relativePath = relative(projectRoot, absolute);
    if (relativePath.startsWith("..") || isAbsolute(relativePath)) throw new Error("Path outside repository");
    if (relativePath === ".git" || relativePath.startsWith(".git/")) throw new Error("Git internals are not valid targets");
    if (relativePath === "node_modules" || relativePath.startsWith("node_modules/")) throw new Error("node_modules is not a valid target");
  }

  function pathBelongsToSource(absolute, source) {
    return pathInside(resolve(projectRoot, source.root), absolute);
  }

  function compareDocuments(a, b) {
    return documentRank(a) - documentRank(b) || a.path.localeCompare(b.path);
  }

  function documentRank(doc) {
    if (doc.path === PROJECT_INDEX_PATH) return -2;
    if (doc.path === "wiki/index.md") return -1;
    return sourceContext.kindRank?.(doc.kind) ?? 10;
  }

  function projectIndexSummary(docs) {
    return {
      path: PROJECT_INDEX_PATH,
      kind: "project_doc",
      title: readerTitle,
      summary: `Generated project entry point for ${docs.length} loaded project files.`,
    };
  }

  function projectIndexDocument(docs, documentScan) {
    const markdown = renderProjectIndexMarkdown(docs, documentScan);
    return {
      path: PROJECT_INDEX_PATH,
      kind: "project_doc",
      title: readerTitle,
      markdown,
      html: renderDocument(markdown, PROJECT_INDEX_PATH),
    };
  }

  function renderProjectIndexMarkdown(docs, documentScan) {
    const readableDocs = docs.filter((doc) => doc.path !== PROJECT_INDEX_PATH);
    const startLinks = preferredStartDocuments(readableDocs).map((doc) => `- [${doc.title}](${doc.path}) - \`${doc.path}\``).join("\n")
      || "- No preferred entry document was found in the current allowlist.";
    const rows = groupedDocumentCounts(readableDocs).map(([kind, count]) => `| ${kind} | ${count} |`).join("\n") || "| project_doc | 0 |";
    const scanNote = documentScan?.complete
      ? `Navigation scan complete. Loaded ${documentScan.loadedCount || readableDocs.length} project files.`
      : `Navigation is loading in the background. Loaded ${documentScan?.loadedCount || readableDocs.length} project files so far.`;
    return `# ${readerTitle}

This generated index is shown because the project does not provide \`wiki/index.md\`.
Use it as a neutral entry point for project documents, source search, direct file opening, and file-based annotations.

${scanNote}

Use project search or a direct \`?path=\` URL while navigation is still loading.

## Start Here

${startLinks}

## Document Groups

| Kind | Files |
| --- | ---: |
${rows}

## Agent Handoff

- Use project search for discovery.
- Save annotations from the right panel when a file needs agent attention.
- The agent reads annotation files, claims them, records its outcome, and then applies separate reviewed changes.
`;
  }

  function groupedDocumentCounts(docs) {
    const counts = new Map();
    for (const doc of docs) counts.set(doc.kind, (counts.get(doc.kind) || 0) + 1);
    return [...counts.entries()].sort((a, b) => (sourceContext.kindRank?.(a[0]) ?? 10) - (sourceContext.kindRank?.(b[0]) ?? 10) || a[0].localeCompare(b[0]));
  }

  return { status, listDocuments, readDocument, listTree, search };
}

function createDocumentScan() {
  return { started: false, complete: false, error: "", docs: new Map(), operationCount: 0, promise: null };
}

function usesLightweightSummary(path, kind) {
  return ["source", "test", "mockup"].includes(kind) || ![".md", ".html"].includes(extname(path));
}

function pathExtAllowed(path, source) {
  return source.exts.includes(extname(path));
}

function readFileStart(file, bytes) {
  const fd = openSync(file, "r");
  try {
    const buffer = Buffer.alloc(bytes);
    const readBytes = readSync(fd, buffer, 0, bytes, 0);
    return buffer.subarray(0, readBytes);
  } finally {
    closeSync(fd);
  }
}

function looksBinary(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  return sample.includes(0);
}

function hasWikiIndex(docs) {
  return docs.some((doc) => doc.path === "wiki/index.md");
}

function preferredStartDocuments(docs) {
  const preferred = ["README.md", "CONTEXT.md", "docs", "decisions", "tasks", "specs"];
  return [...docs]
    .filter((doc) => extname(doc.path) === ".md" && preferred.some((prefix) => doc.path === prefix || doc.path.startsWith(`${prefix}/`)))
    .sort((a, b) => preferredRank(a.path, preferred) - preferredRank(b.path, preferred) || a.path.localeCompare(b.path))
    .slice(0, 8);
}

function preferredRank(path, preferred) {
  const index = preferred.findIndex((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  return index === -1 ? preferred.length : index;
}

function emptySearchResult(pattern, regex, maxResults) {
  return { query: pattern, regex: Boolean(regex), generatedAt: new Date().toISOString(), maxResults, resultCount: 0, truncated: false, results: [] };
}

function parseRgResult(output, pattern, regex, maxResults) {
  const matches = [];
  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const event = JSON.parse(line);
    if (event.type !== "match") continue;
    matches.push(rgMatch(event.data));
    if (matches.length >= maxResults) break;
  }
  return { query: pattern, regex: Boolean(regex), generatedAt: new Date().toISOString(), maxResults, resultCount: matches.length, truncated: matches.length >= maxResults, results: matches };
}

function rgMatch(data) {
  const submatch = data.submatches?.[0];
  return {
    path: normalize(data.path.text),
    line: data.line_number,
    column: Number.isInteger(submatch?.start) ? submatch.start + 1 : data.column || 1,
    text: data.lines.text.trimEnd(),
  };
}

function shouldSkipEntry(name) {
  return name.startsWith(".") || name === ".DS_Store" || name === "node_modules";
}

function compareTreeEntries(a, b) {
  return Number(a.type === "file") - Number(b.type === "file") || a.name.localeCompare(b.name);
}

function pathInside(parent, child) {
  const relativePath = relative(parent, child);
  return !relativePath || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}

export function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.expose = true;
  return error;
}
