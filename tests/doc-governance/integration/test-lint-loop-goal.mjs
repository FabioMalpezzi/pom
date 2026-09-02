#!/usr/bin/env node

// Tests for scripts/lib/lint-loop-goal.ts: the loop-goal evaluation checks
// of scripts/lint-doc-governance.ts.
//
// Each scenario builds a throwaway target project under os.tmpdir() with
// pom/ symlinked to this POM source checkout and, unless stated otherwise,
// a fresh `git init`. The project enables workflows.loopGoal so that the
// module is active, commits a criteria file, and writes one evaluation
// document whose frontmatter freezes those criteria.

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { createHarness, git, makeSandbox, removeSandbox, runNode } from "../../lib/harness.mjs";

const POM_ROOT = process.cwd();
const LINT_SCRIPT = join("pom", "scripts", "lint-doc-governance.ts");
const CRITERIA_PATH = "experiments/demo-loop/design/criteria.md";
const EVALUATION_PATH = "experiments/demo-loop/evaluations/run-1.md";
const MISSING_SHA = "0".repeat(40);

const { assert, section, banner, summary } = createHarness({ name: "Doc Governance Loop-Goal Lint Tests" });

// ─── Helpers ──────────────────────────────────────────────────────────

function baseConfig(overrides = {}) {
  const config = JSON.parse(readFileSync(join(POM_ROOT, "templates", "POM_CONFIG_TEMPLATE.json"), "utf8"));
  config.ownership.mode = "owned";
  config.workflows.enabled = true;
  config.workflows.loopGoal.enabled = true;
  return deepMerge(config, overrides);
}

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value) && target[key] && typeof target[key] === "object") {
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function createProject(config, { git: withGit = true } = {}) {
  const { dir } = makeSandbox("pom-lint-loop-goal-test-");
  execFileSync("ln", ["-s", POM_ROOT, join(dir, "pom")]);
  if (withGit) git(dir, ["init", "-q"]);
  writeFileSync(join(dir, "pom.config.json"), JSON.stringify(config, null, 2));
  return dir;
}

function writeProjectFile(dir, relativePath, content) {
  const target = join(dir, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function gitCommitAll(dir, message) {
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-q", "-m", message]);
  return git(dir, ["rev-parse", "HEAD"]).trim();
}

function runLint(dir) {
  return runNode(["--experimental-strip-types", LINT_SCRIPT], { cwd: dir });
}

const cleanup = removeSandbox;

function hasRule(stdout, rule, severity) {
  const label = severity === "error" ? "ERROR" : severity === "warning" ? "WARN" : "(?:ERROR|WARN)";
  return new RegExp(`^\\[${label}\\] ${rule.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?: |$)`, "m").test(stdout);
}

function countRule(stdout, rule) {
  return [...stdout.matchAll(new RegExp(`^\\[(?:ERROR|WARN)\\] ${rule}(?: |$)`, "gm"))].length;
}

function hasAnyLoopGoalRule(stdout) {
  return /^\[(?:ERROR|WARN)\] loop-goal-/m.test(stdout);
}

function hasAnyError(stdout) {
  return /^\[ERROR\]/m.test(stdout);
}

function evaluationDocument({
  type = "loop-goal-evaluation",
  evaluator = "reviewer-1",
  independent = "true",
  criteriaPath = CRITERIA_PATH,
  commit,
} = {}) {
  const fields = [];
  if (type !== null) fields.push(`type: ${type}`);
  if (evaluator !== null) fields.push(`evaluator: ${evaluator}`);
  if (independent !== null) fields.push(`independent_context: ${independent}`);
  if (criteriaPath !== null) fields.push(`criteria_path: ${criteriaPath}`);
  if (commit !== null && commit !== undefined) fields.push(`criteria_commit: ${commit}`);
  return `---\n${fields.join("\n")}\n---\n\n# Evaluation of run 1\n\nVerdict: pass.\n`;
}

const CRITERIA_TEXT = "# Criteria\n\n- C1: the loop stops within 3 cycles.\n";

// Creates a project whose criteria are committed and returns the commit SHA.
function projectWithCommittedCriteria(overrides = {}) {
  const dir = createProject(baseConfig(overrides));
  writeProjectFile(dir, CRITERIA_PATH, CRITERIA_TEXT);
  const sha = gitCommitAll(dir, "add criteria");
  return { dir, sha };
}

// ─── Scenarios ────────────────────────────────────────────────────────

function scenarioValidEvaluation() {
  section("Scenario: a valid evaluation passes");

  const { dir, sha } = projectWithCommittedCriteria();
  try {
    writeProjectFile(dir, EVALUATION_PATH, evaluationDocument({ commit: sha }));
    const result = runLint(dir);
    assert("valid evaluation: no loop-goal finding at all", !hasAnyLoopGoalRule(result.stdout), result.stdout);
    assert("valid evaluation: no error of any kind", !hasAnyError(result.stdout), result.stdout);
    assert("valid evaluation: lint exits 0", result.status === 0, `status=${result.status}\n${result.stdout}`);
  } finally {
    cleanup(dir);
  }

  const committed = projectWithCommittedCriteria();
  try {
    writeProjectFile(committed.dir, EVALUATION_PATH, evaluationDocument({ commit: committed.sha }));
    gitCommitAll(committed.dir, "add evaluation");
    writeProjectFile(committed.dir, "experiments/demo-loop/EXPERIMENT.md", "# Demo\n\nUnrelated change.\n");
    const result = runLint(committed.dir);
    assert(
      "unrelated changes after the freeze do not count as criteria drift",
      !hasRule(result.stdout, "loop-goal-criteria-drift"),
      result.stdout,
    );
  } finally {
    cleanup(committed.dir);
  }
}

function scenarioCommitProblems() {
  section("Scenario: criteria_commit must exist and must touch the criteria");

  let project = projectWithCommittedCriteria();
  try {
    writeProjectFile(project.dir, EVALUATION_PATH, evaluationDocument({ commit: MISSING_SHA }));
    const result = runLint(project.dir);
    assert(
      "SHA that does not exist: loop-goal-criteria-commit error",
      hasRule(result.stdout, `loop-goal-criteria-commit ${EVALUATION_PATH}`, "error"),
      result.stdout,
    );
    assert("the message says the commit does not exist", result.stdout.includes("does not exist in this repository"), result.stdout);
    assert("no drift check runs on a missing commit", !hasRule(result.stdout, "loop-goal-criteria-drift"), result.stdout);
    assert("and the lint exits 1", result.status === 1, `status=${result.status}`);
  } finally {
    cleanup(project.dir);
  }

  project = projectWithCommittedCriteria();
  try {
    writeProjectFile(project.dir, "README.md", "# Demo project\n");
    const unrelatedSha = gitCommitAll(project.dir, "add readme");
    assert("fixture sanity: the second commit differs from the criteria commit", unrelatedSha !== project.sha, unrelatedSha);
    writeProjectFile(project.dir, EVALUATION_PATH, evaluationDocument({ commit: unrelatedSha }));
    const result = runLint(project.dir);
    assert(
      "SHA that exists but never touched the criteria: loop-goal-criteria-commit error",
      hasRule(result.stdout, `loop-goal-criteria-commit ${EVALUATION_PATH}`, "error"),
      result.stdout,
    );
    assert("the message names the criteria path", result.stdout.includes(`does not touch ${CRITERIA_PATH}`), result.stdout);
  } finally {
    cleanup(project.dir);
  }
}

function scenarioCriteriaDrift() {
  section("Scenario: criteria changed after the evaluation froze them");

  let project = projectWithCommittedCriteria();
  try {
    writeProjectFile(project.dir, EVALUATION_PATH, evaluationDocument({ commit: project.sha }));
    writeProjectFile(project.dir, CRITERIA_PATH, `${CRITERIA_TEXT}- C2: added after the evaluation.\n`);
    const result = runLint(project.dir);
    assert(
      "uncommitted change to the criteria: loop-goal-criteria-drift error",
      hasRule(result.stdout, `loop-goal-criteria-drift ${EVALUATION_PATH}`, "error"),
      result.stdout,
    );
    assert(
      "the message says the criteria changed after the freeze",
      result.stdout.includes("criteria changed after the evaluation froze them"),
      result.stdout,
    );
    assert("no loop-goal-criteria-commit error: the commit itself is fine", !hasRule(result.stdout, "loop-goal-criteria-commit"), result.stdout);
    assert("and the lint exits 1", result.status === 1, `status=${result.status}`);
  } finally {
    cleanup(project.dir);
  }

  project = projectWithCommittedCriteria();
  try {
    writeProjectFile(project.dir, EVALUATION_PATH, evaluationDocument({ commit: project.sha }));
    writeProjectFile(project.dir, CRITERIA_PATH, `${CRITERIA_TEXT}- C2: committed after the evaluation.\n`);
    gitCommitAll(project.dir, "tighten criteria");
    const result = runLint(project.dir);
    assert(
      "committed change to the criteria: loop-goal-criteria-drift error as well",
      hasRule(result.stdout, `loop-goal-criteria-drift ${EVALUATION_PATH}`, "error"),
      result.stdout,
    );
  } finally {
    cleanup(project.dir);
  }
}

function scenarioDependentContext() {
  section("Scenario: independent_context false is a warning");

  const { dir, sha } = projectWithCommittedCriteria();
  try {
    writeProjectFile(dir, EVALUATION_PATH, evaluationDocument({ commit: sha, independent: "false" }));
    const result = runLint(dir);
    assert(
      "independent_context: false: loop-goal-evaluation-dependent warning",
      hasRule(result.stdout, `loop-goal-evaluation-dependent ${EVALUATION_PATH}`, "warning"),
      result.stdout,
    );
    assert("it is a warning, not an error", !hasAnyError(result.stdout), result.stdout);
    assert("and the lint exits 0", result.status === 0, `status=${result.status}`);
  } finally {
    cleanup(dir);
  }
}

function scenarioFrontmatterShape() {
  section("Scenario: frontmatter fields must be present and well formed");

  let project = projectWithCommittedCriteria();
  try {
    writeProjectFile(
      project.dir,
      EVALUATION_PATH,
      evaluationDocument({ evaluator: null, independent: "maybe", commit: project.sha.slice(0, 12) }),
    );
    const result = runLint(project.dir);
    assert(
      "missing evaluator, bad independent_context, short SHA: loop-goal-evaluation-frontmatter errors",
      hasRule(result.stdout, `loop-goal-evaluation-frontmatter ${EVALUATION_PATH}`, "error"),
      result.stdout,
    );
    assert("one finding per broken field (3)", countRule(result.stdout, "loop-goal-evaluation-frontmatter") === 3, result.stdout);
    assert("the message names the evaluator field", result.stdout.includes("evaluator is missing"), result.stdout);
    assert("the message names independent_context", result.stdout.includes("independent_context must be true or false"), result.stdout);
    assert("the message asks for a full 40-hexadecimal SHA", result.stdout.includes("full 40-hexadecimal Git SHA"), result.stdout);
    assert("git checks are skipped while the shape is broken", !hasRule(result.stdout, "loop-goal-criteria-commit"), result.stdout);
  } finally {
    cleanup(project.dir);
  }

  project = projectWithCommittedCriteria();
  try {
    writeProjectFile(
      project.dir,
      EVALUATION_PATH,
      evaluationDocument({ commit: project.sha, criteriaPath: "experiments/demo-loop/design/missing.md" }),
    );
    const result = runLint(project.dir);
    assert(
      "criteria_path that does not exist: loop-goal-evaluation-frontmatter error",
      hasRule(result.stdout, `loop-goal-evaluation-frontmatter ${EVALUATION_PATH}`, "error"),
      result.stdout,
    );
    assert("the message names the missing path", result.stdout.includes("experiments/demo-loop/design/missing.md does not exist"), result.stdout);
  } finally {
    cleanup(project.dir);
  }

  project = projectWithCommittedCriteria();
  try {
    writeProjectFile(project.dir, EVALUATION_PATH, evaluationDocument({ commit: project.sha, criteriaPath: null }));
    const result = runLint(project.dir);
    assert(
      "criteria_path missing: loop-goal-evaluation-frontmatter error",
      result.stdout.includes("criteria_path is missing or empty"),
      result.stdout,
    );
  } finally {
    cleanup(project.dir);
  }
}

function scenarioIgnoredDocuments() {
  section("Scenario: only documents typed loop-goal-evaluation are checked");

  const { dir } = projectWithCommittedCriteria();
  try {
    writeProjectFile(dir, EVALUATION_PATH, evaluationDocument({ type: null, commit: "not-a-sha" }));
    writeProjectFile(dir, "experiments/demo-loop/evaluations/notes.md", evaluationDocument({ type: "notes", commit: "not-a-sha" }));
    writeProjectFile(dir, "experiments/demo-loop/evaluations/plain.md", "# Plain notes\n\nNo frontmatter here.\n");
    const result = runLint(dir);
    assert("Markdown without a type field is ignored even with broken fields", !hasAnyLoopGoalRule(result.stdout), result.stdout);
    assert("and the lint exits 0", result.status === 0, `status=${result.status}\n${result.stdout}`);
  } finally {
    cleanup(dir);
  }
}

function scenarioGating() {
  section("Scenario: the module runs only when workflows and loopGoal are both enabled");

  const cases = [
    { name: "workflows.loopGoal.enabled false", overrides: { workflows: { loopGoal: { enabled: false } } } },
    { name: "workflows.enabled false", overrides: { workflows: { enabled: false } } },
  ];
  for (const testCase of cases) {
    const { dir } = projectWithCommittedCriteria(testCase.overrides);
    try {
      writeProjectFile(dir, EVALUATION_PATH, evaluationDocument({ commit: MISSING_SHA, independent: "false" }));
      const result = runLint(dir);
      assert(`${testCase.name}: a broken evaluation is not reported`, !hasAnyLoopGoalRule(result.stdout), result.stdout);
    } finally {
      cleanup(dir);
    }
  }

  const { dir } = projectWithCommittedCriteria({ workflows: { loopGoal: { evaluationRoots: ["reviews"] } } });
  try {
    writeProjectFile(dir, EVALUATION_PATH, evaluationDocument({ commit: MISSING_SHA }));
    writeProjectFile(dir, "reviews/run-1.md", evaluationDocument({ commit: MISSING_SHA }));
    const result = runLint(dir);
    assert(
      "evaluationRoots is configurable: the document under reviews/ is checked",
      hasRule(result.stdout, "loop-goal-criteria-commit reviews/run-1.md", "error"),
      result.stdout,
    );
    assert(
      "evaluationRoots is configurable: the document outside the roots is not",
      !hasRule(result.stdout, `loop-goal-criteria-commit ${EVALUATION_PATH}`),
      result.stdout,
    );
  } finally {
    cleanup(dir);
  }
}

function scenarioOutsideGit() {
  section("Scenario: outside a Git worktree the Git checks degrade to a warning");

  const dir = createProject(baseConfig(), { git: false });
  try {
    writeProjectFile(dir, CRITERIA_PATH, CRITERIA_TEXT);
    writeProjectFile(dir, EVALUATION_PATH, evaluationDocument({ commit: MISSING_SHA }));
    const result = runLint(dir);
    assert("git-status warning mentions the skipped loop-goal checks", /^\[WARN\] git-status$[\s\S]*?loop-goal criteria checks were skipped/m.test(result.stdout), result.stdout);
    assert("no loop-goal-criteria-commit error without git", !hasRule(result.stdout, "loop-goal-criteria-commit"), result.stdout);
    assert("frontmatter shape is still checked without git (valid here)", !hasRule(result.stdout, "loop-goal-evaluation-frontmatter"), result.stdout);
    assert("and the lint exits 0", result.status === 0, `status=${result.status}`);
  } finally {
    cleanup(dir);
  }
}

banner();

scenarioValidEvaluation();
scenarioCommitProblems();
scenarioCriteriaDrift();
scenarioDependentContext();
scenarioFrontmatterShape();
scenarioIgnoredDocuments();
scenarioGating();
scenarioOutsideGit();

summary();
