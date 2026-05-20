#!/usr/bin/env node

import { createServer } from "node:http";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createAnnotation, deleteAnnotation, listAnnotations, readAnnotation, searchProject, takeAnnotation } from "../wiki-tools.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");
const PUBLIC = join(HERE, "public");
const MARKDOWN_EXTS = [".md"];
const DOC_EXTS = [".md", ".html", ".css", ".json", ".mjs"];
const SOURCE_EXTS = [".ts", ".mjs", ".js", ".css", ".html", ".json"];
const PROJECT_INDEX_PATH = "__project_index__.md";

const DOC_SOURCES = [
  { root: "wiki", kind: "wiki", exts: [".md"], skipDirs: ["_site"], skipFiles: ["log.md"] },
  { root: "specs", kind: "spec", exts: [".md"] },
  { root: "decisions", kind: "decision", exts: [".md"] },
  { root: "tasks", kind: "task_plan", exts: [".md"] },
  { root: "docs", kind: "project_doc", exts: DOC_EXTS },
  { root: "examples", kind: "project_doc", exts: DOC_EXTS },
  { root: "prompts", kind: "project_doc", exts: MARKDOWN_EXTS },
  { root: "skills", kind: "project_doc", exts: MARKDOWN_EXTS },
  { root: "templates", kind: "project_doc", exts: DOC_EXTS },
  { root: "agents", kind: "project_doc", exts: MARKDOWN_EXTS },
  { root: "experiments/wiki-agent-orchestration", kind: "experiment", exts: DOC_EXTS, skipDirs: ["evidence", "fixtures"] },
  { root: "scripts", kind: "source", exts: SOURCE_EXTS },
  { root: "tests", kind: "source", exts: SOURCE_EXTS },
  { root: "bootstrap-pom.mjs", kind: "source", exts: [".mjs"] },
  { root: "package.json", kind: "source", exts: [".json"] },
  { root: "README.md", kind: "project_doc", exts: [".md"] },
  { root: "CHANGELOG.md", kind: "project_doc", exts: [".md"] },
  { root: "CONTEXT.md", kind: "project_doc", exts: [".md"] },
  { root: "WIKI_METHOD.md", kind: "project_doc", exts: [".md"] },
];

const KIND_ORDER = new Map([
  ["wiki", 0],
  ["project_doc", 1],
  ["spec", 2],
  ["decision", 3],
  ["task_plan", 4],
  ["experiment", 5],
  ["source", 6],
  ["other", 9],
]);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const port = parsePort(process.argv.slice(2));
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
    if (url.pathname === "/api/documents") return sendJson(res, listDocuments());
    if (url.pathname === "/api/document") return sendJson(res, readDocument(url.searchParams.get("path")));
    if (url.pathname === "/api/search") return sendJson(res, searchProject({
      query: url.searchParams.get("q"),
      regex: url.searchParams.get("regex") === "1",
      roots: searchRootsForKind(url.searchParams.get("kind") || "all"),
    }));
    if (url.pathname === "/api/annotations" && req.method === "GET") return sendJson(res, listAnnotations({
      status: url.searchParams.get("status") || undefined,
    }));
    if (url.pathname === "/api/annotations" && req.method === "POST") return sendJson(res, createAnnotation({
      ...JSON.parse(await readBody(req)),
      source: "mini-ui",
    }));
    if (url.pathname === "/api/annotation" && req.method === "GET") return sendJson(res, readAnnotation(url.searchParams.get("id")));
    if (url.pathname === "/api/annotation" && req.method === "DELETE") return sendJson(res, deleteAnnotation(url.searchParams.get("id")));
    if (url.pathname === "/api/annotation/take" && req.method === "POST") {
      const input = JSON.parse(await readBody(req) || "{}");
      return sendJson(res, takeAnnotation(input.annotationId, { by: input.by || "agent" }));
    }
    return serveStatic(res, url.pathname);
  } catch (error) {
    sendJson(res, { error: error.message }, error.statusCode || 400);
  }
});

server.listen(port, "127.0.0.1", () => {
  const address = server.address();
  console.log(`POM Project Reader: http://127.0.0.1:${address.port}`);
});

function parsePort(args) {
  const index = args.indexOf("--port");
  if (index === -1) return Number(process.env.PORT || 4173);
  const value = Number(args[index + 1]);
  if (!Number.isInteger(value) || value < 1 || value > 65535) throw new Error("Invalid --port value");
  return value;
}

