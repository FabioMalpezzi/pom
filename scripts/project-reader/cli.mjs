#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { createSourceContext } from "./adapters/index.mjs";
import { createProjectReaderCore } from "./core.mjs";
import { parseOptions, startProjectReaderServer, usage as serverUsage } from "./server.mjs";

const args = process.argv.slice(2);
const command = readCommand(args);

try {
  if (command === "help") {
    usage();
  } else if (command === "open") {
    openCommand(args.slice(1));
  } else if (command === "search") {
    searchCommand(args.slice(1));
  } else {
    const serveArgs = command === "serve" ? args.slice(1) : args;
    startProjectReaderServer(parseOptions(serveArgs));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

function readCommand(inputArgs) {
  const first = inputArgs[0];
  if (!first || first.startsWith("--")) return "serve";
  if (["serve", "open", "search", "help", "--help", "-h"].includes(first)) {
    return first === "--help" || first === "-h" ? "help" : first;
  }
  return "serve";
}

function openCommand(inputArgs) {
  const path = firstPositional(inputArgs);
  if (!path) throw new Error("Missing file path for project-reader open");
  const port = readNumberOption(inputArgs, "--port", Number(process.env.PORT || 4173));
  const host = readStringOption(inputArgs, "--host", "127.0.0.1");
  const params = new URLSearchParams({ path });
  const url = `http://${host}:${port}/?${params.toString()}`;
  console.log(url);
  if (!hasFlag(inputArgs, "--cmux")) return;
  const result = spawnSync("cmux", ["browser", "open", url], { stdio: "inherit" });
  if (result.error) throw new Error(`cmux failed: ${result.error.message}`);
  if (result.status) process.exitCode = result.status;
}

function searchCommand(inputArgs) {
  const query = firstPositional(inputArgs);
  if (!query) throw new Error("Missing search query for project-reader search");
  const root = resolve(readStringOption(inputArgs, "--root", "."));
  assertDirectory(root);
  const profile = readStringOption(inputArgs, "--profile", "auto");
  const kind = readStringOption(inputArgs, "--kind", "all");
  const maxResults = readNumberOption(inputArgs, "--max-results", 50);
  const sourceContext = createSourceContext({ root, profile });
  const reader = createProjectReaderCore({ root, sourceContext });
  const result = reader.search({
    query,
    kind,
    regex: hasFlag(inputArgs, "--regex"),
    maxResults,
  });
  if (hasFlag(inputArgs, "--json")) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  for (const match of result.results) {
    console.log(`${match.path}:${match.line}:${match.column}: ${match.text}`);
  }
}

function firstPositional(inputArgs) {
  for (let index = 0; index < inputArgs.length; index += 1) {
    const value = inputArgs[index];
    if (!value.startsWith("--")) return value;
    if (!isBooleanFlag(value)) index += 1;
  }
  return "";
}

function readStringOption(inputArgs, name, fallback) {
  const index = inputArgs.indexOf(name);
  if (index === -1) return fallback;
  const value = inputArgs[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for ${name}`);
  return value;
}

function readNumberOption(inputArgs, name, fallback) {
  const value = Number(readStringOption(inputArgs, name, String(fallback)));
  if (!Number.isInteger(value) || value < 1) throw new Error(`Invalid value for ${name}`);
  return value;
}

function hasFlag(inputArgs, name) {
  return inputArgs.includes(name);
}

function isBooleanFlag(name) {
  return ["--cmux", "--json", "--regex"].includes(name);
}

function assertDirectory(path) {
  if (!existsSync(path) || !statSync(path).isDirectory()) throw new Error(`Project root not found: ${path}`);
}

function usage() {
  serverUsage();
  console.log(`Standalone commands:
  project-reader open <repo-path> [--port <port>] [--host <host>] [--cmux]
  project-reader search <query> [--root <project-root>] [--profile auto|pom|generic] [--kind <kind>] [--regex] [--json]
`);
}
