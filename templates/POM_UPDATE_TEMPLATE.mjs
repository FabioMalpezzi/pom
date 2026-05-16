#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

const POM_DIR = "pom";
const DEFAULT_REPO = "https://github.com/FabioMalpezzi/pom.git";
const MODE_CHANGE_ARGS = ["preset", "profile", "ownership"];

function run(cmd, args, options = {}) {
  console.log(`> ${cmd} ${args.join(" ")}`);
  execFileSync(cmd, args, { stdio: "inherit", ...options });
}

function output(cmd, args) {
  try {
    return execFileSync(cmd, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    return undefined;
  }
}

function readArg(name) {
  const index = process.argv.findIndex((arg) => arg === `--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  const inline = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (inline) return inline.split("=").slice(1).join("=");
  return undefined;
}

function hasArg(name) {
  return process.argv.some((arg) => arg === `--${name}` || arg.startsWith(`--${name}=`));
}

function normalizeLanguage(value) {
  const normalized = value.toLowerCase();
  if (normalized.startsWith("it")) return "it";
  if (normalized.startsWith("en")) return "en";
  return undefined;
}

function detectLanguage() {
  const arg = readArg("lang");
  if (hasArg("lang")) {
    const normalized = arg ? normalizeLanguage(arg) : undefined;
    if (!normalized) {
      console.error("Missing or unsupported --lang value. Use en or it.");
      process.exit(1);
    }
    return normalized;
  }

  const envLanguage =
    process.env.POM_LANG || process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || "";
  return normalizeLanguage(envLanguage) || "en";
}

function rejectModeChangeArgs() {
  const found = MODE_CHANGE_ARGS.filter(hasArg);
  if (found.length === 0) return;

  if (detectLanguage() === "it") {
    console.error("");
    console.error(`pom:update non cambia la modalita di adozione (${found.map((name) => `--${name}`).join(", ")}).`);
    console.error("");
    console.error("Usa pom:update solo per aggiornare il framework POM installato:");
    console.error("  npm run pom:update");
    console.error("");
    console.error("Per cambiare modalita, usa pom:init in modo esplicito:");
    console.error("  npm run pom:init -- --preset owned");
    console.error("  npm run pom:init -- --preset team");
    console.error("  npm run pom:init -- --preset overlay");
    console.error("  npm run pom:init -- --preset minimal");
    console.error("");
    console.error("Nei casi non chiari, chiedi all'agente di usare pom/skills/config.md.");
    process.exit(1);
  }

  console.error("");
  console.error(`pom:update does not change adoption mode (${found.map((name) => `--${name}`).join(", ")}).`);
  console.error("");
  console.error("Use pom:update only to update the installed POM framework:");
  console.error("  npm run pom:update");
  console.error("");
  console.error("To change mode, run pom:init explicitly:");
  console.error("  npm run pom:init -- --preset owned");
  console.error("  npm run pom:init -- --preset team");
  console.error("  npm run pom:init -- --preset overlay");
  console.error("  npm run pom:init -- --preset minimal");
  console.error("");
  console.error("For unclear cases, ask the agent to use pom/skills/config.md.");
  process.exit(1);
}

function hasPackageScript(name) {
  if (!existsSync("package.json")) return false;
  try {
    const parsed = JSON.parse(readFileSync("package.json", "utf8"));
    return Boolean(parsed.scripts && parsed.scripts[name]);
  } catch {
    return false;
  }
}

function printSyncSuggestion(reason, mode = "git") {
  console.error("");
  console.error(`POM update stopped: ${reason}`);
  console.error("");
  console.error("Recommended agent workflow:");
  console.error("If you are an AI coding agent, stop the automatic update path now and follow:");
  console.error("Read pom/skills/sync.md and refresh this project's POM installation.");
  console.error("");
  console.error("Manual inspection:");
  if (mode === "vendored") {
    console.error("git status --short -- pom");
    console.error("git diff -- pom");
  } else {
    console.error("git -C pom status --short --branch");
    console.error("git -C pom diff");
  }
  console.error("");
  console.error("After resolving local changes, rerun:");
  console.error("npm run pom:update");
}

function pomHasOwnGitMetadata() {
  return existsSync(join(POM_DIR, ".git"));
}

function projectIsGitWorkTree() {
  const insideWorkTree = output("git", ["rev-parse", "--is-inside-work-tree"]);
  return insideWorkTree?.trim() === "true";
}

function ensurePomIsCleanGitCheckout() {
  if (!existsSync(POM_DIR)) {
    printSyncSuggestion("pom/ does not exist.");
    process.exit(1);
  }

  const status = output("git", ["-C", POM_DIR, "status", "--porcelain"]);
  if (status === undefined) {
    printSyncSuggestion("could not inspect pom/ with Git.");
    process.exit(1);
  }

  if (status.trim()) {
    const shortStatus = output("git", ["-C", POM_DIR, "status", "--short", "--branch"]) ?? status;
    console.error(shortStatus.trimEnd());
    printSyncSuggestion("pom/ has local changes.");
    process.exit(1);
  }
}

function ensurePomIsCleanVendoredCopy() {
  if (!existsSync(POM_DIR)) {
    printSyncSuggestion("pom/ does not exist.", "vendored");
    process.exit(1);
  }

  if (!projectIsGitWorkTree()) {
    console.log("Warning: project is not a Git worktree; cannot verify local vendored pom/ changes.");
    return;
  }

  const status = output("git", ["status", "--porcelain", "--", POM_DIR]);
  if (status === undefined) {
    printSyncSuggestion("could not inspect vendored pom/ with Git.", "vendored");
    process.exit(1);
  }

  if (status.trim()) {
    const shortStatus = output("git", ["status", "--short", "--", POM_DIR]) ?? status;
    console.error(shortStatus.trimEnd());
    printSyncSuggestion("vendored pom/ has local changes.", "vendored");
    process.exit(1);
  }
}

function copyPomWithoutGitMetadata(sourceDir) {
  rmSync(POM_DIR, { recursive: true, force: true });
  cpSync(sourceDir, POM_DIR, {
    recursive: true,
    filter: (source) => {
      const rel = relative(sourceDir, source);
      if (!rel) return true;
      const parts = rel.split(/[\\/]/);
      return !parts.includes(".git") && !parts.includes("node_modules");
    },
  });
}

function updateGitPom() {
  console.log("Updating Git-managed pom/...");

  try {
    execFileSync("git", ["-C", POM_DIR, "checkout", "main"], { stdio: "pipe" });
  } catch {
    // Detached submodules or vendored checkouts may not have a local main branch.
  }

  try {
    run("git", ["-C", POM_DIR, "pull", "origin", "main", "--ff-only"]);
    return;
  } catch {
    console.log("Direct pull failed. Trying submodule update...");
  }

  try {
    run("git", ["submodule", "update", "--remote", POM_DIR]);
  } catch {
    printSyncSuggestion("could not update pom/ automatically.");
    process.exit(1);
  }
}

function updateVendoredPom() {
  const sourceDir = readArg("source-dir") || process.env.POM_SOURCE_DIR;
  if (sourceDir) {
    console.log(`Updating vendored pom/ from ${sourceDir}...`);
    copyPomWithoutGitMetadata(sourceDir);
    return;
  }

  const repo = readArg("repo") || process.env.POM_REPO || DEFAULT_REPO;
  const tempRoot = mkdtempSync(join(tmpdir(), "pom-update-"));
  const clonedPom = join(tempRoot, "pom");

  try {
    console.log(`Updating vendored pom/ from ${repo}...`);
    run("git", ["clone", "--depth", "1", repo, clonedPom]);
    copyPomWithoutGitMetadata(clonedPom);
  } catch {
    printSyncSuggestion("could not update vendored pom/ automatically.", "vendored");
    process.exit(1);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function updatePom() {
  if (pomHasOwnGitMetadata()) {
    ensurePomIsCleanGitCheckout();
    updateGitPom();
  } else {
    ensurePomIsCleanVendoredCopy();
    updateVendoredPom();
  }
}

function refreshProject() {
  run("node", ["--experimental-strip-types", "pom/scripts/install-pom.ts", "--profile", "refresh"]);

  if (hasPackageScript("pom:lint")) {
    run("npm", ["run", "pom:lint"]);
  } else {
    console.log("pom:lint not configured; skipped.");
  }
}

function main() {
  rejectModeChangeArgs();
  updatePom();
  refreshProject();
}

main();
