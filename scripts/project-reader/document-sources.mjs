import { existsSync, readFileSync } from "node:fs";
import { extname, isAbsolute, join, normalize } from "node:path";

const MARKDOWN_EXTS = [".md"];
const DOC_EXTS = [".md", ".html", ".css", ".json", ".mjs"];
const SOURCE_EXTS = [
  ".bash", ".c", ".cjs", ".cpp", ".cs", ".css", ".go", ".h", ".hpp", ".html", ".java",
  ".js", ".json", ".jsx", ".kt", ".kts", ".mjs", ".php", ".py", ".rb", ".rs", ".sh",
  ".sql", ".swift", ".toml", ".ts", ".tsx", ".vue", ".xml", ".yaml", ".yml", ".zsh",
];

const BASE_DOC_SOURCES = [
  { root: "wiki", kind: "wiki", exts: [".md"], skipDirs: ["_site"], skipFiles: ["log.md"] },
  { root: "specs", kind: "spec", exts: [".md"] },
  { root: "decisions", kind: "decision", exts: [".md"] },
  { root: "tasks", kind: "task_plan", exts: [".md"] },
  { root: "docs", kind: "project_doc", exts: DOC_EXTS },
  { root: "examples", kind: "project_doc", exts: DOC_EXTS },
  { root: "prompts", kind: "project_doc", exts: MARKDOWN_EXTS },
  { root: "skills", kind: "project_doc", exts: MARKDOWN_EXTS },
  { root: "templates", kind: "project_doc", exts: DOC_EXTS },
  { root: "agents", kind: "project_doc", exts: MARKDOWN_EXTS },
  { root: "experiments/wiki-agent-orchestration", kind: "experiment", exts: DOC_EXTS, skipDirs: ["evidence", "fixtures"] },
  { root: "scripts", kind: "source", exts: SOURCE_EXTS },
  { root: "tests", kind: "source", exts: SOURCE_EXTS },
  { root: "bootstrap-pom.mjs", kind: "source", exts: [".mjs"] },
  { root: "package.json", kind: "source", exts: [".json"] },
  { root: "README.md", kind: "project_doc", exts: [".md"] },
  { root: "CHANGELOG.md", kind: "project_doc", exts: [".md"] },
  { root: "CONTEXT.md", kind: "project_doc", exts: [".md"] },
  { root: "WIKI_METHOD.md", kind: "project_doc", exts: [".md"] },
];

const KIND_ORDER = new Map([
  ["wiki", 0],
  ["project_doc", 1],
  ["spec", 2],
  ["decision", 3],
  ["task_plan", 4],
  ["analysis", 5],
  ["experiment", 6],
  ["source", 7],
  ["test", 8],
  ["mockup", 9],
  ["other", 12],
]);

export function buildDocumentSourceContext(root) {
  const pomConfig = loadPomConfig(root);
  return {
    docSources: buildDocSources(pomConfig),
    pomConfig,
  };
}

export function kindRank(kind) {
  return KIND_ORDER.has(kind) ? KIND_ORDER.get(kind) : KIND_ORDER.get("other");
}

export function isGeneratedPath(pomConfig, path) {
  if (!pomConfig) return false;
  const generated = readStringArray(pomConfig, "artifactPolicy.generated");
  const normalized = normalizeRepoPath(path);
  return generated.some((pattern) => pathMatchesGeneratedPattern(normalized, pattern));
}

export function generatedIgnoreGlobs(pomConfig) {
  if (!pomConfig) return [];
  return readStringArray(pomConfig, "artifactPolicy.generated")
    .map(normalizeRepoPath)
    .filter(Boolean)
    .map((pattern) => `!${pattern}`);
}

export function skippedDocumentGlobs(docSources) {
  const globs = [];
  for (const source of docSources) {
    const root = normalizeRepoPath(source.root);
    if (!root || source.fromConfig) continue;
    if (source.skipDirs) {
      for (const dir of source.skipDirs) globs.push(`!${root}/${dir}/**`);
    }
    if (source.skipFiles) {
      for (const file of source.skipFiles) globs.push(`!${root}/${file}`);
    }
  }
  return [...new Set(globs)];
}

function loadPomConfig(root) {
  const file = join(root, "pom.config.json");
  if (!existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("pom.config.json must contain a JSON object");
    return parsed;
  } catch (error) {
    throw new Error(`Invalid pom.config.json: ${error.message}`);
  }
}

function buildDocSources(config) {
  const sources = [...BASE_DOC_SOURCES];
  if (config) sources.push(...configuredDocSources(config));
  return dedupeDocSources(sources);
}

function configuredDocSources(config) {
  const sources = [];
  for (const path of readStringArray(config, "root.allowedMarkdown")) {
    addConfiguredSource(sources, path, "project_doc", [extname(path) || ".md"]);
  }
  addConfiguredSource(sources, readString(config, "documentation.officialRoot"), "project_doc", DOC_EXTS);
  for (const path of readStringArray(config, "documentation.existingRoots")) {
    addConfiguredSource(sources, path, "project_doc", DOC_EXTS);
  }
  addConfiguredSource(sources, readString(config, "decisions.root"), "decision", MARKDOWN_EXTS);
  addConfiguredSource(sources, readString(config, "taskPlans.root"), "task_plan", MARKDOWN_EXTS);
  addConfiguredSource(sources, readString(config, "analysis.root"), "analysis", MARKDOWN_EXTS);
  addConfiguredSource(sources, readString(config, "tests.root"), "test", SOURCE_EXTS);
  addConfiguredSource(sources, readString(config, "mockups.packagesDir"), "mockup", DOC_EXTS);
  for (const path of readStringArray(config, "source.roots")) {
    addConfiguredSource(sources, path, "source", SOURCE_EXTS);
  }
  return sources;
}

function addConfiguredSource(sources, value, kind, exts) {
  const root = normalizeConfigPath(value);
  if (!root) return;
  sources.push({ root, kind, exts, fromConfig: true });
}

function dedupeDocSources(sources) {
  const byRoot = new Map();
  for (const source of sources) {
    byRoot.set(normalizeRepoPath(source.root), source);
  }
  return [...byRoot.values()];
}

function readString(config, path) {
  const value = readConfigValue(config, path);
  return typeof value === "string" ? value : "";
}

function readStringArray(config, path) {
  const value = readConfigValue(config, path);
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function readConfigValue(config, path) {
  return path.split(".").reduce((value, key) => {
    return value && typeof value === "object" && !Array.isArray(value) ? value[key] : undefined;
  }, config);
}

function normalizeConfigPath(value) {
  if (typeof value !== "string") return "";
  const normalized = normalizeRepoPath(value);
  if (!normalized || normalized === ".") return "";
  if (isAbsolute(normalized) || normalized.startsWith("../") || normalized === "..") {
    throw new Error(`Invalid pom.config.json path outside project root: ${value}`);
  }
  if (normalized === ".git" || normalized.startsWith(".git/") || normalized === "node_modules" || normalized.startsWith("node_modules/")) {
    throw new Error(`Invalid pom.config.json path for Project Reader: ${value}`);
  }
  return normalized;
}

function normalizeRepoPath(value) {
  return normalize(String(value || "")).replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/\/+$/, "");
}

function pathMatchesGeneratedPattern(path, pattern) {
  const normalized = normalizeRepoPath(pattern);
  if (!normalized) return false;
  if (normalized.endsWith("/**")) {
    const prefix = normalized.slice(0, -3);
    return path === prefix || path.startsWith(`${prefix}/`);
  }
  return path === normalized;
}
