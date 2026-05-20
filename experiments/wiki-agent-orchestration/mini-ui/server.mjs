#!/usr/bin/env node

import { createServer } from "node:http";
import { closeSync, existsSync, openSync, readdirSync, readFileSync, readSync, statSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ANNOTATIONS_ROOT, createAnnotation, deleteAnnotation, listAnnotations, readAnnotation, searchProject, setAnnotationsRoot, setProjectRoot, takeAnnotation } from "../wiki-tools.mjs";
import { buildDocumentSourceContext, generatedIgnoreGlobs, isGeneratedPath, kindRank } from "./document-sources.mjs";
import { extractSummary, extractTitle, renderDocument } from "./render-document.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const cliArgs = process.argv.slice(2);
if (shouldShowHelp(cliArgs)) {
  usage();
  process.exit(0);
}
const options = parseOptions(cliArgs);
const ROOT = setProjectRoot(options.root);
if (options.annotationsDir) setAnnotationsRoot(options.annotationsDir);
const PUBLIC = join(HERE, "public");
const PROJECT_INDEX_PATH = "__project_index__.md";
const MAX_DOCUMENT_BYTES = 1_000_000;
const MAX_SUMMARY_BYTES = 64_000;
const { docSources: DOC_SOURCES, pomConfig: POM_CONFIG } = buildDocumentSourceContext(ROOT);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const server = createServer(async (req, res) => {
  try {
    assertLocalHostHeader(req);
    assertSameOriginForStateChangingRequest(req);
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
    if (url.pathname === "/api/status") return sendJson(res, readerStatus());
    if (url.pathname === "/api/documents") return sendJson(res, listDocuments());
    if (url.pathname === "/api/document") return sendJson(res, readDocument(url.searchParams.get("path")));
    if (url.pathname === "/api/search") return sendJson(res, searchProject({
      query: url.searchParams.get("q"),
      regex: url.searchParams.get("regex") === "1",
      roots: searchRootsForKind(url.searchParams.get("kind") || "all"),
      ignoreGlobs: generatedIgnoreGlobs(POM_CONFIG),
    }));
    if (url.pathname === "/api/annotations" && req.method === "GET") return sendJson(res, listAnnotations({
      status: url.searchParams.get("status") || undefined,
    }));
    if (url.pathname === "/api/annotations" && req.method === "POST") return sendJson(res, createAnnotation({
      ...JSON.parse(await readBody(req)),
      source: "mini-ui",
    }));
    if (url.pathname === "/api/annotation" && req.method === "GET") return sendJson(res, readAnnotation(url.searchParams.get("id")));
    if (url.pathname === "/api/annotation" && req.method === "DELETE") return sendJson(res, deleteAnnotation(url.searchParams.get("id")));
    if (url.pathname === "/api/annotation/take" && req.method === "POST") {
      const input = JSON.parse(await readBody(req) || "{}");
      return sendJson(res, takeAnnotation(input.annotationId, { by: input.by || "agent" }));
    }
    return serveStatic(res, url.pathname);
  } catch (error) {
    sendJson(res, { error: error.message }, error.statusCode || 400);
  }
});

server.on("error", (error) => {
  console.error(`POM Project Reader failed to start: ${error.message}`);
  process.exitCode = 1;
});

server.listen(options.port, "127.0.0.1", () => {
  const address = server.address();
  console.log(`POM Project Reader: http://127.0.0.1:${address.port}`);
  console.log(`Project root: ${ROOT}`);
  console.log(`POM config: ${POM_CONFIG ? "pom.config.json" : "not found; using built-in document allowlist"}`);
  console.log(`Annotations: ${ANNOTATIONS_ROOT}`);
});

function parseOptions(args) {
  return {
    port: parsePort(args),
    root: parseRoot(args),
    annotationsDir: parseAnnotationsDir(args),
  };
}

function parsePort(args) {
  const index = args.indexOf("--port");
  const value = Number(index === -1 ? process.env.PORT || 4173 : args[index + 1]);
  if (!Number.isInteger(value) || value < 1 || value > 65535) throw new Error("Invalid --port value");
  return value;
}

function parseRoot(args) {
  const rootIndex = args.indexOf("--root");
  const dirIndex = args.indexOf("--dir");
  const index = rootIndex === -1 ? dirIndex : rootIndex;
  if (index === -1) return ".";
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error("Missing project root value");
  return value;
}

function parseAnnotationsDir(args) {
  const index = args.indexOf("--annotations-dir");
  if (index === -1) return "";
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error("Missing annotation directory value");
  return value;
}

function shouldShowHelp(args) {
  return args.includes("help") || args.includes("--help") || args.includes("-h");
}

