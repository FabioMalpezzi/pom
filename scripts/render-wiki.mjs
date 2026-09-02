#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { positionalArgs, readRawArg, unknownOptions } from "./lib/cli-args.mjs";
import {
  escapeAttr,
  escapeHtml,
  normalizeSearchText,
  renderMarkdown,
  shorten,
  stripMarkdown,
} from "./lib/wiki-reader-markdown.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = process.cwd();

const DEFAULT_CONFIG = {
  source: join(ROOT, "wiki"),
  out: join(ROOT, "wiki", "_site"),
  theme: join(SCRIPT_DIR, "lib", "wiki-reader-theme.css"),
  title: "POM Wiki Reader",
  label: "Persistent Wiki",
  lang: "en",
  generatedDate: new Date().toISOString().slice(0, 10),
  mermaidRuntime: "",
};

const EXCLUDED_READER_FILES = new Set(["log.md"]);

function main() {
  const config = parseArgs(process.argv.slice(2));
  const pages = loadPages(config);

  rmSync(config.out, { recursive: true, force: true });
  mkdirSync(config.out, { recursive: true });

  for (const page of pages) {
    writeFileSync(join(config.out, page.output), renderPage(page, pages, config), "utf8");
  }

  const searchIndex = pages.map((page) => ({
    title: page.title,
    navTitle: page.navTitle,
    summary: page.summary,
    output: page.output,
    text: page.searchText,
  }));

  writeFileSync(join(config.out, "assets.css"), renderCss(config), "utf8");
  writeFileSync(join(config.out, "reader.js"), renderJs(), "utf8");
  writeFileSync(join(config.out, "search-index.json"), `${JSON.stringify(searchIndex, null, 2)}\n`, "utf8");
  writeFileSync(join(config.out, "search-index.js"), `window.POM_SEARCH_INDEX = ${JSON.stringify(searchIndex)};\n`, "utf8");

  if (isRemoteUrl(config.mermaidRuntime)) {
    console.log(
      "Warning: generated reader will load Mermaid from a remote URL. Use a local runtime for offline or sensitive environments.",
    );
  }
  console.log(`Rendered ${pages.length} pages to ${config.out}`);
  console.log(`Open ${pathToFileURL(join(config.out, "index.html")).href}`);
}

// Option name -> config key. Path options are resolved against the current directory.
const OPTIONS = {
  source: "source",
  out: "out",
  theme: "theme",
  title: "title",
  label: "label",
  lang: "lang",
  "generated-date": "generatedDate",
  "mermaid-runtime": "mermaidRuntime",
};
const PATH_OPTIONS = new Set(["source", "out", "theme"]);

function parseArgs(args) {
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }
  const known = Object.keys(OPTIONS);
  const stray = [...unknownOptions(args, known), ...positionalArgs(args, known)];
  if (stray.length > 0) throw new Error(`Unknown option: ${stray[0]}`);

  const config = { ...DEFAULT_CONFIG };
  for (const [name, key] of Object.entries(OPTIONS)) {
    const value = readRawArg(name, args);
    if (value === undefined) continue;
    config[key] = PATH_OPTIONS.has(name) ? resolvePath(value) : requireValue(value, `--${name}`);
  }
  return config;
}

function printHelp() {
  console.log(`Usage:
  node scripts/render-wiki.mjs [options]

Options:
  --source <dir>            Markdown wiki directory
  --out <dir>               Generated static site directory
  --title <text>            Reader title
  --label <text>            Small page label above titles
  --theme <file>            CSS theme copied to assets.css
  --lang <code>             HTML language attribute
  --generated-date <date>   Date shown in generated page metadata
  --mermaid-runtime <path>  Optional local or URL Mermaid module.
                         Default loads no Mermaid runtime; prefer local
                         runtimes for offline or sensitive environments.

The generated HTML is a reader view. Markdown remains canonical.`);
}

function requireValue(value, option) {
  if (!value) throw new Error(`${option} requires a value`);
  return value;
}

function resolvePath(value) {
  const required = requireValue(value, "path option");
  return isAbsolute(required) ? required : join(process.cwd(), required);
}

function loadPages(config) {
  const files = orderFiles(
    readdirSync(config.source).filter((file) => file.endsWith(".md") && !EXCLUDED_READER_FILES.has(file)),
    config.source,
  );
  const readerFiles = new Set(files);

  return files.map((file) => {
    const markdown = readFileSync(join(config.source, file), "utf8");
    const parsed = splitFrontmatter(markdown);
    const title = extractTitle(parsed.body, file);
    const navTitle = extractNavTitle(parsed.metadata, title);
    const summary = extractSummary(parsed.body);
    const rendered = renderMarkdown(parsed.body, config, {
      out: config.out,
      pageFile: file,
      bodyLine: parsed.bodyLine,
      readerFiles,
      source: config.source,
    });
    return {
      file,
      slug: file.replace(/\.md$/, ""),
      output: file.replace(/\.md$/, ".html"),
      markdown,
      title,
      navTitle,
      summary,
      body: rendered.html,
      outline: rendered.outline,
      searchText: normalizeSearchText(`${title} ${navTitle} ${summary} ${stripMarkdown(parsed.body)}`),
    };
  });
}

