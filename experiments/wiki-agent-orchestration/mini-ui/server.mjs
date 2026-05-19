#!/usr/bin/env node

import { createServer } from "node:http";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");
const PUBLIC = join(HERE, "public");
const EVIDENCE_ROOT = join(ROOT, "experiments/wiki-agent-orchestration/evidence");
const UI_EVENTS_ROOT = join(EVIDENCE_ROOT, "ui-events");

const DOC_SOURCES = [
  { root: "wiki", kind: "wiki", exts: [".md"], skipDirs: ["_site"], skipFiles: ["log.md"] },
  { root: "specs", kind: "spec", exts: [".md"] },
  { root: "tasks", kind: "task_plan", exts: [".md"] },
  { root: "experiments/wiki-agent-orchestration", kind: "experiment", exts: [".md", ".json"], skipDirs: ["mini-ui"] },
  { root: "README.md", kind: "project_doc", exts: [".md"] },
  { root: "CONTEXT.md", kind: "project_doc", exts: [".md"] },
  { root: "WIKI_METHOD.md", kind: "project_doc", exts: [".md"] },
];

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
    if (url.pathname === "/api/events" && req.method === "POST") return sendJson(res, saveEvent(await readBody(req)));
    if (url.pathname === "/api/proposals") return sendJson(res, listProposals());
    if (url.pathname === "/api/proposal") return sendJson(res, readProposal(url.searchParams.get("path")));
    return serveStatic(res, url.pathname);
  } catch (error) {
    sendJson(res, { error: error.message }, 400);
  }
});

server.listen(port, "127.0.0.1", () => {
  const address = server.address();
  console.log(`POM wiki agent mini UI: http://127.0.0.1:${address.port}`);
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
  res.writeHead(200, { "content-type": MIME[ext] || "application/octet-stream" });
  res.end(readFileSync(file));
}

function listDocuments() {
  return DOC_SOURCES.flatMap((source) => {
    const absolute = join(ROOT, source.root);
    if (!existsSync(absolute)) return [];
    if (statSync(absolute).isFile()) return [documentSummary(source.root, source.kind)];
    return walk(source.root, source)
      .filter((path) => source.exts.includes(extname(path)))
      .map((path) => documentSummary(path, source.kind));
  }).sort((a, b) => a.kind.localeCompare(b.kind) || a.path.localeCompare(b.path));
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
  const safePath = requireAllowedPath(path);
  const content = readFileSync(join(ROOT, safePath), "utf8");
  return {
    path: safePath,
    kind: kindForPath(safePath),
    title: extractTitle(content, safePath),
    markdown: content,
    html: extname(safePath) === ".json" ? renderJson(content) : renderMarkdown(content, safePath),
  };
}

function saveEvent(rawBody) {
  const input = JSON.parse(rawBody || "{}");
  const primaryDocument = input.primaryDocument || {};
  const eventType = input.eventType || "annotation";
  const eventId = `ui-event-${new Date().toISOString().replace(/[-:.TZ]/g, "")}-${safeId(eventType)}`;
  const event = {
    schemaVersion: "0.1",
    eventId,
    createdAt: new Date().toISOString(),
    eventType,
    userIntent: String(input.userIntent || "").trim(),
    selection: {
      primaryDocument: {
        path: String(primaryDocument.path || ""),
        kind: String(primaryDocument.kind || "other"),
        role: String(primaryDocument.role || "selected document"),
      },
      sectionHeading: String(input.sectionHeading || "").trim(),
      selectedText: String(input.selectedText || "").trim(),
    },
    context: {
      linkedDocuments: Array.isArray(input.linkedDocuments) ? input.linkedDocuments : [],
      sourceAuthorityHints: Array.isArray(input.sourceAuthorityHints) ? input.sourceAuthorityHints : [],
      artifactPolicyHints: [
        "The UI event is not a decision.",
        "Durable Markdown changes require reviewed promotion.",
        ...(Array.isArray(input.artifactPolicyHints) ? input.artifactPolicyHints : []),
      ],
    },
    requestedOutput: "proposal",
  };

  if (!event.userIntent) throw new Error("User intent is required");
  if (!event.selection.primaryDocument.path) throw new Error("Primary document is required");

  mkdirSync(UI_EVENTS_ROOT, { recursive: true });
  const relativePath = `experiments/wiki-agent-orchestration/evidence/ui-events/${eventId}.json`;
  writeFileSync(join(ROOT, relativePath), `${JSON.stringify(event, null, 2)}\n`, "utf8");
  return { path: relativePath, event };
}

function listProposals() {
  if (!existsSync(EVIDENCE_ROOT)) return [];
  return walk("experiments/wiki-agent-orchestration/evidence", { exts: [".json"] })
    .filter((path) => path.endsWith(".proposal.json"))
    .map((path) => {
      const proposal = JSON.parse(readFileSync(join(ROOT, path), "utf8"));
      return {
        path,
        proposalId: proposal.proposalId,
        proposalType: proposal.proposalType,
        proposalStatus: proposal.proposalStatus,
        questionHandled: proposal.questionHandled,
      };
    });
}

function readProposal(path) {
  const safePath = requireAllowedPath(path);
  if (!safePath.startsWith("experiments/wiki-agent-orchestration/evidence/")) throw new Error("Proposal path is not in evidence");
  return JSON.parse(readFileSync(join(ROOT, safePath), "utf8"));
}

function requireAllowedPath(input) {
  if (!input) throw new Error("Missing path");
  const normalized = normalize(String(input)).replace(/^(\.\.[/\\])+/, "");
  const absolute = resolve(ROOT, normalized);
  if (!absolute.startsWith(ROOT)) throw new Error("Path outside repository");
  const relativePath = relative(ROOT, absolute);
  const allowed = DOC_SOURCES.some((source) => {
    return pathBelongsToSource(absolute, source) && !pathIsSkipped(relativePath, source);
  }) || relativePath.startsWith("experiments/wiki-agent-orchestration/evidence/");
  if (!allowed) throw new Error("Path is not part of the mini UI document set");
  if (!existsSync(absolute) || !statSync(absolute).isFile()) throw new Error("Document not found");
  return relativePath;
}

function kindForPath(path) {
  const match = DOC_SOURCES.find((source) => {
    const absolute = resolve(ROOT, path);
    return pathBelongsToSource(absolute, source) && !pathIsSkipped(path, source);
  });
  return match?.kind || "other";
}

function pathBelongsToSource(absolute, source) {
  const sourceAbsolute = resolve(ROOT, source.root);
  return absolute === sourceAbsolute || absolute.startsWith(`${sourceAbsolute}/`);
}

function pathIsSkipped(path, source) {
  const parts = relative(source.root, path).split(/[\\/]+/).filter(Boolean);
  return parts.some((part) => source.skipDirs?.includes(part)) || source.skipFiles?.includes(basename(path));
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

function safeId(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "event";
}

function extractTitle(content, path) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? stripInline(match[1]) : basename(path);
}

function extractSummary(content) {
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
  return `<pre class="code-block"><code>${escapeHtml(JSON.stringify(JSON.parse(content), null, 2))}</code></pre>`;
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

  for (const line of lines) {
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
      out.push(`<pre class="code-block" data-lang="${escapeHtml(codeLang)}"><code>${escapeHtml(code.join("\n"))}</code></pre>`);
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
