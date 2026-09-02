#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, isAbsolute, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hasArg, positionalArgs, readRawArg } from "../lib/cli-args.mjs";
import { createSourceContext } from "./adapters/index.mjs";
import { createProjectReaderCore } from "./core.mjs";

export let ROOT = resolve(process.cwd());
export let ANNOTATIONS_ROOT = annotationsRootFor(ROOT);

// Search and path guards are delegated to the Project Reader core, so the CLI
// and the server look at the same roots (profile/adapter) with the same rules.
let profile = "auto";
let reader = null;

const STATUSES = new Set(["new", "triaged", "in_progress", "resolved", "parked", "discarded"]);

export function setProjectRoot(path) {
  const root = resolve(String(path || "."));
  if (!existsSync(root) || !statSync(root).isDirectory()) throw new Error(`Project root not found: ${root}`);
  ROOT = root;
  ANNOTATIONS_ROOT = annotationsRootFor(ROOT);
  reader = null;
  return ROOT;
}

export function setProjectProfile(value) {
  profile = String(value || "auto");
  reader = null;
  return profile;
}

// Lets the server share its reader instead of building a second one.
export function setProjectReader(instance) {
  reader = instance;
  return reader;
}

export function setAnnotationsRoot(path) {
  ANNOTATIONS_ROOT = resolveAnnotationRoot(path);
  return ANNOTATIONS_ROOT;
}

function projectReader() {
  if (!reader) {
    reader = createProjectReaderCore({ root: ROOT, sourceContext: createSourceContext({ root: ROOT, profile }) });
  }
  return reader;
}

export function searchProject({ query, regex = false, maxResults = 50, kind = "all" } = {}) {
  return projectReader().search({ query, regex, maxResults, kind });
}

export function gitHistory({ path, maxResults = 30 } = {}) {
  const safePath = requireRepoPath(path, { mustExist: false });
  const result = spawnSync("git", ["log", "--oneline", "--decorate", `-${maxResults}`, "--", safePath], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 5000,
    maxBuffer: 1_000_000,
  });
  if (result.error) throw new Error(`git log failed: ${result.error.message}`);
  if (result.status !== 0) throw new Error((result.stderr || "git log failed").trim());
  return {
    path: safePath,
    generatedAt: new Date().toISOString(),
    commits: result.stdout.split(/\r?\n/).filter(Boolean),
  };
}

