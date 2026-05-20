#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, "../..");
export const ANNOTATIONS_ROOT = join(ROOT, "experiments/wiki-agent-orchestration/evidence/annotations");

const SEARCH_ROOTS = [
  "README.md",
  "CONTEXT.md",
  "WIKI_METHOD.md",
  "wiki",
  "specs",
  "decisions",
  "tasks",
  "skills",
  "prompts",
  "templates",
  "scripts",
  "tests",
  "experiments/wiki-agent-orchestration",
];

const RG_GLOBS = [
  "!.git/**",
  "!node_modules/**",
  "!wiki/_site/**",
  "!experiments/wiki-agent-orchestration/evidence/**",
  "!experiments/wiki-agent-orchestration/mini-ui/public/*.map",
];

const STATUSES = new Set(["new", "triaged", "in_progress", "resolved", "parked", "discarded"]);

export function searchProject({ query, regex = false, maxResults = 50, roots: inputRoots } = {}) {
  const pattern = String(query || "").trim();
  if (!pattern) throw new Error("Search query is required");
  const hasCustomRoots = Array.isArray(inputRoots);
  const searchRoots = normalizeSearchRoots(inputRoots);
  const roots = (hasCustomRoots ? searchRoots : SEARCH_ROOTS).filter((path) => existsSync(join(ROOT, path)));
  if (!roots.length) return emptySearchResult(pattern, regex, maxResults);
  const args = [
    "--json",
    "--line-number",
    "--column",
    "--color",
    "never",
    "--max-count",
    "20",
  ];
  if (!regex) args.push("--fixed-strings");
  for (const glob of RG_GLOBS) args.push("--glob", glob);
  args.push("--", pattern, ...roots);

  const result = spawnSync("rg", args, {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 5000,
    maxBuffer: 2_000_000,
  });

  if (result.error) throw new Error(`rg failed: ${result.error.message}`);
  if (result.status > 1) throw new Error((result.stderr || "rg search failed").trim());

  const matches = [];
  for (const line of result.stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const event = JSON.parse(line);
    if (event.type !== "match") continue;
    const data = event.data;
    matches.push({
      path: normalize(data.path.text),
      line: data.line_number,
      column: firstColumn(data),
      text: data.lines.text.trimEnd(),
    });
    if (matches.length >= maxResults) break;
  }

  return {
    query: pattern,
    regex: Boolean(regex),
    generatedAt: new Date().toISOString(),
    maxResults,
    resultCount: matches.length,
    truncated: matches.length >= maxResults,
    results: matches,
  };
}

function emptySearchResult(pattern, regex, maxResults) {
  return {
    query: pattern,
    regex: Boolean(regex),
    generatedAt: new Date().toISOString(),
    maxResults,
    resultCount: 0,
    truncated: false,
    results: [],
  };
}

function normalizeSearchRoots(inputRoots) {
  if (!Array.isArray(inputRoots)) return [];
  return [...new Set(inputRoots.map((path) => requireRepoPath(path, { mustExist: false })))];
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
  const relativePath = annotationRelativePath(annotationId);
  writeFileSync(join(ROOT, relativePath), `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return { path: relativePath, annotation: record };
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
  const file = join(ANNOTATIONS_ROOT, `${annotationId}.json`);
  if (!existsSync(file)) throw new Error(`Annotation not found: ${annotationId}`);
  return normalizeAnnotationRecord(JSON.parse(readFileSync(file, "utf8")));
}

export function deleteAnnotation(id) {
  const annotation = readAnnotation(id);
  if (annotation.agentReport || ["resolved", "discarded"].includes(annotation.status)) {
    throw new Error("Processed annotations cannot be deleted from the working queue");
  }
  unlinkSync(join(ANNOTATIONS_ROOT, `${annotation.annotationId}.json`));
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
  writeFileSync(join(ANNOTATIONS_ROOT, `${annotation.annotationId}.json`), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

function normalizeAnnotationRecord(record) {
  return {
    ...record,
    agentReport: record.agentReport ?? null,
  };
}

function firstColumn(data) {
  const submatch = data.submatches?.[0];
  return Number.isInteger(submatch?.start) ? submatch.start + 1 : data.column || 1;
}

function requireRepoPath(input, { mustExist = true } = {}) {
  if (!input) throw new Error("Path is required");
  const normalized = normalize(String(input));
  if (isAbsolute(normalized)) throw new Error("Absolute paths are not allowed");
  const absolute = resolve(ROOT, normalized);
  const relativePath = relative(ROOT, absolute);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) throw new Error("Path outside repository");
  if (relativePath === ".git" || relativePath.startsWith(".git/")) throw new Error("Git internals are not valid targets");
  if (relativePath === "node_modules" || relativePath.startsWith("node_modules/")) throw new Error("node_modules is not a valid target");
  if (mustExist && (!existsSync(absolute) || !statSync(absolute).isFile())) throw new Error(`Target file not found: ${relativePath}`);
  return relativePath;
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

function annotationRelativePath(annotationId) {
  return `experiments/wiki-agent-orchestration/evidence/annotations/${annotationId}.json`;
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

function parseArgs(args) {
  const parsed = { _: [] };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      parsed._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
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
  node experiments/wiki-agent-orchestration/wiki-tools.mjs search <query> [--regex] [--json]
  node experiments/wiki-agent-orchestration/wiki-tools.mjs history --path <repo-path> [--json]
  node experiments/wiki-agent-orchestration/wiki-tools.mjs annotate --path <repo-path> --note <text> [--text <selected>] [--line-start <n>] [--line-end <n>]
  node experiments/wiki-agent-orchestration/wiki-tools.mjs list [--status <status>] [--json]
  node experiments/wiki-agent-orchestration/wiki-tools.mjs show <annotation-id>
  node experiments/wiki-agent-orchestration/wiki-tools.mjs take <annotation-id> [--by <agent>]
  node experiments/wiki-agent-orchestration/wiki-tools.mjs claim-next [--by <agent>]
  node experiments/wiki-agent-orchestration/wiki-tools.mjs resolve <annotation-id> [--note <text>] [--by <agent>]
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
  if (command === "search") {
    print(searchProject({ query: args._.join(" "), regex: Boolean(args.regex) }), asJson);
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
