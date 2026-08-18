(() => {
  const catalog = window.WELSH_RECORD_CATALOG;
  if (!catalog) return;
  const $ = (selector) => document.querySelector(selector);
  const listen = (element, eventName, handler) => {
    if (!element) return;
    element.addEventListener(eventName, handler);
  };
  const home = $("#homePanel");
  const directory = $("#directoryPanel");
  const branchList = $("#branchList");
  const count = $("#collectionCount");
  const search = $("#collectionSearch");
  const searchResults = $("#searchResults");
  const resultList = $("#searchResultList");
  const picker = $("#branchPicker");
  const pickerList = $("#pickerBranchList");
  const branchPagePicker = $("#branchPagePicker");
  // navigation.js is shared by the routed index shell. If it is ever loaded
  // by a standalone utility page, leave that page alone instead of assuming
  // the shell-only panels exist.
  if (!home || !directory || !branchList || !count || !search || !searchResults || !resultList) return;
  let registry = window.WELSH_BRANCH_REGISTRY?.registry || [];
  const historicalNames = window.WELSH_HISTORICAL_NAMES?.rows || [];

  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\bff/g, "f").replace(/[^a-z0-9]/g, "");
  const displayTitle = (value) => String(value || "").replace(/,(?=\S)/g, ", ");
  function distance(a, b) { const row = Array.from({ length: b.length + 1 }, (_, i) => i); for (let i = 1; i <= a.length; i += 1) { let previous = row[0]; row[0] = i; for (let j = 1; j <= b.length; j += 1) { const old = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1)); previous = old; } } return row[b.length]; }
  function matches(query, text) { const q = normalize(query); const value = normalize(text); if (!q) return true; if (value.includes(q)) return true; return q.length >= 5 && distance(q, value) <= (q.length >= 8 ? 2 : 1); }
  const years = (item) => item?.earliestYear ? `${item.earliestYear}${item.latestYear && item.latestYear !== item.earliestYear ? `–${item.latestYear}` : ""}` : "Years not yet identified";
  const detailsFor = (name) => registry.find((item) => item.canonicalName === name);
  const branchDisplayName = (name) => name === "Llanelly 2" ? "Llanelly 2 (unresolved source identity)" : name;
  const names = () => registry.map((item) => item.canonicalName).sort((a, b) => a.localeCompare(b));
  function related(name) { if (window.WELSH_RELATED_COLLECTIONS) return window.WELSH_RELATED_COLLECTIONS(name); const key = normalize(name); return catalog.collections.filter((collection) => normalize([collection.name, ...(collection.aliases || [])].join(" ")).includes(key) || normalize(collection.name).includes(key.slice(0, Math.max(4, key.length - 2)))); }
  function routeBranch(name, push = true) { window.WELSH_OPEN_BRANCH?.(name); home.hidden = true; directory.hidden = true; branchPagePicker.hidden = false; closePicker(false); if (push) history.pushState({ branch: name }, "", `index.html?branch=${encodeURIComponent(name)}`); document.title = `${name} — LDS Welsh Membership Records`; organizeResources(name); }
  window.WELSH_ROUTE_BRANCH = routeBranch;
  function branchButton(name, compact = false) { const button = document.createElement("button"); button.type = "button"; button.className = compact ? "picker-branch" : "branch-card"; const collections = related(name); button.innerHTML = `<strong>${branchDisplayName(name)}</strong><small>${compact ? years(detailsFor(name)) : `${years(detailsFor(name))} · ${collections.length} record collection${collections.length === 1 ? "" : "s"}`}</small>`; button.addEventListener("click", () => routeBranch(name)); return button; }
  function renderDirectory() { count.textContent = `${names().length} identified branches`; branchList.replaceChildren(...names().map((name) => branchButton(name))); renderPicker(); }
  function resetMainPanels() { branchPagePicker.hidden = true; $("#branchResourceBreadcrumbs").hidden = true; $("#resourcePanel").hidden = true; $("#recordViewer").hidden = true; $(".viewer").classList.remove("record-open"); closePicker(false); }
  function showHome(push = true, focusSearch = false) { home.hidden = false; directory.hidden = true; resetMainPanels(); if (push) history.pushState({ home: true }, "", focusSearch ? "index.html?search=1" : "index.html"); document.title = "LDS Welsh Membership Records, 1800s"; window.scrollTo({ top: 0, behavior: "smooth" }); if (focusSearch) requestAnimationFrame(() => search.focus()); }
  function showAllBranches(push = true) { home.hidden = true; directory.hidden = false; resetMainPanels(); if (push) history.pushState({ branches: true }, "", "index.html?view=branches"); document.title = "All Branches — LDS Welsh Membership Records"; window.scrollTo({ top: 0, behavior: "smooth" }); }
  function renderPicker() { if (!pickerList) return; const all = document.createElement("button"); all.type = "button"; all.className = "picker-branch all-branches"; all.innerHTML = "<strong>All Branches</strong>"; all.addEventListener("click", () => showAllBranches()); pickerList.replaceChildren(all, ...names().map((name) => branchButton(name, true))); }
  function openPicker(anchor = null) {
    if (!picker || !pickerList || !branchPagePicker) return;
    picker.classList.toggle("compact-popover", anchor === branchPagePicker && innerWidth > 760);
    if (picker.classList.contains("compact-popover")) {
      const box = anchor.getBoundingClientRect();
      picker.style.setProperty("--picker-top", `${Math.max(12, Math.min(innerHeight - 420, box.bottom + 5))}px`);
      picker.style.setProperty("--picker-left", `${Math.min(innerWidth - 380, Math.max(12, box.left))}px`);
    }
    picker.hidden = false; branchPagePicker.setAttribute("aria-expanded", "true"); renderPicker(); requestAnimationFrame(() => pickerList.querySelector("button")?.focus());
  }
  function closePicker(refocus = true) { if (!picker || !branchPagePicker) return; picker.hidden = true; picker.classList.remove("compact-popover"); branchPagePicker.setAttribute("aria-expanded", "false"); if (refocus && !branchPagePicker.hidden) branchPagePicker.focus(); }
  function sourceText(collection) { const text = [collection.name, ...(collection.images || []).slice(0, 10).map((item) => item.name)].join(" "); const cd = text.match(/(?:^|\D)(?:CD\s*)?(\d{1,2})(?:\s*[-–]|\b)/i)?.[1]; const call = text.match(/\b(?:LR|CR)\s*\d+(?:\s+\d+)?/i)?.[0]; return [cd && `CD ${cd}`, call].filter(Boolean).join(" · ") || "Source CD not yet identified"; }
  function catalogHits(query) {
    const branchHits = names().filter((name) => matches(query, [name, detailsFor(name)?.variants, detailsFor(name)?.relatedBranches, detailsFor(name)?.filmAndCallNumbers, years(detailsFor(name))].join(" "))).map((name) => {
      const historicalMatch = historicalNames.find((item) => item.canonicalName === name && normalize(item.name) !== normalize(name) && matches(query, item.name));
      return { type: "BRANCH", name, action: () => routeBranch(name), note: historicalMatch ? `${historicalMatch.name} — ${historicalMatch.relationship}` : years(detailsFor(name)) };
    });
    const branchHitNames = new Set(branchHits.map((hit) => hit.name));
    const historicalHits = historicalNames.filter((item) => matches(query, [item.name, item.canonicalName, item.relationship, item.sourceNotes, item.notes].join(" ")))
      .filter((item) => !item.canonicalName || !branchHitNames.has(item.canonicalName))
      .slice(0, 20)
      .map((item) => ({ type: "HISTORICAL NAME", name: item.name, note: item.canonicalName ? `${item.relationship} of ${item.canonicalName}` : item.relationship, action: () => item.canonicalName ? routeBranch(item.canonicalName) : location.href = `historical-names.html?q=${encodeURIComponent(item.name)}` }));
    const collectionHits = catalog.collections.filter((collection) => matches(query, [collection.name, collection.category, sourceText(collection), ...(collection.aliases || []), ...(collection.images || []).map((item) => item.name)].join(" "))).map((collection) => ({ type: "COLLECTION", name: displayTitle(collection.name), note: `${sourceText(collection)} · ${(collection.images || []).length} items`, action: () => { const branch = names().find((name) => normalize(collection.name).includes(normalize(name))); if (branch) routeBranch(branch); else window.WELSH_OPEN_COLLECTION?.(collection); } }));
    return [...branchHits, ...historicalHits, ...collectionHits].slice(0, 60);
  }
  window.WELSH_ARCHIVE_SEARCH = { hits: catalogHits };
  function searchCatalog(query) {
    searchResults.hidden = !query; if (!query) { resultList.replaceChildren(); return; }
    const hits = catalogHits(query); if (!hits.length) { resultList.innerHTML = `<p class="no-results">No matches were found for “${query}”. Try another spelling, CD number, call number, or date.</p>`; return; }
    resultList.replaceChildren(...hits.map((hit) => { const button = document.createElement("button"); button.type = "button"; button.className = "search-result"; button.innerHTML = `<span>${hit.type}</span><strong>${hit.name}</strong><small>${hit.note}</small>`; button.addEventListener("click", hit.action); return button; }));
  }
  function organizeResources(name) {
    const list = $("#resourceList"); if (!list) return; const cards = [...list.querySelectorAll(".resource-card")];
    const d = detailsFor(name);
    const groups = [{ title: "", key: "primary", primary: true }, { title: "Transcriptions and translations", key: "transcription" }, { title: "Other Records and Material", key: "historical" }, { title: "Related PDFs and research material", key: "research" }];
    const used = new Set();
    const grouped = groups.map((group) => ({ ...group, cards: cards.filter((card) => !used.has(card) && card.dataset.resourceGroup === group.key).filter((card) => { used.add(card); return true; }) }));
    grouped.at(-1).cards.push(...cards.filter((card) => !used.has(card)));
    const fragment = document.createDocumentFragment();
    grouped.filter((group) => group.cards.length).forEach((group) => { const section = document.createElement("section"); section.className = `resource-group${group.primary ? " primary-resource-group" : ""}`; if (group.title) section.innerHTML = `<h3>${group.title}</h3>`; const grid = document.createElement("div"); grid.className = "resource-grid"; grid.append(...group.cards); section.append(grid); fragment.append(section); });
    if (!cards.length) {
      const empty = document.createElement("div");
      empty.className = "resource-empty resource-empty-combined";
      const status = document.createElement("strong");
      status.textContent = "No local record collection recovered yet.";
      empty.append(status);
      if (d?.filmAndCallNumbers) {
        const evidence = document.createElement("p");
        evidence.textContent = `Known source evidence: ${d.filmAndCallNumbers}`;
        empty.append(evidence);
      }
      fragment.append(empty);
    }
    const info = document.createElement("section"); info.className = "branch-information";
    const nameSources = (d?.nameSources || []).map((source) => {
      const location = [source.evidenceType, source.filename, source.viewerSequence ? `viewer sequence ${source.viewerSequence}` : "", source.internalPage ? `internal page ${source.internalPage}` : "", source.lrContext].filter(Boolean).join(" · ");
      // A source citation that names the current branch is evidence, not a
      // destination. Only render a branch-resource link when it genuinely
      // leads to a different branch page (for example, a compound source held
      // under another branch).
      const linksElsewhere = source.collectionBranch && normalize(source.collectionBranch) !== normalize(name);
      const link = linksElsewhere ? ` <a href="index.html?branch=${encodeURIComponent(source.collectionBranch)}" data-source-branch="${source.collectionBranch}">Open ${source.collectionBranch} resources</a>` : "";
      return `<li><strong>${source.collectionTitle}</strong><br><span>${location}</span>${source.note ? `<br><span>${source.note}</span>` : ""}${link}</li>`;
    }).join("");
    const defaultEvidence = [d?.filmAndCallNumbers, d?.comparisonStatus, d?.localNote]
      .filter((value) => value !== undefined && value !== null && value !== "" && value !== true && value !== false)
      .map((value) => value === "Matched: FamilySearch and local CD" ? "Local CD and catalog evidence correspond" : value);
    const sourceEvidence = name === "Dinas" ? `<ul class="source-evidence-list"><li><strong>Membership-register provenance:</strong> CD 1 · LR1827 · retained source-image/catalog prefix 1555</li><li><strong>Source date:</strong> The cover says 1848–1878; the inherited project range says 1848–1879. No inspected entry or annotation establishes 1879.</li><li><strong>Membership records:</strong> Written pages 9–21, with an opening sequence, an independently restarted sequence, and a Dinas reorganization section.</li><li><strong>Historical material:</strong> Welsh introductory narrative ending with apparent “Cymer Branch” wording; Welsh narrative on written pages 27–28; Blessings of Children beginning on written page 29.</li><li><strong>Source authority:</strong> 66 recovered full-resolution images verified against the original CD by filename and SHA-256 checksum; 66 thumbnail duplicates excluded.</li><li><strong>Research note:</strong> The apparent Dinas–Cymer wording is preserved as possible branch relationship or boundary evidence, not asserted as a confirmed relationship.</li></ul>` : name === "Merthyr Tydfil" ? `<ul class="source-evidence-list"><li><strong>Membership-register provenance:</strong> LR54507 · CD 29</li><li><strong>Years identified:</strong> 1843-1896</li><li><strong>Typed branch-record extracts:</strong> Candidate Merthyr references remain under review; branch-page linking is not yet complete.</li><li><strong>Transcriptions or minutes:</strong> None are currently linked to this branch page.</li><li><strong>Research notes:</strong> Recovered Wales2Utah branch notes are available for review.</li></ul>` : name === "Stepaside" ? `<ul class="source-evidence-list"><li><strong>Membership-register provenance:</strong> LR-1272711 · CD 44</li><li><strong>Membership records:</strong> 1848–1857</li><li><strong>Historical record and minutes:</strong> 1858–1860</li><li><strong>Source authority:</strong> 107 recovered full-resolution images; thumbnail duplicates excluded.</li></ul>` : name === "Brechfa" ? `<ul class="source-evidence-list"><li><strong>Membership-register provenance:</strong> LR110007 · CD 4</li><li><strong>Membership records:</strong> Main register 1846–1856; separately numbered later register 1857–1868</li><li><strong>Historical material:</strong> Welsh narrative and historical notes preserved through 1875</li><li><strong>Source authority:</strong> 62 recovered full-resolution images; thumbnail duplicates excluded.</li></ul>` : name === "Cefn Coed-y-Cymmer" ? `<ul class="source-evidence-list"><li><strong>Membership-register provenance:</strong> LR1767 · CD 12</li><li><strong>Membership records:</strong> Original register, written pages 1–24; separately numbered/reformation-style register, written pages 25–37</li><li><strong>Historical material:</strong> Narrative on written pages 43–44; Blessings of Children on written pages 45–48; two detached minutes/narrative leaves</li><li><strong>Source authority:</strong> 109 recovered full-resolution images verified by filename and checksum; 109 thumbnail duplicates excluded.</li><li><strong>Legacy metadata:</strong> The prior Wales2Utah matching note is retained only as research context and was not used for the member records.</li></ul>` : name === "Cuffern Mountain" ? `<ul class="source-evidence-list"><li><strong>Membership-register provenance:</strong> LR1987 · CD 6</li><li><strong>Membership records:</strong> Three independently numbered sequences: entries 1–14; entries 1–25; and a reformation-style register numbered 1–252, with the source gap at 177 preserved</li><li><strong>Historical material:</strong> Later special name/status lists, a statistical chart, and a detached handwritten narrative/list are preserved separately</li><li><strong>Source authority:</strong> 83 recovered full-resolution historical images; 86 thumbnail companions and duplicate recovery sets excluded. Three calibration images remain local source-support files but are not shown in the viewer.</li><li><strong>Legacy metadata:</strong> The prior Wales2Utah matching note is retained only as research context and was not used for the member records.</li></ul>` : `<p>${defaultEvidence.join(" · ") || "Detailed source coverage has not yet been entered."}</p>`;
    const detailedCardProvenance = cards.filter((card) => card.dataset.provenanceDetail && card.dataset.provenanceDetail !== card.dataset.provenanceSummary)
      .map((card) => `<li><strong>${card.querySelector("strong")?.textContent || "Resource"}:</strong> ${card.dataset.provenanceDetail}</li>`).join("");
    const alternateNames = [d?.variants, d?.relatedBranches].filter(Boolean).join(" · ");
    const leadership = d?.leadershipOfficers ? `<section class="branch-detail-expanded branch-leadership"><h3>Branch leadership / officers</h3><p>${d.leadershipOfficers}</p></section>` : "";
    const disclosure = (title, content) => `<details class="branch-detail-disclosure"><summary aria-expanded="false">${title}</summary><div class="branch-detail-content">${content}</div></details>`;
    info.innerHTML = (alternateNames ? `<section class="branch-detail-expanded"><h3>Alternate names and branch relationships</h3><p>${alternateNames}</p></section>` : "")
      + leadership
      + disclosure("Sources and Evidence", `${sourceEvidence}${nameSources ? `<ul class="branch-name-sources">${nameSources}</ul>` : ""}${detailedCardProvenance ? `<ul class="source-evidence-list">${detailedCardProvenance}</ul>` : ""}`);
    info.querySelectorAll(".branch-detail-disclosure").forEach((section) => section.addEventListener("toggle", () => section.querySelector("summary")?.setAttribute("aria-expanded", String(section.open))));
    info.querySelectorAll("[data-source-branch]").forEach((link) => link.addEventListener("click", (event) => { event.preventDefault(); routeBranch(link.dataset.sourceBranch); }));
    fragment.append(info); list.replaceChildren(fragment);
  }
  function openSearch() { showHome(true, true); }
  function syncSearch() { home.hidden = false; directory.hidden = true; resetMainPanels(); searchCatalog(search.value.trim()); }
  listen(branchPagePicker, "click", () => openPicker(branchPagePicker));
  listen($("#closeBranchPicker"), "click", () => closePicker());
  listen($("#pickerBackdrop"), "click", () => closePicker());
  listen(search, "input", syncSearch);
  document.addEventListener("keydown", (event) => { if (!picker || !pickerList) return; if (event.key === "Escape" && !picker.hidden) closePicker(); if (!picker.hidden && ["ArrowDown", "ArrowUp"].includes(event.key)) { const buttons = [...pickerList.querySelectorAll("button")]; const index = buttons.indexOf(document.activeElement); buttons[Math.max(0, Math.min(buttons.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)))]?.focus(); event.preventDefault(); } });
  function routeFromLocation() { const parameters = new URLSearchParams(location.search); const branch = parameters.get("branch"); const collectionId = parameters.get("collection"); const imageSequence = Number(parameters.get("image")); const imageFilename = parameters.get("imageFilename"); if (collectionId && ((Number.isInteger(imageSequence) && imageSequence > 0) || imageFilename)) { home.hidden = true; directory.hidden = true; resetMainPanels(); window.WELSH_OPEN_INDEXED_RECORD?.({ branch, collectionId, imageSequence, imageFilename, view: parameters.get("view") || "single" }); } else if (branch && names().includes(branch)) routeBranch(branch, false); else if (parameters.get("view") === "branches") showAllBranches(false); else showHome(false, parameters.has("search")); }
  window.addEventListener("popstate", routeFromLocation);
  function start() { renderDirectory(); routeFromLocation(); }
  if (registry.length) start();
  else fetch("data/branch-registry.json").then((response) => response.json()).then((data) => { registry = data.registry || []; start(); }).catch(() => { count.textContent = "Branch registry could not be loaded."; });
})();
