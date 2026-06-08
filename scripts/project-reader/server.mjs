#!/usr/bin/env node

import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSourceContext } from "./adapters/index.mjs";
import { createProjectReaderCore, httpError } from "./core.mjs";
import { ANNOTATIONS_ROOT, createAnnotation, deleteAnnotation, listAnnotations, readAnnotation, setAnnotationsRoot, setProjectRoot, takeAnnotation } from "./wiki-tools.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(HERE, "public");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

export function startProjectReaderServer(inputOptions = {}) {
  const options = normalizeOptions(inputOptions);
  const projectRoot = setProjectRoot(options.root);
  if (options.annotationsDir) setAnnotationsRoot(options.annotationsDir);
  const sourceContext = createSourceContext({ root: projectRoot, profile: options.profile });
  const reader = createProjectReaderCore({ root: projectRoot, sourceContext });

  const server = createServer(async (req, res) => {
    try {
      assertLocalHostHeader(req);
      assertSameOriginForStateChangingRequest(req);
      const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
      if (url.pathname === "/api/status") return sendJson(res, readerStatus(reader));
      if (url.pathname === "/api/documents") return sendJson(res, reader.listDocuments());
      if (url.pathname === "/api/tree") return sendJson(res, await reader.listTree(url.searchParams.get("path") || ""));
      if (url.pathname === "/api/document") return sendJson(res, reader.readDocument(url.searchParams.get("path")));
      if (url.pathname === "/api/search") return sendJson(res, reader.search({
        query: url.searchParams.get("q"),
        regex: url.searchParams.get("regex") === "1",
        kind: url.searchParams.get("kind") || "all",
      }));
      if (url.pathname === "/api/annotations" && req.method === "GET") return sendJson(res, listAnnotations({
        status: url.searchParams.get("status") || undefined,
      }));
      if (url.pathname === "/api/annotations" && req.method === "POST") return sendJson(res, createAnnotation({
        ...JSON.parse(await readBody(req)),
        source: "project-reader",
      }));
      if (url.pathname === "/api/annotation" && req.method === "GET") return sendJson(res, readAnnotation(url.searchParams.get("id")));
      if (url.pathname === "/api/annotation" && req.method === "DELETE") return sendJson(res, deleteAnnotation(url.searchParams.get("id")));
      if (url.pathname === "/api/annotation/take" && req.method === "POST") {
        const input = JSON.parse(await readBody(req) || "{}");
        return sendJson(res, takeAnnotation(input.annotationId, { by: input.by || "agent" }));
      }
      if (url.pathname === "/favicon.ico") return noContent(res);
      return serveStatic(res, url.pathname);
    } catch (error) {
      sendJson(res, { error: error.message }, error.statusCode || 400);
    }
  });

  server.on("error", (error) => {
    for (const line of startupErrorLines(error, options)) console.error(line);
    process.exitCode = 1;
  });

  server.listen(options.port, "127.0.0.1", () => {
    const address = server.address();
    console.log(`Project Reader: http://127.0.0.1:${address.port}`);
    console.log(`Project root: ${projectRoot}`);
    console.log(`Reader profile: ${sourceContext.profile} (${sourceContext.mode})`);
    console.log(`Annotations: ${ANNOTATIONS_ROOT}`);
  });

  return { server, projectRoot, sourceContext, reader };
}

export function parseOptions(args) {
  return {
    port: parsePort(args),
    root: parseRoot(args),
    annotationsDir: parseAnnotationsDir(args),
    profile: parseProfile(args),
  };
}

export function shouldShowHelp(args) {
  return args.includes("help") || args.includes("--help") || args.includes("-h");
}

export function usage() {
  console.log(`Usage:
  node scripts/project-reader/server.mjs [--port <port>] [--root <project-root>] [--profile auto|pom|generic] [--annotations-dir <path>]

Options:
  --port <port>             Local port. Defaults to PORT or 4173.
  --root, --dir <path>      Project root to inspect. Defaults to ".".
  --profile <profile>       Reader profile. Defaults to auto.
  --annotations-dir <path>  Annotation directory. Defaults to .pom-reader/annotations under the project root.

The auto profile uses .project-reader.json when present, otherwise POM roots when pom.config.json or POM Source structure is found, otherwise a generic README/docs/src/tests fallback.
`);
}

function normalizeOptions(input) {
  return {
    port: Number(input.port || process.env.PORT || 4173),
    root: input.root || ".",
    annotationsDir: input.annotationsDir || "",
    profile: input.profile || "auto",
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

function parseProfile(args) {
  const index = args.indexOf("--profile");
  if (index === -1) return "auto";
  const value = args[index + 1];
  if (!["auto", "pom", "generic"].includes(value)) throw new Error("Invalid --profile value");
  return value;
}

function readerStatus(reader) {
  return { ...reader.status(), annotationsRoot: ANNOTATIONS_ROOT };
}

function startupErrorLines(error, launchOptions) {
  const detail = error instanceof Error ? error.message : String(error);
  const code = error && typeof error === "object" ? error.code : "";
  const syscall = error && typeof error === "object" ? error.syscall : "";
  const port = launchOptions.port;
  const bindTarget = `127.0.0.1:${port}`;

  if (code === "EADDRINUSE") {
    return [
      `Project Reader could not start because ${bindTarget} is already in use.`,
      `Stop the process using that port or choose another local port: npm run pom:reader -- --port ${nextReaderPort(port)}`,
      `Original error: ${detail}`,
    ];
  }

  if ((code === "EPERM" || code === "EACCES") && (!syscall || syscall === "listen")) {
    return [
      `Project Reader could not start because this environment blocked binding ${bindTarget}.`,
      "This is usually a local OS, container, or coding-agent sandbox permission issue, not a failed POM update.",
      `Run the command in a normal local terminal or approve the agent's local-server startup request, then open http://${bindTarget}.`,
      `Original error: ${detail}`,
    ];
  }

  return [
    `Project Reader could not start on ${bindTarget}.`,
    `Original error: ${detail}`,
  ];
}

function nextReaderPort(port) {
  return port >= 65535 ? 4173 : port + 1;
}

function serveStatic(res, pathname) {
  const clean = pathname === "/" ? "/index.html" : pathname;
  const file = resolve(PUBLIC, `.${clean}`);
  if (!pathInside(PUBLIC, file)) throw httpError(400, "Blocked path");
  if (!existsSync(file) || !statSync(file).isFile()) return notFound(res);
  const ext = extname(file);
  res.writeHead(200, {
    ...securityHeaders(),
    "content-type": MIME[ext] || "application/octet-stream",
    "cache-control": "no-store",
  });
  res.end(readFileSync(file));
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

function noContent(res) {
  res.writeHead(204, { ...securityHeaders(), "cache-control": "no-store" });
  res.end();
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

function pathInside(parent, child) {
  const relativePath = relative(parent, child);
  return !relativePath || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}

if (isDirectRun()) {
  const cliArgs = process.argv.slice(2);
  if (shouldShowHelp(cliArgs)) {
    usage();
    process.exit(0);
  }
  startProjectReaderServer(parseOptions(cliArgs));
}

function isDirectRun() {
  return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}
