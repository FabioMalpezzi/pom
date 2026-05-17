#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

const LANGUAGE_LABELS = {
  ascii: "ASCII",
  bash: "Bash",
  css: "CSS",
  html: "HTML",
  javascript: "JavaScript",
  js: "JavaScript",
  json: "JSON",
  mermaid: "Mermaid",
  python: "Python",
  sh: "Shell",
  text: "Text",
  ts: "TypeScript",
  typescript: "TypeScript",
};

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
    summary: page.summary,
    output: page.output,
    text: page.searchText,
  }));

  writeFileSync(join(config.out, "assets.css"), renderCss(config), "utf8");
  writeFileSync(join(config.out, "reader.js"), renderJs(), "utf8");
  writeFileSync(join(config.out, "search-index.json"), `${JSON.stringify(searchIndex, null, 2)}\n`, "utf8");
  writeFileSync(join(config.out, "search-index.js"), `window.POM_SEARCH_INDEX = ${JSON.stringify(searchIndex)};\n`, "utf8");

  console.log(`Rendered ${pages.length} pages to ${config.out}`);
  console.log(`Open ${pathToFileURL(join(config.out, "index.html")).href}`);
}

function parseArgs(args) {
  const config = { ...DEFAULT_CONFIG };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    const [name, inlineValue] = arg.split("=", 2);
    const value = inlineValue ?? args[i + 1];

    if (name === "--source") config.source = resolvePath(value);
    else if (name === "--out") config.out = resolvePath(value);
    else if (name === "--theme") config.theme = resolvePath(value);
    else if (name === "--title") config.title = requireValue(value, name);
    else if (name === "--label") config.label = requireValue(value, name);
    else if (name === "--lang") config.lang = requireValue(value, name);
    else if (name === "--generated-date") config.generatedDate = requireValue(value, name);
    else if (name === "--mermaid-runtime") config.mermaidRuntime = requireValue(value, name);
    else throw new Error(`Unknown option: ${arg}`);

    if (inlineValue === undefined) i += 1;
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
  --mermaid-runtime <path>  Optional local or URL Mermaid module

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

  return files.map((file) => {
    const markdown = readFileSync(join(config.source, file), "utf8");
    const title = extractTitle(markdown, file);
    const summary = extractSummary(markdown);
    const rendered = renderMarkdown(markdown, config);
    return {
      file,
      slug: file.replace(/\.md$/, ""),
      output: file.replace(/\.md$/, ".html"),
      markdown,
      title,
      summary,
      body: rendered.html,
      outline: rendered.outline,
      searchText: normalizeSearchText(`${title} ${summary} ${stripMarkdown(markdown)}`),
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

function extractTitle(markdown, file) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : basename(file, ".md");
}

function extractSummary(markdown) {
  const summary = markdown.match(/## Summary\s+([\s\S]*?)(?=\n## |\n# |\n?$)/);
  if (!summary) return "Persistent wiki page.";
  const paragraph = summary[1].split(/\n\s*\n/).find((block) => block.trim());
  return paragraph ? shorten(stripMarkdown(paragraph.trim()), 220) : "Persistent wiki page.";
}

function stripMarkdown(value) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (_, page, label) => label || page)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_>#|-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSearchText(value) {
  return stripMarkdown(value).toLowerCase();
}

function shorten(value, maxLength) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).replace(/\s+\S*$/, "")}...`;
}

function renderMarkdown(markdown, config) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  const outline = [];
  const usedIds = new Map();
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const fence = line.match(/^```([^\s`]*)?.*$/);
    if (fence) {
      const code = [];
      const lang = normalizeLanguage(fence[1] || "text");
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      html.push(renderCodeBlock(code.join("\n"), lang, config));
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      if (level === 1) {
        i += 1;
        continue;
      }
      const id = uniqueId(slugify(text), usedIds);
      if (level <= 3) outline.push({ level, text, id });
      html.push(`<h${level} id="${id}">${inline(text)} <a class="heading-anchor" href="#${id}" aria-label="Copy link to ${escapeAttr(text)}">#</a></h${level}>`);
      i += 1;
      continue;
    }

    if (isTableStart(lines, i)) {
      const table = [];
      while (i < lines.length && isTableLine(lines[i])) {
        table.push(lines[i]);
        i += 1;
      }
      html.push(renderTable(table));
      continue;
    }

    if (/^\s*-\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*-\s+/, "").trim());
        i += 1;
      }
      html.push(`<ul>${items.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, "").trim());
        i += 1;
      }
      html.push(`<ol>${items.map((item) => `<li>${inline(item)}</li>`).join("")}</ol>`);
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      html.push(`<blockquote>${quote.map(inline).join("<br>")}</blockquote>`);
      continue;
    }

    const paragraph = [];
    while (i < lines.length && isParagraphLine(lines[i])) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    html.push(`<p>${inline(paragraph.join(" "))}</p>`);
  }

  return { html: html.join("\n"), outline };
}

function isParagraphLine(line) {
  return (
    line.trim() &&
    !line.startsWith("```") &&
    !/^(#{1,4})\s+/.test(line) &&
    !isTableLine(line) &&
    !/^\s*-\s+/.test(line) &&
    !/^\s*\d+\.\s+/.test(line) &&
    !/^>\s?/.test(line)
  );
}

