const state = {
  documents: [],
  activeKind: "all",
  activeDocument: null,
};

const els = {
  search: document.querySelector("#search"),
  kindFilters: document.querySelector("#kindFilters"),
  documentList: document.querySelector("#documentList"),
  activeKind: document.querySelector("#activeKind"),
  activeTitle: document.querySelector("#activeTitle"),
  activePath: document.querySelector("#activePath"),
  documentContent: document.querySelector("#documentContent"),
  useSelection: document.querySelector("#useSelection"),
  eventType: document.querySelector("#eventType"),
  intent: document.querySelector("#intent"),
  selectedText: document.querySelector("#selectedText"),
  saveEvent: document.querySelector("#saveEvent"),
  eventResult: document.querySelector("#eventResult"),
  refreshProposals: document.querySelector("#refreshProposals"),
  proposalList: document.querySelector("#proposalList"),
  proposalDetail: document.querySelector("#proposalDetail"),
};

init();

async function init() {
  state.documents = await getJson("/api/documents");
  renderFilters();
  renderDocumentList();
  await loadProposals();
  const firstWiki = state.documents.find((doc) => doc.path === "wiki/index.md") || state.documents[0];
  if (firstWiki) await loadDocument(firstWiki.path);
}

function renderFilters() {
  const kinds = ["all", ...new Set(state.documents.map((doc) => doc.kind))];
  els.kindFilters.innerHTML = "";
  for (const kind of kinds) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip${kind === state.activeKind ? " active" : ""}`;
    button.textContent = kind === "all" ? "Tutti" : kind;
    button.addEventListener("click", () => {
      state.activeKind = kind;
      renderFilters();
      renderDocumentList();
    });
    els.kindFilters.append(button);
  }
}

function renderDocumentList() {
  const query = els.search.value.trim().toLowerCase();
  const docs = state.documents.filter((doc) => {
    const matchesKind = state.activeKind === "all" || doc.kind === state.activeKind;
    const haystack = `${doc.title} ${doc.path} ${doc.summary}`.toLowerCase();
    return matchesKind && (!query || haystack.includes(query));
  });
  els.documentList.innerHTML = "";
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

async function loadDocument(path) {
  const doc = await getJson(`/api/document?path=${encodeURIComponent(path)}`);
  state.activeDocument = doc;
  els.activeKind.textContent = doc.kind;
  els.activeTitle.textContent = doc.title;
  els.activePath.textContent = doc.path;
  els.documentContent.innerHTML = doc.html;
  renderDocumentList();
}

async function saveEvent() {
  if (!state.activeDocument) return;
  const userIntent = els.intent.value.trim();
  if (!userIntent) {
    els.eventResult.innerHTML = `
      <strong>Richiesta mancante</strong><br>
      Scrivi la domanda o istruzione nel campo “Richiesta per l'agente”. Il campo “Testo selezionato” è solo contesto facoltativo.
    `;
    els.intent.focus();
    return;
  }
  const payload = {
    eventType: els.eventType.value,
    userIntent,
    selectedText: els.selectedText.value,
    primaryDocument: {
      path: state.activeDocument.path,
      kind: state.activeDocument.kind,
      role: "active mini UI document",
    },
    linkedDocuments: [],
    sourceAuthorityHints: [
      "Wiki summarizes current knowledge and must not replace authoritative documents.",
      "Specs, ADRs, task plans, code, and project docs own their respective domains.",
    ],
  };
  const result = await postJson("/api/events", payload);
  els.eventResult.innerHTML = `<strong>Evento creato</strong><br>${escapeHtml(result.path)}`;
  await loadProposals();
}

async function loadProposals() {
  const proposals = await getJson("/api/proposals");
  els.proposalList.innerHTML = "";
  if (!proposals.length) {
    els.proposalList.innerHTML = `<p class="panel-note">Nessuna proposta salvata.</p>`;
    return;
  }
  for (const proposal of proposals) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "proposal-item";
    button.innerHTML = `
      <span class="proposal-title">${escapeHtml(proposal.proposalId)}</span>
      <span class="proposal-meta">${escapeHtml(proposal.proposalType)} · ${escapeHtml(proposal.proposalStatus)}</span>
    `;
    button.addEventListener("click", () => loadProposal(proposal.path));
    els.proposalList.append(button);
  }
}

async function loadProposal(path) {
  const proposal = await getJson(`/api/proposal?path=${encodeURIComponent(path)}`);
  els.proposalDetail.textContent = JSON.stringify(proposal, null, 2);
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

function humanError(error) {
  const raw = error?.message || String(error);
  try {
    const parsed = JSON.parse(raw);
    if (parsed.error === "User intent is required") {
      return "Scrivi la domanda o istruzione nel campo “Richiesta per l'agente”.";
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

els.search.addEventListener("input", renderDocumentList);
els.useSelection.addEventListener("click", () => {
  els.selectedText.value = window.getSelection()?.toString().trim() || "";
});
els.saveEvent.addEventListener("click", () => {
  saveEvent().catch((error) => {
    els.eventResult.textContent = humanError(error);
  });
});
els.refreshProposals.addEventListener("click", () => {
  loadProposals().catch((error) => {
    els.proposalDetail.textContent = error.message;
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
