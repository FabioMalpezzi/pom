export function createAnnotationController({
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
}) {
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

  function updateSelectionAction() {
    state.selectedDocumentText = selectedDocumentText();
    els.useSelection.disabled = !state.selectedDocumentText;
    els.useSelection.setAttribute("aria-disabled", String(!state.selectedDocumentText));
  }

  function sendSelectionToNote() {
    const text = selectedDocumentText() || state.selectedDocumentText;
    if (!text) {
      updateSelectionAction();
      return;
    }
    els.selectedText.value = text;
    openAnnotationPanelForNote();
    els.eventResult.innerHTML = `
      <strong>${escapeHtml(t("selection.copied"))}</strong><br>
      ${escapeHtml(t("selection.copiedBody"))}
    `;
    els.selectedText.classList.remove("field-flash");
    requestAnimationFrame(() => {
      els.selectedText.classList.add("field-flash");
      window.setTimeout(() => els.selectedText.classList.remove("field-flash"), 900);
    });
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
    els.selectedText.value = "";
    els.intent.value = "";
    await loadAnnotations();
  }

  function closeFloatingPanelFromOutside(event) {
    if (!state.agentOpen || state.agentPinned) return;
    if (els.agentPanel.contains(event.target) || els.useSelection.contains(event.target)) return;
    state.agentOpen = false;
    renderLayoutState();
  }

  function clearAnnotationTargetHighlights() {
    const marks = [...els.documentContent.querySelectorAll(".annotation-target-mark")];
    for (const mark of marks) {
      const parent = mark.parentNode;
      mark.replaceWith(document.createTextNode(mark.textContent));
      parent?.normalize();
    }
  }

  function selectedDocumentText() {
    const selection = window.getSelection();
    const text = selection?.toString().trim() || "";
    if (!text || !selectionBelongsToDocument(selection)) return "";
    return text;
  }

  function selectionBelongsToDocument(selection) {
    return Boolean(selection?.anchorNode && selection?.focusNode
      && nodeInsideDocument(selection.anchorNode)
      && nodeInsideDocument(selection.focusNode));
  }

  function nodeInsideDocument(node) {
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return Boolean(element && els.documentContent.contains(element));
  }

  function openAnnotationPanelForNote() {
    state.agentOpen = true;
    renderLayoutState();
    setAgentTab("write");
    requestAnimationFrame(() => {
      els.intent.focus({ preventScroll: true });
      els.intent.scrollIntoView({ block: "nearest", inline: "nearest" });
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

  return {
    clearAnnotationTargetHighlights,
    closeFloatingPanelFromOutside,
    loadAnnotations,
    saveAnnotation,
    sendSelectionToNote,
    updateSelectionAction,
  };
}