function isTableStart(lines, index) {
  return isTableLine(lines[index]) && isTableLine(lines[index + 1] || "") && /\|?\s*:?-{3,}:?\s*\|/.test(lines[index + 1]);
}

function isTableLine(line) {
  return /^\s*\|.+\|\s*$/.test(line);
}

function renderTable(lines) {
  const rows = lines
    .filter((line, index) => index !== 1)
    .map((line) => line.trim().slice(1, -1).split("|").map((cell) => cell.trim()));

  const header = rows.shift() || [];
  const body = rows;

  const head = `<thead><tr>${header.map((cell) => `<th>${inline(cell)}</th>`).join("")}</tr></thead>`;
  const rowsHtml = body
    .map((row) => {
      const cells = row
        .map((cell, index) => `<td data-label="${escapeAttr(stripMarkdown(header[index] || ""))}">${inline(cell)}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `<div class="table-wrap"><table>${head}<tbody>${rowsHtml}</tbody></table></div>`;
}

function renderCodeBlock(code, lang, config) {
  const label = LANGUAGE_LABELS[lang] || lang.toUpperCase();

  if (lang === "mermaid") {
    const runtimeClass = config.mermaidRuntime ? " mermaid" : "";
    const note = config.mermaidRuntime
      ? "Rendered by the configured Mermaid runtime; source Markdown remains canonical."
      : "Mermaid source. Configure --mermaid-runtime to render diagrams.";
    return `<figure class="code-figure mermaid-figure">
  <figcaption><span>${label}</span><span>${escapeHtml(note)}</span></figcaption>
  <pre class="mermaid-source${runtimeClass}">${escapeHtml(code)}</pre>
</figure>`;
  }

  const isPlain = ["ascii", "text", "txt", "plain"].includes(lang);
  const className = isPlain ? "code-plain" : "code-highlight";
  const rendered = isPlain ? escapeHtml(code) : highlightCode(code, lang);

  return `<figure class="code-figure ${className}">
  <figcaption><span>${label}</span><span>${isPlain ? "Fixed-width text" : "Syntax highlighted"}</span></figcaption>
  <pre><code class="language-${escapeAttr(lang)}">${rendered}</code></pre>
</figure>`;
}

function normalizeLanguage(value) {
  const lang = String(value || "text").toLowerCase();
  if (lang === "shell") return "bash";
  if (lang === "jsx") return "js";
  if (lang === "tsx") return "ts";
  if (lang === "md" || lang === "markdown") return "text";
  if (!lang) return "text";
  return lang;
}

function highlightCode(code, lang) {
  if (["js", "javascript", "ts", "typescript"].includes(lang)) return highlightJsLike(code);
  if (lang === "json") return highlightJson(code);
  if (lang === "bash" || lang === "sh") return highlightShell(code);
  if (lang === "css") return highlightCss(code);
  if (lang === "html" || lang === "xml") return highlightHtml(code);
  if (lang === "python") return highlightPython(code);
  return escapeHtml(code);
}

function highlightJsLike(code) {
  const keywords = new Set("async await break case catch class const continue default do else export extends finally for from function if import in instanceof let new of return switch throw try typeof var while yield".split(" "));
  const literals = new Set(["true", "false", "null", "undefined"]);
  return tokenize(code, /\/\/.*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b[A-Za-z_$][\w$]*\b|\b\d+(?:\.\d+)?\b/g, (token) => {
    if (token.startsWith("//") || token.startsWith("/*")) return span("tok-comment", token);
    if (/^["'`]/.test(token)) return span("tok-string", token);
    if (keywords.has(token)) return span("tok-keyword", token);
    if (literals.has(token)) return span("tok-literal", token);
    if (/^\d/.test(token)) return span("tok-number", token);
    return escapeHtml(token);
  });
}

function highlightJson(code) {
  return tokenize(code, /"(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/gi, (token, full, offset) => {
    if (token.startsWith("\"")) {
      const rest = full.slice(offset + token.length);
      return /^\s*:/.test(rest) ? span("tok-key", token) : span("tok-string", token);
    }
    if (/^(true|false|null)$/i.test(token)) return span("tok-literal", token);
    return span("tok-number", token);
  });
}

