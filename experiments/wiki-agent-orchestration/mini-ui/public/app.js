import { applyStaticTranslations, nextLocale, readLocale, storeLocale, t as translate } from "./i18n.js";

const SIDEBAR_PINNED_KEY = "pom.sidebarPinned.v2";
const AGENT_PINNED_KEY = "pom.agentPinned.v1";

const state = {
  documents: [],
  activeKind: "all",
  activeDocument: null,
  documentSearchMatches: [],
  documentSearchIndex: -1,
  agentTab: "write",
  navMode: "thematic",
  locale: readLocale(),
  sidebarPinned: localStorage.getItem(SIDEBAR_PINNED_KEY) === "true",
  agentPinned: localStorage.getItem(AGENT_PINNED_KEY) === "true",
};

const els = {
  appShell: document.querySelector("#appShell"),
  languageToggle: document.querySelector("#languageToggle"),
  search: document.querySelector("#search"),
  sidebarPin: document.querySelector("#sidebarPin"),
  navModeButtons: document.querySelectorAll("[data-nav-mode]"),
  thematicNav: document.querySelector("#thematicNav"),
  treeNav: document.querySelector("#treeNav"),
  regexSearch: document.querySelector("#regexSearch"),
  runSearch: document.querySelector("#runSearch"),
  searchResults: document.querySelector("#searchResults"),
  kindFilters: document.querySelector("#kindFilters"),
  documentList: document.querySelector("#documentList"),
  documentTree: document.querySelector("#documentTree"),
  activeKind: document.querySelector("#activeKind"),
  activeTitle: document.querySelector("#activeTitle"),
  activePath: document.querySelector("#activePath"),
  documentContent: document.querySelector("#documentContent"),
  documentSearch: document.querySelector("#documentSearch"),
  documentRegexSearch: document.querySelector("#documentRegexSearch"),
  documentSearchPrev: document.querySelector("#documentSearchPrev"),
  documentSearchNext: document.querySelector("#documentSearchNext"),
  documentSearchCount: document.querySelector("#documentSearchCount"),
  useSelection: document.querySelector("#useSelection"),
  agentPin: document.querySelector("#agentPin"),
  agentTabButtons: document.querySelectorAll("[data-agent-tab]"),
  agentTabPanels: document.querySelectorAll("[data-agent-panel]"),
  intent: document.querySelector("#intent"),
  selectedText: document.querySelector("#selectedText"),
  saveAnnotation: document.querySelector("#saveAnnotation"),
  eventResult: document.querySelector("#eventResult"),
  refreshAnnotations: document.querySelector("#refreshAnnotations"),
  annotationList: document.querySelector("#annotationList"),
  annotationDetail: document.querySelector("#annotationDetail"),
  refreshProcessedAnnotations: document.querySelector("#refreshProcessedAnnotations"),
  processedAnnotationList: document.querySelector("#processedAnnotationList"),
  processedAnnotationDetail: document.querySelector("#processedAnnotationDetail"),
};

init();

async function init() {
  state.documents = await getJson("/api/documents");
  renderLocale();
  renderLayoutState();
  renderNavMode();
  renderAgentTab();
  renderFilters();
  renderDocumentNav();
  await loadAnnotations();
  const entryDoc = state.documents.find((doc) => doc.path === "wiki/index.md")
    || state.documents.find((doc) => doc.path === "__project_index__.md")
    || state.documents[0];
  if (entryDoc) await loadDocument(entryDoc.path);
}

function t(key, values) {
  return translate(state.locale, key, values);
}

function renderLocale() {
  document.documentElement.lang = state.locale;
  applyStaticTranslations(state.locale);
  els.languageToggle.dataset.locale = state.locale;
  els.languageToggle.title = t("language.title");
  els.languageToggle.setAttribute("aria-label", t("language.title"));
  if (!state.activeDocument) {
    els.activeKind.textContent = t("document.type");
    els.activeTitle.textContent = t("document.select");
  }
}

