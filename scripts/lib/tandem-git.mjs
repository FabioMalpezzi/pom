// Git plumbing for `pom:tandem`: the controller worktree and the guard that
// proves the controller never touched the executor workspace.
//
// The controller reviews inside its own Git worktree, checked out detached at
// the executor's HEAD (a branch cannot be checked out twice in one repository)
// with the executor's uncommitted changes applied as a patch. Sequence used by
// every review, all from the project root unless `-C` says otherwise:
//
//   init      git worktree add --detach <ctrl> HEAD
//   review    git status --porcelain=v1 --untracked-files=all -- . :(exclude)<dir>   (fingerprint, before)
//             git diff HEAD --binary -- . :(exclude)<dir>                              (fingerprint + patch)
//             git ls-files --others --exclude-standard -z -- . :(exclude)<dir>         (fingerprint + untracked copy)
//             git -C <ctrl> checkout --detach -q <commit>
//             git -C <ctrl> reset --hard -q <commit>
//             git -C <ctrl> clean -fdq
//             git -C <ctrl> apply --binary --whitespace=nowarn <patch>                (only when the diff is non-empty)
//             <copy of untracked files into <ctrl>>
//             ... controller call ...
//             git -C <ctrl> reset --hard -q HEAD
//             git -C <ctrl> clean -fdq
//             <fingerprint, after: must equal before, otherwise exit 4>
//   close     git worktree remove --force <ctrl>
//
// `<dir>` is the collaboration folder (BRIEF, LEDGER, turns, sessions): the
// script itself writes there during a review, so it is excluded from both the
// fingerprint and the patch.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

/**
 * @param {string} cwd
 * @param {string[]} args
 * @param {{ allowFailure?: boolean }} [options]
 * @returns {string}
 */
export function git(cwd, args, { allowFailure = false } = {}) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
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

/** Pathspec that keeps the collaboration folder out of status, diff, and untracked listings. */
function excluding(root, excludeDir) {
  const rel = relative(root, excludeDir).split("\\").join("/");
  return rel && !rel.startsWith("..") ? [".", `:(exclude)${rel}`] : ["."];
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

/**
 * Snapshot of the executor workspace outside the collaboration folder:
 * porcelain status plus a hash of the tracked diff and of every untracked
 * file's content. Two snapshots are equal only if nothing changed.
 * @returns {{ status: string, hash: string }}
 */
export function workspaceFingerprint(root, excludeDir) {
  const pathspec = excluding(root, excludeDir);
  const status = git(root, ["status", "--porcelain=v1", "--untracked-files=all", "--", ...pathspec]);
  const hash = createHash("sha256");
  hash.update(git(root, ["diff", "HEAD", "--binary", "--", ...pathspec]));
  for (const file of untrackedFiles(root, excludeDir)) {
    hash.update(`\0${file}\0`);
    const path = join(root, file);
    if (existsSync(path)) hash.update(readFileSync(path));
  }
  return { status, hash: hash.digest("hex") };
}

export function fingerprintsEqual(before, after) {
  return before.status === after.status && before.hash === after.hash;
}

function untrackedFiles(root, excludeDir) {
  const output = git(root, ["ls-files", "--others", "--exclude-standard", "-z", "--", ...excluding(root, excludeDir)]);
  return output.split("\0").filter(Boolean);
}

/**
 * Brings the controller worktree to the executor's HEAD, then applies the
 * executor's uncommitted changes (tracked diff as a patch, untracked files by
 * copy). The patch text is saved to `patchFile` when non-empty.
 * @returns {{ commit: string, patchFile: string | null, untracked: string[], description: string }}
 */
export function syncControllerWorktree(root, worktreePath, excludeDir, patchFile) {
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
  const extras = [];
  if (savedPatch) extras.push("uncommitted tracked changes applied as a patch");
  if (untracked.length > 0) extras.push(`${untracked.length} untracked file(s) copied`);
  const description = `commit ${commit}${extras.length ? ` with ${extras.join(" and ")}` : ""}`;
  return { commit, patchFile: savedPatch, untracked, description };
}

/** Discards everything the controller left behind in its worktree. */
export function restoreControllerWorktree(worktreePath) {
  git(worktreePath, ["reset", "--hard", "-q", "HEAD"]);
  git(worktreePath, ["clean", "-fdq"]);
}
