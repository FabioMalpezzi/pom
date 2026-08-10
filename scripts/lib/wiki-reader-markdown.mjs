//
// wiki-reader-markdown.mjs - Markdown to HTML conversion for the wiki reader.
//
// This module knows about Markdown blocks, inline spans, and code highlighting.
// It knows nothing about pages, navigation, themes, or the file system: it takes
// text and returns HTML fragments. Site assembly lives in scripts/render-wiki.mjs,
// which imports from here. The dependency runs one way only.
//

import { dirname, join, relative } from "node:path";

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

export function renderMarkdown(markdown, config, context = {}) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  const outline = [];
  const usedIds = new Map();
  let i = 0;
  let previous = -1;

  while (i < lines.length) {
    // Safety net: every branch below must consume at least one line. If one ever
    // fails to, stop with the offending location instead of growing `html`
    // forever until the runtime throws an opaque RangeError.
    if (i === previous) throw new Error(`${describeLine(context, i)}: renderer made no progress on: ${lines[i].trim()}`);
    previous = i;
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
      html.push(renderTable(table, context));
      continue;
    }

    if (/^\s*-\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*-\s+/, "").trim());
        i += 1;
      }
      html.push(`<ul>${items.map((item) => `<li>${inline(item, context)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, "").trim());
        i += 1;
      }
      html.push(`<ol>${items.map((item) => `<li>${inline(item, context)}</li>`).join("")}</ol>`);
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      html.push(`<blockquote>${quote.map((line) => inline(line, context)).join("<br>")}</blockquote>`);
      continue;
    }

    const paragraph = [];
    while (i < lines.length && isParagraphLine(lines, i)) {
      if (isTableLine(lines[i])) warnOrphanTableRow(context, i, lines[i]);
      paragraph.push(lines[i].trim());
      i += 1;
    }
    html.push(`<p>${inline(paragraph.join(" "), context)}</p>`);
  }

  return { html: html.join("\n"), outline };
}

function isParagraphLine(lines, index) {
  const line = lines[index];
  return (
    line.trim() &&
    !line.startsWith("```") &&
    !/^(#{1,4})\s+/.test(line) &&
    !isTableStart(lines, index) &&
    !/^\s*-\s+/.test(line) &&
    !/^\s*\d+\.\s+/.test(line) &&
    !/^>\s?/.test(line)
  );
}

// A `| ... |` line that starts no table is almost always an authoring mistake:
// a row separated from its table by a blank line. Render it as text like any
// Markdown renderer would, but name it so the author can find it.
function warnOrphanTableRow(context, index, line) {
  console.warn(
    `Warning: ${describeLine(context, index)}: table row is not part of a table (no header separator follows); rendered as text: ${line.trim()}`,
  );
}

function describeLine(context, index) {
  const file = context.pageFile || "markdown";
  return `${file}:${(context.bodyLine || 1) + index}`;
}

function isTableStart(lines, index) {
  return isTableLine(lines[index]) && isTableLine(lines[index + 1] || "") && /\|?\s*:?-{3,}:?\s*\|/.test(lines[index + 1]);
}

function isTableLine(line) {
  return /^\s*\|.+\|\s*$/.test(line);
}

function renderTable(lines, context) {
  const rows = lines
    .filter((line, index) => index !== 1)
    .map((line) => line.trim().slice(1, -1).split("|").map((cell) => cell.trim()));

  const header = rows.shift() || [];
  const body = rows;

  const head = `<thead><tr>${header.map((cell) => `<th>${inline(cell, context)}</th>`).join("")}</tr></thead>`;
  const rowsHtml = body
    .map((row) => {
      const cells = row
        .map((cell, index) => `<td data-label="${escapeAttr(stripMarkdown(header[index] || ""))}">${inline(cell, context)}</td>`)
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

function inline(text, context = {}) {
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
    return `<a ${renderHrefAttrs(href, context)}>${label}</a>`;
  });

  for (let i = 0; i < code.length; i += 1) {
    value = value.replace(`\u0000${i}\u0000`, code[i]);
  }
  return value;
}

function renderHrefAttrs(href, context = {}) {
  const rewritten = rewriteHref(href, context);
  const target = shouldOpenInNewPage(rewritten) ? ' target="_blank" rel="noopener noreferrer"' : "";
  return `href="${escapeAttr(rewritten)}"${target}`;
}

function shouldOpenInNewPage(href) {
  if (!href || href.startsWith("#") || href.startsWith("mailto:")) return false;
  if (/^https?:/.test(href)) return true;
  return !/\.html($|#)/.test(href);
}

function rewriteHref(href, context = {}) {
  if (/^(https?:|mailto:)/.test(href) || href.startsWith("#") || href.startsWith("/")) {
    return href;
  }

  const hashIndex = href.indexOf("#");
  const targetPath = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? "" : href.slice(hashIndex);
  if (!targetPath || targetPath.endsWith(".html")) return href;

  const normalizedTarget = targetPath.replace(/^\.\//, "");
  if (normalizedTarget.endsWith(".md") && context.readerFiles?.has(normalizedTarget)) {
    return `${normalizedTarget.replace(/\.md$/, ".html")}${fragment}`;
  }

  if (!context.source || !context.out) {
    return href;
  }

  const sourceDir = join(context.source, dirname(context.pageFile || ""));
  const sourceTarget = join(sourceDir, targetPath);
  const rewritten = relative(context.out, sourceTarget) || ".";
  const trailingSlash = targetPath.endsWith("/") && !rewritten.endsWith("/") ? "/" : "";
  return `${rewritten}${trailingSlash}${fragment}`;
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

export function stripMarkdown(value) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (_, page, label) => label || page)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_>#|-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeSearchText(value) {
  return stripMarkdown(value).toLowerCase();
}

export function shorten(value, maxLength) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).replace(/\s+\S*$/, "")}...`;
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