export function createAnnotation(input = {}) {
  const now = new Date().toISOString();
  const target = input.target || {};
  const targetPath = requireRepoPath(target.path || input.path);
  const annotation = String(input.annotation || input.note || "").trim();
  if (!annotation) throw new Error("Annotation text is required");

  const annotationId = `annotation-${compactTimestamp(now)}-${safeId(basename(targetPath))}`;
  const record = {
    schemaVersion: "0.1",
    annotationId,
    createdAt: now,
    updatedAt: now,
    status: normalizeStatus(input.status || "new"),
    target: {
      path: targetPath,
      kind: String(target.kind || input.kind || "other"),
      heading: String(target.heading || input.heading || "").trim(),
      lineStart: optionalNumber(target.lineStart ?? input.lineStart),
      lineEnd: optionalNumber(target.lineEnd ?? input.lineEnd),
    },
    selectedText: String(input.selectedText || input.text || "").trim(),
    annotation,
    requestedAction: String(input.requestedAction || "").trim(),
    source: String(input.source || "manual").trim(),
    takenBy: null,
    takenAt: null,
    resolvedAt: null,
    resolution: "",
    agentReport: null,
    history: [
      {
        at: now,
        status: normalizeStatus(input.status || "new"),
        by: String(input.by || input.author || "unknown"),
        note: "created",
      },
    ],
  };

  mkdirSync(ANNOTATIONS_ROOT, { recursive: true });
  writeFileSync(annotationFilePath(annotationId), `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return { path: annotationDisplayPath(annotationId), annotation: record };
}

export function listAnnotations({ status } = {}) {
  if (!existsSync(ANNOTATIONS_ROOT)) return [];
  return readdirSync(ANNOTATIONS_ROOT)
    .filter((name) => name.endsWith(".json"))
    .map((name) => readAnnotation(name.replace(/\.json$/, "")))
    .filter((annotation) => !status || annotation.status === normalizeStatus(status))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export function readAnnotation(id) {
  const annotationId = safeAnnotationId(id);
  const file = annotationFilePath(annotationId);
  if (!existsSync(file)) throw new Error(`Annotation not found: ${annotationId}`);
  return normalizeAnnotationRecord(JSON.parse(readFileSync(file, "utf8")));
}

export function deleteAnnotation(id) {
  const annotation = readAnnotation(id);
  if (annotation.agentReport || ["resolved", "discarded"].includes(annotation.status)) {
    throw new Error("Processed annotations cannot be deleted from the working queue");
  }
  unlinkSync(annotationFilePath(annotation.annotationId));
  return { deleted: true, annotationId: annotation.annotationId };
}

export function takeAnnotation(id, { by = "agent" } = {}) {
  return updateAnnotationStatus(id, "in_progress", {
    by,
    note: "taken in charge",
    extra: {
      takenBy: by,
      takenAt: new Date().toISOString(),
    },
  });
}

export function updateAnnotationStatus(id, status, { by = "agent", note = "", extra = {} } = {}) {
  const annotation = readAnnotation(id);
  const nextStatus = normalizeStatus(status);
  const now = new Date().toISOString();
  const next = {
    ...annotation,
    ...extra,
    status: nextStatus,
    updatedAt: now,
    history: [
      ...(Array.isArray(annotation.history) ? annotation.history : []),
      {
        at: now,
        status: nextStatus,
        by,
        note,
      },
    ],
  };
  if (nextStatus === "resolved" && !next.resolvedAt) next.resolvedAt = now;
  if (nextStatus === "resolved") {
    next.agentReport = {
      processedAt: now,
      by,
      summary: note || next.resolution || "resolved",
    };
  }
  writeFileSync(annotationFilePath(annotation.annotationId), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

function normalizeAnnotationRecord(record) {
  return {
    ...record,
    agentReport: record.agentReport ?? null,
  };
}

function requireRepoPath(input, options) {
  return projectReader().requireRepoPath(input, options);
}

function normalizeStatus(status) {
  const value = String(status || "").trim();
  if (!STATUSES.has(value)) throw new Error(`Invalid annotation status: ${value}`);
  return value;
}

function optionalNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) throw new Error(`Invalid line number: ${value}`);
  return number;
}

function annotationFilePath(annotationId) {
  return join(ANNOTATIONS_ROOT, `${annotationId}.json`);
}

function annotationDisplayPath(annotationId) {
  const file = annotationFilePath(annotationId);
  const relativePath = relative(ROOT, file);
  if (relativePath && !relativePath.startsWith("..") && !isAbsolute(relativePath)) return normalize(relativePath);
  return file;
}

function annotationsRootFor(root) {
  return join(root, ".pom-reader/annotations");
}

function resolveAnnotationRoot(path) {
  const input = String(path || "").trim();
  if (!input) throw new Error("Annotation directory is required");
  const directory = isAbsolute(input) ? normalize(input) : resolve(ROOT, input);
  const relativePath = relative(ROOT, directory);
  if (relativePath && !relativePath.startsWith("..") && !isAbsolute(relativePath)) {
    if (relativePath === ".git" || relativePath.startsWith(".git/")) throw new Error("Git internals are not a valid annotation directory");
    if (relativePath === "node_modules" || relativePath.startsWith("node_modules/")) throw new Error("node_modules is not a valid annotation directory");
  }
  return directory;
}

function safeAnnotationId(value) {
  const id = String(value || "").replace(/\.json$/, "");
  if (!/^annotation-[a-z0-9-]+$/.test(id)) throw new Error(`Invalid annotation id: ${value}`);
  return id;
}

function compactTimestamp(value) {
  return value.replace(/[-:.TZ]/g, "");
}

function safeId(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
}

const VALUE_OPTIONS = ["root", "dir", "annotations-dir", "profile", "kind", "path", "note", "text", "line-start", "line-end", "by", "status"];
const BOOLEAN_OPTIONS = ["json", "regex"];

function parseArgs(args) {
  const parsed = { _: positionalArgs(args, VALUE_OPTIONS) };
  for (const name of VALUE_OPTIONS) {
    const value = readRawArg(name, args);
    if (value !== undefined) parsed[name] = value;
  }
  for (const name of BOOLEAN_OPTIONS) parsed[name] = hasArg(name, args);
  return parsed;
}

function print(value, asJson = false) {
  if (asJson) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }
  if (Array.isArray(value)) {
    if (!value.length) {
      console.log("No annotations.");
      return;
    }
    for (const annotation of value) {
      console.log(`${annotation.annotationId}  ${annotation.status}  ${annotation.target.path}`);
      console.log(`  ${annotation.annotation}`);
    }
    return;
  }
  console.log(JSON.stringify(value, null, 2));
}

function usage() {
  console.log(`Usage:
  Run from the project root, or pass --root <project-root>.
  If POM is installed under pom/, prefix the script path with pom/.
  Annotation files default to .pom-reader/annotations under the project root.
  Search uses the Project Reader roots for the project (--profile auto|pom|generic).

  node scripts/project-reader/wiki-tools.mjs search <query> [--regex] [--kind <kind>] [--json] [--root <project-root>] [--profile <profile>]
  node scripts/project-reader/wiki-tools.mjs history --path <repo-path> [--json] [--root <project-root>]
  node scripts/project-reader/wiki-tools.mjs annotate --path <repo-path> --note <text> [--text <selected>] [--line-start <n>] [--line-end <n>] [--root <project-root>] [--annotations-dir <dir>]
  node scripts/project-reader/wiki-tools.mjs list [--status <status>] [--json] [--root <project-root>] [--annotations-dir <dir>]
  node scripts/project-reader/wiki-tools.mjs show <annotation-id> [--root <project-root>] [--annotations-dir <dir>]
  node scripts/project-reader/wiki-tools.mjs take <annotation-id> [--by <agent>] [--root <project-root>] [--annotations-dir <dir>]
  node scripts/project-reader/wiki-tools.mjs claim-next [--by <agent>] [--root <project-root>] [--annotations-dir <dir>]
  node scripts/project-reader/wiki-tools.mjs resolve <annotation-id> [--note <text>] [--by <agent>] [--root <project-root>] [--annotations-dir <dir>]
`);
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  const asJson = Boolean(args.json);

  if (!command || command === "help" || command === "--help") {
    usage();
    return;
  }
  if (args.root || args.dir) setProjectRoot(args.root || args.dir);
  if (args.profile) setProjectProfile(args.profile);
  if (args["annotations-dir"]) setAnnotationsRoot(args["annotations-dir"]);
  if (command === "search") {
    print(searchProject({ query: args._.join(" "), regex: Boolean(args.regex), kind: args.kind || "all" }), asJson);
    return;
  }
  if (command === "history") {
    print(gitHistory({ path: args.path }), asJson);
    return;
  }
  if (command === "annotate") {
    print(createAnnotation({
      path: args.path,
      annotation: args.note,
      selectedText: args.text,
      lineStart: args["line-start"],
      lineEnd: args["line-end"],
      source: "cli",
      by: args.by || "cli",
    }), asJson);
    return;
  }
  if (command === "list") {
    print(listAnnotations({ status: args.status }), asJson);
    return;
  }
  if (command === "show") {
    print(readAnnotation(args._[0]), asJson);
    return;
  }
  if (command === "take") {
    print(takeAnnotation(args._[0], { by: args.by || "agent" }), asJson);
    return;
  }
  if (command === "claim-next") {
    const next = listAnnotations().find((annotation) => ["new", "triaged"].includes(annotation.status));
    if (!next) throw new Error("No open annotation found");
    print(takeAnnotation(next.annotationId, { by: args.by || "agent" }), asJson);
    return;
  }
  if (command === "resolve") {
    print(updateAnnotationStatus(args._[0], "resolved", {
      by: args.by || "agent",
      note: args.note || "resolved",
      extra: { resolution: args.note || "" },
    }), asJson);
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
