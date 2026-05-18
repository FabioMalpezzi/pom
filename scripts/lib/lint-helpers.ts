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
