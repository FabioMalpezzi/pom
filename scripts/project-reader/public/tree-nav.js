export function createTreeNavController({ els, state, t, escapeHtml, getJson, loadDocument }) {
  const treeState = {
    cache: new Map(),
    loading: new Set(),
    openPaths: new Set(),
    error: "",
  };

  function render() {
    const query = els.search.value.trim().toLowerCase();
    if (query) {
      renderFilteredDocumentTree(query);
      return;
    }
    renderLazyTree();
  }

  function renderLazyTree() {
    els.documentTree.innerHTML = "";
    const root = treeState.cache.get("");
    if (!root) {
      els.documentTree.innerHTML = `<p class="panel-note">${escapeHtml(t("document.treeLoading"))}</p>`;
      loadTreePath("").catch(showTreeError);
      return;
    }
    appendLazyEntries(els.documentTree, root.entries, "");
  }

  function renderFilteredDocumentTree(query) {
    const docs = matchingDocuments(query);
    els.documentTree.innerHTML = "";
    if (!docs.length) {
      els.documentTree.innerHTML = `<p class="panel-note">${escapeHtml(t("document.noFiles"))}</p>`;
      return;
    }
    appendFilteredTreeChildren(els.documentTree, buildTree(docs), query);
  }

  async function loadTreePath(path) {
    if (treeState.cache.has(path) || treeState.loading.has(path)) return;
    treeState.loading.add(path);
    try {
      const params = path ? `?path=${encodeURIComponent(path)}` : "";
      treeState.cache.set(path, await getJson(`/api/tree${params}`));
      treeState.error = "";
    } catch (error) {
      treeState.error = error.message;
      throw error;
    } finally {
      treeState.loading.delete(path);
      if (state.navMode === "tree" && !els.search.value.trim()) renderLazyTree();
    }
  }

  function appendLazyEntries(parent, entries, path) {
    const visibleEntries = entries.filter((entry) => {
      return entry.type === "directory" || state.activeKind === "all" || entry.kind === state.activeKind;
    });
    if (!visibleEntries.length) {
      const note = document.createElement("p");
      note.className = "panel-note";
      note.textContent = treeState.loading.has(path) ? t("document.treeLoading") : t("document.noFiles");
      parent.append(note);
      return;
    }
    for (const entry of [...visibleEntries].sort(compareTreeEntries)) {
      parent.append(entry.type === "directory" ? renderLazyDirectory(entry) : renderTreeFile(entry));
    }
  }

  function renderLazyDirectory(entry) {
    const details = document.createElement("details");
    details.className = "tree-dir";
    details.open = directoryShouldOpen(entry.path);
    const summary = document.createElement("summary");
    summary.textContent = entry.name;
    details.append(summary);
    const body = document.createElement("div");
    body.className = "tree-children";
    details.append(body);
    renderLazyDirectoryBody(entry.path, body);
    details.addEventListener("toggle", () => {
      if (details.open) {
        treeState.openPaths.add(entry.path);
        loadTreePath(entry.path).catch(showTreeError);
      } else {
        treeState.openPaths.delete(entry.path);
      }
    });
    if (details.open) loadTreePath(entry.path).catch(showTreeError);
    return details;
  }

  function renderLazyDirectoryBody(path, body) {
    const tree = treeState.cache.get(path);
    if (tree) {
      appendLazyEntries(body, tree.entries, path);
      return;
    }
    const note = document.createElement("p");
    note.className = "panel-note";
    note.textContent = treeState.error || t("document.treeLoading");
    body.append(note);
  }

  function showTreeError(error) {
    treeState.error = error.message;
    if (state.navMode === "tree") {
      els.documentTree.innerHTML = `<p class="panel-note">${escapeHtml(t("document.treeError", { error: error.message }))}</p>`;
    }
  }

  function matchingDocuments(query) {
    return state.documents.filter((doc) => {
      const matchesKind = state.activeKind === "all" || doc.kind === state.activeKind;
      const haystack = `${doc.title} ${doc.path} ${doc.summary}`.toLowerCase();
      return matchesKind && haystack.includes(query);
    });
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

  function appendFilteredTreeChildren(parent, node, query) {
    for (const dir of [...node.dirs.values()].sort(compareTreeNodes)) {
      parent.append(renderFilteredDirectory(dir, query));
    }
    for (const doc of [...node.files].sort(compareTreeDocs)) {
      parent.append(renderTreeFile(doc));
    }
  }

  function renderFilteredDirectory(node, query) {
    const details = document.createElement("details");
    details.className = "tree-dir";
    details.open = Boolean(query) || node.path === "wiki" || Boolean(state.activeDocument?.path.startsWith(`${node.path}/`));
    const summary = document.createElement("summary");
    summary.textContent = node.name;
    details.append(summary);
    const body = document.createElement("div");
    body.className = "tree-children";
    appendFilteredTreeChildren(body, node, query);
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

  function directoryShouldOpen(path) {
    return treeState.openPaths.has(path) || Boolean(state.activeDocument?.path.startsWith(`${path}/`));
  }

  return { render };
}

function treeNode(name, path) {
  return { name, path, dirs: new Map(), files: [] };
}

function compareTreeNodes(a, b) {
  return treeTopRank(a.path) - treeTopRank(b.path) || a.name.localeCompare(b.name);
}

function compareTreeDocs(a, b) {
  return treeTopRank(a.path) - treeTopRank(b.path) || a.path.localeCompare(b.path);
}

function compareTreeEntries(a, b) {
  return treeTopRank(a.path) - treeTopRank(b.path)
    || Number(a.type === "file") - Number(b.type === "file")
    || a.name.localeCompare(b.name);
}

function treeTopRank(path) {
  const top = path.split("/")[0];
  const order = ["wiki", "README.md", "CONTEXT.md", "docs", "doc", "specs", "decisions", "adr", "tasks", "experiments", "src", "scripts", "tests"];
  const index = order.indexOf(top);
  return index === -1 ? order.length : index;
}

function lastPathSegment(path) {
  return path.split("/").at(-1);
}
