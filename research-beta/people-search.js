(() => {
  const app = document.querySelector("#peopleApp");
  const unavailable = document.querySelector("#peopleUnavailable");
  const loading = document.querySelector("#peopleLoading");
  const finishLoading = () => { if (loading) loading.hidden = true; };
  const betaIndex = window.WELSH_PEOPLE_BETA_INDEX;
  if (window.WELSH_RECORD_CATALOG?.edition === "public" && !betaIndex?.betaPublicIndex) { finishLoading(); unavailable.hidden = false; return; }
  if (betaIndex?.betaPublicIndex) { initialize(); return; }
  unavailable.hidden = false; return;

  function initialize() {
    const index = window.WELSH_PEOPLE_BETA_INDEX || window.WELSH_PEOPLE_PRIVATE_INDEX;
    if (!index?.privateLocalIndex && !index?.betaPublicIndex) { finishLoading(); unavailable.hidden = false; return; }
    app.hidden = false;
    const search = document.querySelector("#peopleSearch");
    const occurrenceType = document.querySelector("#peopleOccurrenceType");
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
    const associatedCount = records.filter((record) => record.occurrenceType === "associated").length;
    if (!associatedCount) occurrenceType.querySelector('option[value="associated"]')?.remove();
    const branches = [...new Set(records.map((record) => record.branch).filter(Boolean))].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
    const branchCount = branches.length;
    const selectedBranches = new Set(branches);
    let searchStarted = false;
    let visibleLimit = 50;
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
    const recordUrl = (record) => {
      if (record.verified && record.onlineViewerAvailable !== false && record.collectionId && ((Number.isInteger(record.imageSequence) && record.imageSequence > 0) || record.imageFilename)) return `index.html?${new URLSearchParams({ branch: record.branch, collection: record.collectionId, image: record.imageSequence ? String(record.imageSequence) : "", imageFilename: record.imageFilename || "", view: "single" })}`;
      return `index.html?branch=${encodeURIComponent(record.branch)}`;
    };
    function render() {
      const rawQuery = search.value.trim();
      const browseSelectedBranches = rawQuery === "" || rawQuery === "*";
      const query = browseSelectedBranches ? "" : normalize(rawQuery);
      summary.textContent = `Member Search contains ${records.length.toLocaleString()} occurrence${records.length === 1 ? "" : "s"} across ${branchCount.toLocaleString()} searchable branch${branchCount === 1 ? "" : "es"}.`;
      if (!searchStarted) { resultSummary.textContent = ""; results.replaceChildren(); return; }
      if (browseSelectedBranches && selectedBranches.size === 0) { resultSummary.textContent = "0 matches found"; results.innerHTML = "<p>Enter a person’s name or select one or more branches to browse their searchable member records.</p>"; return; }
      const matches = records.filter((record) => selectedBranches.has(record.branch)
        && (!occurrenceType.value || record.occurrenceType === occurrenceType.value)
        && searchCore.matches(record, query, collections.get(record.collectionId)));
      const branchScope = selectedBranches.size === branches.length ? "" : selectedBranches.size === 1 ? ` in ${[...selectedBranches][0]}` : ` in ${selectedBranches.size.toLocaleString()} branches`;
      const resultNoun = browseSelectedBranches && occurrenceType.value === "member" ? `member${matches.length === 1 ? "" : "s"}` : browseSelectedBranches && occurrenceType.value === "associated" ? "associated people" : `match${matches.length === 1 ? "" : "es"}`;
      resultSummary.textContent = `${matches.length.toLocaleString()} ${resultNoun} found${branchScope}`;
      const visibleMatches = matches.slice(0, visibleLimit);
      results.replaceChildren(...visibleMatches.map((record) => {
        const article = document.createElement("article"); article.className = "research-result people-result";
        const collection = collections.get(record.collectionId);
        const aliases = Array.isArray(record.aliases) ? record.aliases.filter(Boolean) : [];
        const facts = [`<p class="people-fact people-branch-fact"><strong>Branch:</strong> ${escapeHtml(record.branch)}</p>`, record.birthDate ? `<p class="people-fact people-date-fact"><strong>Birth:</strong> ${escapeHtml(record.birthDate)}</p>` : "", record.baptismDate ? `<p class="people-fact people-date-fact"><strong>Baptism:</strong> ${escapeHtml(record.baptismDate)}</p>` : "", record.residence ? `<p class="people-fact"><strong>Residence:</strong> ${escapeHtml(record.residence)}</p>` : "", record.year || record.date ? `<p class="people-fact"><strong>Date:</strong> ${escapeHtml(record.year || record.date)}</p>` : "", record.entryNumber ? `<p class="people-fact"><strong>Entry:</strong> ${escapeHtml(record.entryNumber)}</p>` : "", aliases.length ? `<p class="people-fact"><strong>Also written:</strong> ${escapeHtml(aliases.join("; "))}</p>` : ""].filter(Boolean);
        const hasImage = record.verified && record.onlineViewerAvailable !== false && record.collectionId && ((Number.isInteger(record.imageSequence) && record.imageSequence > 0) || record.imageFilename);
        const sourceCollection = record.collectionName || collection?.name || "";
        const sourceContext = [sourceCollection, record.imageFilename].filter(Boolean).join(" · ");
        const availabilityTitle = !hasImage && index.betaPublicIndex && record.sourceAvailability === "local-portable-only" ? "Exact source image available in the portable/reviewer edition" : "";
        article.innerHTML = `<small>${record.occurrenceType === "associated" ? "Associated person" : "Member record"}${record.verified ? " · verified" : " · needs image verification"}</small><h2>${escapeHtml(record.nameAsWritten)}</h2><div class="people-key-facts">${facts.join("")}</div>${record.sourceBranchSpelling ? `<p class="people-source-detail"><strong>Source branch spelling:</strong> ${escapeHtml(record.sourceBranchSpelling)}</p>` : ""}${sourceContext ? `<p class="people-source-detail"><strong>Source:</strong> ${escapeHtml(sourceContext)}</p>` : ""}${record.notes ? `<p class="people-source-detail">${escapeHtml(record.notes)}</p>` : ""}<p class="people-result-action"><a class="people-source-link" href="${escapeHtml(recordUrl(record))}"${availabilityTitle ? ` title="${escapeHtml(availabilityTitle)}"` : ""}>${hasImage ? "Open source record" : `${escapeHtml(record.branch)} resources`}</a></p>`;
        return article;
      }));
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
    search.addEventListener("input", () => { searchStarted = true; visibleLimit = 50; render(); });
    occurrenceType.addEventListener("change", () => { searchStarted = true; visibleLimit = 50; render(); });
    updateBranchSummary(); render(); finishLoading();
  }
})();