function setLocale(locale) {
  state.locale = locale;
  storeLocale(locale);
  renderLocale();
  renderLayoutState();
  renderFilters();
  renderDocumentNav();
  runDocumentSearch();
  loadAnnotations().catch((error) => {
    els.eventResult.textContent = humanError(error);
  });
}

function renderLayoutState() {
  els.appShell.classList.toggle("sidebar-floating", !state.sidebarPinned);
  els.appShell.classList.toggle("agent-floating", !state.agentPinned);
  els.sidebarPin.querySelector(".pin-label").textContent = state.sidebarPinned ? t("layout.pinned") : t("layout.pin");
  els.sidebarPin.title = state.sidebarPinned ? t("layout.unpinMenu") : t("layout.pinMenu");
  els.sidebarPin.setAttribute("aria-pressed", String(state.sidebarPinned));
  els.agentPin.querySelector(".pin-label").textContent = state.agentPinned ? t("layout.pinned") : t("layout.pin");
  els.agentPin.title = state.agentPinned ? t("layout.unpinAnnotations") : t("layout.pinAnnotations");
  els.agentPin.setAttribute("aria-pressed", String(state.agentPinned));
}

function toggleSidebarPinned() {
  state.sidebarPinned = !state.sidebarPinned;
  localStorage.setItem(SIDEBAR_PINNED_KEY, String(state.sidebarPinned));
  renderLayoutState();
}

function toggleAgentPinned() {
  state.agentPinned = !state.agentPinned;
  localStorage.setItem(AGENT_PINNED_KEY, String(state.agentPinned));
  renderLayoutState();
}

function renderAgentTab() {
  for (const button of els.agentTabButtons) {
    const active = button.dataset.agentTab === state.agentTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  }
  for (const panel of els.agentTabPanels) {
    panel.hidden = panel.dataset.agentPanel !== state.agentTab;
  }
}

function setAgentTab(tab) {
  state.agentTab = tab;
  renderAgentTab();
}

