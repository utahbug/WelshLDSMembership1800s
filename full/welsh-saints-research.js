(() => {
  const index = window.WELSH_SAINTS_BETA_INDEX || window.WELSH_SAINTS_PRIVATE_INDEX;
  const typedIndex = window.TYPED_BRANCH_RECORD_PRIVATE_INDEX;
  const app = document.querySelector("#researchApp");
  const unavailable = document.querySelector("#researchUnavailable");
  if (!index?.privateLocalIndex && !index?.betaPublicIndex && !typedIndex?.privateLocalIndex) { unavailable.hidden = false; return; }
  app.hidden = false;
  const search = document.querySelector("#researchSearch");
  const searchQuery = document.createElement("div");
  searchQuery.className = "people-search-query welsh-saints-search-query";
  search.before(searchQuery);
  searchQuery.append(search);
  const clearSearch = document.createElement("button");
  clearSearch.type = "button";
  clearSearch.className = "people-search-clear";
  clearSearch.setAttribute("aria-label", "Clear search");
  clearSearch.textContent = "Clear";
  clearSearch.hidden = true;
  searchQuery.append(clearSearch);
  const type = document.querySelector("#researchType");
  const summary = document.querySelector("#researchSummary");
  const results = document.querySelector("#researchResults");
  const help = document.querySelector("#researchSearchHelp");
  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, "").replace(/[^a-z0-9]+/gi, " ").trim().toLocaleLowerCase("en");
  const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const saintsRecords = index?.records || [];
  const typedRecords = typedIndex?.records || [];
  if (!typedRecords.length) type.querySelector('option[value="typed-branch-record-extract"]')?.remove();
  const allRecords = [...saintsRecords, ...typedRecords];
  const updatedAt = [index?.generatedAt, typedIndex?.generatedAt].filter(Boolean).sort().at(-1);
  if (index?.betaPublicIndex && help) help.textContent = "Discovery results identify Welsh Saints Project records and link to the original source; complete source text remains at the Welsh Saints Project.";
  const canonicalBranchLink = (name) => name === "Abertawe" ? "Swansea" : name;

  function parseQuery(value) {
    const raw = String(value || "");
    const phrases = [...raw.matchAll(/["“”]([^"“”]+)["“”]/g)].map((match) => normalize(match[1])).filter(Boolean);
    const plain = normalize(raw.replace(/["“”]/g, " "));
    return { phrase: phrases[0] || plain, quoted: phrases.length > 0, words: plain.split(/\s+/).filter(Boolean) };
  }

  function matchEvidence(record, phrase, words) {
    const visible = normalize(`${record.title || ""} ${record.summary || ""}`);
    if ((phrase && visible.includes(phrase)) || words.every((word) => visible.includes(word))) return "";
    const source = String(record.matchEvidence || record.searchTerms || record.detailText || record.text || "").replace(/\s+/g, " ").trim();
    const sourceWords = source.split(" "), normalizedWords = sourceWords.map(normalize), phraseWords = phrase.split(" ");
    let index = normalizedWords.findIndex((_, position) => normalize(sourceWords.slice(position, position + phraseWords.length).join(" ")).includes(phrase));
    if (index < 0) index = normalizedWords.findIndex((word) => words.some((queryWord) => word.includes(queryWord)));
    if (index < 0) return "";
    const start = Math.max(0, index - 7), end = Math.min(sourceWords.length, index + Math.max(phraseWords.length, 1) + 9);
    return `${start ? "…" : ""}${sourceWords.slice(start, end).join(" ")}${end < sourceWords.length ? "…" : ""}`;
  }

  function findMatches(value) {
    const { phrase, quoted, words } = parseQuery(value);
    return allRecords.map((record, order) => {
      if (type.value && record.type !== type.value) return null;
      const title = normalize(record.title), summaryText = normalize(record.summary);
      const titleParts = String(record.title || "").split(",").map(normalize).filter(Boolean);
      const naturalTitle = titleParts.length === 2 ? `${titleParts[1]} ${titleParts[0]}` : title;
      const prominent = normalize([record.title, record.summary, record.cells?.join(" "), record.categories?.join(" "), record.matchedBranches?.join(" ")].join(" "));
      const hidden = normalize([record.matchEvidence, record.searchTerms, record.detailText, record.text, record.associatedBranches?.join(" "), record.sourceCds?.join(" "), record.lrNumbers?.join(" "), record.sourceFile, record.sourceId].join(" "));
      const haystack = `${prominent} ${hidden}`;
      if (quoted ? !(haystack.includes(phrase) || naturalTitle === phrase) : !words.every((word) => haystack.includes(word))) return null;
      let score = title === phrase || naturalTitle === phrase ? 1200 : title.includes(phrase) || naturalTitle.includes(phrase) ? 900 : prominent.includes(phrase) ? 650 : summaryText.includes(phrase) ? 500 : hidden.includes(phrase) ? 300 : 0;
      score += words.filter((word) => title.includes(word)).length * 70 + words.filter((word) => prominent.includes(word)).length * 25;
      return { record, score, order };
    }).filter(Boolean).sort((a, b) => b.score - a.score || a.order - b.order).slice(0, 250)
      .map((match) => ({ ...match, evidence: matchEvidence(match.record, phrase, words) }));
  }

  function render() {
    const query = search.value.trim();
    if (!query) {
      summary.textContent = index?.betaPublicIndex ? `${saintsRecords.length.toLocaleString()} searchable Welsh Saints Project records · updated ${new Date(updatedAt).toLocaleDateString()}` : `${allRecords.length.toLocaleString()} searchable records (${saintsRecords.length.toLocaleString()} Welsh Saints records and ${typedRecords.length.toLocaleString()} typed transcript pages) · updated ${new Date(updatedAt).toLocaleDateString()}`;
      results.replaceChildren();
      return;
    }
    const ranked = findMatches(query);
    const matches = ranked.map(({ record }) => record);
    summary.textContent = `${matches.length}${matches.length === 250 ? "+" : ""} result${matches.length === 1 ? "" : "s"} · ${allRecords.length.toLocaleString()} searchable Welsh Saints Project records · updated ${new Date(updatedAt).toLocaleDateString()}`;
    results.replaceChildren(...ranked.map(({ record, evidence }) => {
      const item = document.createElement("article"); item.className = "research-result";
      if (record.type === "typed-branch-record-extract") {
        item.classList.add("typed-record-result");
        const metadata = [record.resultType, ...(record.associatedBranches || []).map((name) => `Branch: ${name}`), ...(record.sourceCds || []).map((cd) => `CD ${cd}`), ...(record.lrNumbers || [])];
        const displayUrl = record.viewerUrl || record.url;
        const displayLabel = record.viewerUrl ? "Open viewer page" : "Open local PDF page";
        item.innerHTML = `<small>Welsh Branch Record Extract${metadata.length ? ` · ${escapeHtml(metadata.join(" · "))}` : ""}</small><h2><a href="${escapeHtml(displayUrl)}">${escapeHtml(record.title)}</a></h2><p>${escapeHtml(record.summary)}</p><p class="research-source">${escapeHtml(record.sourceFile)} · PDF page ${record.pdfPage} · <a href="${escapeHtml(displayUrl)}">${displayLabel}</a> · <a href="${escapeHtml(record.url)}" target="_blank" rel="noopener noreferrer">Original PDF</a></p>`;
        return item;
      }
      item.classList.add("welsh-saints-result");
      const kinds = [record.type.toUpperCase(), ...(record.categories || []), ...(record.matchedBranches || []).map((name) => `Branch match: ${name}`)];
      const linkedBranches = [...new Set((record.matchedBranches || []).map(canonicalBranchLink))];
      const branchLinks = linkedBranches.map((name) => `<a href="index.html?branch=${encodeURIComponent(name)}">${escapeHtml(name)} Branch Resources</a>`).join(" · ");
      item.innerHTML = `<small>Welsh Saints Project · ${escapeHtml(kinds.join(" · "))}</small><h2>${escapeHtml(record.title)}</h2><p>${escapeHtml(record.summary)}</p>${evidence ? `<p class="research-match-evidence"><strong>Matched source text:</strong> ${escapeHtml(evidence)}</p>` : ""}<p class="research-source">Welsh Saints source ID ${record.sourceId} · <a class="welsh-saints-original-link" href="${record.url}" target="_blank" rel="noopener noreferrer">Original at Welsh Saints Project &#8599;</a>${branchLinks ? ` · ${branchLinks}` : ""}</p>`;
      return item;
    }));
    if (!matches.length) results.innerHTML = "<p>No records matched this search.</p>";
  }
  const updateClearSearch = () => { clearSearch.hidden = !search.value; };
  let pendingRender = 0;
  const scheduleRender = () => {
    clearTimeout(pendingRender);
    pendingRender = setTimeout(render, 200);
  };
  search.addEventListener("input", () => { updateClearSearch(); scheduleRender(); });
  clearSearch.addEventListener("click", () => { clearTimeout(pendingRender); search.value = ""; updateClearSearch(); render(); search.focus(); });
  type.addEventListener("change", () => { clearTimeout(pendingRender); render(); }); updateClearSearch(); render();
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
})();
