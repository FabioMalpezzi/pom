import { applyStaticTranslations, nextLocale, readLocale, storeLocale, t as translate } from "./i18n.js";
import { createAnnotationController } from "./annotations.js";
import { deleteJson, escapeHtml, escapeRegExp, getJson, humanError as formatError, postJson } from "./dom-utils.js";
import { createDocumentSearchController } from "./document-search.js";

const SIDEBAR_PINNED_KEY = "pom.sidebarPinned.v2";
const AGENT_PINNED_KEY = "pom.agentPinned.v1";
const FLOATING_PANEL_CLOSE_DELAY_MS = 500;

const state = {
  documents: [],
  activeKind: "all",
  activeDocument: null,
  documentSearchMatches: [],
  documentSearchIndex: -1,
  selectedDocumentText: "",
  agentTab: "write",
  agentOpen: false,
  navMode: "thematic",
  locale: readLocale(),
  status: null,
  sidebarPinned: localStorage.getItem(SIDEBAR_PINNED_KEY) === "true",
  agentPinned: localStorage.getItem(AGENT_PINNED_KEY) === "true",
  sidebarHover: false,
  agentHover: false,
};

const floatingPanelTimers = {
  sidebar: null,
  agent: null,
};

const floatingPanelPointerInside = {
  sidebar: false,
  agent: false,
};

