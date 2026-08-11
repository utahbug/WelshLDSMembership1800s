(() => {
  const catalog = window.WELSH_RECORD_CATALOG;
  if (!catalog) return;
  const $ = (selector) => document.querySelector(selector);
  const directory = $("#directoryPanel");
  const branchList = $("#branchList");
  const count = $("#collectionCount");
  const search = $("#collectionSearch");
  const headerSearchButton = $("#headerSearchButton");
  const menuSearchButton = $("#menuSearchButton");
  const searchResults = $("#searchResults");
  const resultList = $("#searchResultList");
  const picker = $("#branchPicker");
  const pickerList = $("#pickerBranchList");
  const branchPagePicker = $("#branchPagePicker");
  let registry = window.WELSH_BRANCH_REGISTRY?.registry || [];

  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\bff/g, "f").replace(/[^a-z0-9]/g, "");
  const displayTitle = (value) => String(value || "").replace(/,(?=\S)/g, ", ");
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
  function showAllBranches(push = true) { directory.hidden = false; branchPagePicker.hidden = true; $("#branchResourceBreadcrumbs").hidden = true; $("#resourcePanel").hidden = true; $("#recordViewer").hidden = true; closePicker(false); if (push) history.pushState({}, "", location.pathname); document.title = "LDS Welsh Membership Records, 1800s"; window.scrollTo({ top: 0, behavior: "smooth" }); }
  function renderPicker() { const all = document.createElement("button"); all.type = "button"; all.className = "picker-branch all-branches"; all.innerHTML = "<strong>All Branches</strong>"; all.addEventListener("click", () => showAllBranches()); pickerList.replaceChildren(all, ...names().map((name) => branchButton(name, true))); }
  function openPicker(anchor = null) {
    picker.classList.toggle("compact-popover", anchor === branchPagePicker && innerWidth > 760);
    if (picker.classList.contains("compact-popover")) {
      const box = anchor.getBoundingClientRect();
      picker.style.setProperty("--picker-top", `${Math.max(12, Math.min(innerHeight - 420, box.bottom + 5))}px`);
      picker.style.setProperty("--picker-left", `${Math.min(innerWidth - 380, Math.max(12, box.left))}px`);
    }
    picker.hidden = false; branchPagePicker.setAttribute("aria-expanded", "true"); renderPicker(); requestAnimationFrame(() => pickerList.querySelector("button")?.focus());
  }
  function closePicker(refocus = true) { picker.hidden = true; picker.classList.remove("compact-popover"); branchPagePicker.setAttribute("aria-expanded", "false"); if (refocus && !branchPagePicker.hidden) branchPagePicker.focus(); }
  function sourceText(collection) { const text = [collection.name, ...(collection.images || []).slice(0, 10).map((item) => item.name)].join(" "); const cd = text.match(/(?:^|\D)(?:CD\s*)?(\d{1,2})(?:\s*[-–]|\b)/i)?.[1]; const call = text.match(/\b(?:LR|CR)\s*\d+(?:\s+\d+)?/i)?.[0]; return [cd && `CD ${cd}`, call].filter(Boolean).join(" · ") || "Source CD not yet identified"; }
  function searchCatalog(query) {
    searchResults.hidden = !query; if (!query) { resultList.replaceChildren(); return; }
    const branchHits = names().filter((name) => matches(query, [name, detailsFor(name)?.variants, detailsFor(name)?.relatedBranches, detailsFor(name)?.filmAndCallNumbers, years(detailsFor(name))].join(" "))).map((name) => ({ type: "BRANCH", name, action: () => routeBranch(name), note: years(detailsFor(name)) }));
    const collectionHits = catalog.collections.filter((collection) => matches(query, [collection.name, collection.category, sourceText(collection), ...(collection.aliases || []), ...(collection.images || []).map((item) => item.name)].join(" "))).map((collection) => ({ type: "COLLECTION", name: displayTitle(collection.name), note: `${sourceText(collection)} · ${(collection.images || []).length} items`, action: () => { const branch = names().find((name) => normalize(collection.name).includes(normalize(name))); if (branch) routeBranch(branch); else window.WELSH_OPEN_COLLECTION?.(collection); } }));
    const hits = [...branchHits, ...collectionHits].slice(0, 60); if (!hits.length) { resultList.innerHTML = `<p class="no-results">No matches were found for “${query}”. Try another spelling, CD number, call number, or date.</p>`; return; }
    resultList.replaceChildren(...hits.map((hit) => { const button = document.createElement("button"); button.type = "button"; button.className = "search-result"; button.innerHTML = `<span>${hit.type}</span><strong>${hit.name}</strong><small>${hit.note}</small>`; button.addEventListener("click", hit.action); return button; }));
  }
  function organizeResources(name) {
    const list = $("#resourceList"); if (!list) return; const cards = [...list.querySelectorAll(".resource-card")];
    const groups = [{ title: "", test: (card) => /membership records/i.test(card.textContent), primary: true }, { title: "Transcriptions and translations", test: (card) => /transcription|translation/i.test(card.textContent) }, { title: "Minutes and other record collections", test: (card) => /minutes/i.test(card.textContent) }, { title: "Related PDFs and research material", test: () => true }];
    const used = new Set();
    const grouped = groups.map((group) => ({ ...group, cards: cards.filter((card) => !used.has(card) && group.test(card)).filter((card) => { used.add(card); return true; }) }));
    const membershipCollections = related(name).filter((collection) => resourceKindForNavigation(collection) === "membership");
    if (membershipCollections.length === 1) {
      const collection = membershipCollections[0];
      const title = displayTitle(collection.name).replace(/,\s*(?:LR|CR)\s*\d+.*$/i, "").replace(/(\d{4})-(\d{4})\s+(?=\d{4}-\d{4})/g, "$1–$2; ").replace(/(\d{4})-(\d{4})/g, "$1–$2");
      const d = detailsFor(name);
      const reference = String(d?.filmAndCallNumbers || "").match(/\b((?:LR|CR)\s*\d+(?:\s+\d+)?)/i)?.[1]?.replace(/\s+/g, "") || "";
      const imageCount = (collection.images || []).filter((item) => item.type === "image").length;
      const cd = String(d?.filmAndCallNumbers || "").match(/\bCD\s*(\d+)/i)?.[1];
      $("#branchTitle").textContent = name;
      $("#branchHeadingYears").textContent = title.replace(new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*,?\\s*`, "i"), "");
      $("#branchHeadingDetails").textContent = [reference, `${imageCount} images`, cd ? `Source CD ${cd}` : ""].filter(Boolean).join(" · ");
      $("#branchHeadingDetails").hidden = false;
    }
    if (name === "Merthyr Tydfil" && grouped[0].cards.length === 1) {
      const card = grouped[0].cards[0];
      card.classList.add("merthyr-membership-card");
      card.innerHTML = `<span class="resource-kind">Membership Records</span><strong>Merthyr Tydfil</strong><small class="resource-years">1843-1857, 1861-1896</small><small>443 items</small>`;
      $("#branchHeadingYears").hidden = true;
      $("#branchHeadingDetails").hidden = true;
      $("#branchMeta").hidden = true;
    }
    const fragment = document.createDocumentFragment();
    grouped.filter((group) => group.cards.length).forEach((group) => { const section = document.createElement("section"); section.className = `resource-group${group.primary ? " primary-resource-group" : ""}`; if (group.title) section.innerHTML = `<h3>${group.title}</h3>`; const grid = document.createElement("div"); grid.className = "resource-grid"; grid.append(...group.cards); section.append(grid); fragment.append(section); });
    if (name !== "Merthyr Tydfil" && grouped.slice(1).every((group) => !group.cards.length)) { const empty = document.createElement("p"); empty.className = "resource-empty resource-empty-combined"; empty.textContent = name === "Stepaside" ? "Historical record and minutes material for 1858–1860 is included in the LR-1272711 image collection." : "No transcriptions, minutes, or related research material are currently linked."; fragment.append(empty); }
    const d = detailsFor(name); const info = document.createElement("section"); info.className = "branch-information";
    const nameSources = (d?.nameSources || []).map((source) => {
      const location = [source.filename, `viewer sequence ${source.viewerSequence}`, source.internalPage ? `internal page ${source.internalPage}` : "", source.lrContext].filter(Boolean).join(" · ");
      const link = source.collectionBranch ? ` <a href="?branch=${encodeURIComponent(source.collectionBranch)}" data-source-branch="${source.collectionBranch}">Open ${source.collectionBranch} resources</a>` : "";
      return `<li><strong>${source.collectionTitle}</strong><br><span>${location}</span>${source.note ? `<br><span>${source.note}</span>` : ""}${link}</li>`;
    }).join("");
    const sourceEvidence = name === "Merthyr Tydfil" ? `<ul class="source-evidence-list"><li><strong>Membership-register provenance:</strong> LR54507 · CD 29</li><li><strong>Years identified:</strong> 1843-1896</li><li><strong>Typed branch-record extracts:</strong> Candidate Merthyr references are indexed privately; manual review and branch-page linking remain to be completed.</li><li><strong>Transcriptions or minutes:</strong> None are currently linked to this branch page.</li><li><strong>Research notes:</strong> Recovered Wales2Utah branch notes are available for review.</li></ul>` : name === "Stepaside" ? `<ul class="source-evidence-list"><li><strong>Membership-register provenance:</strong> LR-1272711 · CD 44</li><li><strong>Membership records:</strong> 1848–1857</li><li><strong>Historical record and minutes:</strong> 1858–1860</li><li><strong>Source authority:</strong> 107 recovered full-resolution images; thumbnail duplicates excluded.</li></ul>` : name === "Brechfa" ? `<ul class="source-evidence-list"><li><strong>Membership-register provenance:</strong> LR110007 · CD 4</li><li><strong>Membership records:</strong> Main register 1846–1856; separately numbered later register 1857–1868</li><li><strong>Historical material:</strong> Welsh narrative and historical notes preserved through 1875</li><li><strong>Source authority:</strong> 62 recovered full-resolution images; thumbnail duplicates excluded.</li></ul>` : name === "Cefn Coed-y-Cymmer" ? `<ul class="source-evidence-list"><li><strong>Membership-register provenance:</strong> LR1767 · CD 12</li><li><strong>Membership records:</strong> Original register, written pages 1–24; separately numbered/reformation-style register, written pages 25–37</li><li><strong>Historical material:</strong> Narrative on written pages 43–44; Blessings of Children on written pages 45–48; two detached minutes/narrative leaves</li><li><strong>Source authority:</strong> 109 recovered full-resolution images verified by filename and checksum; 109 thumbnail duplicates excluded.</li><li><strong>Legacy metadata:</strong> The prior Wales2Utah FamilySearch/local-CD match flag is retained only as an unverified research note and was not used for this production index.</li></ul>` : name === "Cuffern Mountain" ? `<ul class="source-evidence-list"><li><strong>Membership-register provenance:</strong> LR1987 · CD 6</li><li><strong>Membership records:</strong> Three independently numbered sequences: entries 1–14; entries 1–25; and a reformation-style register numbered 1–252, with the source gap at 177 preserved</li><li><strong>Historical material:</strong> Later special name/status lists, a statistical chart, and a detached handwritten narrative/list are preserved separately</li><li><strong>Source authority:</strong> 83 recovered full-resolution historical images; 86 thumbnail companions and duplicate recovery sets excluded. Three calibration images remain local source-support files but are not shown in the viewer.</li><li><strong>Legacy metadata:</strong> The prior Wales2Utah FamilySearch/local-CD match flag is retained only as an unverified research note and was not used for this production index.</li></ul>` : `<p>${[d?.filmAndCallNumbers, d?.comparisonStatus, d?.localNote].filter(Boolean).join(" · ") || "Detailed source coverage has not yet been entered."}</p>`;
    info.innerHTML = `<h3>Alternate names and branch relationships</h3><p>${[d?.variants, d?.relatedBranches].filter(Boolean).join(" · ") || "No alternate names or relationships have yet been recorded."}</p>${nameSources ? `<h3>Sources for branch name</h3><ul class="branch-name-sources">${nameSources}</ul>` : ""}<h3>Sources and Evidence</h3>${sourceEvidence}<h3>Registry and technical details</h3><p><a href="branch-registry.html">Consult the branch coverage matrix</a></p><h3>Work remaining</h3><p>${cards.length ? "Review source coverage, transcription status, and discrepancies." : "Locate and connect records for this identified branch."}</p>`;
    info.querySelectorAll("[data-source-branch]").forEach((link) => link.addEventListener("click", (event) => { event.preventDefault(); routeBranch(link.dataset.sourceBranch); }));
    fragment.append(info); list.replaceChildren(fragment);
  }
  function resourceKindForNavigation(collection) { return (collection.images || []).some((item) => item.type === "image") ? "membership" : "other"; }
  function openSearch() { directory.hidden = false; branchPagePicker.hidden = true; $("#branchResourceBreadcrumbs").hidden = true; $("#resourcePanel").hidden = true; $("#recordViewer").hidden = true; document.querySelector(".site-menu")?.removeAttribute("open"); directory.scrollIntoView({ block: "start" }); requestAnimationFrame(() => search.focus()); }
  function syncSearch() { directory.hidden = false; $("#branchResourceBreadcrumbs").hidden = true; $("#resourcePanel").hidden = true; $("#recordViewer").hidden = true; searchCatalog(search.value.trim()); }
  branchPagePicker.addEventListener("click", () => openPicker(branchPagePicker)); $("#closeBranchPicker").addEventListener("click", () => closePicker()); $("#pickerBackdrop").addEventListener("click", () => closePicker());
  search.addEventListener("input", syncSearch); headerSearchButton.addEventListener("click", openSearch); menuSearchButton.addEventListener("click", openSearch);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !picker.hidden) closePicker(); if (!picker.hidden && ["ArrowDown", "ArrowUp"].includes(event.key)) { const buttons = [...pickerList.querySelectorAll("button")]; const index = buttons.indexOf(document.activeElement); buttons[Math.max(0, Math.min(buttons.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)))]?.focus(); event.preventDefault(); } });
  window.addEventListener("popstate", () => { const branch = new URLSearchParams(location.search).get("branch"); if (branch) routeBranch(branch, false); else showAllBranches(false); });
  function start() { renderDirectory(); const parameters = new URLSearchParams(location.search); const branch = parameters.get("branch"); if (branch && names().includes(branch)) routeBranch(branch, false); const imageSequence = Number(parameters.get("image")); const imageFilename = parameters.get("imageFilename"); const collectionId = parameters.get("collection"); if (branch && collectionId && ((Number.isInteger(imageSequence) && imageSequence > 0) || imageFilename)) window.WELSH_OPEN_INDEXED_RECORD?.({ branch, collectionId, imageSequence, imageFilename, view: parameters.get("view") || "single" }); }
  if (registry.length) start();
  else fetch("data/branch-registry.json").then((response) => response.json()).then((data) => { registry = data.registry || []; start(); }).catch(() => { count.textContent = "Branch registry could not be loaded."; });
})();
