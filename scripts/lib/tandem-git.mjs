// Git plumbing for `pom:tandem`: the controller worktree and the guard that
// proves the controller never touched the executor workspace.
//
// The controller reviews inside its own Git worktree, checked out detached at
// the executor's HEAD (a branch cannot be checked out twice in one repository)
// with the executor's uncommitted changes applied as a patch. Sequence used by
// every review, all from the project root unless `-C` says otherwise:
//
//   init      git worktree add --detach <ctrl> HEAD
//   review    git status --porcelain=v1 --untracked-files=all -- . :(exclude)<dir> :(exclude)collaboration   (fingerprint, before)
//             git diff HEAD --binary -- . :(exclude)...                              (fingerprint + patch)
//             git ls-files --others --exclude-standard -z -- . :(exclude)...         (fingerprint + untracked copy)
//             git ls-files --others --ignored --exclude-standard -z -- . :(exclude)...   (fingerprint: ignored files too)
//             git -C <ctrl> checkout --detach -q <commit>
//             git -C <ctrl> reset --hard -q <commit>
//             git -C <ctrl> clean -fdq                                              (ignored files survive, e.g. node_modules)
//             git -C <ctrl> apply --binary --whitespace=nowarn <patch>              (only when the diff is non-empty)
//             <copy of untracked files into <ctrl>>
//             GIT_INDEX_FILE=<tmp> git -C <ctrl> add -A                             (snapshot of what the controller received)
//             ... controller call ...
//             GIT_INDEX_FILE=<tmp> git -C <ctrl> diff / ls-files --others           (what the controller left behind)
//             git -C <ctrl> reset --hard -q HEAD
//             git -C <ctrl> clean -fdq
//             <fingerprint, after: must equal before, otherwise exit 4>
//   close     git worktree remove --force <ctrl>
//
// `<dir>` is the collaboration folder (BRIEF, LEDGER, turns, sessions): the
// script itself writes there during a review, so it is excluded from the
// fingerprint and the patch, together with every other `collaboration/*`
// folder so that two tandems running side by side do not trip each other.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

/** Folder that holds every tandem by default; always excluded from the executor fingerprint. */
export const COLLABORATION_ROOT = "collaboration";
/** Ignored files that change on their own (server logs, pid files) never count in the fingerprint. */
export const DEFAULT_GUARD_IGNORE = ["*.log", "*.pid"];

/**
 * Minimal glob matcher for `--guard-ignore`: `**` spans folders, `*` and `?`
 * stay within one segment; a pattern without `/` matches the file name in
 * any folder, like a .gitignore line.
 */