function usage() {
  console.log(`Usage:
  node experiments/wiki-agent-orchestration/mini-ui/server.mjs [--port <port>] [--root <project-root>] [--annotations-dir <path>]

Options:
  --port <port>             Local port. Defaults to PORT or 4173.
  --root, --dir <path>      Project root to inspect. Defaults to ".".
  --annotations-dir <path>  Annotation directory. Defaults to experiments/wiki-agent-orchestration/evidence/annotations under the project root.

When pom.config.json exists under the project root, the reader uses its configured roots to classify documents.
`);
}

function serveStatic(res, pathname) {
  const clean = pathname === "/" ? "/index.html" : pathname;
  const file = resolve(PUBLIC, `.${clean}`);
  if (!pathInside(PUBLIC, file)) throw new Error("Blocked path");
  if (!existsSync(file) || !statSync(file).isFile()) return notFound(res);
  const ext = extname(file);
  res.writeHead(200, {
    ...securityHeaders(),
    "content-type": MIME[ext] || "application/octet-stream",
    "cache-control": "no-store",
  });
  res.end(readFileSync(file));
}

function readerStatus() {
  return {
    projectRoot: ROOT,
    documentSources: {
      mode: POM_CONFIG ? "pom.config.json" : "built-in",
      configFound: Boolean(POM_CONFIG),
      configuredCount: DOC_SOURCES.filter((source) => source.fromConfig).length,
      totalCount: DOC_SOURCES.length,
    },
    limits: {
      maxDocumentBytes: MAX_DOCUMENT_BYTES,
      maxSummaryBytes: MAX_SUMMARY_BYTES,
    },
    annotationsRoot: ANNOTATIONS_ROOT,
  };
}

function listDocuments() {
  const docs = physicalDocuments();
  if (!hasWikiIndex(docs)) docs.push(projectIndexSummary(docs));
  return docs.sort(compareDocuments);
}

function physicalDocuments() {
  return DOC_SOURCES.flatMap((source) => {
    const absolute = join(ROOT, source.root);
    if (!existsSync(absolute)) return [];
    if (statSync(absolute).isFile()) return pathIsSkipped(source.root, source) ? [] : [documentSummary(source.root, source.kind)];
    return walk(source.root, source)
      .filter((path) => !pathIsSkipped(path, source))
      .filter((path) => source.exts.includes(extname(path)))
      .map((path) => documentSummary(path, source.kind));
  });
}

function walk(root, source) {
  const absolute = join(ROOT, root);
  const entries = readdirSync(absolute, { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === ".DS_Store") continue;
    if (source.skipFiles?.includes(entry.name)) continue;
    const child = join(root, entry.name);
    if (entry.isDirectory()) {
      if (source.skipDirs?.includes(entry.name)) continue;
      paths.push(...walk(child, source));
    } else {
      paths.push(child);
    }
  }
  return paths;
}

function documentSummary(path, kind) {
  let content = "";
  let summary = "";
  try {
    content = readProjectText(path, { maxBytes: MAX_SUMMARY_BYTES, truncate: true });
    summary = extractSummary(content);
  } catch (error) {
    summary = error.expose ? error.message : "Document cannot be previewed by the reader.";
  }
  return {
    path,
    kind,
    title: extractTitle(content, path),
    summary,
  };
}

function readDocument(path) {
  if (path === PROJECT_INDEX_PATH) return projectIndexDocument(physicalDocuments());
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

function requireAllowedPath(input) {
  if (!input) throw new Error("Missing path");
  const normalized = normalize(String(input));
  if (isAbsolute(normalized)) throw new Error("Absolute paths are not allowed");
  const absolute = resolve(ROOT, normalized);
  const relativePath = relative(ROOT, absolute);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) throw new Error("Path outside repository");
  const allowed = DOC_SOURCES.some((source) => {
    return pathBelongsToSource(absolute, source) && !pathIsSkipped(relativePath, source) && pathExtAllowed(relativePath, source);
  }) || relativePath.startsWith("experiments/wiki-agent-orchestration/evidence/");
  if (!allowed) throw new Error("Path is not part of the mini UI document set");
  if (!existsSync(absolute) || !statSync(absolute).isFile()) throw new Error("Document not found");
  return relativePath;
}