const els = {
  appShell: document.querySelector("#appShell"),
  sidebar: document.querySelector(".sidebar"),
  languageToggle: document.querySelector("#languageToggle"),
  search: document.querySelector("#search"),
  sidebarPin: document.querySelector("#sidebarPin"),
  navModeButtons: document.querySelectorAll("[data-nav-mode]"),
  thematicNav: document.querySelector("#thematicNav"),
  treeNav: document.querySelector("#treeNav"),
  regexSearch: document.querySelector("#regexSearch"),
  runSearch: document.querySelector("#runSearch"),
  searchResults: document.querySelector("#searchResults"),
  configStatus: document.querySelector("#configStatus"),
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
  agentPanel: document.querySelector(".agent-panel"),
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

const documentSearch = createDocumentSearchController({
  els,
  state,
  t,
  escapeRegExp,
});

const annotations = createAnnotationController({
  els,
  state,
  t,
  escapeHtml,
  getJson,
  postJson,
  deleteJson,
  humanError,
  loadDocument,
  renderLayoutState,
  setAgentTab,
});

init();

async function init() {
  [state.status, state.documents] = await Promise.all([
    getJson("/api/status"),
    getJson("/api/documents"),
  ]);
  renderLocale();
  renderLayoutState();
  renderNavMode();
  renderAgentTab();
  renderReaderStatus();
  renderFilters();
  renderDocumentNav();
  await annotations.loadAnnotations();
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
  renderReaderStatus();
}

function setLocale(locale) {
  state.locale = locale;
  storeLocale(locale);
  renderLocale();
  renderLayoutState();
  renderFilters();
  renderDocumentNav();
  documentSearch.run();
  annotations.loadAnnotations().catch((error) => {
    els.eventResult.textContent = humanError(error);
  });
}

function renderLayoutState() {
  els.appShell.classList.toggle("sidebar-floating", !state.sidebarPinned);
  els.appShell.classList.toggle("sidebar-hovered", state.sidebarHover && !state.sidebarPinned);
  els.appShell.classList.toggle("agent-floating", !state.agentPinned);
  els.appShell.classList.toggle("agent-hovered", state.agentHover && !state.agentPinned);
  els.appShell.classList.toggle("agent-open", state.agentOpen && !state.agentPinned);
  els.sidebarPin.querySelector(".pin-label").textContent = state.sidebarPinned ? t("layout.pinned") : t("layout.pin");
  els.sidebarPin.title = state.sidebarPinned ? t("layout.unpinMenu") : t("layout.pinMenu");
  els.sidebarPin.setAttribute("aria-pressed", String(state.sidebarPinned));
  els.agentPin.querySelector(".pin-label").textContent = state.agentPinned ? t("layout.pinned") : t("layout.pin");
  els.agentPin.title = state.agentPinned ? t("layout.unpinAnnotations") : t("layout.pinAnnotations");
  els.agentPin.setAttribute("aria-pressed", String(state.agentPinned));
}

function toggleSidebarPinned() {
  state.sidebarPinned = !state.sidebarPinned;
  if (state.sidebarPinned) state.sidebarHover = false;
  localStorage.setItem(SIDEBAR_PINNED_KEY, String(state.sidebarPinned));
  clearFloatingPanelTimer("sidebar");
  renderLayoutState();
}

function toggleAgentPinned() {
  state.agentPinned = !state.agentPinned;
  if (state.agentPinned) {
    state.agentOpen = false;
    state.agentHover = false;
  }
  localStorage.setItem(AGENT_PINNED_KEY, String(state.agentPinned));
  clearFloatingPanelTimer("agent");
  renderLayoutState();
}

function openFloatingPanel(panel) {
  clearFloatingPanelTimer(panel);
  if (panel === "sidebar" && !state.sidebarPinned) state.sidebarHover = true;
  if (panel === "agent" && !state.agentPinned) state.agentHover = true;
  renderLayoutState();
}

function scheduleFloatingPanelClose(panel) {
  clearFloatingPanelTimer(panel);
  floatingPanelTimers[panel] = window.setTimeout(() => {
    const panelElement = panel === "sidebar" ? els.sidebar : els.agentPanel;
    if (floatingPanelPointerInside[panel] || panelElement.contains(document.activeElement)) return;
    if (panel === "sidebar") state.sidebarHover = false;
    if (panel === "agent") state.agentHover = false;
    renderLayoutState();
  }, FLOATING_PANEL_CLOSE_DELAY_MS);
}

function clearFloatingPanelTimer(panel) {
  if (!floatingPanelTimers[panel]) return;
  window.clearTimeout(floatingPanelTimers[panel]);
  floatingPanelTimers[panel] = null;
}

function bindFloatingPanelHover(panelElement, panel) {
  const openFromPointer = () => {
    floatingPanelPointerInside[panel] = true;
    openFloatingPanel(panel);
  };
  const closeFromPointer = () => {
    floatingPanelPointerInside[panel] = false;
    scheduleFloatingPanelClose(panel);
  };
  panelElement.addEventListener("pointerenter", openFromPointer);
  panelElement.addEventListener("pointerleave", closeFromPointer);
  panelElement.addEventListener("mouseenter", openFromPointer);
  panelElement.addEventListener("mouseleave", closeFromPointer);
  panelElement.addEventListener("focusin", () => openFloatingPanel(panel));
  panelElement.addEventListener("focusout", (event) => {
    if (!panelElement.contains(event.relatedTarget)) scheduleFloatingPanelClose(panel);
  });
}

function renderReaderStatus() {
  if (!els.configStatus || !state.status) return;
  const mode = state.status.documentSources?.mode;
  els.configStatus.textContent = mode === "pom.config.json"
    ? t("reader.configActive", { count: state.status.documentSources.configuredCount })
    : t("reader.configFallback");
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
  state.selectedDocumentText = "";
  annotations.updateSelectionAction();
  documentSearch.run();
  renderDocumentNav();
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

function humanError(error) {
  return formatError(error, t);
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
bindFloatingPanelHover(els.sidebar, "sidebar");
bindFloatingPanelHover(els.agentPanel, "agent");
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
els.documentSearch.addEventListener("input", () => documentSearch.run());
els.documentRegexSearch.addEventListener("change", () => documentSearch.run({ scroll: true }));
els.documentSearch.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  documentSearch.move(event.shiftKey ? -1 : 1);
});
els.documentSearchPrev.addEventListener("click", () => documentSearch.move(-1));
els.documentSearchNext.addEventListener("click", () => documentSearch.move(1));
document.addEventListener("selectionchange", annotations.updateSelectionAction);
document.addEventListener("pointerdown", annotations.closeFloatingPanelFromOutside);
els.documentContent.addEventListener("keyup", annotations.updateSelectionAction);
els.documentContent.addEventListener("mouseup", annotations.updateSelectionAction);
els.useSelection.addEventListener("mousedown", (event) => {
  if (!els.useSelection.disabled) event.preventDefault();
});
els.useSelection.addEventListener("click", annotations.sendSelectionToNote);
els.saveAnnotation.addEventListener("click", () => {
  annotations.saveAnnotation().catch((error) => {
    els.eventResult.textContent = humanError(error);
  });
});
els.refreshAnnotations.addEventListener("click", () => {
  annotations.loadAnnotations().catch((error) => {
    els.annotationDetail.textContent = error.message;
  });
});
els.refreshProcessedAnnotations.addEventListener("click", () => {
  annotations.loadAnnotations().catch((error) => {
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
