(() => {
  const app = document.querySelector("#peopleApp");
  const unavailable = document.querySelector("#peopleUnavailable");
  if (window.WELSH_RECORD_CATALOG?.edition === "public") { unavailable.hidden = false; return; }
  const privateScript = document.createElement("script");
  privateScript.src = "data/private/people-index.local.js";
  privateScript.addEventListener("error", () => { unavailable.hidden = false; });
  privateScript.addEventListener("load", initialize);
  document.head.append(privateScript);

  function initialize() {
    const index = window.WELSH_PEOPLE_PRIVATE_INDEX;
    if (!index?.privateLocalIndex) { unavailable.hidden = false; return; }
    app.hidden = false;
    const search = document.querySelector("#peopleSearch");
    const summary = document.querySelector("#peopleSummary");
    const results = document.querySelector("#peopleResults");
    const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, " ").trim();
    const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
    const records = index.records || [];
    const branchCount = new Set(records.map((record) => record.branch)).size;
    const recordUrl = (record) => {
      if (Number.isInteger(record.imageSequence) && record.imageSequence > 0) return `index.html?${new URLSearchParams({ branch: record.branch, collection: record.collectionId || "", image: String(record.imageSequence), view: "single" })}`;
      return `index.html?branch=${encodeURIComponent(record.branch)}`;
    };
    function render() {
      const query = normalize(search.value);
      summary.textContent = `Private index contains ${records.length.toLocaleString()} occurrence${records.length === 1 ? "" : "s"} across ${branchCount.toLocaleString()} indexed branch${branchCount === 1 ? "" : "es"}.`;
      if (!query) { results.innerHTML = "<p>Enter a person’s name to search every indexed branch.</p>"; return; }
      const words = query.split(/\s+/).filter(Boolean);
      const matches = records.filter((record) => words.every((word) => normalize([record.nameAsWritten, record.normalizedName, ...(record.aliases || [])].join(" ")).includes(word)));
      results.replaceChildren(...matches.map((record) => {
        const article = document.createElement("article"); article.className = "research-result people-result";
        const facts = [`<strong>Branch:</strong> ${escapeHtml(record.branch)}`, record.baptismDate ? `<strong>Baptism:</strong> ${escapeHtml(record.baptismDate)}` : "", record.residence ? `<strong>Residence:</strong> ${escapeHtml(record.residence)}` : "", record.year || record.date ? `<strong>Date:</strong> ${escapeHtml(record.year || record.date)}` : "", record.entryNumber ? `<strong>Entry:</strong> ${escapeHtml(record.entryNumber)}` : ""].filter(Boolean);
        const hasImage = Number.isInteger(record.imageSequence) && record.imageSequence > 0;
        article.innerHTML = `<small>Membership name-index occurrence${record.verified ? " · verified" : " · needs image verification"}</small><h2>${escapeHtml(record.nameAsWritten)}</h2><p>${facts.join("<br>")}</p>${record.sourceBranchAsWritten ? `<p><strong>Source branch spelling:</strong> ${escapeHtml(record.sourceBranchAsWritten)}</p>` : ""}${record.notes ? `<p>${escapeHtml(record.notes)}</p>` : ""}<p><a class="people-open-record" href="${escapeHtml(recordUrl(record))}">${hasImage ? "Open record" : `Open ${escapeHtml(record.branch)} resources`}</a>${hasImage ? "" : '<span class="people-image-pending"> Exact image not yet linked.</span>'}</p>`;
        return article;
      }));
      if (!matches.length) results.innerHTML = "<p>No indexed membership-name occurrences matched this search.</p>";
    }
    search.addEventListener("input", render); render();
  }
})();