function orderFiles(files, source) {
  const preferred = readIndexOrder(files, source);
  return files.sort((a, b) => {
    const ai = preferred.indexOf(a);
    const bi = preferred.indexOf(b);
    if (ai !== -1 || bi !== -1) return rank(ai) - rank(bi);
    if (a === "index.md") return -1;
    if (b === "index.md") return 1;
    return a.localeCompare(b);
  });
}

function readIndexOrder(files, source) {
  const available = new Set(files);
  const ordered = ["index.md"];
  const indexPath = join(source, "index.md");
  if (!existsSync(indexPath)) return ordered;

  const text = readFileSync(indexPath, "utf8");
  const linkPattern = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]|\]\(([^)#]+\.md)(?:#[^)]+)?\)/g;
  for (const match of text.matchAll(linkPattern)) {
    const raw = match[1] || match[2];
    const file = basename(raw.trim()).replace(/\.md$/, "") + ".md";
    if (available.has(file) && !ordered.includes(file)) ordered.push(file);
  }

  return ordered;
}

function rank(index) {
  return index === -1 ? 999 : index;
}

function splitFrontmatter(markdown) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---[ \t]*\n?/);
  if (!match) return { metadata: {}, body: markdown, bodyLine: 1 };
  return {
    metadata: parseFrontmatter(match[1]),
    body: normalized.slice(match[0].length),
    bodyLine: match[0].split("\n").length,
  };
}

function parseFrontmatter(rawMetadata) {
  const metadata = {};
  for (const line of rawMetadata.split("\n")) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    const value = unquoteYamlString(match[2].trim());
    if (value) metadata[key] = value;
  }
  return metadata;
}

function unquoteYamlString(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).trim();
  }
  return value.trim();
}

function extractTitle(markdown, file) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : basename(file, ".md");
}

function extractNavTitle(metadata, title) {
  return metadata.navTitle || metadata.nav_title || title;
}

