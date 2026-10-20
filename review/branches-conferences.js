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
    ["Brecon", {
      established: "A historical source identifies a former president of Brecon Branch.",
      context: "Expert review recalls a possible meeting-place reference to the Woolpack, but the exact passage has not yet been located.",
      unresolved: "The Woolpack detail remains unverified and is not used as evidence for the branch identity.",
    }],
    ["Cefn Mawr", {
      established: "A historical periodical explicitly names Cefn Mawr Branch.",
      context: "Expert review places the locality in Flintshire.",
      unresolved: "The locality context still needs to be checked against the branch source before it is attached as a formal relationship.",
    }],
    ["Llantrisant", {
      established: "Llantrisant is retained as an established branch in the project registry.",
      context: "Expert review confirms the Glamorgan locality but supplies no additional organizational evidence.",
      unresolved: "No further branch detail from this review has been independently confirmed.",
    }],
    ["Mountain Ash", {
      established: "Mountain Ash is retained as an established branch in the project registry.",
      context: "Expert review recalls one Latter-day Saint reference and separately notes a nineteenth-century Reorganized Church presence.",
      unresolved: "The Latter-day Saint citation and the distinct RLDS evidence must be kept separate and still require source checking.",
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
      sourceHref: "index.html?collection=collection-36&image=1&view=facing",
      evidence: "The public catalog explicitly identifies a Glamorgan East Conference source collection.",
    },
    {
      id: "west-glamorgan-conference",
      name: "West Glamorgan Conference",
      type: "Conference",
      status: "established",
      years: "1851–1870",
      collections: 1,
      source: "Western Glamorgan Conference Minutes, 1851–1870 · CD 41 · LR 17617 11",
      sourceHref: "publication-viewer.html?collection=typed-viewer-ddc42515ba3dc458&title=Western%20Glamorgan%20Conference%2C%201851%E2%80%931870&type=Transcription%20or%20Translation&page=85",
      evidence: "The surviving historical transcript identifies the Western Glamorganshire Conference minute book and preserves a partial extract from its cover through manuscript page 7.",
    },
    {
      id: "welsh-district",
      name: "Welsh District",
      type: "District",
      status: "established",
      years: "1849–1854",
      collections: 1,
      source: "Welsh District general minutes, volume 1 · CD 60 · LR 10011 11",
      sourceHref: "index.html?collection=typed-viewer-240a15d95d2e9fa2&image=1&view=facing",
      evidence: "The recovered source is explicitly titled as Welsh District general minutes and includes Wick, St Brides, Pile/Pike, and Abercenfig material.",
    },
    {
      id: "tredegar-district",
      name: "Tredegar District",
      type: "District",
      status: "established",
      years: "1879–1882",
      collections: 1,
      source: "Tredegar District confidential minutes, 1879–1882 · LR 12404 10",
      sourceHref: "index.html?collection=collection-54&image=1&view=facing",
      evidence: "The public catalog explicitly identifies this source as a district-level record.",
    },
  ];

  const additionalCandidates = [
    { name: "Aberdare English", note: "Expert review identifies an English-language town branch in the 1850s; documentary confirmation is still required." },
    { name: "Aberdare Welsh", note: "Expert review identifies a Welsh-language town branch in the 1850s; documentary confirmation is still required." },
    { name: "Pembroke Dock", note: "Expert review distinguishes Pembroke Dock from Pembroke and reports Pater as a possible historical name; source confirmation is pending." },
    { name: "Pater", note: "Expert review reports Pater as a possible historical name for Pembroke Dock; the exact source wording and relationship remain unverified." },
    { name: "Monkton", note: "Expert review reports a nearby branch and purpose-built chapel; the cited documentation has not yet been recovered into the organization registry." },
    { name: "Milford Haven / Johnston", note: "Expert review describes a later organizational succession involving Pembroke Dock, Milford Haven, and a Johnston meeting place; this falls outside the current nineteenth-century registry and requires verification." },
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
    link.innerHTML = `<span class="organization-card-heading"><strong>${item.name}</strong>${icon}<span class="organization-type">${statusText}</span></span>${metadata(item) ? `<small>${metadata(item)}</small>` : ""}`;
    if (!item.registry) link.addEventListener("click", (event) => { event.preventDefault(); history.pushState({ organization: item.id }, "", link.href); showCustomDetail(item); });
    return link;
  }

  function filtered(items) {
    return items.filter((item) => {
      if (typeFilter === "branch") return item.type === "Branch";
      if (typeFilter === "conference") return item.type === "Conference" || item.type === "District";
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  }

  function reviewGroup(id, title, description, items) {
    const section = document.createElement("section");
    section.className = "organization-review-group";
    section.setAttribute("aria-labelledby", id);
    const heading = document.createElement("h3");
    heading.id = id;
    heading.textContent = title;
    const context = document.createElement("p");
    context.className = "organization-review-group-description";
    context.textContent = description;
    const grid = document.createElement("div");
    grid.className = "organization-review-grid";
    grid.replaceChildren(...items.map(card));
    section.append(heading, context, grid);
    return section;
  }

  function render() {
    const establishedNotes = filtered(establishedOrganizations.filter((item) => item.status === "research-note"));
    const candidateItems = filtered(candidates);
    const items = reviewOnly ? [...establishedNotes, ...candidateItems] : filtered(establishedOrganizations);
    if (reviewOnly) {
      const groups = [];
      if (establishedNotes.length) groups.push(reviewGroup("establishedResearchHeading", "Established with research notes", "Established organizations whose interpretation or relationships still need careful source review.", establishedNotes));
      if (candidateItems.length) groups.push(reviewGroup("candidateResearchHeading", "Candidates / identification under review", "Names and possible organizations that have not been added to the established registry.", candidateItems));
      if (!groups.length) {
        const empty = document.createElement("p");
        empty.className = "organization-review-empty";
        empty.textContent = "No organizations under review match this type filter.";
        groups.push(empty);
      }
      branchList.replaceChildren(...groups);
    } else {
      branchList.replaceChildren(...items.map(card));
    }
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
    if (item.note && typeof item.note === "object") return `<dl class="organization-research-definition"><dt>Historical evidence</dt><dd>${item.note.established}</dd><dt>Research context</dt><dd>${item.note.context}</dd><dt>Still unresolved</dt><dd>${item.note.unresolved}</dd></dl>`;
    const source = item.source ? `<dt>Historical evidence</dt><dd>${item.source}${item.sourceHref ? ` · <a href="${item.sourceHref}">View source</a>` : ""}</dd>` : "";
    const evidence = item.evidence ? `<dt>Research context</dt><dd>${item.evidence}</dd>` : "";
    const note = item.note ? `<dt>Still unresolved</dt><dd>${item.note}</dd>` : "";
    return `<dl class="organization-research-definition">${source}${evidence}${note}</dl>`;
  }

  const researchPilotFiles = new Map([
    ["east-glamorgan-conference", "data/east-glamorgan-research-pilot.json"],
    ["west-glamorgan-conference", "data/west-glamorgan-research-pilot.json"],
  ]);
  const researchPilots = new Map([...researchPilotFiles].map(([id, path]) => [
    id,
    fetch(path).then((response) => response.ok ? response.json() : Promise.reject(new Error(`${id} research data unavailable`))),
  ]));

  function appendText(element, label, value) {
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;
    element.append(term, description);
  }

  function actionLink(label, href) {
    const link = document.createElement("a");
    link.href = href;
    link.textContent = label;
    return link;
  }

  function occurrenceItem(occurrence) {
    const item = document.createElement("li");
    item.className = "organization-person-occurrence";
    const heading = document.createElement("p");
    heading.className = "organization-occurrence-date";
    heading.textContent = occurrence.date || "Date not recorded";
    const context = document.createElement("p");
    context.textContent = occurrence.context;
    const sourceForm = document.createElement("p");
    sourceForm.className = "organization-source-form";
    sourceForm.textContent = `Name as written: ${occurrence.nameAsWritten}`;
    const location = document.createElement("p");
    location.className = "organization-occurrence-location";
    const locations = [`Transcript PDF p. ${occurrence.transcriptPage}`];
    if (occurrence.manuscriptPage) locations.push(`manuscript p. ${occurrence.manuscriptPage}`);
    if (occurrence.frame) locations.push(`frame ${occurrence.frame}`);
    location.textContent = locations.join(" · ");
    const actions = document.createElement("p");
    actions.className = "organization-occurrence-actions";
    actions.append(actionLink("View transcript", occurrence.transcriptHref));
    if (occurrence.originalHref) {
      actions.append(document.createTextNode(" · "), actionLink("View original", occurrence.originalHref));
    }
    item.append(heading, context, sourceForm, location, actions);
    return item;
  }

  function personDisclosure(person) {
    const details = document.createElement("details");
    details.className = "organization-person";
    const summary = document.createElement("summary");
    const name = document.createElement("span");
    name.textContent = person.name;
    const count = document.createElement("span");
    count.className = "organization-person-count";
    count.textContent = `${person.occurrences.length} occurrence${person.occurrences.length === 1 ? "" : "s"}`;
    summary.append(name, count);
    const occurrences = document.createElement("ol");
    occurrences.className = "organization-occurrence-list";
    occurrences.replaceChildren(...person.occurrences.map(occurrenceItem));
    details.append(summary, occurrences);
    details.dataset.searchName = normalize(`${person.name} ${person.searchName || ""} ${person.occurrences.map((occurrence) => occurrence.nameAsWritten).join(" ")}`);
    return details;
  }

  function peopleSection(data) {
    const section = document.createElement("section");
    section.className = "branch-information organization-people-section";
    const heading = document.createElement("h3");
    heading.textContent = `People mentioned in these records (${data.people.length})`;
    const explanation = document.createElement("p");
    explanation.className = "organization-section-intro";
    explanation.textContent = "A source-name occurrence index for this pilot. Appearance in the minutes does not establish conference or branch membership.";
    const label = document.createElement("label");
    label.htmlFor = "organizationPeopleFilter";
    label.textContent = "Search names";
    const input = document.createElement("input");
    input.id = "organizationPeopleFilter";
    input.type = "search";
    input.placeholder = "Search names…";
    input.autocomplete = "off";
    const status = document.createElement("p");
    status.className = "organization-people-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    const list = document.createElement("div");
    list.className = "organization-people-list";
    const disclosures = data.people.map(personDisclosure);
    list.replaceChildren(...disclosures);
    const update = () => {
      const query = normalize(input.value);
      let visible = 0;
      disclosures.forEach((details) => {
        const match = !query || details.dataset.searchName.includes(query);
        details.hidden = !match;
        if (match) visible += 1;
      });
      status.textContent = query ? `${visible} of ${disclosures.length} people shown.` : `${disclosures.length} people in this pilot index.`;
    };
    input.addEventListener("input", update);
    section.append(heading, explanation, label, input, status, list);
    update();
    return section;
  }

  function transcriptionsSection(data) {
    const section = document.createElement("section");
    section.className = "branch-information organization-transcriptions-section";
    const heading = document.createElement("h3");
    heading.textContent = "Transcriptions & translations";
    section.append(heading);
    data.transcriptions.forEach((record) => {
      const article = document.createElement("article");
      article.className = "organization-transcription-card";
      const title = document.createElement("h4");
      title.textContent = record.title;
      const metadata = document.createElement("p");
      metadata.className = "organization-transcription-metadata";
      metadata.textContent = `${record.years} · ${record.language} · ${record.provenance}`;
      const actions = document.createElement("p");
      actions.className = "organization-transcription-actions";
      actions.append(actionLink("View transcript", record.viewTranscript));
      if (record.viewOriginal) actions.append(document.createTextNode(" · "), actionLink("View original", record.viewOriginal));
      article.append(title, metadata, actions);
      section.append(article);
    });
    return section;
  }

  function renderOrganizationResearchPilot(item, data) {
    const list = document.querySelector("#resourceList");
    const sources = document.createElement("section");
    sources.className = "branch-information organization-source-information";
    const sourcesHeading = document.createElement("h3");
    sourcesHeading.textContent = "Sources and information";
    const definition = document.createElement("dl");
    definition.className = "organization-research-definition";
    appendText(definition, "Organization type", item.type);
    appendText(definition, "Status", "Established");
    appendText(definition, "Historical source", `${data.source.title} · ${data.source.cd} · ${data.source.callNumber}`);
    if (data.source.coverage) appendText(definition, "Transcript coverage", data.source.coverage);
    const sourceActions = document.createElement("p");
    sourceActions.className = "organization-source-actions";
    if (data.source.viewOriginal) sourceActions.append(actionLink("View original source", data.source.viewOriginal));
    else sourceActions.textContent = data.source.originalAvailability || "Original source images are not currently available in the public viewer.";
    sources.append(sourcesHeading, definition, sourceActions);

    const notes = document.createElement("section");
    notes.className = "branch-information organization-research-notes";
    notes.innerHTML = `<h3>Research notes</h3><p>${item.evidence}</p><p>${data.researchNote || "This bounded Review pilot preserves source-name occurrences and does not infer membership or merge people with similarly named records."}</p>`;
    list.replaceChildren(sources, peopleSection(data), transcriptionsSection(data), notes);
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
    const resourceList = document.querySelector("#resourceList");
    resourceList.innerHTML = `<section class="branch-information organization-research-notes"><h3>Research notes</h3><p><strong>Organization type:</strong> ${item.type}</p><p><strong>Status:</strong> ${item.status === "candidate" ? "Candidate · Under review" : "Established"}</p>${evidenceList(item)}</section>`;
    const researchPilot = researchPilots.get(item.id);
    if (researchPilot) {
      resourceList.innerHTML = `<section class="branch-information organization-pilot-loading" role="status"><h3>${item.name} research pilot</h3><p>Loading transcript and people index…</p></section>`;
      researchPilot
        .then((data) => renderOrganizationResearchPilot(item, data))
        .catch(() => {
          resourceList.innerHTML = `<section class="branch-information organization-research-notes"><h3>Research notes</h3><p>The Review research pilot could not be loaded. The source remains available through <a href="${item.sourceHref}">View source</a>.</p>${evidenceList(item)}</section>`;
        });
    }
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
