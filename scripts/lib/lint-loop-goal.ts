// Loop-goal evaluation checks.
//
// A loop-goal evaluation is a Markdown document that judges a run against
// the criteria contract of an experiment. The verdict is only meaningful if
// the reader can tell exactly which criteria were judged, so the document
// freezes them in its frontmatter:
//
//   ---
//   type: loop-goal-evaluation
//   evaluator: <id>
//   independent_context: true | false
//   criteria_path: <repo-relative path>
//   criteria_commit: <full SHA>
//   ---
//
// This module scans the configured roots for such documents and verifies
// that the frozen reference is well formed, points at a real file, names a
// commit that actually changed that file, and that the file has not moved
// on since. It runs only when workflows.enabled and workflows.loopGoal.enabled
// are both true in pom.config.json.

import { execFileSync } from "node:child_process";
import { normalize } from "node:path";

import type { LintContext } from "./lint-context.ts";
import { pathExists, readText, walkFiles } from "./lint-helpers.ts";

const EVALUATION_TYPE = "loop-goal-evaluation";
const FULL_SHA = /^[0-9a-f]{40}$/;

type Frontmatter = Record<string, string>;

type Evaluation = {
  file: string;
  frontmatter: Frontmatter;
};

type GitProbe = {
  commitExists: (sha: string) => boolean;
  commitTouches: (sha: string, path: string) => boolean;
  worktreeMatches: (sha: string, path: string) => boolean;
};

export function checkLoopGoalEvaluations(context: LintContext): void {
  if (!context.loopGoalGovernanceEnabled) return;

  const evaluations = collectEvaluations(context);
  if (evaluations.length === 0) return;

  const git = createGitProbe(context.root, (message) => context.add("warning", "git-status", message));

  for (const evaluation of evaluations) {
    checkEvaluation(context, evaluation, git);
  }
}

function collectEvaluations(context: LintContext): Evaluation[] {
  const evaluations: Evaluation[] = [];
  const seen = new Set<string>();

  for (const configuredRoot of context.config.workflows.loopGoal.evaluationRoots) {
    const root = normalize(configuredRoot).replace(/\\/g, "/").replace(/\/$/, "");
    if (!root || root === "." || root.startsWith("..")) continue;

    for (const file of walkFiles(context.root, root, (path) => path.endsWith(".md"))) {
      if (seen.has(file)) continue;
      seen.add(file);

      const frontmatter = parseFrontmatter(readText(context.root, file));
      if (!frontmatter || frontmatter.type !== EVALUATION_TYPE) continue;
      evaluations.push({ file, frontmatter });
    }
  }

  return evaluations;
}

function parseFrontmatter(text: string): Frontmatter | undefined {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return undefined;

  const frontmatter: Frontmatter = {};
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === "---") return frontmatter;
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const separator = line.indexOf(":");
    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();
    const value = stripQuotes(line.slice(separator + 1).trim());
    frontmatter[key] = value;
  }

  return undefined;
}

function stripQuotes(value: string): string {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

function checkEvaluation(context: LintContext, evaluation: Evaluation, git: GitProbe | undefined): void {
  const { file, frontmatter } = evaluation;
  const frontmatterError = (message: string): void => {
    context.add("error", "loop-goal-evaluation-frontmatter", `${file}: ${message}`, file);
  };

  let shapeIsValid = true;

  if (!frontmatter.evaluator) {
    frontmatterError("frontmatter field evaluator is missing or empty.");
    shapeIsValid = false;
  }

  const independence = frontmatter.independent_context;
  if (independence !== "true" && independence !== "false") {
    frontmatterError(
      `frontmatter field independent_context must be true or false (found "${independence ?? ""}").`,
    );
    shapeIsValid = false;
  } else if (independence === "false") {
    context.add(
      "warning",
      "loop-goal-evaluation-dependent",
      `${file} declares independent_context: false. The evaluator shared the context that produced the work, so this verdict is an agreement, not a verification; re-run it in a separate context when the outcome matters.`,
      file,
    );
  }

  const criteriaPath = normalizeRepoPath(frontmatter.criteria_path);
  if (!criteriaPath) {
    frontmatterError("frontmatter field criteria_path is missing or empty.");
    shapeIsValid = false;
  } else if (!pathExists(context.root, criteriaPath)) {
    frontmatterError(`criteria_path ${criteriaPath} does not exist.`);
    shapeIsValid = false;
  }

  const sha = frontmatter.criteria_commit ?? "";
  if (!FULL_SHA.test(sha)) {
    frontmatterError(
      `frontmatter field criteria_commit must be a full 40-hexadecimal Git SHA (found "${sha}").`,
    );
    shapeIsValid = false;
  }

  if (!shapeIsValid || !git || !criteriaPath) return;

  if (!git.commitExists(sha)) {
    context.add(
      "error",
      "loop-goal-criteria-commit",
      `${file}: criteria_commit ${sha} does not exist in this repository.`,
      file,
    );
    return;
  }

  if (!git.commitTouches(sha, criteriaPath)) {
    context.add(
      "error",
      "loop-goal-criteria-commit",
      `${file}: criteria_commit ${sha} does not touch ${criteriaPath}. Freeze the criteria at a commit that changed them (git log --format=%H -- ${criteriaPath}).`,
      file,
    );
    return;
  }

  if (!git.worktreeMatches(sha, criteriaPath)) {
    context.add(
      "error",
      "loop-goal-criteria-drift",
      `${file}: criteria changed after the evaluation froze them (${criteriaPath} differs from ${sha}). Re-run the evaluation against the current criteria or update criteria_commit.`,
      file,
    );
  }
}

function normalizeRepoPath(value: string | undefined): string | undefined {
  if (!value || !value.trim()) return undefined;
  const clean = normalize(value.trim()).replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/$/, "");
  if (!clean || clean.startsWith("/") || clean === ".." || clean.startsWith("../")) return undefined;
  return clean;
}

function createGitProbe(root: string, onError: (message: string) => void): GitProbe | undefined {
  const run = (args: string[]): { ok: boolean; stdout: string; status: number } => {
    try {
      const stdout = execFileSync("git", args, {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      return { ok: true, stdout, status: 0 };
    } catch (error) {
      const status = typeof (error as { status?: unknown }).status === "number"
        ? (error as { status: number }).status
        : -1;
      return { ok: false, stdout: "", status };
    }
  };

  if (!run(["rev-parse", "--is-inside-work-tree"]).ok) {
    onError("Unable to run git in this directory; loop-goal criteria checks were skipped.");
    return undefined;
  }

  return {
    commitExists: (sha) => run(["cat-file", "-e", `${sha}^{commit}`]).ok,
    commitTouches: (sha, path) => {
      const result = run(["log", "--format=%H", "--", path]);
      return result.ok && result.stdout.split("\n").includes(sha);
    },
    // `git diff --quiet` exits 0 when the working tree matches the commit and
    // 1 when it differs; anything else is a git failure, reported as drift so
    // that a broken check never passes silently.
    worktreeMatches: (sha, path) => run(["diff", "--quiet", sha, "--", path]).status === 0,
  };
}
