export function createDocumentSearchController({ els, state, t, escapeRegExp }) {
  function run({ scroll = false } = {}) {
    clearHighlights();
    state.documentSearchMatches = [];
    state.documentSearchIndex = -1;
    const query = els.documentSearch.value.trim();
    if (!query) {
      updateCount();
      return;
    }
    const pattern = buildPattern(query);
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
    for (const node of nodes) markMatches(node, pattern);
    if (state.documentSearchMatches.length) {
      setIndex(0, { scroll });
    } else {
      updateCount();
    }
  }

  function move(direction) {
    if (!state.documentSearchMatches.length) {
      run({ scroll: true });
      return;
    }
    const nextIndex = (state.documentSearchIndex + direction + state.documentSearchMatches.length) % state.documentSearchMatches.length;
    setIndex(nextIndex);
  }

  function clearHighlights() {
    const marks = [...els.documentContent.querySelectorAll(".file-search-mark")];
    for (const mark of marks) {
      const parent = mark.parentNode;
      mark.replaceWith(document.createTextNode(mark.textContent));
      parent?.normalize();
    }
  }

  function markMatches(node, pattern) {
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

  function buildPattern(query) {
    try {
      return new RegExp(els.documentRegexSearch.checked ? query : escapeRegExp(query), "gi");
    } catch {
      updateCount(t("fileSearch.invalidRegex"));
      return null;
    }
  }

  function setIndex(index, { scroll = true } = {}) {
    if (!state.documentSearchMatches.length) {
      state.documentSearchIndex = -1;
      updateCount();
      return;
    }
    state.documentSearchMatches[state.documentSearchIndex]?.classList.remove("active");
    state.documentSearchIndex = index;
    const active = state.documentSearchMatches[state.documentSearchIndex];
    active.classList.add("active");
    updateCount();
    if (scroll) active.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  }

  function updateCount(message = "") {
    const count = state.documentSearchMatches.length;
    els.documentSearchCount.textContent = message || (els.documentSearch.value.trim() ? `${count ? state.documentSearchIndex + 1 : 0}/${count}` : "");
    els.documentSearchPrev.disabled = count === 0;
    els.documentSearchNext.disabled = count === 0;
  }

  return { run, move, clearHighlights };
}
