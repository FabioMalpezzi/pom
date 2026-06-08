import { applyStaticTranslations, nextLocale, readLocale, storeLocale, t as translate } from "./i18n.js";
import { createAnnotationController } from "./annotations.js";
import { createCommandPaletteController } from "./command-palette.js";
import { createDocumentListController } from "./document-list.js";
import { deleteJson, escapeHtml, escapeRegExp, getJson, humanError as formatError, postJson } from "./dom-utils.js";
import { createDocumentSearchController } from "./document-search.js";
import { createTreeNavController } from "./tree-nav.js";

const SIDEBAR_PINNED_KEY = "pom.sidebarPinned.v2";
const AGENT_PINNED_KEY = "pom.agentPinned.v1";
const FLOATING_PANEL_CLOSE_DELAY_MS = 500;
const DOCUMENT_SCAN_POLL_MS = 200;

const state = {
  documents: [],
  documentScan: null,
  documentListScrollTop: 0,
  activeKind: "all",
  activeDocument: null,
  documentSearchMatches: [],
  documentSearchIndex: -1,
  selectedDocumentText: "",
  commandMode: "path",
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
  openCommandPalette: document.querySelector("#openCommandPalette"),
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
  commandPalette: document.querySelector("#commandPalette"),
  commandInput: document.querySelector("#commandInput"),
  commandModeButtons: document.querySelectorAll("[data-command-mode]"),
  commandResults: document.querySelector("#commandResults"),
  closeCommandPalette: document.querySelector("#closeCommandPalette"),
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

const treeNav = createTreeNavController({
  els,
  state,
  t,
  escapeHtml,
  getJson,
  loadDocument,
});

const documentList = createDocumentListController({
  els,
  state,
  t,
  escapeHtml,
  loadDocument,
});

const commandPalette = createCommandPaletteController({
  els,
  state,
  t,
  escapeHtml,
  getJson,
  loadDocument,
  humanError,
});

init();

async function init() {
  const [status, documentsPayload] = await Promise.all([
    getJson("/api/status"),
    getJson("/api/documents"),
  ]);
  state.status = status;
  applyDocumentsPayload(documentsPayload, { replace: true });
  renderLocale();
  renderLayoutState();
  renderNavMode();
  renderAgentTab();
  renderReaderStatus();
  renderFilters();
  renderDocumentNav();
  await annotations.loadAnnotations();
  await loadInitialDocument();
  pollDocumentScan().catch((error) => {
    els.eventResult.textContent = humanError(error);
  });
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
  const sources = state.status.documentSources || {};
  const configText = readerConfigText(sources);
  const scan = state.documentScan;
  if (!scan) {
    els.configStatus.textContent = configText;
    return;
  }
  if (scan.error) {
    els.configStatus.textContent = `${configText} · ${t("reader.scanError")}`;
    return;
  }
  els.configStatus.textContent = scan.complete
    ? `${configText} · ${t("reader.scanComplete", { count: scan.loadedCount })}`
    : `${configText} · ${t("reader.scanLoading", { count: scan.loadedCount })}`;
}

function readerConfigText(sources) {
  if (sources.mode === "pom.config.json") return t("reader.configActive", { count: sources.configuredCount });
  if (sources.mode === ".project-reader.json") return t("reader.genericConfigActive", { count: sources.configuredCount });
  if (sources.profile === "generic") return t("reader.genericConfigFallback");
  return t("reader.configFallback");
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
      documentList.resetScroll();
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
  if (state.navMode === "tree") {
    renderDocumentTree();
  } else {
    renderDocumentList();
  }
}

async function loadInitialDocument() {
  const requestedPath = initialDocumentPath();
  for (const path of [requestedPath, "wiki/index.md", "__project_index__.md"].filter(Boolean)) {
    try {
      await loadDocument(path, { syncUrl: path === requestedPath });
      return;
    } catch (error) {
      if (path === requestedPath) els.eventResult.textContent = humanError(error);
    }
  }
  const entryDoc = state.documents[0];
  if (entryDoc) await loadDocument(entryDoc.path);
}

function renderDocumentList() {
  documentList.render();
}

function renderDocumentTree() {
  treeNav.render();
}

async function pollDocumentScan() {
  while (!state.documentScan?.complete && !state.documentScan?.error) {
    await delay(DOCUMENT_SCAN_POLL_MS);
    const changed = applyDocumentsPayload(await getJson("/api/documents"), { replace: true });
    renderReaderStatus();
    if (changed) {
      renderFilters();
      renderDocumentNav();
    }
  }
}

async function loadDocument(path, { syncUrl = true } = {}) {
  const doc = await getJson(`/api/document?path=${encodeURIComponent(path)}`);
  const added = addDocumentIfMissing(doc);
  state.activeDocument = doc;
  els.activeKind.textContent = doc.kind;
  els.activeTitle.textContent = doc.title;
  els.activePath.textContent = doc.path;
  els.documentContent.innerHTML = doc.html;
  state.selectedDocumentText = "";
  annotations.updateSelectionAction();
  documentSearch.run();
  if (added) renderFilters();
  if (syncUrl) syncActiveDocumentUrl(doc.path);
  renderDocumentNav();
}

function applyDocumentsPayload(payload, { replace = false } = {}) {
  const normalized = normalizeDocumentsPayload(payload);
  const nextDocuments = replace ? [] : [...state.documents];
  const byPath = new Map(nextDocuments.map((doc) => [doc.path, doc]));
  for (const doc of normalized.documents) {
    byPath.set(doc.path, doc);
  }
  if (state.activeDocument && !byPath.has(state.activeDocument.path)) {
    byPath.set(state.activeDocument.path, {
      path: state.activeDocument.path,
      kind: state.activeDocument.kind,
      title: state.activeDocument.title,
      summary: "",
    });
  }
  const next = [...byPath.values()];
  const previousSignature = documentsSignature(state.documents);
  const nextSignature = documentsSignature(next);
  const previousScan = JSON.stringify(state.documentScan || {});
  const nextScan = JSON.stringify(normalized.scan || {});
  state.documents = next;
  state.documentScan = normalized.scan;
  return previousSignature !== nextSignature || previousScan !== nextScan;
}

function normalizeDocumentsPayload(payload) {
  if (Array.isArray(payload)) {
    return {
      documents: payload,
      scan: {
        started: true,
        complete: true,
        loadedCount: payload.length,
        error: "",
      },
    };
  }
  return {
    documents: Array.isArray(payload?.documents) ? payload.documents : [],
    scan: payload?.scan || null,
  };
}

function documentsSignature(docs) {
  return `${docs.length}:${docs[0]?.path || ""}:${docs.at(-1)?.path || ""}`;
}

function initialDocumentPath() {
  const params = new URLSearchParams(window.location.search);
  const value = params.get("path") || params.get("file") || "";
  return value.startsWith("/") ? "" : value;
}

function addDocumentIfMissing(doc) {
  if (state.documents.some((item) => item.path === doc.path)) return false;
  state.documents.push({
    path: doc.path,
    kind: doc.kind,
    title: doc.title,
    summary: "",
  });
  return true;
}

function syncActiveDocumentUrl(path) {
  const url = new URL(window.location.href);
  url.searchParams.set("path", path);
  window.history.replaceState({ path }, "", url);
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
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
      loadDocument(match.path).catch((error) => {
        els.eventResult.textContent = error.message;
      });
    });
    els.searchResults.append(button);
  }
}

function handleSearchInput() {
  documentList.resetScroll();
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
els.openCommandPalette.addEventListener("click", commandPalette.open);
els.closeCommandPalette.addEventListener("click", commandPalette.close);
els.commandInput.addEventListener("input", commandPalette.render);
els.commandPalette.addEventListener("click", (event) => {
  if (event.target === els.commandPalette) commandPalette.close();
});
for (const button of els.commandModeButtons) {
  button.addEventListener("click", () => commandPalette.setMode(button.dataset.commandMode));
}
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
document.addEventListener("keydown", commandPalette.handleKeydown);
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
