#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const POM_DIR = "pom";

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

function hasPackageScript(name) {
  if (!existsSync("package.json")) return false;
  try {
    const parsed = JSON.parse(readFileSync("package.json", "utf8"));
    return Boolean(parsed.scripts && parsed.scripts[name]);
  } catch {
    return false;
  }
}

function printSyncSuggestion(reason) {
  console.error("");
  console.error(`POM update stopped: ${reason}`);
  console.error("");
  console.error("Recommended agent workflow:");
  console.error("Read pom/skills/sync.md and refresh this project's POM installation.");
  console.error("");
  console.error("Manual inspection:");
  console.error("git -C pom status --short --branch");
  console.error("git -C pom diff");
  console.error("");
  console.error("After resolving local changes, rerun:");
  console.error("npm run pom:update");
}

function ensurePomIsCleanGitCheckout() {
  if (!existsSync(POM_DIR)) {
    printSyncSuggestion("pom/ does not exist.");
    process.exit(1);
  }

  const insideWorkTree = output("git", ["-C", POM_DIR, "rev-parse", "--is-inside-work-tree"]);
  if (!insideWorkTree || insideWorkTree.trim() !== "true") {
    printSyncSuggestion("pom/ is not a Git checkout or submodule.");
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

function updatePom() {
  console.log("Updating pom/...");

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

function refreshProject() {
  run("node", ["--experimental-strip-types", "pom/scripts/install-pom.ts", "--profile", "refresh"]);

  if (hasPackageScript("pom:lint")) {
    run("npm", ["run", "pom:lint"]);
  } else {
    console.log("pom:lint not configured; skipped.");
  }
}

function main() {
  ensurePomIsCleanGitCheckout();
  updatePom();
  refreshProject();
}

main();