function highlightShell(code) {
  const keywords = new Set("case do done elif else esac fi for function if in then until while".split(" "));
  return tokenize(code, /#.*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b[A-Za-z_][\w-]*\b|\$\{?[\w_]+\}?/g, (token) => {
    if (token.startsWith("#")) return span("tok-comment", token);
    if (/^["']/.test(token)) return span("tok-string", token);
    if (token.startsWith("$")) return span("tok-literal", token);
    if (keywords.has(token)) return span("tok-keyword", token);
    return escapeHtml(token);
  });
}

function highlightCss(code) {
  return tokenize(code, /\/\*[\s\S]*?\*\/|#[0-9a-fA-F]{3,8}|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|--?[\w-]+(?=\s*:)|\b\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw)?\b/g, (token) => {
    if (token.startsWith("/*")) return span("tok-comment", token);
    if (/^["']/.test(token)) return span("tok-string", token);
    if (token.startsWith("#")) return span("tok-literal", token);
    if (/^--?/.test(token)) return span("tok-key", token);
    return span("tok-number", token);
  });
}

function highlightHtml(code) {
  const escaped = escapeHtml(code);
  return escaped.replace(/(&lt;!--[\s\S]*?--&gt;|&lt;\/?[A-Za-z][\s\S]*?&gt;)/g, (token) => {
    if (token.startsWith("&lt;!--")) return `<span class="tok-comment">${token}</span>`;
    return `<span class="tok-keyword">${token}</span>`;
  });
}

function highlightPython(code) {
  const keywords = new Set("and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield".split(" "));
  const literals = new Set(["True", "False", "None"]);
  return tokenize(code, /#.*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b[A-Za-z_]\w*\b|\b\d+(?:\.\d+)?\b/g, (token) => {
    if (token.startsWith("#")) return span("tok-comment", token);
    if (/^["']/.test(token)) return span("tok-string", token);
    if (keywords.has(token)) return span("tok-keyword", token);
    if (literals.has(token)) return span("tok-literal", token);
    if (/^\d/.test(token)) return span("tok-number", token);
    return escapeHtml(token);
  });
}

function tokenize(code, pattern, classify) {
  const source = code;
  let output = "";
  let last = 0;
  for (const match of source.matchAll(pattern)) {
    output += escapeHtml(source.slice(last, match.index));
    output += classify(match[0], source, match.index);
    last = match.index + match[0].length;
  }
  output += escapeHtml(source.slice(last));
  return output;
}

function span(className, value) {
  return `<span class="${className}">${escapeHtml(value)}</span>`;
}

function inline(text) {
  const code = [];
  let value = text.replace(/`([^`]+)`/g, (_, raw) => {
    const token = `\u0000${code.length}\u0000`;
    code.push(`<code>${escapeHtml(raw)}</code>`);
    return token;
  });

  value = escapeHtml(value);
  value = value.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  value = value.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, page, label) => {
    const slug = page.trim().replace(/\.md$/, "");
    const text = label ? label.trim() : slug;
    return `<a href="${escapeAttr(slug)}.html">${escapeHtml(text)}</a>`;
  });
  value = value.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    return `<a href="${escapeAttr(rewriteHref(href))}">${label}</a>`;
  });

  for (let i = 0; i < code.length; i += 1) {
    value = value.replace(`\u0000${i}\u0000`, code[i]);
  }
  return value;
}

function rewriteHref(href) {
  if (/^https?:\/\//.test(href) || href.startsWith("#")) return href;
  return href.replace(/\.md($|#)/, ".html$1");
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";
}

function uniqueId(base, usedIds) {
  const count = usedIds.get(base) || 0;
  usedIds.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

function renderPage(page, pages, config) {
  const nav = pages
    .map((item) => {
      const active = item.output === page.output ? " aria-current=\"page\"" : "";
      return `<a href="${item.output}" data-title="${escapeAttr(item.title)}"${active}>${escapeHtml(item.title)}</a>`;
    })
    .join("\n");

  const outline = page.outline.length
    ? page.outline
        .map((heading) => `<a class="level-${heading.level}" href="#${heading.id}">${escapeHtml(heading.text)}</a>`)
        .join("\n")
    : `<span class="empty-outline">No page sections</span>`;

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
    <a class="source-link" href="${escapeAttr(sourceHref)}">Markdown source</a>
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
          <nav class="breadcrumb" aria-label="Breadcrumb"><a href="index.html">Wiki</a><span>/</span><span>${escapeHtml(page.title)}</span></nav>
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

function renderPager(previous, next) {
  if (!previous && !next) return "";
  return `<nav class="page-pager" aria-label="Previous and next pages">
    ${previous ? `<a class="pager-prev" href="${previous.output}"><span>Previous</span>${escapeHtml(previous.title)}</a>` : "<span></span>"}
    ${next ? `<a class="pager-next" href="${next.output}"><span>Next</span>${escapeHtml(next.title)}</a>` : "<span></span>"}
  </nav>`;
}

function renderMermaidRuntime(config) {
  if (!config.mermaidRuntime) return "";
  return `<script type="module">
import mermaid from "${escapeAttr(config.mermaidRuntime)}";
mermaid.initialize({ startOnLoad: true, theme: "base" });
</script>`;
}

function renderCss(config) {
  return readFileSync(config.theme, "utf8");
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
    const haystack = normalize([link.dataset.title, item && item.summary, item && item.text].join(" "));
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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

main();
