const CONTENT_SEARCH_DELAY_MS = 250;
const MAX_FILE_RESULTS = 50;

export function createCommandPaletteController({ els, state, t, escapeHtml, getJson, loadDocument, humanError }) {
  let searchTimer = null;
  let searchToken = 0;

  function open() {
    if (!els.commandPalette.open) els.commandPalette.showModal();
    els.commandInput.value = els.activePath.textContent || "";
    setMode("path");
    render();
    els.commandInput.focus();
    els.commandInput.select();
  }

  function close() {
    els.commandPalette.close();
  }

  function setMode(mode) {
    state.commandMode = mode;
    for (const button of els.commandModeButtons) {
      const active = button.dataset.commandMode === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    }
    render();
  }

  function render() {
    const mode = state.commandMode || "path";
    if (mode === "path") return renderPathMode();
    if (mode === "file") return renderFileMode();
    return scheduleContentSearch();
  }

  function renderPathMode() {
    clearContentSearchTimer();
    const path = els.commandInput.value.trim();
    els.commandResults.innerHTML = "";
    if (!path) {
      els.commandResults.innerHTML = `<p class="panel-note">${escapeHtml(t("command.emptyPath"))}</p>`;
      return;
    }
    els.commandResults.append(commandButton({
      title: path,
      meta: t("command.openPath"),
      onClick: () => openDocument(path),
    }));
  }

  function renderFileMode() {
    clearContentSearchTimer();
    const query = els.commandInput.value.trim().toLowerCase();
    const docs = state.documents
      .filter((doc) => {
        const haystack = `${doc.title} ${doc.path}`.toLowerCase();
        return !query || haystack.includes(query);
      })
      .slice(0, MAX_FILE_RESULTS);
    els.commandResults.innerHTML = "";
    if (!docs.length) {
      els.commandResults.innerHTML = `<p class="panel-note">${escapeHtml(t("command.noResults"))}</p>`;
      return;
    }
    for (const doc of docs) {
      els.commandResults.append(commandButton({
        title: doc.title,
        meta: `${doc.kind} · ${doc.path}`,
        onClick: () => openDocument(doc.path),
      }));
    }
  }

  function scheduleContentSearch() {
    clearContentSearchTimer();
    const query = els.commandInput.value.trim();
    const token = searchToken + 1;
    searchToken = token;
    if (!query) {
      els.commandResults.innerHTML = `<p class="panel-note">${escapeHtml(t("command.emptyContent"))}</p>`;
      return;
    }
    els.commandResults.innerHTML = `<p class="panel-note">${escapeHtml(t("search.loading"))}</p>`;
    searchTimer = window.setTimeout(() => {
      runContentSearch(query, token).catch((error) => {
        els.commandResults.innerHTML = `<p class="panel-note">${escapeHtml(humanError(error))}</p>`;
      });
    }, CONTENT_SEARCH_DELAY_MS);
  }

  async function runContentSearch(query, token) {
    const params = new URLSearchParams({
      q: query,
      regex: "0",
      kind: state.activeKind,
    });
    const result = await getJson(`/api/search?${params.toString()}`);
    if (token !== searchToken) return;
    renderContentResults(result);
  }

  function renderContentResults(result) {
    els.commandResults.innerHTML = "";
    if (!result.results.length) {
      els.commandResults.innerHTML = `<p class="panel-note">${escapeHtml(t("command.noResults"))}</p>`;
      return;
    }
    for (const match of result.results) {
      els.commandResults.append(commandButton({
        title: `${match.path}:${match.line}`,
        meta: match.text,
        onClick: () => openDocument(match.path),
      }));
    }
  }

  function commandButton({ title, meta, onClick }) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "command-result";
    button.innerHTML = `
      <span class="doc-title">${escapeHtml(title)}</span>
      <span class="doc-meta">${escapeHtml(meta)}</span>
    `;
    button.addEventListener("click", onClick);
    return button;
  }

  function openDocument(path) {
    loadDocument(path).then(close).catch((error) => {
      els.commandResults.innerHTML = `<p class="panel-note">${escapeHtml(humanError(error))}</p>`;
    });
  }

  function clearContentSearchTimer() {
    if (!searchTimer) return;
    window.clearTimeout(searchTimer);
    searchTimer = null;
  }

  function handleKeydown(event) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      open();
      return;
    }
    if (event.key !== "Enter" || !els.commandPalette.open) return;
    event.preventDefault();
    if ((state.commandMode || "path") === "path") openDocument(els.commandInput.value.trim());
  }

  return { open, close, setMode, render, handleKeydown };
}
