#!/usr/bin/env node
// Reports, and on request removes, experiment evidence that Git ignores.
//
// Convention (templates/EXPERIMENT_TEMPLATE.md, "Evidence"): raw runs,
// transcripts, dumps, and dependencies under experiments/ stay ignored and
// local; only the run-level summary an experiment cites is tracked, and a
// tracked evidence file should stay under the size limit below. This script
// makes the local weight visible and deletes it only with --delete.
//
// Usage:
//   node scripts/clean-experiment-evidence.mjs            # report only
//   node scripts/clean-experiment-evidence.mjs --delete   # remove ignored paths
//   node scripts/clean-experiment-evidence.mjs --root experiments/<topic>
//
// Source-only: this script is not installed in target projects.

import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = process.cwd();
const DEFAULT_SCOPE = "experiments";
const TRACKED_EVIDENCE_LIMIT_BYTES = 1024 * 1024;

function readArg(name) {
  const index = process.argv.findIndex((arg) => arg === `--${name}`);
  if (index >= 0) {
    const value = process.argv[index + 1];
    return value && !value.startsWith("--") ? value : "";
  }
  const inline = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return inline ? inline.slice(`--${name}=`.length) : undefined;
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function sizeOf(path) {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) return 0;
  if (!stat.isDirectory()) return stat.size;
  let total = 0;
  for (const entry of readdirSync(path)) total += sizeOf(join(path, entry));
  return total;
}

function formatBytes(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function ignoredPaths(scope) {
  const output = git(["ls-files", "--others", "--ignored", "--exclude-standard", "--directory", "-z", "--", scope]);
  const paths = output.split("\0").filter(Boolean).map((path) => path.replace(/\/$/, ""));
  // Git can list an ignored directory and, separately, ignored entries inside
  // it; keep only the top-most path so sizes are not counted twice.
  return paths.filter((path) => !paths.some((other) => other !== path && path.startsWith(`${other}/`)));
}

export function oversizedTrackedFiles(scope, limit = TRACKED_EVIDENCE_LIMIT_BYTES) {
  const output = git(["ls-files", "-z", "--", scope]);
  return output
    .split("\0")
    .filter(Boolean)
    .map((path) => ({ path, bytes: existsSync(join(ROOT, path)) ? statSync(join(ROOT, path)).size : 0 }))
    .filter((entry) => entry.bytes > limit);
}

function main() {
  const scope = readArg("root") || DEFAULT_SCOPE;
  const scopePath = resolve(ROOT, scope);
  if (!scopePath.startsWith(ROOT) || !existsSync(scopePath)) {
    console.error(`clean-experiment-evidence: ${scope} is not a directory inside the repository.`);
    process.exit(1);
  }
  const deleteMode = process.argv.includes("--delete");

  const ignored = ignoredPaths(scope).map((path) => ({ path, bytes: sizeOf(join(ROOT, path)) }));
  const totalBytes = ignored.reduce((sum, entry) => sum + entry.bytes, 0);

  console.log(`Ignored evidence under ${scope}/ (${ignored.length} path${ignored.length === 1 ? "" : "s"}, ${formatBytes(totalBytes)}):`);
  for (const entry of ignored.sort((a, b) => b.bytes - a.bytes)) {
    console.log(`  ${formatBytes(entry.bytes).padStart(9)}  ${entry.path}`);
  }
  if (ignored.length === 0) console.log("  (none)");

  const oversized = oversizedTrackedFiles(scope);
  if (oversized.length > 0) {
    console.log("");
    console.log(`Tracked files above the ${formatBytes(TRACKED_EVIDENCE_LIMIT_BYTES)} evidence limit (keep a summary, not the raw run):`);
    for (const entry of oversized.sort((a, b) => b.bytes - a.bytes)) {
      console.log(`  ${formatBytes(entry.bytes).padStart(9)}  ${entry.path}`);
    }
  }

  if (!deleteMode) {
    if (ignored.length > 0) {
      console.log("");
      console.log("Nothing was deleted. Rerun with --delete to remove the ignored paths listed above.");
    }
    return;
  }

  for (const entry of ignored) {
    rmSync(join(ROOT, entry.path), { recursive: true, force: true });
    console.log(`Removed ${entry.path}`);
  }
  console.log(`Freed ${formatBytes(totalBytes)}.`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main();
}