export function globMatches(pattern, path) {
  let source = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === "*" && pattern[index + 1] === "*") {
      const slashAfter = pattern[index + 2] === "/";
      source += slashAfter ? "(?:.*/)?" : ".*";
      index += slashAfter ? 2 : 1;
    } else if (char === "*") source += "[^/]*";
    else if (char === "?") source += "[^/]";
    else source += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${source}$`).test(pattern.includes("/") ? path : basename(path));
}

/**
 * @param {string} cwd
 * @param {string[]} args
 * @param {{ allowFailure?: boolean, env?: Record<string, string> }} [options]
 * @returns {string}
 */
export function git(cwd, args, { allowFailure = false, env } = {}) {
  try {
    return execFileSync("git", args, {
      cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024,
      env: env ? { ...process.env, ...env } : process.env,
    });
  } catch (error) {
    if (allowFailure) return "";
    const stderr = error && error.stderr ? String(error.stderr).trim() : "";
    throw new Error(`git ${args.join(" ")} failed${stderr ? `: ${stderr}` : ""}`);
  }
}

export function isGitWorktree(root) {
  return git(root, ["rev-parse", "--is-inside-work-tree"], { allowFailure: true }).trim() === "true";
}

export function headCommit(root) {
  const commit = git(root, ["rev-parse", "--verify", "HEAD"], { allowFailure: true }).trim();
  return commit || null;
}

export function currentBranch(root) {
  const branch = git(root, ["rev-parse", "--abbrev-ref", "HEAD"], { allowFailure: true }).trim();
  return branch && branch !== "HEAD" ? branch : null;
}

/** Path relative to `root` with forward slashes, or null when `path` is outside `root`. */
export function insideRoot(root, path) {
  const rel = relative(root, path).split("\\").join("/");
  return rel && !rel.startsWith("..") && !rel.includes(":") ? rel : null;
}

/** Pathspec that keeps the collaboration folders out of status, diff, and untracked listings. */
function excluding(root, excludeDir) {
  const rel = insideRoot(root, excludeDir);
  const excluded = new Set([COLLABORATION_ROOT, ...(rel ? [rel] : [])]);
  return [".", ...[...excluded].map((path) => `:(exclude)${path}`)];
}

/** `git worktree add --detach <path> HEAD` (the folder must not exist yet). */
export function createControllerWorktree(root, worktreePath) {
  if (existsSync(worktreePath)) throw new Error(`Controller worktree path already exists: ${worktreePath}`);
  mkdirSync(dirname(worktreePath), { recursive: true });
  git(root, ["worktree", "add", "--detach", worktreePath, "HEAD"]);
}

export function removeControllerWorktree(root, worktreePath) {
  if (!existsSync(worktreePath)) return false;
  git(root, ["worktree", "remove", "--force", worktreePath]);
  git(root, ["worktree", "prune"], { allowFailure: true });
  return true;
}

function hashOf(content) {
  return createHash("sha256").update(content).digest("hex");
}

function hashFile(path) {
  return existsSync(path) ? hashOf(readFileSync(path)) : "(missing)";
}

/** Ignored files are not read (they can be huge: caches, archives); size and mtime identify them. */
function statFile(path) {
  if (!existsSync(path)) return "(missing)";
  const stat = statSync(path);
  return `${stat.size}:${stat.mtimeMs}`;
}

/**
 * Snapshot of the executor workspace outside the collaboration folders:
 * porcelain status, a hash of the tracked diff, one content hash per file
 * that is modified or untracked, and size plus mtime for every ignored file.
 * Paths matching a `guardIgnore` glob are left out; ignored files also skip
 * DEFAULT_GUARD_IGNORE. Two snapshots are equal only if nothing changed;
 * `fingerprintDifferences` names the paths that did.
 * @returns {{ status: string, diff: string, files: Record<string, string> }}
 */
export function workspaceFingerprint(root, excludeDir, guardIgnore = []) {
  const pathspec = excluding(root, excludeDir);
  const skipped = (path, patterns) => patterns.some((pattern) => globMatches(pattern, path));
  const statusLines = git(root, ["status", "--porcelain=v1", "--untracked-files=all", "--", ...pathspec])
    .split("\n").filter(Boolean)
    .map((line) => ({ line, path: line.slice(3).split(" -> ").pop() }))
    .filter(({ path }) => !skipped(path, guardIgnore));
  const status = statusLines.map(({ line }) => line).join("\n");
  const diff = hashOf(git(root, ["diff", "HEAD", "--binary", "--", ...pathspec]));
  const files = {};
  for (const { path } of statusLines) files[path] = hashFile(join(root, path));
  for (const file of untrackedFiles(root, excludeDir)) {
    if (!skipped(file, guardIgnore)) files[file] = hashFile(join(root, file));
  }
  for (const file of ignoredFiles(root, excludeDir)) {
    if (!skipped(file, [...DEFAULT_GUARD_IGNORE, ...guardIgnore])) files[file] = statFile(join(root, file));
  }
  return { status, diff, files };
}

export function fingerprintsEqual(before, after) {
  return fingerprintDifferences(before, after).length === 0;
}

/** Paths whose state differs between two fingerprints (`(tracked diff)` when only the diff hash moved). */
export function fingerprintDifferences(before, after) {
  const paths = new Set([...Object.keys(before.files), ...Object.keys(after.files)]);
  const changed = [...paths].filter((path) => before.files[path] !== after.files[path]).sort();
  if (changed.length === 0 && (before.status !== after.status || before.diff !== after.diff)) changed.push("(tracked diff)");
  return changed;
}

function untrackedFiles(root, excludeDir) {
  const output = git(root, ["ls-files", "--others", "--exclude-standard", "-z", "--", ...excluding(root, excludeDir)]);
  return output.split("\0").filter(Boolean);
}

function ignoredFiles(root, excludeDir) {
  const output = git(root, ["ls-files", "--others", "--ignored", "--exclude-standard", "-z", "--", ...excluding(root, excludeDir)]);
  return output.split("\0").filter(Boolean);
}

/**
 * Brings the controller worktree to the executor's HEAD, then applies the
 * executor's uncommitted changes (tracked diff as a patch, untracked files by
 * copy). The patch text is saved to `patchFile` when non-empty. The result
 * is recorded in a temporary index (`indexFile`, outside the worktree) so
 * that `controllerChanges` can later isolate what the controller wrote.
 * @returns {{ commit: string, patchFile: string | null, untracked: string[], description: string }}
 */
export function syncControllerWorktree(root, worktreePath, excludeDir, patchFile, indexFile) {
  const commit = headCommit(root);
  if (!commit) throw new Error("The project has no commit yet; commit once before running a review.");
  if (!existsSync(worktreePath)) throw new Error(`Controller worktree is missing: ${worktreePath}. Run init again or restore it with git worktree add.`);
  git(worktreePath, ["checkout", "--detach", "-q", commit]);
  git(worktreePath, ["reset", "--hard", "-q", commit]);
  git(worktreePath, ["clean", "-fdq"]);

  const patch = git(root, ["diff", "HEAD", "--binary", "--", ...excluding(root, excludeDir)]);
  let savedPatch = null;
  if (patch.trim()) {
    mkdirSync(dirname(patchFile), { recursive: true });
    writeFileSync(patchFile, patch);
    git(worktreePath, ["apply", "--binary", "--whitespace=nowarn", patchFile]);
    savedPatch = patchFile;
  }
  const untracked = untrackedFiles(root, excludeDir);
  for (const file of untracked) {
    const target = join(worktreePath, file);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(root, file), target);
  }
  if (indexFile) {
    mkdirSync(dirname(indexFile), { recursive: true });
    rmSync(indexFile, { force: true });
    git(worktreePath, ["add", "-A"], { env: { GIT_INDEX_FILE: indexFile } });
  }
  const extras = [];
  if (savedPatch) extras.push("uncommitted tracked changes applied as a patch");
  if (untracked.length > 0) extras.push(`${untracked.length} untracked file(s) copied`);
  const description = `commit ${commit}${extras.length ? ` with ${extras.join(" and ")}` : ""}`;
  return { commit, patchFile: savedPatch, untracked, description };
}

/**
 * What the controller left in its worktree, relative to the snapshot taken
 * by `syncControllerWorktree`: the diff of the files it received plus the
 * files it created (added to the temporary index with intent-to-add, so the
 * diff carries their content). Empty when it wrote nothing.
 * @returns {{ diff: string, newFiles: string[] }}
 */
export function controllerChanges(worktreePath, indexFile) {
  if (!indexFile || !existsSync(indexFile)) return { diff: "", newFiles: [] };
  const env = { GIT_INDEX_FILE: indexFile };
  const newFiles = git(worktreePath, ["ls-files", "--others", "--exclude-standard", "-z"], { env, allowFailure: true }).split("\0").filter(Boolean);
  if (newFiles.length) git(worktreePath, ["add", "-N", "--", ...newFiles], { env, allowFailure: true });
  const diff = git(worktreePath, ["diff", "--binary"], { env, allowFailure: true });
  return { diff, newFiles };
}

/** Discards everything the controller left behind in its worktree (ignored files stay). */
export function restoreControllerWorktree(worktreePath, indexFile) {
  git(worktreePath, ["reset", "--hard", "-q", "HEAD"]);
  git(worktreePath, ["clean", "-fdq"]);
  if (indexFile) rmSync(indexFile, { force: true });
}
