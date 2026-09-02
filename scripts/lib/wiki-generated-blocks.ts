import { statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { parseMetadataTable } from "./completion-verification.ts";
import type { LintContext } from "./lint-context.ts";
import {
  cleanRelativePath,
  gitLastCommitTime,
  markdownCell,
  pathExists,
  readText,
  truncateSummary,
  walkFiles,
} from "./lint-helpers.ts";

/**
 * Generated blocks inside wiki pages.
 *
 * A synthesis page should not restate by hand what already has an
 * authoritative source: the list of decisions lives in the decisions root,
 * the current state lives in PROJECT_STATE.md, the map of pages is the wiki
 * itself. A page can instead reserve a region for POM to fill:
 *
 *   <!-- pom:generated decisions -->
 *   <!-- /pom:generated -->
 *
 *   <!-- pom:generated state section="### Current State" -->
 *   <!-- /pom:generated -->
 *
 *   <!-- pom:generated pages -->
 *   <!-- /pom:generated -->
 *
 * `npm run pom:lint` rewrites the content between the markers on every run,
 * like it already regenerates the ADR index, and reports what it refreshed.
 * Text outside the markers is never touched. Markdown stays the canonical
 * memory: the regenerated block is committed with the page.
 */

const OPEN_MARKER = /<!--\s*pom:generated\s+([a-z-]+)([^>]*?)-->/g;
const CLOSE_MARKER = "<!-- /pom:generated -->";

type BlockKind = "decisions" | "state" | "pages";
const KNOWN_KINDS: BlockKind[] = ["decisions", "state", "pages"];

export function refreshWikiGeneratedBlocks(context: LintContext): string[] {
  if (!context.wikiGovernanceEnabled) return [];
  const wikiRoot = context.config.wiki.root;
  if (!pathExists(context.root, wikiRoot)) return [];

  const pages = walkFiles(
    context.root,
    wikiRoot,
    (path) => path.endsWith(".md") && !path.startsWith(`${wikiRoot}/_site/`),
  );

  const refreshed: string[] = [];
  for (const page of pages) {
    const original = readText(context.root, page);
    if (!original.includes("pom:generated")) continue;

    const updated = rewriteBlocks(context, page, pages, original);
    if (updated !== original) {
      writeFileSync(join(context.root, page), updated);
      refreshed.push(page);
    }
  }

  if (refreshed.length > 0) {
    console.log(`POM lint: refreshed generated block(s) in ${refreshed.join(", ")}.`);
  }
  return refreshed;
}

function rewriteBlocks(context: LintContext, page: string, pages: string[], text: string): string {
  let output = "";
  let cursor = 0;

  for (const match of text.matchAll(OPEN_MARKER)) {
    const start = match.index ?? 0;
    if (start < cursor) continue; // inside a block already rewritten
    if (insideCode(text, start)) continue; // a marker quoted in documentation, not a block
    const kind = match[1];
    const options = parseOptions(match[2] ?? "");
    const afterOpen = start + match[0].length;
    const closeAt = text.indexOf(CLOSE_MARKER, afterOpen);

    if (closeAt === -1) {
      context.add(
        "warning",
        "wiki-generated-block-unclosed",
        `Generated block '${kind}' has no closing marker ${CLOSE_MARKER}; the block was left untouched.`,
        page,
      );
      continue;
    }

    if (!KNOWN_KINDS.includes(kind as BlockKind)) {
      context.add(
        "warning",
        "wiki-generated-block-unknown",
        `Unknown generated block kind '${kind}'; supported kinds: ${KNOWN_KINDS.join(", ")}.`,
        page,
      );
      continue;
    }

    const body = renderBlock(context, page, pages, kind as BlockKind, options);
    output += text.slice(cursor, afterOpen) + "\n\n" + body + "\n\n" + CLOSE_MARKER;
    cursor = closeAt + CLOSE_MARKER.length;
  }

  return output + text.slice(cursor);
}

/** True when `index` falls inside a fenced code block or inline code on its line. */
function insideCode(text: string, index: number): boolean {
  const before = text.slice(0, index);
  const fences = (before.match(/^```/gm) ?? []).length;
  if (fences % 2 === 1) return true;
  const lineStart = before.lastIndexOf("\n") + 1;
  const backticks = (before.slice(lineStart).match(/`/g) ?? []).length;
  return backticks % 2 === 1;
}

function parseOptions(raw: string): Map<string, string> {
  const options = new Map<string, string>();
  for (const match of raw.matchAll(/([a-zA-Z][a-zA-Z0-9_-]*)\s*=\s*"([^"]*)"/g)) {
    options.set(match[1], match[2]);
  }
  return options;
}

