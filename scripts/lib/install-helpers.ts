import type { ProjectConfig } from "./install-model.ts";

// Small pure helpers shared by the installer and the pre-commit hook builder.

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function configString(config: ProjectConfig, path: string, fallback: string): string {
  const value = path.split(".").reduce<unknown>((current, part) => {
    if (!isRecord(current)) return undefined;
    return current[part];
  }, config);
  return typeof value === "string" ? value : fallback;
}

export function configuredPath(config: ProjectConfig, path: string, fallback: string): string {
  const value = configString(config, path, fallback);
  const normalized = value.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!normalized || normalized === "." || normalized.includes("../") || normalized.startsWith("..")) return fallback;
  return normalized;
}

export function defaultDecisionIndexPath(root: string): string {
  const folderName = root.split("/").filter(Boolean).at(-1) || "decisions";
  return `${root}/${folderName.toUpperCase()}_INDEX.md`;
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

export function firstPathSegment(path: string): string {
  return path.split("/").filter(Boolean)[0] ?? path;
}
