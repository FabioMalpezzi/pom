const search = document.getElementById("page-search");
const status = document.getElementById("search-status");
const links = Array.from(document.querySelectorAll("#page-nav a"));
const index = Array.isArray(window.POM_SEARCH_INDEX) ? window.POM_SEARCH_INDEX : [];

const byOutput = new Map(index.map((item) => [item.output, item]));

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function updateSearch() {
  const query = normalize(search.value);
  let visible = 0;
  for (const link of links) {
    const href = link.getAttribute("href");
    const item = byOutput.get(href);
    const haystack = normalize([link.dataset.title, item && item.summary, item && item.text].join(" "));
    const match = !query || haystack.includes(query);
    link.hidden = !match;
    if (match) visible += 1;
  }
  if (status) status.textContent = query ? visible + " page" + (visible === 1 ? "" : "s") + " found" : "";
}

if (search) search.addEventListener("input", updateSearch);

document.addEventListener("click", async (event) => {
  const anchor = event.target.closest(".heading-anchor");
  if (!anchor) return;
  const url = new URL(anchor.getAttribute("href"), window.location.href).href;
  if (!navigator.clipboard) return;
  event.preventDefault();
  await navigator.clipboard.writeText(url);
  anchor.classList.add("copied");
  window.setTimeout(() => anchor.classList.remove("copied"), 900);
});