function renderFilters() {
  const kinds = ["all", ...new Set(state.documents.map((doc) => doc.kind))];
  els.kindFilters.innerHTML = "";
  for (const kind of kinds) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip${kind === state.activeKind ? " active" : ""}`;
    button.textContent = kind === "all" ? t("filter.all") : kind;
    button.addEventListener("click", () => {
      state.activeKind = kind;
      renderFilters();
      renderDocumentNav();
    });
    els.kindFilters.append(button);
  }
}

function renderNavMode() {
  for (const button of els.navModeButtons) {
    const active = button.dataset.navMode === state.navMode;
    button.classList.toggle("active", active);
  }
  els.thematicNav.hidden = state.navMode !== "thematic";
  els.treeNav.hidden = state.navMode !== "tree";
}

function setNavMode(mode) {
  state.navMode = mode;
  renderNavMode();
  renderDocumentNav();
}

function renderDocumentNav() {
  renderDocumentList();
  renderDocumentTree();
}

function renderDocumentList() {
  const query = els.search.value.trim().toLowerCase();
  const docs = state.documents.filter((doc) => {
    const matchesKind = state.activeKind === "all" || doc.kind === state.activeKind;
    const haystack = `${doc.title} ${doc.path} ${doc.summary}`.toLowerCase();
    return matchesKind && (!query || haystack.includes(query));
  });
  els.documentList.innerHTML = "";
  if (!docs.length) {
    els.documentList.innerHTML = `<p class="panel-note">${escapeHtml(t("document.noDocuments"))}</p>`;
    return;
  }
  for (const doc of docs) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `doc-item${state.activeDocument?.path === doc.path ? " active" : ""}`;
    button.innerHTML = `
      <span class="doc-title">${escapeHtml(doc.title)}</span>
      <span class="doc-meta">${escapeHtml(doc.kind)} · ${escapeHtml(doc.path)}</span>
    `;
    button.addEventListener("click", () => loadDocument(doc.path));
    els.documentList.append(button);
  }
}

function renderDocumentTree() {
  const query = els.search.value.trim().toLowerCase();
  const docs = state.documents.filter((doc) => {
    const matchesKind = state.activeKind === "all" || doc.kind === state.activeKind;
    const haystack = `${doc.title} ${doc.path} ${doc.summary}`.toLowerCase();
    return matchesKind && (!query || haystack.includes(query));
  });
  els.documentTree.innerHTML = "";
  if (!docs.length) {
    els.documentTree.innerHTML = `<p class="panel-note">${escapeHtml(t("document.noFiles"))}</p>`;
    return;
  }
  const root = buildTree(docs);
  appendTreeChildren(els.documentTree, root, query);
}

function buildTree(docs) {
  const root = treeNode("", "");
  for (const doc of docs) {
    const parts = doc.path.split("/");
    let node = root;
    for (const part of parts.slice(0, -1)) {
      if (!node.dirs.has(part)) node.dirs.set(part, treeNode(part, node.path ? `${node.path}/${part}` : part));
      node = node.dirs.get(part);
    }
    node.files.push(doc);
  }
  return root;
}

function treeNode(name, path) {
  return { name, path, dirs: new Map(), files: [] };
}

function appendTreeChildren(parent, node, query) {
  for (const dir of [...node.dirs.values()].sort(compareTreeNodes)) {
    parent.append(renderDirectory(dir, query));
  }
  for (const doc of [...node.files].sort(compareTreeDocs)) {
    parent.append(renderTreeFile(doc));
  }
}

function renderDirectory(node, query) {
  const details = document.createElement("details");
  details.className = "tree-dir";
  details.open = Boolean(query) || node.path === "wiki" || Boolean(state.activeDocument?.path.startsWith(`${node.path}/`));
  const summary = document.createElement("summary");
  summary.textContent = node.name;
  details.append(summary);
  const body = document.createElement("div");
  body.className = "tree-children";
  appendTreeChildren(body, node, query);
  details.append(body);
  return details;
}

function renderTreeFile(doc) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `tree-file${state.activeDocument?.path === doc.path ? " active" : ""}`;
  button.innerHTML = `
    <span class="tree-file-name">${escapeHtml(lastPathSegment(doc.path))}</span>
    <span class="tree-file-meta">${escapeHtml(doc.kind)}</span>
  `;
  button.addEventListener("click", () => loadDocument(doc.path));
  return button;
}

function compareTreeNodes(a, b) {
  return treeTopRank(a.path) - treeTopRank(b.path) || a.name.localeCompare(b.name);
}

function compareTreeDocs(a, b) {
  return treeTopRank(a.path) - treeTopRank(b.path) || a.path.localeCompare(b.path);
}

function treeTopRank(path) {
  const top = path.split("/")[0];
  const order = ["wiki", "README.md", "CONTEXT.md", "docs", "specs", "decisions", "tasks", "experiments", "scripts", "tests"];
  const index = order.indexOf(top);
  return index === -1 ? order.length : index;
}

function lastPathSegment(path) {
  return path.split("/").at(-1);
}

async function loadDocument(path) {
  const doc = await getJson(`/api/document?path=${encodeURIComponent(path)}`);
  state.activeDocument = doc;
  els.activeKind.textContent = doc.kind;
  els.activeTitle.textContent = doc.title;
  els.activePath.textContent = doc.path;
  els.documentContent.innerHTML = doc.html;
  runDocumentSearch();
  renderDocumentNav();
}

function runDocumentSearch({ scroll = false } = {}) {
  clearDocumentSearchHighlights();
  state.documentSearchMatches = [];
  state.documentSearchIndex = -1;
  const query = els.documentSearch.value.trim();
  if (!query) {
    updateDocumentSearchCount();
    return;
  }
  const pattern = buildDocumentSearchPattern(query);
  if (!pattern) return;
  const walker = document.createTreeWalker(els.documentContent, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (node.parentElement?.closest(".file-search-mark")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) markDocumentSearchMatches(node, pattern);
  if (state.documentSearchMatches.length) {
    setDocumentSearchIndex(0, { scroll });
  } else {
    updateDocumentSearchCount();
  }
}

function markDocumentSearchMatches(node, pattern) {
  const text = node.nodeValue;
  const fragment = document.createDocumentFragment();
  let lastIndex = 0;
  let found = false;
  pattern.lastIndex = 0;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    if (!match[0]) {
      pattern.lastIndex += 1;
      if (pattern.lastIndex > text.length) break;
      continue;
    }
    found = true;
    if (match.index > lastIndex) fragment.append(document.createTextNode(text.slice(lastIndex, match.index)));
    const mark = document.createElement("mark");
    mark.className = "file-search-mark";
    mark.textContent = match[0];
    fragment.append(mark);
    state.documentSearchMatches.push(mark);
    lastIndex = pattern.lastIndex;
  }
  if (!found) return;
  if (lastIndex < text.length) fragment.append(document.createTextNode(text.slice(lastIndex)));
  node.replaceWith(fragment);
}

function buildDocumentSearchPattern(query) {
  try {
    return new RegExp(els.documentRegexSearch.checked ? query : escapeRegExp(query), "gi");
  } catch {
    updateDocumentSearchCount(t("fileSearch.invalidRegex"));
    return null;
  }
}

function clearDocumentSearchHighlights() {
  const marks = [...els.documentContent.querySelectorAll(".file-search-mark")];
  for (const mark of marks) {
    const parent = mark.parentNode;
    mark.replaceWith(document.createTextNode(mark.textContent));
    parent?.normalize();
  }
}

function setDocumentSearchIndex(index, { scroll = true } = {}) {
  if (!state.documentSearchMatches.length) {
    state.documentSearchIndex = -1;
    updateDocumentSearchCount();
    return;
  }
  state.documentSearchMatches[state.documentSearchIndex]?.classList.remove("active");
  state.documentSearchIndex = index;
  const active = state.documentSearchMatches[state.documentSearchIndex];
  active.classList.add("active");
  updateDocumentSearchCount();
  if (scroll) active.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
}

function moveDocumentSearch(direction) {
  if (!state.documentSearchMatches.length) {
    runDocumentSearch({ scroll: true });
    return;
  }
  const nextIndex = (state.documentSearchIndex + direction + state.documentSearchMatches.length) % state.documentSearchMatches.length;
  setDocumentSearchIndex(nextIndex);
}

function updateDocumentSearchCount(message = "") {
  const count = state.documentSearchMatches.length;
  els.documentSearchCount.textContent = message || (els.documentSearch.value.trim() ? `${count ? state.documentSearchIndex + 1 : 0}/${count}` : "");
  els.documentSearchPrev.disabled = count === 0;
  els.documentSearchNext.disabled = count === 0;
}

async function saveAnnotation() {
  if (!state.activeDocument) return;
  const annotation = els.intent.value.trim();
  if (!annotation) {
    els.eventResult.innerHTML = `
      <strong>${escapeHtml(t("status.annotationMissing"))}</strong><br>
      ${escapeHtml(t("status.annotationMissingBody"))}
    `;
    els.intent.focus();
    return;
  }
  const result = await postJson("/api/annotations", {
    target: {
      path: state.activeDocument.path,
      kind: state.activeDocument.kind,
    },
    selectedText: els.selectedText.value,
    annotation,
  });
  els.eventResult.innerHTML = `
    <strong>${escapeHtml(t("status.annotationSaved"))}</strong><br>
    ${escapeHtml(result.annotation.annotationId)}<br>
    ${escapeHtml(result.path)}
  `;
  await loadAnnotations();
}

async function runProjectSearch() {
  const query = els.search.value.trim();
  if (!query) {
    els.searchResults.innerHTML = `<p class="panel-note">${escapeHtml(t("search.empty"))}</p>`;
    return;
  }
  els.searchResults.innerHTML = `<p class="panel-note">${escapeHtml(t("search.loading"))}</p>`;
  const params = new URLSearchParams({
    q: query,
    regex: els.regexSearch.checked ? "1" : "0",
    kind: state.activeKind,
  });
  const result = await getJson(`/api/search?${params.toString()}`);
  renderSearchResults(result);
}

function renderSearchResults(result) {
  els.searchResults.innerHTML = "";
  if (!result.results.length) {
    els.searchResults.innerHTML = `<p class="panel-note">${escapeHtml(t("search.noResults"))}</p>`;
    return;
  }
  for (const match of result.results) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-result";
    button.innerHTML = `
      <span class="doc-title">${escapeHtml(match.path)}:${escapeHtml(match.line)}</span>
      <span class="doc-meta">${escapeHtml(match.text)}</span>
    `;
    button.addEventListener("click", () => {
      if (state.documents.some((doc) => doc.path === match.path)) {
        loadDocument(match.path).catch((error) => {
          els.eventResult.textContent = error.message;
        });
      }
    });
    els.searchResults.append(button);
  }
}

function handleSearchInput() {
  renderDocumentNav();
  if (!els.search.value.trim()) els.searchResults.innerHTML = "";
}

async function loadAnnotations() {
  const annotations = await getJson("/api/annotations");
  const processed = annotations.filter(isProcessedAnnotation);
  const working = annotations.filter((annotation) => !isProcessedAnnotation(annotation));
  renderAnnotationList({
    annotations: working,
    listElement: els.annotationList,
    detailElement: els.annotationDetail,
    emptyMessage: t("agent.emptyWorking"),
    deletable: true,
  });
  renderAnnotationList({
    annotations: processed,
    listElement: els.processedAnnotationList,
    detailElement: els.processedAnnotationDetail,
    emptyMessage: t("agent.emptyProcessed"),
  });
}

function isProcessedAnnotation(annotation) {
  return Boolean(annotation.agentReport) || ["resolved", "discarded"].includes(annotation.status);
}

function renderAnnotationList({ annotations, listElement, detailElement, emptyMessage, deletable = false }) {
  listElement.innerHTML = "";
  detailElement.hidden = true;
  if (!annotations.length) {
    listElement.innerHTML = `<p class="panel-note">${escapeHtml(emptyMessage)}</p>`;
    detailElement.textContent = "";
    return;
  }
  for (const annotation of annotations) {
    const row = document.createElement("div");
    row.className = "annotation-row";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "proposal-item";
    button.innerHTML = `
      <span class="proposal-title">${escapeHtml(annotation.annotationId)}</span>
      <span class="proposal-meta">${escapeHtml(annotation.status)} · ${escapeHtml(annotation.target.path)}</span>
    `;
    button.addEventListener("click", () => {
      loadAnnotation(annotation.annotationId, detailElement).catch((error) => {
        detailElement.textContent = humanError(error);
      });
    });
    row.append(button);
    if (deletable) row.append(renderAnnotationDeleteButton(annotation, detailElement));
    listElement.append(row);
  }
}

function renderAnnotationDeleteButton(annotation, detailElement) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "annotation-delete";
  button.title = t("annotation.deleteTitle");
  button.setAttribute("aria-label", t("annotation.deleteAria", { id: annotation.annotationId }));
  button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-1 6h2v9H8V9Zm6 0h2v9h-2V9Zm-4 0h4v9h-4V9Z"/></svg>`;
  button.addEventListener("click", () => deleteAnnotation(annotation.annotationId, detailElement));
  return button;
}

