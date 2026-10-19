(() => {
  const registry = window.WELSH_BRANCH_REGISTRY?.registry || [];
  const directory = document.querySelector("#directoryPanel");
  const branchList = document.querySelector("#branchList");
  let count = document.querySelector("#collectionCount");
  const top = directory?.querySelector(".presentation-directory-top");
  if (!registry.length || !directory || !branchList || !count || !top) return;

  const researchNotes = new Map([
    ["Aberdare", {
      established: "Historical sources establish an Aberdare branch.",
      context: "Expert review distinguishes an Aberdare district from separate English- and Welsh-language town branches in the 1850s.",
      unresolved: "Whether the current Aberdare entry combines those organizations remains unresolved; no split or new identity is asserted here.",
    }],
    ["Pembroke", {
      established: "A historical contribution list explicitly names Pembroke Branch.",
      context: "Expert review distinguishes Pembroke town from Pembroke Dock and nearby Monkton, and reports that Pembroke Dock was sometimes called Pater.",
      unresolved: "The relationships among Pembroke, Pembroke Dock, Pater, and Monkton still require source confirmation.",
    }],
  ]);

  const explicitOrganizations = [
    {
      id: "east-glamorgan-conference",
      name: "East Glamorgan Conference",
      type: "Conference",
      status: "established",
      years: "1853–1863",
      collections: 1,
      source: "Glamorgan East Conference minutes, 1853–1863 · LR 17616 21",
      evidence: "The public catalog explicitly identifies a Glamorgan East Conference source collection.",
    },
    {
      id: "west-glamorgan-conference",
      name: "West Glamorgan Conference",
      type: "Conference",
      status: "established",
      years: "1851–1870",
      collections: 1,
      source: "Western Glamorgan Conference Minutes, 1851–1870 · CD 41 · LR 17617 21",
      evidence: "The established Morriston record cites the enclosing Western Glamorgan Conference minutes and their source identifiers.",
    },
    {
      id: "welsh-district",
      name: "Welsh District",
      type: "District",
      status: "established",
      years: "1849–1854",
      collections: 1,
      source: "Welsh District general minutes, volume 1 · CD 60 · LR 10011 11",
      evidence: "The recovered source is explicitly titled as Welsh District general minutes and includes Wick, St Brides, Pile/Pike, and Abercenfig material.",
    },
    {
      id: "tredegar-district",
      name: "Tredegar District",
      type: "District",
      status: "established",
      years: "1879–1882",
      collections: 1,
      source: "Tredegar District confidential minutes, 1879–1882",
      evidence: "The public catalog explicitly identifies this source as a district-level record.",
    },
  ];

  const additionalCandidates = [
    { name: "Aberdare English", note: "Expert review identifies an English-language town branch in the 1850s; documentary confirmation is still required." },
    { name: "Aberdare Welsh", note: "Expert review identifies a Welsh-language town branch in the 1850s; documentary confirmation is still required." },
    { name: "Pembroke Dock", note: "Expert review distinguishes Pembroke Dock from Pembroke and reports Pater as a possible historical name; source confirmation is pending." },
    { name: "Monkton", note: "Expert review reports a nearby branch and purpose-built chapel; the cited documentation has not yet been recovered into the organization registry." },
    { name: "Kilha", note: "LR 129 7 contains the explicit historical heading “yn Nghangen Kilha.” The modern locality and any relationship to Cila, Cilâ, or Killay remain unresolved.", source: "Bryntroedgam/Bryn volume · CD 13 · LR 129 7 · register pages 9–11" },
  ];

  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const slug = (value) => normalize(value).replace(/[^a-z0-9]+/g, "-");
  const yearLabel = (item) => item?.earliestYear
    ? `${item.earliestYear}${item.latestYear && item.latestYear !== item.earliestYear ? `–${item.latestYear}` : ""}`
    : "";
  const relatedCount = (name) => window.WELSH_RELATED_COLLECTIONS ? window.WELSH_RELATED_COLLECTIONS(name).length : 0;

  const registryOrganizations = registry.map((item) => ({
    id: `registry-${slug(item.canonicalName)}`,
    name: item.canonicalName,
    type: item.entityType || "Branch",
    status: researchNotes.has(item.canonicalName) ? "research-note" : "established",
    years: yearLabel(item),
    collections: relatedCount(item.canonicalName),
    registry: true,
    note: researchNotes.get(item.canonicalName),
  }));

  const existingNames = new Set(registryOrganizations.map((item) => normalize(item.name)));
  const establishedOrganizations = [
    ...registryOrganizations,
    ...explicitOrganizations.filter((item) => !existingNames.has(normalize(item.name))),
  ];
  let candidates = [];
  let typeFilter = "all";
  let reviewOnly = false;

  top.innerHTML = `
    <div class="directory-heading"><h3>Organizations</h3><p id="collectionCount"></p></div>
    <div class="organization-filter-row" aria-label="Filter organizations">
      <div class="organization-type-filters" role="group" aria-label="Organization type">
        <button type="button" data-organization-type="all" aria-pressed="true">All</button>
        <button type="button" data-organization-type="branch" aria-pressed="false">Branches</button>
        <button type="button" data-organization-type="conference" aria-pressed="false">Conferences</button>
      </div>
      <button type="button" class="organization-review-filter" aria-pressed="false"><span aria-hidden="true">ⓘ</span> Under review</button>
      <div class="branch-export-top-slot"></div>
    </div>
    <p class="organization-filter-summary" id="organizationFilterSummary" aria-live="polite"></p>`;
  count = directory.querySelector("#collectionCount");

  const heading = directory.querySelector("h2");
  const description = directory.querySelector(".directory-scope");
  heading.textContent = "Branches & Conferences";
  description.textContent = "Browse Welsh Latter-day Saint branches, conferences, and related historical organizations.";
  branchList.setAttribute("aria-label", "Welsh Latter-day Saint branches, conferences, and related historical organizations");
  branchList.classList.add("organization-directory-list");

  function metadata(item) {
    const parts = [];
    if (item.years) parts.push(item.years);
    if (item.collections) parts.push(`${item.collections} collection${item.collections === 1 ? "" : "s"}`);
    return parts.join(" · ");
  }

  function hrefFor(item) {
    if (item.registry) return `index.html?branch=${encodeURIComponent(item.name)}`;
    return `index.html?organization=${encodeURIComponent(item.id)}`;
  }

  function card(item) {
    const link = document.createElement("a");
    link.className = `organization-card organization-${item.status}`;
    link.href = hrefFor(item);
    const statusText = item.status === "research-note" ? "Established · Research note" : item.status === "candidate" ? "Candidate · Under review" : item.type;
    const icon = item.status === "research-note" ? `<span class="organization-note-icon" aria-hidden="true">ⓘ</span><span class="visually-hidden"> Research note</span>` : "";
    link.innerHTML = `<span class="organization-card-heading"><strong>${item.name}</strong>${icon}<span class="organization-type">${statusText}</span></span>${metadata(item) ? `<small>${metadata(item)}</small>` : ""}${item.status === "candidate" ? `<span class="organization-status-note">${item.note || "Identity or organization status requires further evidence."}</span>` : ""}`;
    if (!item.registry) link.addEventListener("click", (event) => { event.preventDefault(); history.pushState({ organization: item.id }, "", link.href); showCustomDetail(item); });
    return link;
  }

  function activeItems() {
    const source = reviewOnly
      ? [...establishedOrganizations.filter((item) => item.status === "research-note"), ...candidates]
      : establishedOrganizations;
    return source.filter((item) => {
      if (typeFilter === "branch") return item.type === "Branch";
      if (typeFilter === "conference") return item.type === "Conference";
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  }

  function render() {
    const items = activeItems();
    branchList.replaceChildren(...items.map(card));
    const context = reviewOnly ? "under review" : typeFilter === "all" ? "established organizations" : `${typeFilter === "branch" ? "branches" : "conferences"}`;
    count.textContent = `${items.length} ${context}`;
    document.querySelector("#organizationFilterSummary").textContent = reviewOnly
      ? "Showing established organizations with research notes and candidates that are still under review."
      : "Showing established organizations. Candidate organizations remain in the Under review view.";
  }

  function setType(next) {
    typeFilter = next;
    directory.querySelectorAll("[data-organization-type]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.organizationType === next)));
    render();
  }

  directory.querySelectorAll("[data-organization-type]").forEach((button) => button.addEventListener("click", () => setType(button.dataset.organizationType)));
  directory.querySelector(".organization-review-filter").addEventListener("click", (event) => {
    reviewOnly = !reviewOnly;
    event.currentTarget.setAttribute("aria-pressed", String(reviewOnly));
    render();
  });

  function evidenceList(item) {
    if (item.note && typeof item.note === "object") return `<ul><li><strong>Historical source establishes:</strong> ${item.note.established}</li><li><strong>Research context:</strong> ${item.note.context}</li><li><strong>Still unresolved:</strong> ${item.note.unresolved}</li></ul>`;
    const source = item.source ? `<li><strong>Source evidence:</strong> ${item.source}</li>` : "";
    const evidence = item.evidence ? `<li><strong>Historical source establishes:</strong> ${item.evidence}</li>` : "";
    const note = item.note ? `<li><strong>Still under review:</strong> ${item.note}</li>` : "";
    return `<ul>${evidence}${source}${note}</ul>`;
  }

  function showCustomDetail(item) {
    document.querySelector("#homePanel").hidden = true;
    directory.hidden = true;
    document.querySelector("#recordViewer").hidden = true;
    const panel = document.querySelector("#resourcePanel");
    panel.hidden = false;
    document.querySelector("#branchResourceBreadcrumbs").hidden = false;
    document.querySelector("#branchBreadcrumbName").textContent = item.name;
    document.querySelector("#branchTitle").textContent = item.name;
    const years = document.querySelector("#branchHeadingYears");
    years.textContent = item.years || "";
    years.hidden = !item.years;
    document.querySelector("#branchHeadingDetails").hidden = true;
    document.querySelector("#branchMeta").hidden = true;
    document.querySelector("#resourceList").innerHTML = `<section class="branch-information organization-research-notes"><h3>${item.status === "candidate" ? "Research status" : "Sources and Evidence"}</h3><p><strong>Organization type:</strong> ${item.type}</p><p><strong>Status:</strong> ${item.status === "candidate" ? "Candidate / under review" : "Established"}</p>${evidenceList(item)}</section>`;
    document.title = `${item.name} — LDS Welsh Membership Records`;
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function injectResearchNote(name) {
    const note = researchNotes.get(name);
    if (!note) return;
    const information = document.querySelector("#resourceList .branch-information");
    if (!information || information.querySelector(".organization-research-notes")) return;
    const section = document.createElement("section");
    section.className = "branch-detail-expanded organization-research-notes";
    section.innerHTML = `<h3>Research notes</h3>${evidenceList({ note })}`;
    information.prepend(section);
  }

  const originalRouteBranch = window.WELSH_ROUTE_BRANCH;
  if (originalRouteBranch) window.WELSH_ROUTE_BRANCH = (name, push = true) => { originalRouteBranch(name, push); injectResearchNote(name); };

  function routePrototypeOrganization() {
    const parameters = new URLSearchParams(location.search);
    const id = parameters.get("organization");
    if (id) {
      const item = [...explicitOrganizations, ...candidates].find((candidate) => candidate.id === id);
      if (item) showCustomDetail(item);
      return;
    }
    const branch = parameters.get("branch");
    if (branch) injectResearchNote(branch);
    if (parameters.get("view") === "branches") {
      document.title = "Branches & Conferences — LDS Welsh Membership Records";
      render();
    }
  }

  window.addEventListener("popstate", routePrototypeOrganization);
  window.addEventListener("load", routePrototypeOrganization, { once: true });
  fetch("data/possible-branch-provenance.json")
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("Candidate data unavailable")))
    .then((data) => {
      const publicCandidates = (data.candidates || []).map((item) => ({
        id: `candidate-${slug(item.candidateName)}`,
        name: item.candidateName,
        type: "Branch",
        status: "candidate",
        note: item.status,
        source: (item.sources || []).map((source) => [source.title, source.yearVolume, source.pageLabel, source.evidenceType].filter(Boolean).join(" · ")).join("; ") || item.provenanceNote || "Source provenance still requires recovery.",
      }));
      const seen = new Set(publicCandidates.map((item) => normalize(item.name)));
      const reviewedCandidates = additionalCandidates.filter((item) => !seen.has(normalize(item.name))).map((item) => ({ ...item, id: `candidate-${slug(item.name)}`, type: "Branch", status: "candidate" }));
      candidates = [...publicCandidates, ...reviewedCandidates];
      render();
      routePrototypeOrganization();
    })
    .catch(() => { candidates = additionalCandidates.map((item) => ({ ...item, id: `candidate-${slug(item.name)}`, type: "Branch", status: "candidate" })); render(); routePrototypeOrganization(); });

  render();
  routePrototypeOrganization();
})();
