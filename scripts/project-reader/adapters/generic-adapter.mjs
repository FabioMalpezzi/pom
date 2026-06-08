import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import {
  DOC_EXTS,
  MARKDOWN_EXTS,
  SOURCE_EXTS,
  dedupeDocSources,
  ignoreGlobsFromPatterns,
  kindRank,
  normalizeConfigPath,
  normalizeRepoPath,
  pathMatchesPattern,
  readStringArray,
} from "./shared.mjs";

const CONFIG_FILE = ".project-reader.json";
const FALLBACK_CANDIDATES = [
  { root: "README.md", kind: "project_doc", exts: [".md"] },
  { root: "CONTEXT.md", kind: "project_doc", exts: [".md"] },
  { root: "docs", kind: "project_doc", exts: DOC_EXTS },
  { root: "doc", kind: "project_doc", exts: DOC_EXTS },
  { root: "wiki", kind: "wiki", exts: MARKDOWN_EXTS, skipDirs: ["_site"], skipFiles: ["log.md"] },
  { root: "specs", kind: "spec", exts: MARKDOWN_EXTS },
  { root: "decisions", kind: "decision", exts: MARKDOWN_EXTS },
  { root: "adr", kind: "decision", exts: MARKDOWN_EXTS },
  { root: "tasks", kind: "task_plan", exts: MARKDOWN_EXTS },
  { root: "src", kind: "source", exts: SOURCE_EXTS },
  { root: "lib", kind: "source", exts: SOURCE_EXTS },
  { root: "app", kind: "source", exts: SOURCE_EXTS },
  { root: "packages", kind: "source", exts: SOURCE_EXTS },
  { root: "tests", kind: "test", exts: SOURCE_EXTS },
  { root: "test", kind: "test", exts: SOURCE_EXTS },
  { root: "package.json", kind: "source", exts: [".json"] },
];

export function createGenericSourceContext(root) {
  const config = loadProjectReaderConfig(root);
  const configured = configuredDocSources(config);
  const fallback = fallbackDocSources(root);
  const docSources = dedupeDocSources(config ? configured : fallback);
  const generated = readStringArray(config, "generated");
  const ignore = readStringArray(config, "ignore");
  return {
    profile: "generic",
    mode: config ? CONFIG_FILE : "generic-fallback",
    readerTitle: "Project Reader",
    configFound: Boolean(config),
    configuredCount: configured.length,
    docSources,
    config,
    ignoreGlobs: [
      ...ignoreGlobsFromPatterns(generated),
      ...ignoreGlobsFromPatterns(ignore),
    ],
    isGeneratedPath: (path) => pathMatchesAny(path, generated),
    kindRank,
  };
}

export function hasProjectReaderConfig(root) {
  return existsSync(join(root, CONFIG_FILE));
}

function loadProjectReaderConfig(root) {
  const file = join(root, CONFIG_FILE);
  if (!existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(`${CONFIG_FILE} must contain a JSON object`);
    return parsed;
  } catch (error) {
    throw new Error(`Invalid ${CONFIG_FILE}: ${error.message}`);
  }
}

function configuredDocSources(config) {
  if (!config) return [];
  const sources = [];
  for (const source of readConfiguredSources(config)) {
    const root = normalizeConfigPath(source.root, CONFIG_FILE);
    if (!root) continue;
    sources.push({
      root,
      kind: typeof source.kind === "string" ? source.kind : kindForRoot(root),
      exts: readSourceExts(source, root),
      skipDirs: readStringArray(source, "skipDirs"),
      skipFiles: readStringArray(source, "skipFiles"),
      fromConfig: true,
    });
  }
  return sources;
}

function readConfiguredSources(config) {
  const value = Array.isArray(config.sources) ? config.sources : config.documents;
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object" && !Array.isArray(item)) : [];
}

function readSourceExts(source, root) {
  const configured = Array.isArray(source.exts) ? source.exts.filter((item) => typeof item === "string" && item.startsWith(".")) : [];
  if (configured.length) return configured;
  const rootExt = extname(root);
  if (rootExt) return [rootExt];
  return source.kind === "source" || source.kind === "test" ? SOURCE_EXTS : DOC_EXTS;
}

function fallbackDocSources(root) {
  return FALLBACK_CANDIDATES.filter((source) => {
    const absolute = join(root, source.root);
    return existsSync(absolute) && (statSync(absolute).isDirectory() || statSync(absolute).isFile());
  });
}

function kindForRoot(root) {
  const top = root.split("/")[0];
  if (top === "wiki") return "wiki";
  if (top === "specs") return "spec";
  if (top === "decisions" || top === "adr") return "decision";
  if (top === "tasks") return "task_plan";
  if (top === "tests" || top === "test") return "test";
  if (["src", "lib", "app", "packages"].includes(top)) return "source";
  return "project_doc";
}

function pathMatchesAny(path, patterns) {
  const normalized = normalizeRepoPath(path);
  return patterns.some((pattern) => pathMatchesPattern(normalized, pattern));
}