async function loadAnnotation(annotationId, detailElement = els.annotationDetail) {
  const annotation = await getJson(`/api/annotation?id=${encodeURIComponent(annotationId)}`);
  renderAnnotationDetail(annotation, detailElement);
  await focusAnnotationTarget(annotation, detailElement);
}

async function deleteAnnotation(annotationId, detailElement) {
  if (!window.confirm(t("annotation.deleteConfirm", { id: annotationId }))) return;
  await deleteJson(`/api/annotation?id=${encodeURIComponent(annotationId)}`);
  detailElement.hidden = true;
  detailElement.textContent = "";
  clearAnnotationTargetHighlights();
  await loadAnnotations();
}

function renderAnnotationDetail(annotation, detailElement = els.annotationDetail) {
  const agentReport = annotation.agentReport || {};
  detailElement.hidden = false;
  detailElement.innerHTML = `
    <div class="annotation-detail-head">
      <p class="eyebrow">${escapeHtml(annotation.status)}</p>
      <button class="detail-close" type="button" data-detail-close aria-label="${escapeHtml(t("annotation.close"))}">x</button>
    </div>
    <h3 class="proposal-title">${escapeHtml(annotation.annotationId)}</h3>
    <p class="panel-note">${escapeHtml(annotation.target.path)}</p>
    <p class="panel-note" data-target-focus-note hidden></p>
    <label>${escapeHtml(t("agent.selectedText"))}</label>
    <pre class="agent-result">${escapeHtml(annotation.selectedText || t("annotation.noSelection"))}</pre>
    <label>${escapeHtml(t("agent.intent"))}</label>
    <pre class="agent-result">${escapeHtml(annotation.annotation)}</pre>
    <label>${escapeHtml(t("agent.outcome"))}</label>
    <pre class="agent-result">${escapeHtml(agentReport.summary || annotation.resolution || t("annotation.notProcessed"))}</pre>
    ${agentReport.processedAt ? `<p class="panel-note">${escapeHtml(t("agent.processedBy", { by: agentReport.by || "agent", at: agentReport.processedAt }))}</p>` : ""}
    <button class="secondary full-width" type="button" data-json-toggle aria-expanded="false">${escapeHtml(t("json.show"))}</button>
    <pre class="agent-result" data-json-view hidden>${escapeHtml(JSON.stringify(annotation, null, 2))}</pre>
  `;
  detailElement.querySelector("[data-json-toggle]").addEventListener("click", (event) => {
    const json = detailElement.querySelector("[data-json-view]");
    json.hidden = !json.hidden;
    event.currentTarget.textContent = json.hidden ? t("json.show") : t("json.hide");
    event.currentTarget.setAttribute("aria-expanded", String(!json.hidden));
  });
  detailElement.querySelector("[data-detail-close]").addEventListener("click", () => {
    detailElement.hidden = true;
    detailElement.textContent = "";
    clearAnnotationTargetHighlights();
  });
}

