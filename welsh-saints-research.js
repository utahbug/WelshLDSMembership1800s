(() => {
  const index = window.WELSH_SAINTS_PRIVATE_INDEX;
  const app = document.querySelector("#researchApp");
  const unavailable = document.querySelector("#researchUnavailable");
  if (!index?.privateLocalIndex) { unavailable.hidden = false; return; }
  app.hidden = false;
  const search = document.querySelector("#researchSearch");
  const type = document.querySelector("#researchType");
  const summary = document.querySelector("#researchSummary");
  const results = document.querySelector("#researchResults");
  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en");
  const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  function render() {
    const query = normalize(search.value.trim());
    const words = query.split(/\s+/).filter(Boolean);
    const matches = index.records.filter((record) => (!type.value || record.type === type.value) && words.every((word) => normalize([record.title, record.summary, record.cells?.join(" "), record.categories?.join(" "), record.matchedBranches?.join(" "), record.sourceId].join(" ")).includes(word))).slice(0, 250);
    summary.textContent = `${matches.length}${matches.length === 250 ? "+" : ""} result${matches.length === 1 ? "" : "s"} · local index contains ${index.counts.total.toLocaleString()} public-listing records · updated ${new Date(index.generatedAt).toLocaleDateString()}`;
    results.replaceChildren(...matches.map((record) => {
      const item = document.createElement("article"); item.className = "research-result";
      const kinds = [record.type.toUpperCase(), ...(record.categories || []), ...(record.matchedBranches || []).map((name) => `Branch match: ${name}`)];
      item.innerHTML = `<small>${escapeHtml(kinds.join(" · "))}</small><h2><a href="${record.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(record.title)}</a></h2><p>${escapeHtml(record.summary)}</p><p class="research-source">Welsh Saints source ID ${record.sourceId} · <a href="${record.url}" target="_blank" rel="noopener noreferrer">Open original record</a></p>`;
      return item;
    }));
    if (!matches.length) results.innerHTML = "<p>No indexed Welsh Saints records matched this search.</p>";
  }
  search.addEventListener("input", render); type.addEventListener("change", render); render();
})();
