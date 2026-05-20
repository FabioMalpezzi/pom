import { basename, dirname, extname, join, normalize } from "node:path";

export function extractTitle(content, path) {
  if (extname(path) !== ".md") return basename(path);
  const match = content.match(/^#\s+(.+)$/m);
  return match ? stripInline(match[1]) : basename(path);
}

export function extractSummary(content) {
  if (!content.includes("\n\n") && content.length > 160) return shorten(content, 160);
  const summary = content.match(/## Summary\s+([\s\S]*?)(?=\n## |\n# |\n?$)/);
  const source = summary ? summary[1] : content.replace(/^---[\s\S]*?---\s*/, "");
  const paragraph = source.split(/\n\s*\n/).find((block) => block.trim() && !block.trim().startsWith("#"));
  return shorten(stripInline(paragraph || "Document"), 160);
}

export function renderDocument(content, path) {
  const ext = extname(path);
  if (ext === ".md") return renderMarkdown(content, path);
  if (ext === ".json") return renderJson(content);
  return renderCode(content, ext.slice(1) || "text");
}

function stripInline(value) {
  return String(value)
    .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (_, page, label) => label || page)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_>#|-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shorten(value, max) {
  return value.length <= max ? value : `${value.slice(0, max - 3).replace(/\s+\S*$/, "")}...`;
}

function renderJson(content) {
  return renderCodeBlock(JSON.stringify(JSON.parse(content), null, 2), "json");
}

function renderCode(content, lang) {
  return renderCodeBlock(content, lang, "code-file");
}

function renderCodeBlock(content, lang, className = "") {
  const normalized = String(content).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.endsWith("\n") ? normalized.slice(0, -1).split("\n") : normalized.split("\n");
  const numbered = shouldNumberCodeBlock(lang);
  const rows = lines.map((line, index) => {
    const text = highlightCodeLine(line, lang) || " ";
    if (!numbered) return `<span class="code-line"><span class="code-line-text">${text}</span></span>`;
    return `<span class="code-line"><span class="code-line-number">${index + 1}</span><span class="code-line-text">${text}</span></span>`;
  }).join("");
  const classes = [
    "code-block",
    className,
    numbered ? "line-numbered" : "no-line-numbers",
    isPlainTextBlock(lang) ? "plain-text-block" : "",
  ].filter(Boolean).join(" ");
  return `<pre class="${classes}" data-lang="${escapeHtml(lang || "text")}" data-numbered="${numbered ? "true" : "false"}"><code>${rows}</code></pre>`;
}

function isPlainTextBlock(lang) {
  return new Set(["", "ascii", "text", "txt"]).has(normalizeLang(lang));
}

function shouldNumberCodeBlock(lang) {
  return new Set([
    "c",
    "cjs",
    "cpp",
    "cs",
    "css",
    "go",
    "html",
    "java",
    "js",
    "json",
    "jsx",
    "kt",
    "kotlin",
    "mjs",
    "php",
    "py",
    "python",
    "rb",
    "rs",
    "ruby",
    "scala",
    "sql",
    "swift",
    "ts",
    "tsx",
    "xml",
  ]).has(normalizeLang(lang));
}

function highlightCodeLine(line, lang) {
  const normalizedLang = normalizeLang(lang);
  const escaped = escapeCodeText(line);
  if (!escaped.trim()) return "";
  if (["js", "mjs", "ts"].includes(normalizedLang)) return highlightJs(escaped);
  if (normalizedLang === "json") return highlightJson(escaped);
  if (normalizedLang === "css") return highlightCss(escaped);
  if (["html", "xml"].includes(normalizedLang)) return highlightHtml(escaped);
  if (["bash", "sh", "shell", "zsh"].includes(normalizedLang)) return highlightShell(escaped);
  return escaped;
}

function normalizeLang(lang) {
  const value = String(lang || "text").trim().toLowerCase();
  if (value === "javascript") return "js";
  if (value === "typescript") return "ts";
  if (value === "text") return "text";
  return value;
}

function highlightJs(text) {
  const store = [];
  let out = protectTokens(text, /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/g, "tok-string", store);
  out = protectTokens(out, /\/\/.*$/g, "tok-comment", store);
  out = protectTokens(out, /\/\*.*?\*\//g, "tok-comment", store);
  out = out.replace(/\b(import|from|export|const|let|var|function|return|if|else|for|while|switch|case|break|continue|class|new|try|catch|finally|throw|async|await|true|false|null|undefined|type|interface|extends|default)\b/g, '<span class="tok-keyword">$1</span>');
  out = out.replace(/\b([0-9]+(?:\.[0-9]+)?)\b/g, '<span class="tok-number">$1</span>');
  return restoreTokens(out, store);
}

function highlightJson(text) {
  const store = [];
  let out = protectTokens(text, /"(?:\\.|[^"\\])*"/g, "tok-string", store);
  out = out.replace(/\b(true|false|null)\b/g, '<span class="tok-keyword">$1</span>');
  out = out.replace(/\b-?[0-9]+(?:\.[0-9]+)?\b/g, '<span class="tok-number">$&</span>');
  return restoreTokens(out, store);
}

function highlightCss(text) {
  const store = [];
  let out = protectTokens(text, /\/\*.*?\*\//g, "tok-comment", store);
  out = protectTokens(out, /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g, "tok-string", store);
  out = out.replace(/#[0-9a-fA-F]{3,8}\b/g, '<span class="tok-number">$&</span>');
  out = out.replace(/([a-zA-Z-]+)(\s*:)/g, '<span class="tok-property">$1</span>$2');
  out = out.replace(/(@[a-zA-Z-]+)/g, '<span class="tok-keyword">$1</span>');
  return restoreTokens(out, store);
}

function highlightHtml(text) {
  const store = [];
  let out = protectTokens(text, /&lt;!--.*?--&gt;/g, "tok-comment", store);
  out = protectTokens(out, /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g, "tok-string", store);
  out = out.replace(/(&lt;\/?)([A-Za-z][A-Za-z0-9:-]*)/g, '$1<span class="tok-tag">$2</span>');
  out = out.replace(/\s([A-Za-z_:][A-Za-z0-9_:.:-]*)(=)/g, ' <span class="tok-property">$1</span>$2');
  out = out.replace(/(\/?&gt;)/g, '<span class="tok-muted">$1</span>');
  return restoreTokens(out, store);
}

function highlightShell(text) {
  const store = [];
  let out = protectTokens(text, /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g, "tok-string", store);
  out = protectTokens(out, /#.*/g, "tok-comment", store);
  out = out.replace(/(^|\s)(-{1,2}[A-Za-z0-9-]+)/g, '$1<span class="tok-keyword">$2</span>');
  out = out.replace(/\b(curl|node|npm|git|cd|mkdir|cp|mv|rm|cat|rg|grep|sed|awk|export)\b/g, '<span class="tok-function">$1</span>');
  return restoreTokens(out, store);
}

function protectTokens(text, pattern, className, store) {
  return text.replace(pattern, (match) => {
    const placeholder = `@@POMTOK${store.length}@@`;
    store.push(`<span class="${className}">${match}</span>`);
    return placeholder;
  });
}

function restoreTokens(text, store) {
  return text.replace(/@@POMTOK(\d+)@@/g, (_, index) => store[Number(index)]);
}

function renderMarkdown(markdown, currentPath) {
  const body = markdown.replace(/^---\n[\s\S]*?\n---\s*/, "");
  const lines = body.split(/\r?\n/);
  const out = [];
  let paragraph = [];
  let list = null;
  let inCode = false;
  let code = [];
  let codeLang = "";

  const flushParagraph = () => {
    if (!paragraph.length) return;
    out.push(`<p>${inlineMarkdown(paragraph.join(" "), currentPath)}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    out.push(`<${list.type}>${list.items.map((item) => `<li>${inlineMarkdown(item, currentPath)}</li>`).join("")}</${list.type}>`);
    list = null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fence = line.match(/^```([A-Za-z0-9_-]*)\s*$/);
    if (fence && !inCode) {
      flushParagraph();
      flushList();
      inCode = true;
      codeLang = fence[1] || "";
      code = [];
      continue;
    }
    if (fence && inCode) {
      out.push(renderCodeBlock(code.join("\n"), codeLang || "text"));
      inCode = false;
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    if (isTableStart(line, lines[index + 1])) {
      flushParagraph();
      flushList();
      const tableLines = [line, lines[index + 1]];
      index += 2;
      while (index < lines.length && isTableRow(lines[index])) {
        tableLines.push(lines[index]);
        index += 1;
      }
      index -= 1;
      out.push(renderTable(tableLines, currentPath));
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      out.push(`<h${level}>${inlineMarkdown(heading[2], currentPath)}</h${level}>`);
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      if (!list || list.type !== "ul") list = { type: "ul", items: [] };
      list.items.push(bullet[1]);
      continue;
    }
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      if (!list || list.type !== "ol") list = { type: "ol", items: [] };
      list.items.push(ordered[1]);
      continue;
    }
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  return out.join("\n");
}

function isTableStart(line, nextLine) {
  return isTableRow(line) && Boolean(nextLine) && isTableSeparator(nextLine);
}

function isTableRow(line) {
  return line.includes("|") && !line.trim().startsWith("```");
}

function isTableSeparator(line) {
  const cells = splitTableRow(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function splitTableRow(line) {
  let value = line.trim();
  if (value.startsWith("|")) value = value.slice(1);
  if (value.endsWith("|")) value = value.slice(0, -1);
  return value.split("|").map((cell) => cell.trim());
}

function renderTable(tableLines, currentPath) {
  const header = splitTableRow(tableLines[0]);
  const aligns = splitTableRow(tableLines[1]).map((cell) => {
    if (cell.startsWith(":") && cell.endsWith(":")) return "center";
    if (cell.endsWith(":")) return "right";
    return "left";
  });
  const body = tableLines.slice(2).map(splitTableRow);
  const head = header.map((cell, index) => {
    const align = aligns[index] || "left";
    return `<th class="align-${align}">${inlineMarkdown(cell, currentPath)}</th>`;
  }).join("");
  const rows = body.map((row) => {
    const cells = header.map((_, index) => {
      const align = aligns[index] || "left";
      return `<td class="align-${align}">${inlineMarkdown(row[index] || "", currentPath)}</td>`;
    }).join("");
    return `<tr>${cells}</tr>`;
  }).join("");
  return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function inlineMarkdown(value, currentPath) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_, page, label) => {
      const target = `wiki/${page.replace(/\.md$/, "")}.md`;
      return `<a href="#" data-doc-path="${escapeHtml(target)}">${escapeHtml(label || page)}</a>`;
    })
    .replace(/\[([^\]]+)\]\(([^)]+\.md)(?:#[^)]+)?\)/g, (_, label, target) => {
      const resolved = resolveLinkTarget(currentPath, target);
      return `<a href="#" data-doc-path="${escapeHtml(resolved)}">${escapeHtml(label)}</a>`;
    });
}

function resolveLinkTarget(currentPath, target) {
  if (target.startsWith("/")) return target.slice(1);
  return normalize(join(dirname(currentPath), target));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeCodeText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