async function focusAnnotationTarget(annotation, detailElement) {
  const targetPath = annotation?.target?.path;
  if (!targetPath) return;
  if (!state.documents.some((doc) => doc.path === targetPath)) {
    setAnnotationFocusNote(detailElement, t("annotation.focusMissing"));
    return;
  }
  try {
    if (state.activeDocument?.path !== targetPath) await loadDocument(targetPath);
  } catch (error) {
    setAnnotationFocusNote(detailElement, t("annotation.targetOpenError", { error: humanError(error) }));
    return;
  }
  clearAnnotationTargetHighlights();
  const mark = markAnnotationTarget(annotation.selectedText);
  if (mark) {
    setAnnotationFocusNote(detailElement, t("annotation.focusOpened"));
    mark.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    return;
  }
  setAnnotationFocusNote(detailElement, t("annotation.focusNotFound"));
  els.documentContent.scrollIntoView({ block: "start", inline: "nearest", behavior: "smooth" });
}

function setAnnotationFocusNote(detailElement, text) {
  const note = detailElement.querySelector("[data-target-focus-note]");
  if (!note) return;
  note.textContent = text;
  note.hidden = !text;
}

function clearAnnotationTargetHighlights() {
  const marks = [...els.documentContent.querySelectorAll(".annotation-target-mark")];
  for (const mark of marks) {
    const parent = mark.parentNode;
    mark.replaceWith(document.createTextNode(mark.textContent));
    parent?.normalize();
  }
}

