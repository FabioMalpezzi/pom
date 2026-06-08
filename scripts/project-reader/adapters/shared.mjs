import { isAbsolute, normalize } from "node:path";

export const MARKDOWN_EXTS = [".md"];
export const DOC_EXTS = [".md", ".html", ".css", ".json", ".mjs"];
export const SOURCE_EXTS = [
  ".bash", ".c", ".cjs", ".cpp", ".cs", ".css", ".go", ".h", ".hpp", ".html", ".java",
  ".js", ".json", ".jsx", ".kt", ".kts", ".mjs", ".php", ".py", ".rb", ".rs", ".sh",
  ".sql", ".swift", ".toml", ".ts", ".tsx", ".vue", ".xml", ".yaml", ".yml", ".zsh",
];

export const KIND_ORDER = new Map([
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

export function kindRank(kind) {
  return KIND_ORDER.has(kind) ? KIND_ORDER.get(kind) : KIND_ORDER.get("other");
}

export function normalizeConfigPath(value, sourceName = "Project Reader") {
  if (typeof value !== "string") return "";
  const normalized = normalizeRepoPath(value);
  if (!normalized || normalized === ".") return "";
  if (isAbsolute(normalized) || normalized.startsWith("../") || normalized === "..") {
    throw new Error(`Invalid ${sourceName} path outside project root: ${value}`);
  }
  if (normalized === ".git" || normalized.startsWith(".git/") || normalized === "node_modules" || normalized.startsWith("node_modules/")) {
    throw new Error(`Invalid ${sourceName} path for Project Reader: ${value}`);
  }
  return normalized;
}

export function normalizeRepoPath(value) {
  return normalize(String(value || "")).replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/\/+$/, "");
}

export function pathMatchesPattern(path, pattern) {
  const normalized = normalizeRepoPath(pattern);
  if (!normalized) return false;
  if (normalized.endsWith("/**")) {
    const prefix = normalized.slice(0, -3);
    return path === prefix || path.startsWith(`${prefix}/`);
  }
  return path === normalized;
}

export function readConfigValue(config, path) {
  return path.split(".").reduce((value, key) => {
    return value && typeof value === "object" && !Array.isArray(value) ? value[key] : undefined;
  }, config);
}

export function readString(config, path) {
  const value = readConfigValue(config, path);
  return typeof value === "string" ? value : "";
}

export function readStringArray(config, path) {
  const value = readConfigValue(config, path);
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

export function dedupeDocSources(sources) {
  const byRoot = new Map();
  for (const source of sources) byRoot.set(normalizeRepoPath(source.root), source);
  return [...byRoot.values()];
}

export function ignoreGlobsFromPatterns(patterns) {
  return patterns
    .map(normalizeRepoPath)
    .filter(Boolean)
    .map((pattern) => `!${pattern}`);
}
