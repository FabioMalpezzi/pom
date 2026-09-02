import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join } from "node:path";
import type { GitContext, ProjectConfig } from "./install-model.ts";
import { configuredPath, defaultDecisionIndexPath, escapeRegex, firstPathSegment, isRecord, shellQuote } from "./install-helpers.ts";

// Installs the managed POM block in the target project's pre-commit hook.

const HOOK_START_MARKER = "# POM:START pre-commit";
const HOOK_END_MARKER = "# POM:END pre-commit";

export type HookInstallContext = {
  root: string;
  config: ProjectConfig;
  gitContext: GitContext;
  runGit: (args: string[]) => string | undefined;
};

export function installPreCommitHook({ root, config, gitContext, runGit }: HookInstallContext): void {
  if (!gitContext.insideWorkTree) {
    console.log("Git hooks not installed: target project is not in a Git worktree.");
    return;
  }
  if (!gitContext.isProjectRoot) {
    console.log("Git hook not installed automatically: target project root is not the Git worktree root.");
    return;
  }

  const hookGitPath = runGit(["rev-parse", "--git-path", "hooks/pre-commit"]);
  if (!hookGitPath) {
    console.log("Git hook not installed automatically: could not resolve the Git hook path.");
    return;
  }

  const hookPath = resolveHookTarget(root, hookGitPath, runGit);
  mkdirSync(dirname(hookPath), { recursive: true });
  const current = existsSync(hookPath) ? readFileSync(hookPath, "utf8") : "#!/bin/sh\n";
  const governedPathArgs = governedMemoryPaths(config).map(shellQuote).join(" ");
  const generatedPathArgs = generatedArtifactPaths(config).map(shellQuote).join(" ");
  const projectStatePath = shellQuote(configuredPath(config, "handoff.projectStatePath", "PROJECT_STATE.md"));
  const hookBlock = `${HOOK_START_MARKER}
echo "POM pre-commit: running npm run pom:lint"
npm run pom:lint
pom_lint_status=$?
if [ "$pom_lint_status" -ne 0 ]; then
  echo "POM pre-commit: pom:lint failed. Fix findings and rerun npm run pom:lint."
  exit "$pom_lint_status"
fi

# pom:lint may regenerate tracked indexes and the wiki reader. Restage them so
# the commit carries the regenerated output; untracked or ignored files are
# never added here.
pom_regenerated="$(git diff --name-only -- ${generatedPathArgs} 2>/dev/null)"
pom_added=""
pom_untracked_generated=""
for pom_generated_path in ${generatedPathArgs}; do
  [ -e "$pom_generated_path" ] || continue
  pom_new="$(git ls-files --others --exclude-standard -- "$pom_generated_path" 2>/dev/null)"
  if [ -n "$(git ls-files -- "$pom_generated_path" 2>/dev/null)" ]; then
    # The project tracks this artifact: stage modifications, deletions, and new files under it.
    git add --all -- "$pom_generated_path" 2>/dev/null
    [ -n "$pom_new" ] && pom_added="$pom_added$pom_new
"
  elif [ -n "$pom_new" ]; then
    pom_untracked_generated="$pom_untracked_generated$pom_new
"
  fi
done
if [ -n "$pom_regenerated$pom_added" ]; then
  echo "POM pre-commit: restaged regenerated POM artifacts:"
  printf '%s\\n' "$pom_regenerated" | sed '/^$/d; s/^/  /'
  printf '%s' "$pom_added" | sed '/^$/d; s/^/  /'
fi
if [ -n "$pom_untracked_generated" ]; then
  echo "POM pre-commit notice: pom:lint created generated files that this project does not track yet."
  echo "Add them to the commit or ignore them explicitly; they were left unstaged:"
  printf '%s' "$pom_untracked_generated" | sed '/^$/d; s/^/  /'
fi

if [ -f ${projectStatePath} ]; then
  pom_changed="$(git diff --cached --name-only -- ${governedPathArgs} 2>/dev/null)"
  pom_state_changed="$(git diff --cached --name-only -- ${projectStatePath} 2>/dev/null)"
  if [ -n "$pom_changed" ] && [ -z "$pom_state_changed" ]; then
    echo "POM pre-commit notice: this commit touches governed project-memory files but not PROJECT_STATE.md."
    echo "Most commits do not need a PROJECT_STATE.md update. Update it only when the next person resuming would otherwise see a wrong starting picture: a closed important task, a new risk or open decision, a substantial ADR/spec/roadmap change, or an explicit handoff request."
  fi
fi
${HOOK_END_MARKER}`;

  const markerRegex = new RegExp(`${escapeRegex(HOOK_START_MARKER)}[\\s\\S]*?${escapeRegex(HOOK_END_MARKER)}`);
  const next = markerRegex.test(current)
    ? current.replace(markerRegex, hookBlock)
    : `${current.trimEnd()}\n\n${hookBlock}\n`;

  if (next !== current) {
    writeFileSync(hookPath, next);
    chmodSync(hookPath, 0o755);
    console.log("Installed or updated Git pre-commit hook with POM checks.");
  } else {
    chmodSync(hookPath, 0o755);
    console.log("Git pre-commit hook already contains the current POM block.");
  }
}

