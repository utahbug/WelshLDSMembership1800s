(() => {
  const catalog = window.WELSH_RECORD_CATALOG;
  if (!catalog) return;
  const $ = (selector) => document.querySelector(selector);
  const directory = $("#directoryPanel");
  const branchList = $("#branchList");
  const count = $("#collectionCount");
  const search = $("#collectionSearch");
  const globalSearch = $("#globalSearch");
  const searchResults = $("#searchResults");
  const resultList = $("#searchResultList");
  const picker = $("#branchPicker");
  const pickerSearch = $("#pickerSearch");
  const pickerList = $("#pickerBranchList");
  const pickerButton = $("#branchesButton");
  const branchPagePicker = $("#branchPagePicker");
  let registry = window.WELSH_BRANCH_REGISTRY?.registry || [];

  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\bff/g, "f").replace(/[^a-z0-9]/g, "");
  function distance(a, b) { const row = Array.from({ length: b.length + 1 }, (_, i) => i); for (let i = 1; i <= a.length; i += 1) { let previous = row[0]; row[0] = i; for (let j = 1; j <= b.length; j += 1) { const old = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1)); previous = old; } } return row[b.length]; }
  function matches(query, text) { const q = normalize(query); const value = normalize(text); if (!q) return true; if (value.includes(q)) return true; return q.length >= 5 && distance(q, value) <= (q.length >= 8 ? 2 : 1); }
  const years = (item) => item?.earliestYear ? `${item.earliestYear}${item.latestYear && item.latestYear !== item.earliestYear ? `–${item.latestYear}` : ""}` : "Years not yet identified";
  const detailsFor = (name) => registry.find((item) => item.canonicalName === name);
  const names = () => registry.map((item) => item.canonicalName).sort((a, b) => a.localeCompare(b));
  function related(name) { const key = normalize(name); return catalog.collections.filter((collection) => normalize([collection.name, ...(collection.aliases || [])].join(" ")).includes(key) || normalize(collection.name).includes(key.slice(0, Math.max(4, key.length - 2)))); }
  function routeBranch(name, push = true) { window.WELSH_OPEN_BRANCH?.(name); directory.hidden = true; branchPagePicker.hidden = false; closePicker(false); if (push) history.pushState({ branch: name }, "", `?branch=${encodeURIComponent(name)}`); document.title = `${name} — LDS Welsh Membership Records`; organizeResources(name); }
  window.WELSH_ROUTE_BRANCH = routeBranch;
  function branchButton(name, compact = false) { const button = document.createElement("button"); button.type = "button"; button.className = compact ? "picker-branch" : "branch-card"; const collections = related(name); button.innerHTML = `<strong>${name}</strong><small>${compact ? years(detailsFor(name)) : `${years(detailsFor(name))} · ${collections.length} record collection${collections.length === 1 ? "" : "s"}`}</small>`; button.addEventListener("click", () => routeBranch(name)); return button; }
  function renderDirectory() { count.textContent = `${names().length} identified branches`; branchList.replaceChildren(...names().map((name) => branchButton(name))); renderPicker(); }
  function renderPicker() { const query = pickerSearch.value.trim(); const found = names().filter((name) => matches(query, [name, detailsFor(name)?.variants, detailsFor(name)?.relatedBranches].join(" "))); pickerList.replaceChildren(...found.map((name) => branchButton(name, true))); }
  function openPicker(anchor = null) {
    picker.classList.toggle("compact-popover", anchor === branchPagePicker && innerWidth > 760);
    if (picker.classList.contains("compact-popover")) {
      const box = anchor.getBoundingClientRect();
      picker.style.setProperty("--picker-top", `${Math.max(12, Math.min(innerHeight - 420, box.bottom + 5))}px`);
      picker.style.setProperty("--picker-left", `${Math.min(innerWidth - 380, Math.max(12, box.left))}px`);
    }
    picker.hidden = false; pickerButton.setAttribute("aria-expanded", "true"); pickerSearch.value = ""; renderPicker(); requestAnimationFrame(() => pickerSearch.focus());
  }
  function closePicker(refocus = true) { picker.hidden = true; picker.classList.remove("compact-popover"); pickerButton.setAttribute("aria-expanded", "false"); if (refocus) pickerButton.focus(); }
  function sourceText(collection) { const text = [collection.name, ...(collection.images || []).slice(0, 10).map((item) => item.name)].join(" "); const cd = text.match(/(?:^|\D)(?:CD\s*)?(\d{1,2})(?:\s*[-–]|\b)/i)?.[1]; const call = text.match(/\b(?:LR|CR)\s*\d+(?:\s+\d+)?/i)?.[0]; return [cd && `CD ${cd}`, call].filter(Boolean).join(" · ") || "Source CD not yet identified"; }
  function searchCatalog(query) {
    searchResults.hidden = !query; if (!query) { resultList.replaceChildren(); return; }
    const branchHits = names().filter((name) => matches(query, [name, detailsFor(name)?.variants, detailsFor(name)?.relatedBranches, detailsFor(name)?.filmAndCallNumbers, years(detailsFor(name))].join(" "))).map((name) => ({ type: "BRANCH", name, action: () => routeBranch(name), note: years(detailsFor(name)) }));
    const collectionHits = catalog.collections.filter((collection) => matches(query, [collection.name, collection.category, sourceText(collection), ...(collection.aliases || []), ...(collection.images || []).map((item) => item.name)].join(" "))).map((collection) => ({ type: "COLLECTION", name: collection.name, note: `${sourceText(collection)} · ${(collection.images || []).length} items`, action: () => { const branch = names().find((name) => normalize(collection.name).includes(normalize(name))); if (branch) routeBranch(branch); else window.WELSH_OPEN_COLLECTION?.(collection); } }));
    const hits = [...branchHits, ...collectionHits].slice(0, 60); if (!hits.length) { resultList.innerHTML = `<p class="no-results">No matches were found for “${query}”. Try another spelling, CD number, call number, or date.</p>`; return; }
    resultList.replaceChildren(...hits.map((hit) => { const button = document.createElement("button"); button.type = "button"; button.className = "search-result"; button.innerHTML = `<span>${hit.type}</span><strong>${hit.name}</strong><small>${hit.note}</small>`; button.addEventListener("click", hit.action); return button; }));
  }
  function organizeResources(name) {
    const list = $("#resourceList"); if (!list) return; const cards = [...list.querySelectorAll(".resource-card")];
    const groups = [{ title: "Membership images", test: (card) => /record images/i.test(card.textContent) }, { title: "Transcriptions and translations", test: (card) => /transcription|translation/i.test(card.textContent) }, { title: "Minutes and other record collections", test: (card) => /minutes/i.test(card.textContent) }, { title: "Related PDFs and research material", test: () => true }];
    const used = new Set(); const fragment = document.createDocumentFragment(); groups.forEach((group) => { const section = document.createElement("section"); section.className = "resource-group"; section.innerHTML = `<h3>${group.title}</h3>`; const grid = document.createElement("div"); grid.className = "resource-grid"; cards.filter((card) => !used.has(card) && group.test(card)).forEach((card) => { used.add(card); grid.append(card); }); if (!grid.children.length) grid.innerHTML = `<p class="resource-empty">No resources in this category have yet been connected to ${name}.</p>`; section.append(grid); fragment.append(section); });
    const d = detailsFor(name); const info = document.createElement("section"); info.className = "branch-information"; info.innerHTML = `<h3>Source coverage</h3><p>${[d?.filmAndCallNumbers, d?.comparisonStatus, d?.localNote].filter(Boolean).join(" · ") || "Detailed source coverage has not yet been entered."}</p><h3>Alternate names and branch relationships</h3><p>${[d?.variants, d?.relatedBranches].filter(Boolean).join(" · ") || "No alternate names or relationships have yet been recorded."}</p><h3>Registry and technical details</h3><p><a href="branch-registry.html">Consult the branch coverage matrix</a></p><h3>Work remaining</h3><p>${cards.length ? "Review source coverage, transcription status, and discrepancies." : "Locate and connect records for this identified branch."}</p>`; fragment.append(info); list.replaceChildren(fragment);
  }
  function syncSearch(source) { const value = source.value; search.value = value; globalSearch.value = value; directory.hidden = false; $("#resourcePanel").hidden = true; $("#recordViewer").hidden = true; searchCatalog(value.trim()); if (source === globalSearch) directory.scrollIntoView({ block: "start" }); }
  pickerButton.addEventListener("click", () => openPicker()); branchPagePicker.addEventListener("click", () => openPicker(branchPagePicker)); $("#closeBranchPicker").addEventListener("click", () => closePicker()); $("#pickerBackdrop").addEventListener("click", () => closePicker()); pickerSearch.addEventListener("input", renderPicker);
  [search, globalSearch].forEach((input) => input.addEventListener("input", () => syncSearch(input)));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !picker.hidden) closePicker(); if (!picker.hidden && ["ArrowDown", "ArrowUp"].includes(event.key)) { const buttons = [...pickerList.querySelectorAll("button")]; const index = buttons.indexOf(document.activeElement); buttons[Math.max(0, Math.min(buttons.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)))]?.focus(); event.preventDefault(); } });
  window.addEventListener("popstate", () => { const branch = new URLSearchParams(location.search).get("branch"); if (branch) routeBranch(branch, false); else { directory.hidden = false; branchPagePicker.hidden = true; $("#resourcePanel").hidden = true; $("#recordViewer").hidden = true; document.title = "LDS Welsh Membership Records, 1800s"; } });
  function start() { renderDirectory(); const branch = new URLSearchParams(location.search).get("branch"); if (branch && names().includes(branch)) routeBranch(branch, false); }
  if (registry.length) start();
  else fetch("data/branch-registry.json").then((response) => response.json()).then((data) => { registry = data.registry || []; start(); }).catch(() => { count.textContent = "Branch registry could not be loaded."; });
})();
