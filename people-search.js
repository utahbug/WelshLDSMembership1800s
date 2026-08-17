(() => {
  const app = document.querySelector("#peopleApp");
  const unavailable = document.querySelector("#peopleUnavailable");
  const loading = document.querySelector("#peopleLoading");
  const finishLoading = () => { if (loading) loading.hidden = true; };
  const betaIndex = window.WELSH_PEOPLE_BETA_INDEX;
  if (window.WELSH_RECORD_CATALOG?.edition === "public" && !betaIndex?.betaPublicIndex) { finishLoading(); unavailable.hidden = false; return; }
  if (betaIndex?.betaPublicIndex) { initialize(); return; }
  const privateScript = document.createElement("script");
  privateScript.src = "data/private/people-index.local.js";
  privateScript.addEventListener("error", () => { finishLoading(); unavailable.hidden = false; });
  privateScript.addEventListener("load", initialize);
  document.head.append(privateScript);

  function initialize() {
    const index = window.WELSH_PEOPLE_BETA_INDEX || window.WELSH_PEOPLE_PRIVATE_INDEX;
    if (!index?.privateLocalIndex && !index?.betaPublicIndex) { finishLoading(); unavailable.hidden = false; return; }
    app.hidden = false;
    const search = document.querySelector("#peopleSearch");
    const searchQuery = document.createElement("div");
    searchQuery.className = "people-search-query";
    search.before(searchQuery);
    searchQuery.append(search);
    const clearSearch = document.createElement("button");
    clearSearch.type = "button";
    clearSearch.className = "people-search-clear";
    clearSearch.setAttribute("aria-label", "Clear search");
    clearSearch.textContent = "Clear";
    clearSearch.hidden = true;
    searchQuery.append(clearSearch);
    const occurrenceTypes = [...document.querySelectorAll('input[name="peopleSearchScope"]')];
    const selectedScope = () => occurrenceTypes.find((control) => control.checked)?.value || "member";
    const branchFilter = document.querySelector("#peopleBranchFilter");
    const branchSummary = document.querySelector("#peopleBranchSummary");
    const branchChoices = document.querySelector("#peopleBranchChoices");
    const branchSelectAll = document.querySelector("#peopleBranchSelectAll");
    const branchClear = document.querySelector("#peopleBranchClear");
    const summary = document.querySelector("#peopleSummary");
    const resultSummary = document.querySelector("#peopleResultSummary");
    const results = document.querySelector("#peopleResults");
    const searchCore = window.WELSH_PEOPLE_SEARCH_CORE;
    if (!searchCore) { finishLoading(); unavailable.hidden = false; app.hidden = true; return; }
    const normalize = searchCore.normalize;
    const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
    const records = index.records || [];
    const collections = new Map((window.WELSH_RECORD_CATALOG?.collections || []).map((collection) => [collection.id, collection]));
    const branches = [...new Set(records.map((record) => record.branch).filter(Boolean))].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
    const branchCount = branches.length;
    const selectedBranches = new Set(branches);
    let searchStarted = false;
    let visibleLimit = 50;
    let historicalRequest = 0;
    const allRecordsEnabled = Boolean(window.ALL_RECORDS_DISCOVERY?.search);
    const fullSearchChoice = document.querySelector("[data-full-search-choice]");
    if (fullSearchChoice && !allRecordsEnabled) fullSearchChoice.remove();
    const requestedScope = new URLSearchParams(window.location.search).get("scope");
    if (requestedScope === "all-records" && allRecordsEnabled) {
      const requestedScopeControl = occurrenceTypes.find((control) => control.value === requestedScope);
      if (requestedScopeControl) requestedScopeControl.checked = true;
    }
    for (const branch of branches) {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox"; checkbox.value = branch; checkbox.checked = true;
      checkbox.addEventListener("change", () => { checkbox.checked ? selectedBranches.add(branch) : selectedBranches.delete(branch); searchStarted = true; visibleLimit = 50; updateBranchSummary(); render(); });
      label.append(checkbox, document.createTextNode(branch)); branchChoices.append(label);
    }
    function updateBranchSummary() {
      if (selectedBranches.size === branches.length) branchSummary.textContent = "All branches";
      else if (selectedBranches.size === 0) branchSummary.textContent = "No branches selected";
      else if (selectedBranches.size === 1) branchSummary.textContent = [...selectedBranches][0];
      else branchSummary.textContent = `${selectedBranches.size} branches selected`;
    }
    function setAllBranches(checked) {
      selectedBranches.clear();
      branchChoices.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => { checkbox.checked = checked; if (checked) selectedBranches.add(checkbox.value); });
      searchStarted = true; visibleLimit = 50; updateBranchSummary(); render();
    }
    branchSelectAll.addEventListener("click", () => setAllBranches(true));
    branchClear.addEventListener("click", () => setAllBranches(false));
    const exactSourceAvailable = (record) => record.verified
      && (record.onlineViewerAvailable !== false || (window.WELSH_LOCAL_DEVELOPMENT && record.collectionName === "Georgetown-production"))
      && record.collectionId
      && ((Number.isInteger(record.imageSequence) && record.imageSequence > 0) || record.imageFilename);
    const recordUrl = (record) => {
      if (exactSourceAvailable(record)) return `index.html?${new URLSearchParams({ branch: record.branch, collection: record.collectionId, image: record.imageSequence ? String(record.imageSequence) : "", imageFilename: record.imageFilename || "", view: "single" })}`;
      return `index.html?branch=${encodeURIComponent(record.branch)}`;
    };
    const historicalLabel = (record) => ({
      transcription: "Transcription",
      translation: "Translation",
      "welsh-saints": "Welsh Saints Project",
      "ron-dennis-publication": "Ron Dennis publication",
      "historical-publication": "Historical publication",
    })[record.sourceType] || "Historical record";
    const historicalDisplayText = (value) => String(value || "")
      .replace(/local research corpus/gi, "research collection")
      .replace(/local research copy/gi, "research-edition copy");
    const memberDisplayNote = (value) => {
      const note = String(value || "");
      if (!note) return "";
      if (/Production transcription/i.test(note)) return "Transcribed and verified against the source image.";
      return note.replace(/authoritative source image/gi, "source image").replace(/original image is authoritative/gi, "verified against the source image");
    };
    const renderWelshSaintsFacts = (record) => {
      const facts = window.WELSH_SAINTS_PERSON_DETAIL?.facts(record) || [];
      return facts.length ? `<dl class="welsh-saints-result-facts">${facts.map(({ label, value }) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>` : "";
    };
    const isSerializedWelshSaintsPersonSummary = (snippet, personRecord) => {
      if (!personRecord || !Array.isArray(personRecord.cells) || !personRecord.cells.length) return false;
      const serializedFields = normalize(personRecord.cells.filter(Boolean).join(" "));
      return Boolean(serializedFields) && normalize(snippet) === serializedFields;
    };
    const publicationViewerSearchLink = (value, query) => {
      if (!value || !query || !String(value).includes("publication-viewer.html")) return value;
      const url = new URL(value, location.href);
      url.searchParams.set("q", query);
      return `${url.pathname.split("/").pop()}${url.search}${url.hash}`;
    };
    const historicalArticle = (record, rawQuery = "", personRecord = null) => {
      const article = document.createElement("article"); article.className = "research-result people-result all-records-result";
      if (record.sourceType === "welsh-saints") article.classList.add("welsh-saints-result");
      const sourceLink = publicationViewerSearchLink(record.viewerUrl || record.sourceUrl, rawQuery);
      const branchContext = (record.branches || []).length ? `<p class="people-fact"><strong>Branch/place context:</strong> ${escapeHtml(record.branches.join("; "))}</p>` : "";
      const alternates = (record.alternateTitles || []).length ? `<p class="people-source-detail"><strong>Also known as:</strong> ${escapeHtml(record.alternateTitles.join("; "))}</p>` : "";
      const isWelshSaintsPerson = record.sourceType === "welsh-saints" && record.recordSubtype === "immigrant" && personRecord;
      const sourceActionLabel = record.sourceType === "historical-publication" ? "Open publication" : record.viewerUrl ? "Open source" : "View source";
      const sourceAction = sourceLink ? `<a class="people-source-link" href="${escapeHtml(sourceLink)}"${record.sourceType === "welsh-saints" ? ' target="_blank" rel="noopener noreferrer"' : ""}>${sourceActionLabel}<span class="people-source-link-icon" aria-hidden="true"></span></a>` : `<span class="people-source-status">Source text is searchable; the publication itself is not included.</span>`;
      const availability = isWelshSaintsPerson ? `<button type="button" class="people-source-link welsh-saints-view-details">View details</button>${sourceAction}` : sourceAction;
      const visibleMatchText = normalize([record.title, record.snippet, record.location, ...(record.branches || []), ...(record.alternateTitles || [])].join(" "));
      const queryWords = normalize(rawQuery).split(/\s+/).filter(Boolean);
      const matchedField = record.sourceType === "welsh-saints" && queryWords.length && !queryWords.every((word) => visibleMatchText.includes(word))
        ? `<p class="people-source-detail"><strong>Matched source material:</strong> ${escapeHtml(rawQuery)}</p>` : "";
      const summaryText = isWelshSaintsPerson && isSerializedWelshSaintsPersonSummary(record.snippet, personRecord)
        ? ""
        : `<p class="historical-result-summary">${escapeHtml(record.snippet)}</p>`;
      article.innerHTML = `<small>${escapeHtml(historicalLabel(record))}</small><h2>${isWelshSaintsPerson ? `<button type="button" class="welsh-saints-detail-trigger">${escapeHtml(record.title)}</button>` : escapeHtml(record.title)}</h2>${renderWelshSaintsFacts(personRecord)}${record.author ? `<p class="people-source-detail"><strong>Author:</strong> ${escapeHtml(record.author)}</p>` : ""}${record.versionStatus ? `<p class="people-source-detail"><strong>Version:</strong> ${escapeHtml(historicalDisplayText(record.versionStatus))}</p>` : ""}${alternates}${summaryText}${matchedField}<div class="people-key-facts"><p class="people-fact"><strong>Location:</strong> ${escapeHtml(record.location)}</p>${branchContext}</div><p class="people-source-detail"><strong>Source:</strong> ${escapeHtml(historicalDisplayText(record.provenance))}</p><p class="people-result-action">${availability}</p>`;
      if (isWelshSaintsPerson) article.dataset.welshSaintsSourceId = String(record.sourceId);
      return article;
    };
    async function renderAllRecords(rawQuery) {
      const request = ++historicalRequest;
      const memberMatches = records.filter((record) => selectedBranches.has(record.branch) && record.occurrenceType === "member" && searchCore.matches(record, rawQuery, collections.get(record.collectionId)));
      resultSummary.textContent = "Searching member and historical records...";
      results.replaceChildren();
      try {
        const historical = await window.ALL_RECORDS_DISCOVERY.search(rawQuery, 250);
        if (request !== historicalRequest || selectedScope() !== "all-records") return;
        const welshPersonRecords = new Map();
        if (historical.records.some((record) => record.sourceType === "welsh-saints" && record.recordSubtype === "immigrant")) {
          try {
            const fullRecords = await window.WELSH_SAINTS_PERSON_DETAIL.loadRecords();
            fullRecords.filter((record) => record.type === "immigrant").forEach((record) => welshPersonRecords.set(String(record.sourceId), record));
          } catch (error) {
            console.warn(error.message);
          }
        }
        if (request !== historicalRequest || selectedScope() !== "all-records") return;
        const memberItems = memberMatches.map((record) => ({ kind: "member", record }));
        const historicalItems = historical.records.map((record) => ({ kind: "historical", record }));
        const diverseHistorical = [];
        const usedTypes = new Set();
        for (const item of historicalItems) {
          if (!usedTypes.has(item.record.sourceType) && diverseHistorical.length < 4) {
            diverseHistorical.push(item); usedTypes.add(item.record.sourceType);
          }
        }
        const diverseIds = new Set(diverseHistorical.map((item) => item.record.id));
        const combined = memberItems.length
          ? [...memberItems.slice(0, 6), ...diverseHistorical, ...memberItems.slice(6), ...historicalItems.filter((item) => !diverseIds.has(item.record.id))]
          : historicalItems;
        const visible = combined.slice(0, visibleLimit);
        const makeMemberArticle = (record) => {
          // Reuse the existing member-only renderer by temporarily rendering the
          // exact occurrence through the same card construction below.
          return memberCard(record);
        };
        results.replaceChildren(...visible.map((item) => item.kind === "member" ? makeMemberArticle(item.record) : historicalArticle(item.record, rawQuery, welshPersonRecords.get(String(item.record.sourceId).split(":").at(-1)))));
        const total = memberMatches.length + historical.totalMatches;
        resultSummary.textContent = `${total.toLocaleString()} mixed-source result${total === 1 ? "" : "s"} found${historical.records.length < historical.totalMatches ? " (showing the highest-ranked historical matches)" : ""}`;
        if (combined.length > visible.length) {
          const more = document.createElement("button"); more.type = "button"; more.className = "people-show-more"; more.textContent = `Show more results (${(combined.length - visible.length).toLocaleString()} remaining)`;
          more.addEventListener("click", () => { visibleLimit += 50; render(); }); results.append(more);
        }
        summary.textContent = "";
      } catch (error) {
        if (request !== historicalRequest) return;
        resultSummary.textContent = "The local Full search prototype could not be loaded.";
        results.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
      }
    }
    function memberCard(record) {
        const article = document.createElement("article"); article.className = "research-result people-result";
        const collection = collections.get(record.collectionId);
        const aliases = Array.isArray(record.aliases) ? record.aliases.filter(Boolean) : [];
        const facts = [`<p class="people-fact people-branch-fact"><strong>Branch:</strong> ${escapeHtml(record.branch)}</p>`, record.birthDate ? `<p class="people-fact people-date-fact"><strong>Birth:</strong> ${escapeHtml(record.birthDate)}</p>` : "", record.baptismDate ? `<p class="people-fact people-date-fact"><strong>Baptism:</strong> ${escapeHtml(record.baptismDate)}</p>` : "", record.residence ? `<p class="people-fact"><strong>Residence:</strong> ${escapeHtml(record.residence)}</p>` : "", record.year || record.date ? `<p class="people-fact"><strong>Date:</strong> ${escapeHtml(record.year || record.date)}</p>` : "", record.entryNumber ? `<p class="people-fact"><strong>Entry:</strong> ${escapeHtml(record.entryNumber)}</p>` : "", aliases.length ? `<p class="people-fact"><strong>Also written:</strong> ${escapeHtml(aliases.join("; "))}</p>` : ""].filter(Boolean);
        const hasImage = exactSourceAvailable(record);
        const sourceCollection = record.collectionName || collection?.name || "";
        const sourceContext = sourceCollection;
        const availabilityTitle = !hasImage && index.betaPublicIndex && record.sourceAvailability === "local-portable-only" ? "Exact source image available in the portable/reviewer edition" : "";
        const displayNote = memberDisplayNote(record.notes);
        article.innerHTML = `<h2>${escapeHtml(record.nameAsWritten)}</h2><div class="people-key-facts">${facts.join("")}</div>${record.sourceBranchSpelling ? `<p class="people-source-detail"><strong>Source branch spelling:</strong> ${escapeHtml(record.sourceBranchSpelling)}</p>` : ""}${sourceContext ? `<p class="people-source-detail"><strong>Source:</strong> ${escapeHtml(sourceContext)}</p>` : ""}${displayNote ? `<p class="people-source-detail">${escapeHtml(displayNote)}</p>` : ""}<p class="people-result-action"><a class="people-source-link" href="${escapeHtml(recordUrl(record))}"${availabilityTitle ? ` title="${escapeHtml(availabilityTitle)}"` : ""}>${hasImage ? "Open source" : `${escapeHtml(record.branch)} resources`}<span class="people-source-link-icon" aria-hidden="true"></span></a></p>`;
        return article;
    }
    function render() {
      const rawQuery = search.value.trim();
      const scope = selectedScope();
      if (scope === "all-records") {
        if (!rawQuery || rawQuery === "*") { summary.textContent = ""; resultSummary.textContent = ""; results.replaceChildren(); return; }
        renderAllRecords(rawQuery); return;
      }
      historicalRequest += 1;
      const browseSelectedBranches = rawQuery === "" || rawQuery === "*";
      const query = browseSelectedBranches ? "" : normalize(rawQuery);
      summary.textContent = "";
      if (!searchStarted) { resultSummary.textContent = ""; results.replaceChildren(); return; }
      if (browseSelectedBranches && selectedBranches.size === 0) { resultSummary.textContent = "0 matches found"; results.innerHTML = "<p>Enter a person’s name or select one or more branches to browse their searchable member records.</p>"; return; }
      const matches = records.filter((record) => selectedBranches.has(record.branch)
        && record.occurrenceType === scope
        && searchCore.matches(record, query, collections.get(record.collectionId)));
      const branchScope = selectedBranches.size === branches.length ? "" : selectedBranches.size === 1 ? ` in ${[...selectedBranches][0]}` : ` in ${selectedBranches.size.toLocaleString()} branches`;
      const resultNoun = browseSelectedBranches && scope === "member" ? `member${matches.length === 1 ? "" : "s"}` : `match${matches.length === 1 ? "" : "es"}`;
      resultSummary.textContent = `${matches.length.toLocaleString()} ${resultNoun} found${branchScope}`;
      const visibleMatches = matches.slice(0, visibleLimit);
      results.replaceChildren(...visibleMatches.map(memberCard));
      if (matches.length > visibleMatches.length) {
        const more = document.createElement("button");
        more.type = "button"; more.className = "people-show-more";
        more.textContent = `Show more results (${(matches.length - visibleMatches.length).toLocaleString()} remaining)`;
        more.addEventListener("click", () => { visibleLimit += 50; render(); });
        results.append(more);
      }
      if (!matches.length) results.innerHTML = "<p>No member records matched this search.</p>";
    }
    document.addEventListener("click", (event) => { if (branchFilter.open && !branchFilter.contains(event.target)) branchFilter.open = false; });
    results.addEventListener("click", async (event) => {
      const trigger = event.target.closest(".welsh-saints-detail-trigger, .welsh-saints-view-details");
      if (!trigger || !results.contains(trigger)) return;
      const card = trigger.closest("[data-welsh-saints-source-id]");
      const record = await window.WELSH_SAINTS_PERSON_DETAIL.find(card?.dataset.welshSaintsSourceId);
      if (record) window.WELSH_SAINTS_PERSON_DETAIL.open(record, trigger);
    });
    const updateClearSearch = () => { clearSearch.hidden = !search.value; };
    search.addEventListener("input", () => { searchStarted = true; visibleLimit = 50; updateClearSearch(); render(); });
    clearSearch.addEventListener("click", () => { search.value = ""; searchStarted = false; visibleLimit = 50; updateClearSearch(); render(); search.focus(); });
    occurrenceTypes.forEach((control) => control.addEventListener("change", () => { searchStarted = true; visibleLimit = 50; render(); }));
    updateBranchSummary(); updateClearSearch(); render(); finishLoading();
    requestAnimationFrame(() => {
      if (search.value || (document.activeElement && document.activeElement !== document.body)) return;
      if (matchMedia("(pointer: fine)").matches && innerWidth > 760) search.focus({ preventScroll: true });
      else {
        search.classList.add("initial-search-emphasis");
        const clearInitialEmphasis = () => search.classList.remove("initial-search-emphasis");
        document.addEventListener("pointerdown", clearInitialEmphasis, { once: true, capture: true });
        document.addEventListener("keydown", clearInitialEmphasis, { once: true, capture: true });
      }
    });
  }
})();
