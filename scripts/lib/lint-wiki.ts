import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import type { LintContext } from "./lint-context.ts";
import {
  gitChangedFiles,
  pathExists,
  readText,
  stripMarkdownCode,
  walkFiles,
} from "./lint-helpers.ts";

export function checkWikiIndexCoverage(context: LintContext): void {
  if (!context.wikiGovernanceEnabled) return;
  if (!pathExists(context.root, "wiki/index.md")) return;

  const index = readText(context.root, "wiki/index.md");
  const wikiPages = walkFiles(
    context.root,
    "wiki",
    (path) => path.endsWith(".md") && !["wiki/index.md", "wiki/log.md"].includes(path),
  );

  for (const page of wikiPages) {
    const wikiRelative = page.replace(/^wiki\//, "");
    const basename = wikiRelative.replace(/\.md$/, "");
    const obsidianLink = `[[${basename}]]`;
    const markdownLink = `](${wikiRelative})`;
    const plainPath = wikiRelative;

    if (!index.includes(obsidianLink) && !index.includes(markdownLink) && !index.includes(plainPath)) {
      context.add("warning", "wiki-index-coverage", "Wiki page is not referenced in wiki/index.md.", page);
    }
  }
}

export function checkWikiDocuments(context: LintContext): void {
  if (!context.wikiGovernanceEnabled) return;
  if (!pathExists(context.root, "wiki")) return;

  const wikiPages = walkFiles(context.root, "wiki", (path) => path.endsWith(".md"));
  const wikiPageSet = new Set(wikiPages);

  for (const page of wikiPages) {
    const text = readText(context.root, page);
    const trimmed = text.trim();

    if (trimmed.length === 0) {
      context.add("error", "wiki-empty-page", "Wiki page is empty.", page);
      continue;
    }

    const h1Matches = text.match(/^# .+/gm) ?? [];
    if (h1Matches.length === 0) {
      context.add("error", "wiki-missing-h1", "Each wiki page must have one H1 title.", page);
    } else if (h1Matches.length > 1) {
      context.add("warning", "wiki-multiple-h1", "Wiki page contains multiple H1 titles.", page);
    }

    if (trimmed.length < context.config.wiki.minPageLength && !page.endsWith(".gitkeep")) {
      context.add(
        "warning",
        "wiki-too-short",
        "Wiki page is very short: verify that it is not an unmarked stub.",
        page,
      );
    }

    for (const [prefix, sections] of Object.entries(context.config.wiki.categorySections)) {
      if (!page.startsWith(prefix)) continue;
      for (const section of sections) {
        if (!text.includes(section)) {
          context.add(
            "warning",
            "wiki-category-section",
            `Page under ${prefix} is missing expected section: ${section}`,
            page,
          );
        }
      }
    }
  }

  checkWikiLinks(context, wikiPages, wikiPageSet);
  checkWikiLogFormat(context);
  checkWikiIndexBaseShape(context);
  checkProjectWikiIndexShape(context);
}

function checkWikiLinks(context: LintContext, wikiPages: string[], wikiPageSet: Set<string>): void {
  for (const page of wikiPages) {
    const text = stripMarkdownCode(readText(context.root, page));

    for (const match of text.matchAll(/\[\[([^\]]+)\]\]/g)) {
      const rawTarget = match[1].split("|")[0].split("#")[0].trim();
      if (!rawTarget) continue;

      const normalizedTarget = rawTarget.replace(/^wiki\//, "").replace(/\.md$/, "");
      const candidate = normalize(`wiki/${normalizedTarget}.md`);

      if (!wikiPageSet.has(candidate)) {
        context.add("error", "wiki-broken-wikilink", `Broken Obsidian link: [[${rawTarget}]]`, page);
      }
    }

    for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
      const rawTarget = match[1].trim();
      if (
        !rawTarget ||
        rawTarget.startsWith("#") ||
        /^[a-z]+:\/\//i.test(rawTarget) ||
        rawTarget.startsWith("mailto:")
      ) {
        continue;
      }

      const targetWithoutAnchor = rawTarget.split("#")[0];
      if (!targetWithoutAnchor.endsWith(".md")) continue;

      const candidate = normalize(join(dirname(page), targetWithoutAnchor));
      if (!existsSync(join(context.root, candidate))) {
        context.add("error", "wiki-broken-md-link", `Broken local Markdown link: ${rawTarget}`, page);
      }
    }
  }
}

function checkWikiLogFormat(context: LintContext): void {
  if (!pathExists(context.root, "wiki/log.md")) return;

  const text = readText(context.root, "wiki/log.md");
  const entries = [...text.matchAll(/^## .+$/gm)].map((match) => match[0]);
  const logEntryRegex = new RegExp(context.config.wiki.logEntryPattern);
  const invalid = entries.filter((entry) => !logEntryRegex.test(entry));

  for (const entry of invalid) {
    context.add(
      "warning",
      "wiki-log-entry-format",
      `Log entry does not match '## [YYYY-MM-DD] action | detail': ${entry}`,
      "wiki/log.md",
    );
  }
}

function checkWikiIndexBaseShape(context: LintContext): void {
  if (!pathExists(context.root, "wiki/index.md")) return;

  const text = readText(context.root, "wiki/index.md");
  for (const section of context.config.wiki.baseIndexSections) {
    if (!text.includes(section)) {
      context.add(
        "warning",
        "wiki-index-base-section",
        `wiki/index.md is missing expected base POM section: ${section}`,
        "wiki/index.md",
      );
    }
  }
}

function checkProjectWikiIndexShape(context: LintContext): void {
  if (!pathExists(context.root, "wiki/index.md")) return;

  const text = readText(context.root, "wiki/index.md");
  for (const section of context.config.wiki.projectIndexSections) {
    if (!text.includes(section)) {
      context.add(
        "warning",
        "project-wiki-index-section",
        `wiki/index.md is missing expected project section: ${section}`,
        "wiki/index.md",
      );
    }
  }
}

export function resolveWikiRenderScript(context: LintContext): string | undefined {
  if (pathExists(context.root, "pom/scripts/render-wiki.mjs")) return "pom/scripts/render-wiki.mjs";
  if (pathExists(context.root, "scripts/render-wiki.mjs")) return "scripts/render-wiki.mjs";
  return undefined;
}

export function renderWikiReaderIfNeeded(context: LintContext): void {
  const changedWiki = changedWikiMarkdownFiles(context);
  if (changedWiki.length === 0) return;
  if (!pathExists(context.root, "wiki")) return;

  const script = resolveWikiRenderScript(context);
  if (!script) {
    console.log("");
    console.log("POM wiki reader: wiki Markdown changed, but scripts/render-wiki.mjs was not found.");
    console.log("Run npm run pom:wiki:render after restoring the renderer.");
    return;
  }

  console.log("");
  console.log(
    `POM wiki reader: ${changedWiki.length} wiki Markdown file${changedWiki.length === 1 ? "" : "s"} changed; regenerating wiki/_site/.`,
  );
  execFileSync(process.execPath, [script], {
    cwd: context.root,
    stdio: "inherit",
  });
}

function changedWikiMarkdownFiles(context: LintContext): string[] {
  const onError = (message: string) => context.add("warning", "git-status", message);
  return [...gitChangedFiles(context.root, onError)].filter((path) => {
    return path.startsWith("wiki/") && !path.startsWith("wiki/_site/") && path.endsWith(".md");
  });
}
