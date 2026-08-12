(() => {
  const index = window.WELSH_SAINTS_BETA_INDEX || window.WELSH_SAINTS_PRIVATE_INDEX;
  const typedIndex = window.TYPED_BRANCH_RECORD_PRIVATE_INDEX;
  const app = document.querySelector("#researchApp");
  const unavailable = document.querySelector("#researchUnavailable");
  if (!index?.privateLocalIndex && !index?.betaPublicIndex && !typedIndex?.privateLocalIndex) { unavailable.hidden = false; return; }
  app.hidden = false;
  const search = document.querySelector("#researchSearch");
  const type = document.querySelector("#researchType");
  const summary = document.querySelector("#researchSummary");
  const results = document.querySelector("#researchResults");
  const help = document.querySelector("#researchSearchHelp");
  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en");
  const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const saintsRecords = index?.records || [];
  const typedRecords = typedIndex?.records || [];
  if (!typedRecords.length) type.querySelector('option[value="typed-branch-record-extract"]')?.remove();
  const allRecords = [...saintsRecords, ...typedRecords];
  const updatedAt = [index?.generatedAt, typedIndex?.generatedAt].filter(Boolean).sort().at(-1);
  if (index?.betaPublicIndex && help) help.textContent = "Discovery results identify Welsh Saints Project records and link to the original source; complete source text remains at the Welsh Saints Project.";

  function render() {
    const query = normalize(search.value.trim());
    if (!query) {
      summary.textContent = index?.betaPublicIndex ? `Research beta index contains ${saintsRecords.length.toLocaleString()} Welsh Saints Project discovery records · updated ${new Date(updatedAt).toLocaleDateString()}` : `Local index contains ${allRecords.length.toLocaleString()} searchable records (${saintsRecords.length.toLocaleString()} Welsh Saints records and ${typedRecords.length.toLocaleString()} typed PDF pages) · updated ${new Date(updatedAt).toLocaleDateString()}`;
      results.innerHTML = "<p>Enter a name, place, branch, voyage, or resource title.</p>";
      return;
    }
    const words = query.split(/\s+/).filter(Boolean);
    const matches = allRecords.filter((record) => (!type.value || record.type === type.value) && words.every((word) => normalize([
      record.title, record.summary, record.detailText, record.searchTerms, record.text, record.cells?.join(" "), record.categories?.join(" "),
      record.matchedBranches?.join(" "), record.associatedBranches?.join(" "), record.sourceCds?.join(" "),
      record.lrNumbers?.join(" "), record.sourceFile, record.sourceId,
    ].join(" ")).includes(word))).slice(0, 250);
    summary.textContent = `${matches.length}${matches.length === 250 ? "+" : ""} result${matches.length === 1 ? "" : "s"} · ${index?.betaPublicIndex ? "research beta" : "local"} index contains ${allRecords.length.toLocaleString()} searchable records · updated ${new Date(updatedAt).toLocaleDateString()}`;
    results.replaceChildren(...matches.map((record) => {
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
      const branchLinks = (record.matchedBranches || []).map((name) => `<a href="index.html?branch=${encodeURIComponent(name)}">${escapeHtml(name)} Branch Resources</a>`).join(" · ");
      item.innerHTML = `<small>Welsh Saints Project · ${escapeHtml(kinds.join(" · "))}</small><h2><a href="${record.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(record.title)}</a></h2><p>${escapeHtml(record.summary)}</p><p class="research-source">Welsh Saints source ID ${record.sourceId} · <a href="${record.url}" target="_blank" rel="noopener noreferrer">View original at Welsh Saints Project &#8599;</a>${branchLinks ? ` · ${branchLinks}` : ""}</p>`;
      return item;
    }));
    if (!matches.length) results.innerHTML = "<p>No indexed records matched this search.</p>";
  }
  search.addEventListener("input", render); type.addEventListener("change", render); render();
})();
