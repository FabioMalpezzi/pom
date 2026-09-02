import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";

export const ADR_INDEX_SUMMARY_MAX_LENGTH = 250;

export function resolveTemplatePath(root: string, path: string): string | undefined {
  const direct = join(root, path);
  if (existsSync(direct)) return direct;

  if (path.startsWith("pom/")) {
    const local = join(root, path.slice("pom/".length));
    if (existsSync(local)) return local;
  }

  return undefined;
}

export function sectionsFromTemplate(root: string, path: string): string[] {
  const resolved = resolveTemplatePath(root, path);
  if (!resolved) return [];
  const text = readFileSync(resolved, "utf8");
  return [...text.matchAll(/^## [^\n]+/gm)].map((match) => match[0].trim());
}

export function pathExists(root: string, path: string): boolean {
  return existsSync(join(root, path));
}

export function readText(root: string, path: string): string {
  return readFileSync(join(root, path), "utf8");
}

export function listDir(root: string, path: string): string[] {
  if (!pathExists(root, path)) return [];
  return readdirSync(join(root, path)).sort();
}

export function walkFiles(
  root: string,
  dir: string,
  predicate: (path: string) => boolean = () => true,
): string[] {
  if (!pathExists(root, dir)) return [];

  const results: string[] = [];
  const stack = [dir];

  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const entry of readdirSync(join(root, current))) {
      const full = join(current, entry);
      const stat = statSync(join(root, full));
      if (stat.isDirectory()) {
        if (entry === ".git" || entry === "node_modules" || entry === ".obsidian") continue;
        stack.push(full);
      } else if (predicate(full)) {
        results.push(full);
      }
    }
  }

  return results.sort();
}

export function gitChangedFiles(
  root: string,
  onError: (message: string) => void,
): Set<string> {
  try {
    const output = execFileSync("git", ["status", "--porcelain"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    const changed = new Set<string>();
    for (const line of output.split("\n")) {
      if (!line.trim()) continue;
      const raw = line.slice(3).trim();
      const renamed = raw.includes(" -> ") ? raw.split(" -> ").at(-1)! : raw;
      changed.add(renamed);
    }
    return changed;
  } catch {
    onError("Unable to read git status; Git-based checks were skipped.");
    return new Set();
  }
}

export function stripMarkdownCode(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]+`/g, "");
}

export function configuredIndexPath(configuredPath: string, folderRoot: string): string {
  const value = configuredPath && configuredPath.trim() ? configuredPath : defaultFolderIndexPath(folderRoot);
  return normalize(value).replace(/\\/g, "/");
}

export function defaultFolderIndexPath(folderRoot: string): string {
  const cleanRoot = normalize(folderRoot).replace(/\\/g, "/").replace(/\/$/, "");
  const folderName = cleanRoot.split("/").filter(Boolean).at(-1) || "index";
  return `${cleanRoot}/${folderName.toUpperCase()}_INDEX.md`;
}

export function expectedFolderIndexName(indexPath: string): string {
  const parent = dirname(normalize(indexPath).replace(/\\/g, "/"));
  const folderName = parent.split("/").filter(Boolean).at(-1) || "index";
  return `${folderName.toUpperCase()}_INDEX.md`;
}

export function isSamePathOrInside(path: string, root: string): boolean {
  const cleanPath = normalize(path).replace(/\\/g, "/").replace(/\/$/, "");
  const cleanRoot = normalize(root).replace(/\\/g, "/").replace(/\/$/, "");
  return cleanPath === cleanRoot || cleanPath.startsWith(`${cleanRoot}/`);
}

export function markdownCell(value: string): string {
  return value.replace(/\|/g, "\\|").trim() || "-";
}

export function truncateSummary(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= ADR_INDEX_SUMMARY_MAX_LENGTH) return normalized;
  return `${normalized.slice(0, ADR_INDEX_SUMMARY_MAX_LENGTH - 3).trimEnd()}...`;
}

export function relativeFromIndex(indexPath: string, file: string): string {
  const indexDir = dirname(indexPath);
  let link = relative(indexDir, file).replace(/\\/g, "/");
  if (!link.startsWith(".") && !link.startsWith("/")) {
    link = `./${link}`;
  }
  return link;
}

export type Frontmatter = {
  /** Scalar values as written; list values as arrays of their items. */
  fields: Map<string, string | string[]>;
  /** Whether the file starts with a `---` block at all. */
  present: boolean;
};

/**
 * Parse the optional YAML-like frontmatter block at the top of a Markdown file.
 * Supports `key: value` scalars, `key: a, b` inline lists (only for keys read
 * as lists by the caller), and block lists written as `key:` followed by `- item`
 * lines. Comments (`# ...`) and unknown shapes are ignored. Values are returned
 * verbatim, without quotes.
 */
export function parseFrontmatter(text: string): Frontmatter {
  const fields = new Map<string, string | string[]>();
  const normalized = text.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (!match) return { fields, present: false };

  let currentList: string[] | undefined;
  for (const rawLine of match[1].split("\n")) {
    const line = rawLine.replace(/\s+#.*$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && currentList) {
      currentList.push(unquote(item[1]));
      continue;
    }

    const scalar = line.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
    if (!scalar) continue;
    const key = scalar[1];
    const value = unquote(scalar[2]);
    if (value) {
      fields.set(key, value);
      currentList = undefined;
    } else {
      currentList = [];
      fields.set(key, currentList);
    }
  }

  return { fields, present: true };
}

/** Read a frontmatter field as a list, accepting block lists and comma-separated scalars. */
export function frontmatterList(frontmatter: Frontmatter, key: string): string[] {
  const value = frontmatter.fields.get(key);
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function frontmatterScalar(frontmatter: Frontmatter, key: string): string | undefined {
  const value = frontmatter.fields.get(key);
  return typeof value === "string" ? value : undefined;
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/**
 * Committer time (epoch milliseconds) of the last commit touching `path`,
 * which may be a file or a directory. Undefined when the path has no commits
 * or Git is unavailable.
 */
export function gitLastCommitTime(root: string, path: string): number | undefined {
  try {
    const output = execFileSync("git", ["log", "-1", "--format=%ct", "--", path], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!output) return undefined;
    const seconds = Number(output);
    return Number.isFinite(seconds) ? seconds * 1000 : undefined;
  } catch {
    return undefined;
  }
}

/** Normalize a repository-relative path written by hand: no `./`, no trailing slash, forward slashes. */
export function cleanRelativePath(path: string): string {
  return normalize(path.trim())
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+$/, "");
}
