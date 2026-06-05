import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { LintContext } from "./lint-context.ts";
import { walkFiles } from "./lint-helpers.ts";

const TARGET_MAX_LINES = 800;
const HARD_MAX_LINES = 1000;
const SOURCE_EXTENSIONS = new Set([".css", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const EXCLUDED_PREFIXES = [
  ".agents/",
  ".claude/",
  ".codex/",
  ".git/",
  ".pom-reader/",
  ".playwright-cli/",
  "docs/",
  "experiments/",
  "node_modules/",
  "wiki/_site/",
];

export function checkSourceFileSizes(context: LintContext): void {
  if (!isPomSourceRoot(context.root)) return;

  for (const file of walkFiles(context.root, ".", isTrackedSourceCandidate)) {
    const lines = countLines(readFileSync(join(context.root, file), "utf8"));
    if (lines > HARD_MAX_LINES) {
      context.add(
        "error",
        "source-size-hard-cap",
        `POM source files must stay at or below ${HARD_MAX_LINES} lines; split this file before continuing. Current lines: ${lines}.`,
        file,
      );
    } else if (lines >= TARGET_MAX_LINES) {
      context.add(
        "warning",
        "source-size-target",
        `POM source files should stay under ${TARGET_MAX_LINES} lines where practical. Current lines: ${lines}.`,
        file,
      );
    }
  }
}

function isPomSourceRoot(root: string): boolean {
  return [
    "bootstrap-pom.mjs",
    "scripts/install-pom.ts",
    "skills/README.md",
    "WIKI_METHOD.md",
  ].every((path) => existsSync(join(root, path)));
}

function isTrackedSourceCandidate(path: string): boolean {
  if (EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix))) return false;
  const dot = path.lastIndexOf(".");
  return dot >= 0 && SOURCE_EXTENSIONS.has(path.slice(dot));
}

function countLines(text: string): number {
  if (text.length === 0) return 0;
  const newlineCount = text.match(/\n/g)?.length ?? 0;
  return text.endsWith("\n") ? newlineCount : newlineCount + 1;
}