function markAnnotationTarget(selectedText) {
  const candidates = annotationNeedles(selectedText);
  if (!candidates.length) return null;
  const walker = document.createTreeWalker(els.documentContent, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const exact = candidates.find((candidate) => node.nodeValue.includes(candidate));
    if (exact) return replaceTextMatch(node, exact);
    if (candidates.some((candidate) => normalizeText(node.nodeValue).includes(normalizeText(candidate)))) return replaceWholeTextNode(node);
  }
  return null;
}

function replaceTextMatch(node, text) {
  const index = node.nodeValue.indexOf(text);
  const fragment = document.createDocumentFragment();
  if (index > 0) fragment.append(document.createTextNode(node.nodeValue.slice(0, index)));
  const mark = document.createElement("mark");
  mark.className = "file-search-mark active annotation-target-mark";
  mark.textContent = text;
  fragment.append(mark);
  const end = index + text.length;
  if (end < node.nodeValue.length) fragment.append(document.createTextNode(node.nodeValue.slice(end)));
  node.replaceWith(fragment);
  return mark;
}

function replaceWholeTextNode(node) {
  const mark = document.createElement("mark");
  mark.className = "file-search-mark active annotation-target-mark";
  mark.textContent = node.nodeValue;
  node.replaceWith(mark);
  return mark;
}