function readProjectText(path, { maxBytes, truncate = false } = {}) {
  const absolute = join(ROOT, path);
  const stat = statSync(absolute);
  if (stat.size > maxBytes && !truncate) {
    throw httpError(413, `Document exceeds the reader limit of ${maxBytes} bytes.`);
  }
  const buffer = truncate && stat.size > maxBytes ? readFileStart(absolute, maxBytes) : readFileSync(absolute);
  if (looksBinary(buffer)) throw httpError(415, "Document appears to be binary and cannot be rendered.");
  const slice = truncate && buffer.length > maxBytes ? buffer.subarray(0, maxBytes) : buffer;
  return slice.toString("utf8");
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

function kindForPath(path) {
  const match = DOC_SOURCES.find((source) => {
    const absolute = resolve(ROOT, path);
    return pathBelongsToSource(absolute, source) && !pathIsSkipped(path, source) && pathExtAllowed(path, source);
  });
  return match?.kind || "other";
}

function compareDocuments(a, b) {
  return documentRank(a) - documentRank(b) || a.path.localeCompare(b.path);
}

function documentRank(doc) {
  if (doc.path === PROJECT_INDEX_PATH) return -2;
  if (doc.path === "wiki/index.md") return -1;
  return kindRank(doc.kind);
}

function hasWikiIndex(docs) {
  return docs.some((doc) => doc.path === "wiki/index.md");
}

function projectIndexSummary(docs) {
  return {
    path: PROJECT_INDEX_PATH,
    kind: "project_doc",
    title: "POM Project Reader",
    summary: `Generated project entry point for ${docs.length} readable project files.`,
  };
}

function projectIndexDocument(docs) {
  const markdown = renderProjectIndexMarkdown(docs);
  return {
    path: PROJECT_INDEX_PATH,
    kind: "project_doc",
    title: "POM Project Reader",
    markdown,
    html: renderDocument(markdown, PROJECT_INDEX_PATH),
  };
}

function renderProjectIndexMarkdown(docs) {
  const readableDocs = docs.filter((doc) => doc.path !== PROJECT_INDEX_PATH);
  const startLinks = preferredStartDocuments(readableDocs)
    .map((doc) => `- [${doc.title}](${doc.path}) - \`${doc.path}\``)
    .join("\n") || "- No preferred entry document was found in the current allowlist.";
  const rows = groupedDocumentCounts(readableDocs)
    .map(([kind, count]) => `| ${kind} | ${count} |`)
    .join("\n") || "| project_doc | 0 |";
  return `# POM Project Reader

This generated index is shown because the project does not provide \`wiki/index.md\`.
Use it as a neutral entry point for project documents, source files, search, and file-based annotations.

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

function groupedDocumentCounts(docs) {
  const counts = new Map();
  for (const doc of docs) counts.set(doc.kind, (counts.get(doc.kind) || 0) + 1);
  return [...counts.entries()].sort((a, b) => kindRank(a[0]) - kindRank(b[0]) || a[0].localeCompare(b[0]));
}

function searchRootsForKind(kind) {
  const selectedKind = String(kind || "all");
  return DOC_SOURCES
    .filter((source) => selectedKind === "all" || source.kind === selectedKind)
    .map((source) => source.root);
}

function pathBelongsToSource(absolute, source) {
  const sourceAbsolute = resolve(ROOT, source.root);
  return pathInside(sourceAbsolute, absolute);
}

function pathInside(parent, child) {
  const relativePath = relative(parent, child);
  return !relativePath || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}

function assertLocalHostHeader(req) {
  const host = String(req.headers.host || "");
  if (isLocalHttpOrigin(`http://${host}`)) return;
  throw httpError(403, "Project Reader only accepts local host headers.");
}

function assertSameOriginForStateChangingRequest(req) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(String(req.method || "").toUpperCase())) return;
  const origin = req.headers.origin;
  if (!origin) return;
  const host = String(req.headers.host || "");
  if (sameOrigin(origin, `http://${host}`) && isLocalHttpOrigin(origin)) return;
  throw httpError(403, "Cross-origin state-changing requests are not allowed.");
}

function sameOrigin(left, right) {
  try {
    return new URL(left).origin === new URL(right).origin;
  } catch {
    return false;
  }
}

function isLocalHttpOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" && ["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

function pathIsSkipped(path, source) {
  if (isGeneratedPath(POM_CONFIG, path)) return true;
  const parts = relative(source.root, path).split(/[\\/]+/).filter(Boolean);
  return parts.some((part) => source.skipDirs?.includes(part)) || source.skipFiles?.includes(basename(path));
}

function pathExtAllowed(path, source) {
  return source.exts.includes(extname(path));
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let body = "";
    let rejected = false;
    req.on("data", (chunk) => {
      if (rejected) return;
      body += chunk;
      if (body.length > 1_000_000) {
        rejected = true;
        req.destroy();
        reject(httpError(413, "Request too large"));
      }
    });
    req.on("end", () => {
      if (!rejected) resolveBody(body);
    });
    req.on("error", (error) => {
      if (!rejected) reject(error);
    });
  });
}

function sendJson(res, value, status = 200) {
  res.writeHead(status, { ...securityHeaders(), "content-type": "application/json; charset=utf-8" });
  res.end(`${JSON.stringify(value, null, 2)}\n`);
}

function notFound(res) {
  res.writeHead(404, { ...securityHeaders(), "content-type": "text/plain; charset=utf-8" });
  res.end("Not found");
}

function securityHeaders() {
  return {
    "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    "cross-origin-resource-policy": "same-origin",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  };
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.expose = true;
  return error;
}
