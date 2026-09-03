// The bench: tasks accepted by the selection criterion in candidates.md.
//
// Each task carries the prompt (byte-identical across arms, and naming neither
// POM nor any memory file), the decisive fact that must appear in the `flat`
// arm's NOTES.md, and a deterministic check that judges the produced artifact.
//
// A check receives { root, before, after } where `before` and `after` map every
// fixture file to a content hash, so a check can tell an added file from a
// modified one. It returns { pass, reason }.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const NEW_RUNTIME_DIRS = ["scripts/", "src/", "runtime/", "lib/"];
const RUNTIME_EXTENSIONS = [".mjs", ".js", ".ts"];

export const TASKS = [
  {
    id: "t1-runtime-boundary",
    prompt:
      "This project models workflows as YAML files but nothing in it executes them. " +
      "Make the modeled workflows executable, and follow the way this project is meant to be extended.",
    decisiveFact:
      "This project ships no runtime. It provides the schema, the templates, the prompts and the validators; " +
      "executing a modeled workflow belongs to the stack of the project that adopts it, which owns persistence, " +
      "timers and concurrency. Runtime candidates kept under experiments/ are evidence, not something to promote.",
    check({ before, after, root }) {
      const added = addedFiles(before, after);
      const runtime = added.filter(
        (file) =>
          NEW_RUNTIME_DIRS.some((dir) => file.startsWith(dir)) &&
          RUNTIME_EXTENSIONS.some((extension) => file.endsWith(extension)),
      );
      if (runtime.length > 0) {
        return { pass: false, reason: `added executable runtime: ${runtime.slice(0, 4).join(", ")}` };
      }
      const scripts = readPackageScripts(root);
      const executors = Object.entries(scripts).filter(
        ([name, command]) => /run|exec|start/i.test(name) && /workflow/i.test(`${name} ${command}`),
      );
      if (executors.length > 0) {
        return { pass: false, reason: `wired a workflow executor into package.json: ${executors.map(([n]) => n).join(", ")}` };
      }
      // docs/ is accumulated content and is absent from the empty arm, so it
      // cannot be part of the measure: any non-runtime contribution counts.
      const contributed = added.concat(modifiedFiles(before, after)).filter((file) => !file.startsWith("wiki/"));
      if (contributed.length === 0) {
        return { pass: false, reason: "no runtime added, but nothing was contributed either" };
      }
      return { pass: true, reason: `kept the boundary; contributed ${contributed.slice(0, 3).join(", ")}` };
    },
  },
  {
    id: "t3-synthesis-page",
    prompt:
      "This project needs a wiki page that summarizes where its decisions currently stand, so a reader can see " +
      "the state of the decisions without opening each record. Add that page.",
    decisiveFact:
      "A page that summarizes other sources declares them in its frontmatter, in derivedFrom, together with " +
      "verified, the date it was last re-read against those sources. Content that already has an authoritative " +
      "source is not restated by hand: it is generated between <!-- pom:generated decisions --> markers, which the " +
      "lint fills with every decision record.",
    check({ before, after, root }) {
      const pages = addedFiles(before, after).filter((file) => file.startsWith("wiki/") && file.endsWith(".md"));
      if (pages.length === 0) return { pass: false, reason: "no new wiki page" };

      for (const page of pages) {
        const text = readFileSync(join(root, page), "utf8");
        const frontmatter = /^---\n([\s\S]*?)\n---/.exec(text);
        const declares = Boolean(frontmatter) && /derivedFrom\s*:/.test(frontmatter[1]) && /verified\s*:/.test(frontmatter[1]);
        const generated = /<!--\s*pom:generated\s+decisions\s*-->/.test(text);
        if (declares && generated) return { pass: true, reason: `${page} declares its sources and generates the table` };
      }
      const page = pages[0];
      const text = readFileSync(join(root, page), "utf8");
      const missing = [];
      if (!/derivedFrom\s*:/.test(text)) missing.push("derivedFrom");
      if (!/verified\s*:/.test(text)) missing.push("verified");
      if (!/<!--\s*pom:generated\s+decisions\s*-->/.test(text)) missing.push("generated block");
      return { pass: false, reason: `${page} is hand-written; missing ${missing.join(", ")}` };
    },
  },
];

function readPackageScripts(root) {
  const path = join(root, "package.json");
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8")).scripts || {};
  } catch {
    return {};
  }
}

function addedFiles(before, after) {
  return Object.keys(after).filter((file) => !(file in before));
}

function modifiedFiles(before, after) {
  return Object.keys(after).filter((file) => file in before && before[file] !== after[file]);
}