function extractSummary(markdown) {
  const summary = markdown.match(/## Summary\s+([\s\S]*?)(?=\n## |\n# |\n?$)/);
  if (!summary) return "Persistent wiki page.";
  const paragraph = summary[1].split(/\n\s*\n/).find((block) => block.trim());
  return paragraph ? shorten(stripMarkdown(paragraph.trim()), 220) : "Persistent wiki page.";
}

function renderPage(page, pages, config) {
  const nav = pages
    .map((item) => {
      const active = item.output === page.output ? " aria-current=\"page\"" : "";
      return `<a href="${item.output}" data-title="${escapeAttr(item.title)}" data-nav-title="${escapeAttr(item.navTitle)}" title="${escapeAttr(item.title)}"${active}>${escapeHtml(item.navTitle)}</a>`;
    })
    .join("\n");

  const outline = renderOutline(page.outline);

  const index = pages.findIndex((item) => item.output === page.output);
  const previous = pages[index - 1];
  const next = pages[index + 1];
  const sourceHref = relative(config.out, join(config.source, page.file));

  return `<!doctype html>
<html lang="${escapeAttr(config.lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="generator" content="POM Wiki Reader">
  <title>${escapeHtml(page.title)} - ${escapeHtml(config.title)}</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="assets.css">
</head>
<body>
  <header class="topbar">
    <a class="brand" href="index.html">
      <span class="brand-mark">POM</span>
      <span>${escapeHtml(config.title)}</span>
    </a>
    <a class="source-link" href="${escapeAttr(sourceHref)}" target="_blank" rel="noopener noreferrer">Markdown source</a>
  </header>

  <div class="layout">
    <aside class="site-nav" aria-label="Wiki pages">
      <label class="search-label" for="page-search">Search wiki</label>
      <input id="page-search" type="search" placeholder="Search title and content" autocomplete="off">
      <p id="search-status" class="search-status" aria-live="polite"></p>
      <nav id="page-nav">
        ${nav}
      </nav>
    </aside>

    <main class="content">
      <article class="page">
        <header class="page-head">
          <nav class="breadcrumb" aria-label="Breadcrumb"><a href="index.html">Wiki</a><span>/</span><span title="${escapeAttr(page.title)}">${escapeHtml(page.navTitle)}</span></nav>
          <p class="eyebrow">${escapeHtml(config.label)}</p>
          <h1>${escapeHtml(page.title)}</h1>
          <p class="dek">${escapeHtml(page.summary)}</p>
          <div class="meta">
            <span>Source: ${escapeHtml(page.file)}</span>
            <span>Generated: ${escapeHtml(config.generatedDate)}</span>
          </div>
        </header>
        <aside class="generated-notice">
          <strong>Generated reader view.</strong> Edit the Markdown source, then regenerate this static site. The HTML is not canonical Operating Memory.
        </aside>
        ${page.body}
        ${renderPager(previous, next)}
      </article>
    </main>

    <aside class="outline" aria-label="Page outline">
      <p class="outline-title">On This Page</p>
      <nav>${outline}</nav>
    </aside>
  </div>

  <script src="search-index.js"></script>
  <script src="reader.js"></script>
  ${renderMermaidRuntime(config)}
</body>
</html>
`;
}

function renderOutline(outline) {
  if (!outline.length) return `<span class="empty-outline">No page sections</span>`;

  const blocks = [];
  let current = null;

  const flushCurrent = () => {
    if (!current) return;
    blocks.push(renderOutlineBlock(current.heading, current.children));
    current = null;
  };

  for (const heading of outline) {
    if (heading.level <= 2) {
      flushCurrent();
      current = { heading, children: [] };
    } else if (current) {
      current.children.push(heading);
    } else {
      blocks.push(renderOutlineLink(heading));
    }
  }

  flushCurrent();
  return blocks.join("\n");
}

function renderOutlineBlock(heading, children) {
  if (!children.length) return renderOutlineLink(heading);
  return `<details class="outline-section" open>
    <summary>${renderOutlineLink(heading)}</summary>
    <div class="outline-children">
      ${children.map(renderOutlineLink).join("\n")}
    </div>
  </details>`;
}

function renderOutlineLink(heading) {
  return `<a class="level-${heading.level}" href="#${heading.id}">${escapeHtml(heading.text)}</a>`;
}

function renderPager(previous, next) {
  if (!previous && !next) return "";
  return `<nav class="page-pager" aria-label="Previous and next pages">
    ${previous ? `<a class="pager-prev" href="${previous.output}" title="${escapeAttr(previous.title)}"><span>Previous</span>${escapeHtml(previous.navTitle)}</a>` : "<span></span>"}
    ${next ? `<a class="pager-next" href="${next.output}" title="${escapeAttr(next.title)}"><span>Next</span>${escapeHtml(next.navTitle)}</a>` : "<span></span>"}
  </nav>`;
}

function renderMermaidRuntime(config) {
  if (!config.mermaidRuntime) return "";
  return `<script type="module">
import mermaid from "${escapeAttr(config.mermaidRuntime)}";
mermaid.initialize({ startOnLoad: true, theme: "dark" });
</script>`;
}

function isRemoteUrl(value) {
  return /^https?:\/\//i.test(value);
}

function renderCss(config) {
  const base = readFileSync(config.theme, "utf8");
  const responsive = join(dirname(config.theme), "wiki-reader-responsive.css");
  return existsSync(responsive) ? `${base.trimEnd()}\n\n${readFileSync(responsive, "utf8").trimEnd()}\n` : base;
}

function renderJs() {
  return `const search = document.getElementById("page-search");
const status = document.getElementById("search-status");
const links = Array.from(document.querySelectorAll("#page-nav a"));
const index = Array.isArray(window.POM_SEARCH_INDEX) ? window.POM_SEARCH_INDEX : [];

const byOutput = new Map(index.map((item) => [item.output, item]));

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function updateSearch() {
  const query = normalize(search.value);
  let visible = 0;
  for (const link of links) {
    const href = link.getAttribute("href");
    const item = byOutput.get(href);
    const haystack = normalize([link.dataset.title, link.dataset.navTitle, item && item.summary, item && item.text].join(" "));
    const match = !query || haystack.includes(query);
    link.hidden = !match;
    if (match) visible += 1;
  }
  if (status) status.textContent = query ? visible + " page" + (visible === 1 ? "" : "s") + " found" : "";
}

if (search) search.addEventListener("input", updateSearch);

document.addEventListener("click", async (event) => {
  const anchor = event.target.closest(".heading-anchor");
  if (!anchor) return;
  const url = new URL(anchor.getAttribute("href"), window.location.href).href;
  if (!navigator.clipboard) return;
  event.preventDefault();
  await navigator.clipboard.writeText(url);
  anchor.classList.add("copied");
  window.setTimeout(() => anchor.classList.remove("copied"), 900);
});
`;
}

main();