function annotationNeedles(value) {
  const text = String(value || "").trim();
  if (!text) return [];
  return [...new Set([text, text.slice(0, 180), text.slice(0, 90)].filter((item) => item.trim().length >= 20))];
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function deleteJson(url) {
  const response = await fetch(url, { method: "DELETE" });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function humanError(error) {
  const raw = error?.message || String(error);
  try {
    const parsed = JSON.parse(raw);
    if (parsed.error === "User intent is required") {
      return t("status.annotationMissingBody");
    }
    if (parsed.error === "Annotation text is required") {
      return t("status.annotationMissingBody");
    }
    return parsed.error || raw;
  } catch {
    return raw;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

els.search.addEventListener("input", handleSearchInput);
els.search.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    runProjectSearch().catch((error) => {
      els.searchResults.textContent = humanError(error);
    });
  }
});
els.languageToggle.addEventListener("click", () => setLocale(nextLocale(state.locale)));
els.sidebarPin.addEventListener("click", toggleSidebarPinned);
els.agentPin.addEventListener("click", toggleAgentPinned);
for (const button of els.navModeButtons) {
  button.addEventListener("click", () => setNavMode(button.dataset.navMode));
}
for (const button of els.agentTabButtons) {
  button.addEventListener("click", () => setAgentTab(button.dataset.agentTab));
}
els.runSearch.addEventListener("click", () => {
  runProjectSearch().catch((error) => {
    els.searchResults.textContent = humanError(error);
  });
});
els.documentSearch.addEventListener("input", () => runDocumentSearch());
els.documentRegexSearch.addEventListener("change", () => runDocumentSearch({ scroll: true }));
els.documentSearch.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  moveDocumentSearch(event.shiftKey ? -1 : 1);
});
els.documentSearchPrev.addEventListener("click", () => moveDocumentSearch(-1));
els.documentSearchNext.addEventListener("click", () => moveDocumentSearch(1));
els.useSelection.addEventListener("click", () => {
  els.selectedText.value = window.getSelection()?.toString().trim() || "";
});
els.saveAnnotation.addEventListener("click", () => {
  saveAnnotation().catch((error) => {
    els.eventResult.textContent = humanError(error);
  });
});
els.refreshAnnotations.addEventListener("click", () => {
  loadAnnotations().catch((error) => {
    els.annotationDetail.textContent = error.message;
  });
});
els.refreshProcessedAnnotations.addEventListener("click", () => {
  loadAnnotations().catch((error) => {
    els.processedAnnotationDetail.textContent = error.message;
  });
});
els.documentContent.addEventListener("click", (event) => {
  const link = event.target.closest("[data-doc-path]");
  if (!link) return;
  event.preventDefault();
  loadDocument(link.dataset.docPath).catch((error) => {
    els.eventResult.textContent = error.message;
  });
});