function serveStatic(res, pathname) {
  const clean = pathname === "/" ? "/index.html" : pathname;
  const file = resolve(PUBLIC, `.${clean}`);
  if (!file.startsWith(PUBLIC)) throw new Error("Blocked path");
  if (!existsSync(file) || !statSync(file).isFile()) return notFound(res);
  const ext = extname(file);
  res.writeHead(200, {
    "content-type": MIME[ext] || "application/octet-stream",
    "cache-control": "no-store",
  });
  res.end(readFileSync(file));
}

function listDocuments() {
  const docs = physicalDocuments();
  if (!hasWikiIndex(docs)) docs.push(projectIndexSummary(docs));
  return docs.sort(compareDocuments);
}

function physicalDocuments() {
  return DOC_SOURCES.flatMap((source) => {
    const absolute = join(ROOT, source.root);
    if (!existsSync(absolute)) return [];
    if (statSync(absolute).isFile()) return [documentSummary(source.root, source.kind)];
    return walk(source.root, source)
      .filter((path) => source.exts.includes(extname(path)))
      .map((path) => documentSummary(path, source.kind));
  });
}

function walk(root, source) {
  const absolute = join(ROOT, root);
  const entries = readdirSync(absolute, { withFileTypes: true });
  const paths = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === ".DS_Store") continue;
    if (source.skipFiles?.includes(entry.name)) continue;
    const child = join(root, entry.name);
    if (entry.isDirectory()) {
      if (source.skipDirs?.includes(entry.name)) continue;
      paths.push(...walk(child, source));
    } else {
      paths.push(child);
    }
  }
  return paths;
}

function documentSummary(path, kind) {
  const content = readFileSync(join(ROOT, path), "utf8");
  return {
    path,
    kind,
    title: extractTitle(content, path),
    summary: extractSummary(content),
  };
}

function readDocument(path) {
  if (path === PROJECT_INDEX_PATH) return projectIndexDocument(physicalDocuments());
  const safePath = requireAllowedPath(path);
  const content = readFileSync(join(ROOT, safePath), "utf8");
  return {
    path: safePath,
    kind: kindForPath(safePath),
    title: extractTitle(content, safePath),
    markdown: content,
    html: renderDocument(content, safePath),
  };
}

function requireAllowedPath(input) {
  if (!input) throw new Error("Missing path");
  const normalized = normalize(String(input));
  if (isAbsolute(normalized)) throw new Error("Absolute paths are not allowed");
  const absolute = resolve(ROOT, normalized);
  const relativePath = relative(ROOT, absolute);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) throw new Error("Path outside repository");
  const allowed = DOC_SOURCES.some((source) => {
    return pathBelongsToSource(absolute, source) && !pathIsSkipped(relativePath, source) && pathExtAllowed(relativePath, source);
  }) || relativePath.startsWith("experiments/wiki-agent-orchestration/evidence/");
  if (!allowed) throw new Error("Path is not part of the mini UI document set");
  if (!existsSync(absolute) || !statSync(absolute).isFile()) throw new Error("Document not found");
  return relativePath;
}

function kindForPath(path) {
  const match = DOC_SOURCES.find((source) => {
    const absolute = resolve(ROOT, path);
    return pathBelongsToSource(absolute, source) && !pathIsSkipped(path, source) && pathExtAllowed(path, source);
  });
  return match?.kind || "other";
}

function kindRank(kind) {
  return KIND_ORDER.has(kind) ? KIND_ORDER.get(kind) : KIND_ORDER.get("other");
}

function compareDocuments(a, b) {
  return documentRank(a) - documentRank(b) || a.path.localeCompare(b.path);
}

function documentRank(doc) {
  if (doc.path === PROJECT_INDEX_PATH) return -2;
  if (doc.path === "wiki/index.md") return -1;
  return kindRank(doc.kind);
}

function hasWikiIndex(docs) {
  return docs.some((doc) => doc.path === "wiki/index.md");
}

function projectIndexSummary(docs) {
  return {
    path: PROJECT_INDEX_PATH,
    kind: "project_doc",
    title: "POM Project Reader",
    summary: `Generated project entry point for ${docs.length} readable project files.`,
  };
}

function projectIndexDocument(docs) {
  const markdown = renderProjectIndexMarkdown(docs);
  return {
    path: PROJECT_INDEX_PATH,
    kind: "project_doc",
    title: "POM Project Reader",
    markdown,
    html: renderDocument(markdown, PROJECT_INDEX_PATH),
  };
}