/**
 * Where the POM block belongs. With the default hooks directory it is the
 * pre-commit hook itself. With `core.hooksPath` pointing at husky's internal
 * shim directory (`.husky/_`), the shim is managed by husky and rewritten on
 * install, so the block goes into the user hook `.husky/pre-commit` instead.
 * Any other custom hooks directory is respected as configured.
 */
function resolveHookTarget(root: string, hookGitPath: string, runGit: HookInstallContext["runGit"]): string {
  const resolved = resolveRootPath(root, hookGitPath);
  const hooksPath = runGit(["config", "--get", "core.hooksPath"]);
  if (!hooksPath) return resolved;

  const hooksDir = resolveRootPath(root, hooksPath);
  if (basename(hooksDir) === "_" && basename(dirname(hooksDir)) === ".husky") {
    const userHook = join(dirname(hooksDir), "pre-commit");
    console.log(`Detected husky (core.hooksPath=${hooksPath}); installing the POM block in ${relativeToRoot(root, userHook)}.`);
    return userHook;
  }

  console.log(`core.hooksPath is set to ${hooksPath}; installing the POM block in ${relativeToRoot(root, resolved)}.`);
  return resolved;
}

function relativeToRoot(root: string, path: string): string {
  return path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;
}

function resolveRootPath(root: string, path: string): string {
  return isAbsolute(path) ? path : join(root, path);
}

function governedMemoryPaths(config: ProjectConfig): string[] {
  const paths = [
    configuredPath(config, "wiki.root", "wiki"),
    configuredPath(config, "decisions.root", "decisions"),
    configuredPath(config, "documentation.officialRoot", "docs"),
    configuredPath(config, "analysis.root", "analysis"),
    firstPathSegment(configuredPath(config, "mockups.packagesDir", "mockups/packages")),
    configuredPath(config, "taskPlans.root", "tasks"),
    "pom.config.json",
    configuredPath(config, "handoff.currentPlanPath", "CURRENT_PLAN.md"),
    "specs",
  ];
  return [...new Set(paths.filter(Boolean))];
}

/**
 * Paths that `pom:lint` may regenerate (folder indexes, the ADR index, the
 * wiki reader). The pre-commit hook restages tracked files under these paths
 * after lint, so the commit carries the regenerated output instead of leaving
 * it as an unstaged change. Glob suffixes such as `wiki/_site/**` collapse to
 * their directory prefix, which is what a Git pathspec needs.
 */
function generatedArtifactPaths(config: ProjectConfig): string[] {
  const declared = isRecord(config.artifactPolicy) && Array.isArray(config.artifactPolicy.generated)
    ? config.artifactPolicy.generated.filter((value): value is string => typeof value === "string")
    : [];
  const decisionsRoot = configuredPath(config, "decisions.root", "decisions");
  const analysisRoot = configuredPath(config, "analysis.root", "analysis");
  const tasksRoot = configuredPath(config, "taskPlans.root", "tasks");
  const wikiRoot = configuredPath(config, "wiki.root", "wiki");
  const implied = [
    configuredPath(config, "decisions.indexPath", defaultDecisionIndexPath(decisionsRoot)),
    configuredPath(config, "analysis.indexPath", `${analysisRoot}/ANALYSIS_INDEX.md`),
    configuredPath(config, "taskPlans.indexPath", `${tasksRoot}/README.md`),
    `${wikiRoot}/_site`,
  ];
  const pathspecs = [...declared, ...implied]
    .map((value) => value.replace(/\\/g, "/").replace(/[*?].*$/, "").replace(/^\/+|\/+$/g, ""))
    .filter((value) => value && value !== ".");
  return [...new Set(pathspecs)];
}
