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
  const detailDialog = document.querySelector("#welshSaintsDetail");
  const detailTitle = document.querySelector("#welshSaintsDetailTitle");
  const detailBody = document.querySelector("#welshSaintsDetailBody");
  const detailActions = document.querySelector("#welshSaintsDetailActions");
  const detailClose = detailDialog?.querySelector(".welsh-saints-detail-close");
  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, "").replace(/[^a-z0-9]+/gi, " ").trim().toLocaleLowerCase("en");
  const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const saintsRecords = index?.records || [];
  const typedRecords = typedIndex?.records || [];
  if (!typedRecords.length) type.querySelector('option[value="typed-branch-record-extract"]')?.remove();
  const allRecords = [...saintsRecords, ...typedRecords];
  const updatedAt = [index?.generatedAt, typedIndex?.generatedAt].filter(Boolean).sort().at(-1);
  if (index?.betaPublicIndex && help) help.textContent = "Discovery results identify Welsh Saints Project records and link to the original source; complete source text remains at the Welsh Saints Project.";
  const canonicalBranchLink = (name) => name === "Abertawe" ? "Swansea" : name;
  let detailReturnTarget = null;
  let detailReturnScrollY = 0;
  const detailSectionNames = ["Spouses and Children", "Census Records", "Migration", "Resources"];
  const detailFieldLabels = ["Given Name", "Surname", "Maiden Name", "Gender", "Birth date", "Birth place", "Christening date", "Christening place", "Baptism date", "Baptism place", "Confirmation date", "Confirmation place", "Marriage date", "Marriage place", "Death date", "Death place", "Burial date", "Burial place", "Father", "Mother"];

  function cleanDetailText(value) {
    const decoder = document.createElement("textarea");
    decoder.innerHTML = String(value || "").replace(/&nbsp;?/gi, " ");
    return decoder.value.replace(/\s+/g, " ").replace(/^View On FamilySearch\s*/i, "").trim();
  }

  function splitDetailSections(value) {
    const text = cleanDetailText(value);
    const sections = [];
    const markers = detailSectionNames.map((name) => ({ name, index: text.indexOf(name) })).filter((item) => item.index >= 0).sort((a, b) => a.index - b.index);
    const vitalEnd = markers[0]?.index ?? text.length;
    const vital = text.slice(0, vitalEnd).replace(/^Vital Information\s*(?:Close)?\s*/i, "").trim();
    markers.forEach((marker, index) => {
      const end = markers[index + 1]?.index ?? text.length;
      const content = text.slice(marker.index + marker.name.length, end).replace(/^\s*(?:Open|Close)\s*/i, "").trim();
      if (content) sections.push({ heading: marker.name, content });
    });
    return { vital, sections };
  }

  function parseVitalFields(value) {
    const found = detailFieldLabels.map((label) => ({ label, marker: `${label}:`, index: value.indexOf(`${label}:`) })).filter((item) => item.index >= 0).sort((a, b) => a.index - b.index);
    return found.map((item, index) => {
      const end = found[index + 1]?.index ?? value.length;
      const fieldValue = value.slice(item.index + item.marker.length, end).replace(/\bView Sources\b/gi, " Source: ").replace(/\s+/g, " ").trim();
      return { label: item.label, value: fieldValue };
    }).filter((item) => item.value);
  }

  function publicPersonFields(record) {
    const cells = record.cells || [];
    const fields = [];
    if (cells[1]) fields.push({ label: "Birth", value: cells[1] });
    if (cells[2]) fields.push({ label: "Death", value: cells[2] });
    if (cells.length > 4 && cells[3]) fields.push({ label: "Baptism", value: cells[3] });
    const place = cells.length > 3 ? cells.at(-1) : "";
    fields.push(...personPlaceFields(record, place));
    return fields;
  }

  function documentedPlaceVariants(record, place) {
    const rows = window.WELSH_HISTORICAL_NAMES?.rows || [];
    const acceptedRelationships = new Set(["Historical spelling", "Known alias", "Alternate spelling"]);
    const placeKey = normalize(place);
    return [...new Set((record.matchedBranches || []).flatMap((branch) => {
      const branchRows = rows.filter((row) => row.canonicalName === branch);
      const identifiesPlace = [branch, ...branchRows.map((row) => row.name)]
        .some((name) => name && placeKey.includes(normalize(name.replace(/\s+Branch$/i, ""))));
      return identifiesPlace ? branchRows.filter((row) => acceptedRelationships.has(row.relationship)).map((row) => row.name) : [];
    }))]
      .filter((name) => name && !/[()]|\bBranch$/i.test(name));
  }

  function personPlaceFields(record, place) {
    if (!place) return [];
    const labelled = place.match(/^English Spelling:\s*(.*?)\s+Welsh Spelling:\s*(.*)$/i);
    const fields = labelled
      ? [{ label: "Birth place — English spelling", value: labelled[1] }, { label: "Birth place — Welsh spelling", value: labelled[2] }]
      : [{ label: "Birth place", value: place }];
    const variants = documentedPlaceVariants(record, place).filter((variant) => !normalize(place).includes(normalize(variant)));
    if (variants.length) fields.push({ label: "Also written as", value: variants.join("; ") });
    return fields;
  }

  function personResultFacts(record) {
    if (record.type !== "immigrant") return [];
    if (window.WELSH_SAINTS_PERSON_DETAIL?.facts) return window.WELSH_SAINTS_PERSON_DETAIL.facts(record);
    const cells = record.cells || [];
    const facts = [];
    const birthDate = cells[1] || "";
    const birthPlace = cells.length > 3 ? cells.at(-1) : "";
    if (birthDate || birthPlace) facts.push({ label: "Birth", value: [birthDate, birthPlace].filter(Boolean).join(" · ") });
    if (cells.length > 4 && cells[3]) facts.push({ label: "Baptism", value: cells[3] });
    if (record.matchedBranches?.length) facts.push({ label: "Branch/place", value: record.matchedBranches.join("; ") });
    return facts;
  }

  function renderPersonResultFacts(record) {
    const facts = personResultFacts(record);
    if (!facts.length) return "";
    return `<dl class="welsh-saints-result-facts">${facts.map(({ label, value }) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`;
  }

  function closePersonDetail() { if (detailDialog?.open) detailDialog.close(); }

  function openPersonDetail(record, trigger) {
    if (window.WELSH_SAINTS_PERSON_DETAIL) {
      window.WELSH_SAINTS_PERSON_DETAIL.open(record, trigger);
      return;
    }
    if (!detailDialog) return;
    detailReturnTarget = trigger;
    detailReturnScrollY = window.scrollY;
    const { vital, sections } = splitDetailSections(record.detailText);
    const fields = record.detailText ? parseVitalFields(vital) : publicPersonFields(record);
    detailTitle.textContent = record.title || "Welsh Saints person record";
    detailBody.replaceChildren();
    if (fields.length) {
      const list = document.createElement("dl"); list.className = "welsh-saints-detail-fields";
      fields.forEach(({ label, value }) => { const term = document.createElement("dt"); const description = document.createElement("dd"); term.textContent = label; description.textContent = value; list.append(term, description); });
      detailBody.append(list);
    } else if (record.summary) { const paragraph = document.createElement("p"); paragraph.textContent = record.summary; detailBody.append(paragraph); }
    sections.forEach(({ heading, content }) => { const section = document.createElement("section"); const h3 = document.createElement("h3"); const paragraph = document.createElement("p"); h3.textContent = heading; paragraph.textContent = content; section.append(h3, paragraph); detailBody.append(section); });
    if (record.matchedBranches?.length) { const section = document.createElement("section"); const h3 = document.createElement("h3"); const paragraph = document.createElement("p"); h3.textContent = "Branch and place context"; paragraph.textContent = record.matchedBranches.join("; "); section.append(h3, paragraph); detailBody.append(section); }
    detailActions.replaceChildren();
    const attribution = document.createElement("p"); attribution.textContent = `Welsh Saints Project source ID ${record.sourceId}`; detailActions.append(attribution);
    if (record.url) { const source = document.createElement("a"); source.className = "welsh-saints-original-link"; source.href = record.url; source.target = "_blank"; source.rel = "noopener noreferrer"; source.textContent = "Open original Welsh Saints record"; detailActions.append(source); }
    detailDialog.showModal();
    detailClose.focus({ preventScroll: true });
  }

  detailClose?.addEventListener("click", closePersonDetail);
  detailDialog?.addEventListener("click", (event) => { if (event.target === detailDialog) closePersonDetail(); });
  detailDialog?.addEventListener("close", () => {
    const returnTarget = detailReturnTarget;
    const returnScrollY = detailReturnScrollY;
    detailReturnTarget = null;
    requestAnimationFrame(() => {
      window.scrollTo({ top: returnScrollY, left: 0, behavior: "instant" });
      returnTarget?.focus({ preventScroll: true });
    });
  });

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
      const personFields = record.type === "immigrant" ? normalize([record.title, ...(record.cells || []), ...Object.values(record.personDetails || {}), ...(record.matchedBranches || [])].join(" ")) : "";
      const haystack = `${prominent} ${hidden}`;
      if (quoted ? !(haystack.includes(phrase) || naturalTitle === phrase) : !words.every((word) => haystack.includes(word))) return null;
      let score = title === phrase || naturalTitle === phrase ? 1200 : title.includes(phrase) || naturalTitle.includes(phrase) ? 900 : prominent.includes(phrase) ? 650 : summaryText.includes(phrase) ? 500 : hidden.includes(phrase) ? 300 : 0;
      score += words.filter((word) => title.includes(word)).length * 70 + words.filter((word) => prominent.includes(word)).length * 25;
      if (personFields && words.every((word) => personFields.includes(word))) score += 450;
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
      const detailAvailable = record.type === "immigrant";
      item.innerHTML = `<small>Welsh Saints Project · ${escapeHtml(kinds.join(" · "))}</small><h2>${detailAvailable ? `<button type="button" class="welsh-saints-detail-trigger" aria-label="Open details for ${escapeHtml(record.title)}">${escapeHtml(record.title)}</button>` : escapeHtml(record.title)}</h2>${renderPersonResultFacts(record)}<p>${escapeHtml(record.summary)}</p>${evidence ? `<p class="research-match-evidence"><strong>Matched source text:</strong> ${escapeHtml(evidence)}</p>` : ""}<p class="research-source">Welsh Saints source ID ${record.sourceId} · <a class="welsh-saints-original-link" href="${record.url}" target="_blank" rel="noopener noreferrer">Open original Welsh Saints record &#8599;</a>${branchLinks ? ` · ${branchLinks}` : ""}</p>`;
      if (detailAvailable) item.dataset.personDetailSourceId = String(record.sourceId);
      return item;
    }));
    if (!matches.length) results.innerHTML = "<p>No records matched this search.</p>";
  }

  results.addEventListener("click", (event) => {
    const trigger = event.target.closest(".welsh-saints-detail-trigger");
    if (!trigger || !results.contains(trigger)) return;
    const card = trigger.closest("[data-person-detail-source-id]");
    const record = saintsRecords.find((item) => String(item.sourceId) === card?.dataset.personDetailSourceId);
    if (record) openPersonDetail(record, trigger);
  });
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
