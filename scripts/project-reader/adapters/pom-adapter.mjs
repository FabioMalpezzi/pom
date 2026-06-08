import { existsSync, readFileSync } from "node:fs";
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
  readString,
  readStringArray,
} from "./shared.mjs";

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

export function createPomSourceContext(root) {
  const pomConfig = loadPomConfig(root);
  const docSources = buildDocSources(pomConfig);
  return {
    profile: "pom",
    mode: pomConfig ? "pom.config.json" : "built-in",
    readerTitle: "POM Project Reader",
    configFound: Boolean(pomConfig),
    configuredCount: docSources.filter((source) => source.fromConfig).length,
    docSources,
    config: pomConfig,
    ignoreGlobs: [
      ...generatedIgnoreGlobs(pomConfig),
      ...skippedDocumentGlobs(docSources),
    ],
    isGeneratedPath: (path) => isGeneratedPath(pomConfig, path),
    kindRank,
  };
}

export function loadPomConfig(root) {
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

export function isGeneratedPath(pomConfig, path) {
  if (!pomConfig) return false;
  const generated = readStringArray(pomConfig, "artifactPolicy.generated");
  const normalized = normalizeRepoPath(path);
  return generated.some((pattern) => pathMatchesPattern(normalized, pattern));
}

export function generatedIgnoreGlobs(pomConfig) {
  if (!pomConfig) return [];
  return ignoreGlobsFromPatterns(readStringArray(pomConfig, "artifactPolicy.generated"));
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
  const root = normalizeConfigPath(value, "pom.config.json");
  if (!root) return;
  sources.push({ root, kind, exts, fromConfig: true });
}
