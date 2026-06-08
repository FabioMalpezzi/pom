const VIRTUAL_THRESHOLD = 200;
const ROW_HEIGHT = 64;
const BUFFER_ROWS = 6;

export function createDocumentListController({ els, state, t, escapeHtml, loadDocument }) {
  let renderFrame = 0;

  function render() {
    const docs = matchingDocuments();
    els.documentList.innerHTML = "";
    if (!docs.length) {
      els.documentList.classList.remove("virtualized");
      els.documentList.innerHTML = `<p class="panel-note">${escapeHtml(t("document.noDocuments"))}</p>`;
      return;
    }
    if (docs.length < VIRTUAL_THRESHOLD) {
      renderStaticList(docs);
      return;
    }
    renderVirtualList(docs);
  }

  function resetScroll() {
    state.documentListScrollTop = 0;
    if (els.documentList) els.documentList.scrollTop = 0;
  }

  function matchingDocuments() {
    const query = els.search.value.trim().toLowerCase();
    return state.documents.filter((doc) => {
      const matchesKind = state.activeKind === "all" || doc.kind === state.activeKind;
      const haystack = `${doc.title} ${doc.path} ${doc.summary}`.toLowerCase();
      return matchesKind && (!query || haystack.includes(query));
    });
  }

  function renderStaticList(docs) {
    els.documentList.classList.remove("virtualized");
    els.documentList.onscroll = null;
    for (const doc of docs) els.documentList.append(renderDocumentButton(doc));
  }

  function renderVirtualList(docs) {
    els.documentList.classList.add("virtualized");
    els.documentList.onscroll = scheduleVirtualRender;
    const viewportHeight = els.documentList.clientHeight || 480;
    const maxScroll = Math.max(0, docs.length * ROW_HEIGHT - viewportHeight);
    const scrollTop = Math.min(state.documentListScrollTop || 0, maxScroll);
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
    const end = Math.min(docs.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + BUFFER_ROWS);
    const spacer = document.createElement("div");
    spacer.className = "virtual-spacer";
    spacer.style.height = `${docs.length * ROW_HEIGHT}px`;
    for (let index = start; index < end; index += 1) {
      const button = renderDocumentButton(docs[index]);
      button.classList.add("virtual-row");
      button.style.transform = `translateY(${index * ROW_HEIGHT}px)`;
      spacer.append(button);
    }
    els.documentList.append(spacer);
    els.documentList.scrollTop = scrollTop;
  }

  function scheduleVirtualRender() {
    state.documentListScrollTop = els.documentList.scrollTop;
    if (renderFrame) return;
    renderFrame = window.requestAnimationFrame(() => {
      renderFrame = 0;
      if (state.navMode === "thematic") render();
    });
  }

  function renderDocumentButton(doc) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `doc-item${state.activeDocument?.path === doc.path ? " active" : ""}`;
    button.innerHTML = `
      <span class="doc-title">${escapeHtml(doc.title)}</span>
      <span class="doc-meta">${escapeHtml(doc.kind)} · ${escapeHtml(doc.path)}</span>
    `;
    button.addEventListener("click", () => loadDocument(doc.path));
    return button;
  }

  return { render, resetScroll };
}