function renderBlock(
  context: LintContext,
  page: string,
  pages: string[],
  kind: BlockKind,
  options: Map<string, string>,
): string {
  switch (kind) {
    case "decisions":
      return renderDecisions(context, page);
    case "state":
      return renderState(context, page, options);
    case "pages":
      return renderPages(context, page, pages);
  }
}

function renderDecisions(context: LintContext, page: string): string {
  const decisionsRoot = context.config.decisions.root || "decisions";
  if (!pathExists(context.root, decisionsRoot)) {
    return `_No decisions root found at \`${decisionsRoot}/\`._`;
  }

  const pattern = new RegExp(context.config.decisions.adrPathPattern);
  const adrFiles = walkFiles(context.root, decisionsRoot, (path) => path.endsWith(".md") && pattern.test(path));
  if (adrFiles.length === 0) {
    return `_No decisions recorded under \`${decisionsRoot}/\` yet._`;
  }

  const lines = ["| Decision | Status | Date | Summary |", "|---|---|---|---|"];
  for (const file of adrFiles) {
    const text = readText(context.root, file);
    const fields = parseMetadataTable(text);
    const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? file;
    const status = fields.get("status") ?? fields.get("stato") ?? "";
    const date = fields.get("date") ?? fields.get("data") ?? "";
    const summary = fields.get("summary") ?? fields.get("sintesi") ?? "";
    const link = relative(dirname(page), file).replace(/\\/g, "/");
    lines.push(
      `| [${markdownCell(title)}](${link}) | ${markdownCell(status)} | ${markdownCell(date)} | ${markdownCell(
        truncateSummary(summary),
      )} |`,
    );
  }
  return lines.join("\n");
}

function renderState(context: LintContext, page: string, options: Map<string, string>): string {
  const source = cleanRelativePath(options.get("source") ?? context.config.handoff.projectStatePath);
  const heading = (options.get("section") ?? "### Current State").trim();
  const link = relative(dirname(page), source).replace(/\\/g, "/");

  if (!pathExists(context.root, source)) {
    return `_State file not found: \`${source}\`._`;
  }

  const changed = lastChangeDate(context.root, source);
  const intro = `_From [${source}](${link}), last changed ${changed}._`;
  const text = readText(context.root, source).replace(/\r\n/g, "\n");
  const body = extractSection(text, heading);
  if (body === undefined) {
    return `${intro}\n\n_Section \`${heading}\` not found in \`${source}\`._`;
  }
  return body ? `${intro}\n\n${body}` : `${intro}\n\n_Section \`${heading}\` is empty._`;
}

function renderPages(context: LintContext, page: string, pages: string[]): string {
  const wikiRoot = context.config.wiki.root;
  const skip = new Set([`${wikiRoot}/index.md`, `${wikiRoot}/log.md`, page]);
  const entries: string[] = [];

  for (const candidate of pages) {
    if (skip.has(candidate)) continue;
    const name = candidate.slice(wikiRoot.length + 1).replace(/\.md$/, "");
    const title = readText(context.root, candidate).match(/^#\s+(.+)$/m)?.[1]?.trim();
    entries.push(title && title !== name ? `- [[${name}]]: ${title}` : `- [[${name}]]`);
  }

  return entries.length > 0 ? entries.join("\n") : "_No other wiki pages yet._";
}

/**
 * Body of the section introduced by `heading`, up to the next heading of the
 * same or a higher level. Undefined when the heading is absent.
 */
function extractSection(text: string, heading: string): string | undefined {
  const level = heading.match(/^#+/)?.[0].length ?? 0;
  if (level === 0) return undefined;

  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) return undefined;

  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    const next = line.match(/^(#{1,6})\s/);
    if (next && next[1].length <= level) break;
    body.push(line);
  }
  return body.join("\n").trim();
}

function lastChangeDate(root: string, path: string): string {
  const committed = gitLastCommitTime(root, path);
  const epoch = committed ?? statSync(join(root, path)).mtimeMs;
  const date = new Date(epoch);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
