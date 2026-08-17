(() => {
  const input = document.querySelector("#collectionSearch");
  const sourcePicker = document.querySelector(".home-search-sources");
  const resultRoot = document.querySelector("#searchResults");
  const resultList = document.querySelector("#searchResultList");
  if (!input || !sourcePicker || !resultRoot || !resultList) return;

  const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const selectedSources = () => new Set([...sourcePicker.querySelectorAll('input[type="checkbox"]:checked')].map((control) => control.value));
  const memberIndex = window.WELSH_PEOPLE_BETA_INDEX;
  const memberRecords = memberIndex?.records || [];
  const collections = new Map((window.WELSH_RECORD_CATALOG?.collections || []).map((collection) => [collection.id, collection]));
  const memberCore = window.WELSH_PEOPLE_SEARCH_CORE;
  let requestNumber = 0;
  let debounceTimer = 0;

  function resultArticle(type, title, detail = "") {
    const article = document.createElement("article");
    article.className = "home-unified-result";
    article.innerHTML = `<span class="home-unified-result-type">${escapeHtml(type)}</span><strong>${escapeHtml(title)}</strong>${detail ? `<p>${escapeHtml(detail)}</p>` : ""}`;
    return article;
  }

  function appendActions(article, actions) {
    const row = document.createElement("div"); row.className = "home-unified-result-actions";
    actions.filter(Boolean).forEach((action) => row.append(action));
    if (row.children.length) article.append(row);
  }

  function actionLink(label, href, external = false) {
    const link = document.createElement("a"); link.textContent = label; link.href = href;
    if (external) { link.target = "_blank"; link.rel = "noopener noreferrer"; }
    return link;
  }

  function integratedPublicationTarget(record, query = "") {
    const title = normalize(record.title);
    let id = title.includes("call of zion") ? "call-of-zion"
      : title.includes("welsh mormon writings") ? "welsh-mormon-writings"
      : title.includes("casgliad o hymnau") ? "welsh-hymnal-1852"
      : title.includes("on trial in the welsh press") ? "on-trial-welsh-press" : "";
    if (!id && title.includes("zion s trumpet")) {
      if (title.includes("1856") || title.includes("1857")) id = "zions-trumpet-1856-1857";
      else for (const year of [1849, 1850, 1851, 1852, 1853, 1854, 1855]) if (title.includes(String(year))) { id = `zions-trumpet-${year}`; break; }
    }
    if (!id) return "";
    const page = Number(record.pageNumber) || Number(String(record.location || "").match(/(?:pdf\s*)?page\s*(\d+)/i)?.[1]) || 1;
    return `publication-viewer.html?id=${encodeURIComponent(id)}&page=${page}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
  }

  function renderArchive(query) {
    return (window.WELSH_ARCHIVE_SEARCH?.hits(query) || []).map((hit) => {
      const article = resultArticle("Archive resource", hit.name, hit.note);
      const button = document.createElement("button"); button.type = "button"; button.textContent = hit.type === "BRANCH" ? "Open Branch Resource" : "Open resource"; button.addEventListener("click", hit.action);
      appendActions(article, [button]); return article;
    });
  }

  function memberUrl(record) {
    const hasImage = record.verified && record.onlineViewerAvailable !== false && record.collectionId && ((Number.isInteger(record.imageSequence) && record.imageSequence > 0) || record.imageFilename);
    if (!hasImage) return `index.html?branch=${encodeURIComponent(record.branch)}`;
    return `index.html?${new URLSearchParams({ branch: record.branch, collection: record.collectionId, image: record.imageSequence ? String(record.imageSequence) : "", imageFilename: record.imageFilename || "", view: "single" })}`;
  }

  function renderMembers(query) {
    if (!memberCore) return [];
    return memberRecords.filter((record) => record.occurrenceType === "member" && memberCore.matches(record, query, collections.get(record.collectionId))).slice(0, 60).map((record) => {
      const facts = [record.branch, record.birthDate && `Birth ${record.birthDate}`, record.baptismDate && `Baptism ${record.baptismDate}`, record.residence && `Residence ${record.residence}`, record.entryNumber && `Entry ${record.entryNumber}`].filter(Boolean).join(" · ");
      const article = resultArticle("Member record", record.nameAsWritten, facts);
      appendActions(article, [actionLink(record.verified && record.onlineViewerAvailable !== false ? "Open source" : `${record.branch} resources`, memberUrl(record))]); return article;
    });
  }

  function discoveryArticle(record, personRecords, query) {
    if (record.sourceType === "welsh-saints") {
      const person = personRecords.get(String(record.sourceId).split(":").at(-1));
      const facts = person && window.WELSH_SAINTS_PERSON_DETAIL ? window.WELSH_SAINTS_PERSON_DETAIL.facts(person).map(({ label, value }) => `${label}: ${value}`).join(" · ") : record.snippet;
      const article = resultArticle("Welsh Saints Project", record.title, facts);
      const details = person ? document.createElement("button") : null;
      if (details) { details.type = "button"; details.textContent = "View details"; details.addEventListener("click", () => window.WELSH_SAINTS_PERSON_DETAIL.open(person, details)); }
      appendActions(article, [details, record.sourceUrl ? actionLink("View source", record.sourceUrl, true) : null]); return article;
    }
    const article = resultArticle(record.sourceType === "historical-publication" ? "Historical publication" : "Ronald D. Dennis Publication", record.title, [record.location, record.snippet].filter(Boolean).join(" · "));
    const integratedTarget = integratedPublicationTarget(record, query);
    const href = integratedTarget || record.viewerUrl || record.sourceUrl;
    appendActions(article, [href ? actionLink(integratedTarget || record.viewerUrl ? "Open publication" : "View source", href, Boolean(record.sourceUrl && !integratedTarget && !record.viewerUrl)) : null]); return article;
  }

  async function render() {
    const request = ++requestNumber;
    const query = input.value.trim();
    resultList.replaceChildren();
    if (!query) { resultRoot.hidden = true; return; }
    resultRoot.hidden = false;
    const sources = selectedSources();
    if (!sources.size) { resultList.innerHTML = '<p class="no-results">Select at least one source to search.</p>'; return; }
    resultList.innerHTML = '<p class="home-search-result-status">Searching selected sources…</p>';
    const items = [];
    if (sources.has("archive")) items.push(...renderArchive(query));
    if (sources.has("members")) items.push(...renderMembers(query));
    if (sources.has("welsh-saints") || sources.has("publications")) {
      try {
        const discovery = await window.ALL_RECORDS_DISCOVERY.search(query, 1000);
        if (request !== requestNumber) return;
        const selected = discovery.records.filter((record) => (sources.has("welsh-saints") && record.sourceType === "welsh-saints") || (sources.has("publications") && ["ron-dennis-publication", "translation", "historical-publication"].includes(record.sourceType) && integratedPublicationTarget(record)));
        const people = new Map();
        if (selected.some((record) => record.sourceType === "welsh-saints" && record.recordSubtype === "immigrant")) {
          const records = await window.WELSH_SAINTS_PERSON_DETAIL.loadRecords();
          if (request !== requestNumber) return;
          records.filter((record) => record.type === "immigrant").forEach((record) => people.set(String(record.sourceId), record));
        }
        items.push(...selected.slice(0, 60).map((record) => discoveryArticle(record, people, query)));
      } catch (error) {
        console.error(error); resultList.innerHTML = '<p class="no-results">The selected historical sources could not be searched.</p>'; return;
      }
    }
    if (request !== requestNumber) return;
    resultList.replaceChildren();
    const status = document.createElement("p"); status.className = "home-search-result-status"; status.textContent = `${items.length.toLocaleString()} result${items.length === 1 ? "" : "s"} shown from the selected sources.`; resultList.append(status);
    if (items.length) resultList.append(...items); else resultList.insertAdjacentHTML("beforeend", '<p class="no-results">No records matched this search in the selected sources.</p>');
  }

  function queueRender() { clearTimeout(debounceTimer); debounceTimer = setTimeout(render, 190); }
  input.addEventListener("input", (event) => { event.stopImmediatePropagation(); queueRender(); }, true);
  sourcePicker.addEventListener("change", queueRender);
})();