function renderProjectIndexMarkdown(docs) {
  const readableDocs = docs.filter((doc) => doc.path !== PROJECT_INDEX_PATH);
  const startLinks = preferredStartDocuments(readableDocs)
    .map((doc) => `- [${doc.title}](${doc.path}) - \`${doc.path}\``)
    .join("\n") || "- No preferred entry document was found in the current allowlist.";
  const rows = groupedDocumentCounts(readableDocs)
    .map(([kind, count]) => `| ${kind} | ${count} |`)
    .join("\n") || "| project_doc | 0 |";
  return `# POM Project Reader

This generated index is shown because the project does not provide \`wiki/index.md\`.
Use it as a neutral entry point for project documents, source files, search, and file-based annotations.

## Start Here

${startLinks}

## Document Groups

| Kind | Files |
| --- | ---: |
${rows}

## Agent Handoff

- Use project search for discovery.
- Save annotations from the right panel when a file needs agent attention.
- The agent reads annotation files, claims them, records its outcome, and then applies separate reviewed changes.
`;
}

function preferredStartDocuments(docs) {
  const preferred = ["README.md", "CONTEXT.md", "docs", "decisions", "tasks", "specs"];
  return [...docs]
    .filter((doc) => extname(doc.path) === ".md" && preferred.some((prefix) => doc.path === prefix || doc.path.startsWith(`${prefix}/`)))
    .sort((a, b) => preferredRank(a.path, preferred) - preferredRank(b.path, preferred) || a.path.localeCompare(b.path))
    .slice(0, 8);
}

function preferredRank(path, preferred) {
  const index = preferred.findIndex((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  return index === -1 ? preferred.length : index;
}

function groupedDocumentCounts(docs) {
  const counts = new Map();
  for (const doc of docs) counts.set(doc.kind, (counts.get(doc.kind) || 0) + 1);
  return [...counts.entries()].sort((a, b) => kindRank(a[0]) - kindRank(b[0]) || a[0].localeCompare(b[0]));
}

function searchRootsForKind(kind) {
  const selectedKind = String(kind || "all");
  return DOC_SOURCES
    .filter((source) => selectedKind === "all" || source.kind === selectedKind)
    .map((source) => source.root);
}

function pathBelongsToSource(absolute, source) {
  const sourceAbsolute = resolve(ROOT, source.root);
  return absolute === sourceAbsolute || absolute.startsWith(`${sourceAbsolute}/`);
}

function pathIsSkipped(path, source) {
  const parts = relative(source.root, path).split(/[\\/]+/).filter(Boolean);
  return parts.some((part) => source.skipDirs?.includes(part)) || source.skipFiles?.includes(basename(path));
}

function pathExtAllowed(path, source) {
  return source.exts.includes(extname(path));
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) reject(new Error("Request too large"));
    });
    req.on("end", () => resolveBody(body));
    req.on("error", reject);
  });
}

function sendJson(res, value, status = 200) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(`${JSON.stringify(value, null, 2)}\n`);
}

function notFound(res) {
  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("Not found");
}

function extractTitle(content, path) {
  if (extname(path) !== ".md") return basename(path);
  const match = content.match(/^#\s+(.+)$/m);
  return match ? stripInline(match[1]) : basename(path);
}

function extractSummary(content) {
  if (!content.includes("\n\n") && content.length > 160) return shorten(content, 160);
  const summary = content.match(/## Summary\s+([\s\S]*?)(?=\n## |\n# |\n?$)/);
  const source = summary ? summary[1] : content.replace(/^---[\s\S]*?---\s*/, "");
  const paragraph = source.split(/\n\s*\n/).find((block) => block.trim() && !block.trim().startsWith("#"));
  return shorten(stripInline(paragraph || "Document"), 160);
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

function renderDocument(content, path) {
  const ext = extname(path);
  if (ext === ".md") return renderMarkdown(content, path);
  if (ext === ".json") return renderJson(content);
  return renderCode(content, ext.slice(1) || "text");
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
    return `<th style="text-align:${aligns[index] || "left"}">${inlineMarkdown(cell, currentPath)}</th>`;
  }).join("");
  const rows = body.map((row) => {
    const cells = header.map((_, index) => {
      return `<td style="text-align:${aligns[index] || "left"}">${inlineMarkdown(row[index] || "", currentPath)}</td>`;
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
