#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

type Command = {
  key: string;
  title: string;
  command: string;
  description: string;
  run?: () => void;
};

function pathExists(path: string): boolean {
  return existsSync(join(ROOT, path));
}

function readText(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function runNpmScript(script: string, args: string[] = []): void {
  execFileSync("npm", ["run", script, ...args], { stdio: "inherit" });
}

function showFile(path: string): void {
  if (!pathExists(path)) {
    console.log(`${path} not found.`);
    return;
  }
  console.log("");
  console.log(readText(path).trim());
  console.log("");
}

function commands(): Command[] {
  return [
    {
      key: "1",
      title: "Refresh POM",
      command: "npm run pom:init -- --profile refresh",
      description: "Update POM instruction sections, scripts, hooks, and coding-agent files without changing project config.",
      run: () => runNpmScript("pom:init", ["--", "--profile", "refresh"]),
    },
    {
      key: "2",
      title: "Install or reconfigure POM",
      command: "npm run pom:init",
      description: "Run the interactive installer/profile chooser for a target project.",
      run: () => runNpmScript("pom:init"),
    },
    {
      key: "3",
      title: "Lint POM governance",
      command: "npm run pom:lint",
      description: "Check document governance, configured roots, statuses, indexes, and handoff reminders.",
      run: () => runNpmScript("pom:lint"),
    },
    {
      key: "4",
      title: "Read POM skills index",
      command: "pom/skills/README.md",
      description: "Show available POM skills and their canonical prompts.",
      run: () => showFile(pathExists("pom/skills/README.md") ? "pom/skills/README.md" : "skills/README.md"),
    },
    {
      key: "5",
      title: "Read post-action validator",
      command: "pom/skills/validate.md",
      description: "Show the validation skill used after significant work, before handoff or commit.",
      run: () => showFile(pathExists("pom/skills/validate.md") ? "pom/skills/validate.md" : "skills/validate.md"),
    },
  ];
}

function printHelp(): void {
  console.log("");
  console.log("POM Help");
  console.log("========");
  console.log("");
  console.log("Project Operating Memory keeps wiki, decisions, tasks, docs, and handoff state aligned.");
  console.log("");
  console.log("Available commands:");
  console.log("");
  for (const command of commands()) {
    console.log(`${command.key}. ${command.title}`);
    console.log(`   ${command.command}`);
    console.log(`   ${command.description}`);
    console.log("");
  }
  console.log("Direct skill usage:");
  console.log("");
  console.log("  Ask the coding agent to use a POM skill, for example:");
  console.log("  - Use `pom/skills/wiki.md` to query or maintain the wiki.");
  console.log("  - Use `pom/skills/defer.md` to park future work.");
  console.log("  - Use `pom/skills/validate.md` to audit governance after significant work.");
  console.log("");
}

async function main(): Promise<void> {
  printHelp();

  if (!process.stdin.isTTY) return;

  const rl = createInterface({ input, output });
  try {
    const answer = (await rl.question("Run a command? [1-5, Enter to exit]: ")).trim();
    if (!answer) return;

    const command = commands().find((candidate) => candidate.key === answer);
    if (!command?.run) {
      console.log("Unknown choice. Nothing run.");
      return;
    }

    console.log("");
    console.log(`> ${command.command}`);
    command.run();
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
