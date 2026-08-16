const catalogRoot = document.querySelector("#publicationCatalog");
const collectionSearch = {
  root: document.querySelector("#publicationCollectionSearch"),
  scope: document.querySelector("#publicationCollectionScope"),
  form: document.querySelector("#publicationCollectionSearchForm"),
  source: document.querySelector("#publicationCollectionSearchSource"),
  sourceSummary: document.querySelector("#publicationCollectionSearchSourceSummary"),
  sourceChoices: document.querySelector("#publicationCollectionSearchChoices"),
  sourceSelectAll: document.querySelector("#publicationCollectionSearchSelectAll"),
  sourceClear: document.querySelector("#publicationCollectionSearchClear"),
  input: document.querySelector("#publicationCollectionSearchInput"),
  status: document.querySelector("#publicationCollectionSearchStatus"),
  toggle: document.querySelector("#publicationCollectionSearchToggle"),
  message: document.querySelector("#publicationCollectionSearchMessage"),
  results: document.querySelector("#publicationCollectionSearchResults"),
};
let catalogData;
let integratedSearchPages;
const selectedPublicationScopes = new Set(["all"]);

const normalizeSearchText = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ").trim();
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));

function matchExcerpt(text, normalizedQuery) {
  const normalizedText = normalizeSearchText(text);
  const position = normalizedText.indexOf(normalizedQuery);
  if (position < 0) return String(text).slice(0, 220);
  const start = Math.max(0, position - 85);
  const end = Math.min(String(text).length, position + normalizedQuery.length + 135);
  return `${start ? "…" : ""}${String(text).slice(start, end).trim()}${end < String(text).length ? "…" : ""}`;
}

async function loadIntegratedSearchPages() {
  if (integratedSearchPages) return integratedSearchPages;
  const ids = catalogData.collectionSearch.integratedPublicationIds;
  const publications = ids.map((id) => catalogData.publications.find((item) => item.id === id));
  if (publications.some((item) => !item?.searchable || !item.searchableTextSource)) throw new Error("The integrated-publication search configuration is incomplete.");
  const indexes = await Promise.all(publications.map(async (publication) => {
    const response = await fetch(publication.searchableTextSource);
    if (!response.ok) throw new Error(`Publication search index returned ${response.status}`);
    const index = await response.json();
    if (index.publicationId !== publication.id) throw new Error("Publication search index identity mismatch.");
    return index.pages.map((page) => ({ publication, pageNumber: page.pageNumber, text: page.text, normalized: normalizeSearchText(page.text) }));
  }));
  integratedSearchPages = indexes.flat();
  return integratedSearchPages;
}

function populateIntegratedPublicationChoices() {
  const addChoice = (value, labelText, checked = false) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = value;
    checkbox.checked = checked;
    checkbox.addEventListener("change", () => updateSelectedPublicationScopes(checkbox));
    const text = document.createElement("span");
    text.textContent = labelText;
    label.append(checkbox, text);
    collectionSearch.sourceChoices.append(label);
  };
  addChoice("all", "All publications", true);
  const sets = catalogData.collectionSearch.publicationSets || [];
  if (sets.length) {
    sets.forEach((set) => {
      addChoice(`set:${set.id}`, set.label);
    });
  }
  catalogData.collectionSearch.integratedPublicationIds.forEach((id) => {
    const publication = catalogData.publications.find((item) => item.id === id);
    addChoice(`publication:${id}`, publication.title);
  });
}

function selectedIntegratedPublicationIds() {
  if (selectedPublicationScopes.has("all")) return [...catalogData.collectionSearch.integratedPublicationIds];
  const ids = new Set();
  selectedPublicationScopes.forEach((value) => {
    if (value.startsWith("set:")) {
      const set = catalogData.collectionSearch.publicationSets?.find((item) => item.id === value.slice(4));
      (set?.publicationIds || []).forEach((id) => ids.add(id));
    } else if (value.startsWith("publication:")) {
      const id = value.slice(12);
      if (catalogData.collectionSearch.integratedPublicationIds.includes(id)) ids.add(id);
    }
  });
  return [...catalogData.collectionSearch.integratedPublicationIds].filter((id) => ids.has(id));
}

function updatePublicationScopeSummary() {
  if (selectedPublicationScopes.has("all")) {
    collectionSearch.sourceSummary.textContent = "All publications";
    return;
  }
  const ids = selectedIntegratedPublicationIds();
  if (!ids.length) collectionSearch.sourceSummary.textContent = "No publications selected";
  else if (selectedPublicationScopes.size === 1) {
    const value = [...selectedPublicationScopes][0];
    if (value.startsWith("set:")) collectionSearch.sourceSummary.textContent = catalogData.collectionSearch.publicationSets.find((item) => item.id === value.slice(4))?.label || `${ids.length} publications selected`;
    else collectionSearch.sourceSummary.textContent = catalogData.publications.find((item) => item.id === value.slice(12))?.title || `${ids.length} publications selected`;
  } else collectionSearch.sourceSummary.textContent = `${ids.length} publications selected`;
}

function rerunPublicationSearchForScopeChange() {
  if (collectionSearch.input.value.trim()) searchIntegratedPublications();
}

function updateSelectedPublicationScopes(changedCheckbox) {
  const value = changedCheckbox.value;
  if (value === "all" && changedCheckbox.checked) {
    selectedPublicationScopes.clear();
    selectedPublicationScopes.add("all");
    collectionSearch.sourceChoices.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => { checkbox.checked = checkbox === changedCheckbox; });
  } else {
    selectedPublicationScopes.delete("all");
    const allCheckbox = collectionSearch.sourceChoices.querySelector('input[value="all"]');
    if (allCheckbox) allCheckbox.checked = false;
    if (changedCheckbox.checked) selectedPublicationScopes.add(value);
    else selectedPublicationScopes.delete(value);
  }
  updatePublicationScopeSummary();
  rerunPublicationSearchForScopeChange();
}

function setAllPublicationScopes() {
  selectedPublicationScopes.clear();
  selectedPublicationScopes.add("all");
  collectionSearch.sourceChoices.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => { checkbox.checked = checkbox.value === "all"; });
  updatePublicationScopeSummary();
  rerunPublicationSearchForScopeChange();
}

function clearPublicationScopes() {
  selectedPublicationScopes.clear();
  collectionSearch.sourceChoices.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => { checkbox.checked = false; });
  updatePublicationScopeSummary();
  rerunPublicationSearchForScopeChange();
}

async function searchIntegratedPublications(event) {
  event?.preventDefault();
  const query = collectionSearch.input.value.trim();
  collectionSearch.results.replaceChildren();
  collectionSearch.results.hidden = true;
  collectionSearch.toggle.hidden = true;
  collectionSearch.toggle.setAttribute("aria-expanded", "true");
  collectionSearch.status.textContent = "";
  collectionSearch.message.textContent = "";
  if (!query) return;
  const selectedIds = selectedIntegratedPublicationIds();
  if (!selectedIds.length) {
    collectionSearch.message.textContent = "Select at least one publication to search.";
    return;
  }
  collectionSearch.message.textContent = `Searching ${selectedIds.length === 1 ? "the selected publication" : `${selectedIds.length} publications`}…`;
  try {
    const normalizedQuery = normalizeSearchText(query);
    const pages = await loadIntegratedSearchPages();
    const selectedIdSet = new Set(selectedIds);
    const matches = pages.filter((page) => selectedIdSet.has(page.publication.id) && page.normalized.includes(normalizedQuery));
    const publicationCount = new Set(matches.map((match) => match.publication.id)).size;
    const summary = `${matches.length} matching page${matches.length === 1 ? "" : "s"} across ${publicationCount} publication${publicationCount === 1 ? "" : "s"}.`;
    collectionSearch.message.textContent = "";
    if (!matches.length) { collectionSearch.message.textContent = summary; return; }
    collectionSearch.status.textContent = summary;
    collectionSearch.toggle.hidden = false;
    const groups = selectedIds
      .map((id) => matches.filter((match) => match.publication.id === id))
      .filter((group) => group.length);
    const visibleMatches = [];
    for (let row = 0; visibleMatches.length < 200 && groups.some((group) => row < group.length); row += 1) {
      for (const group of groups) {
        if (group[row]) visibleMatches.push(group[row]);
        if (visibleMatches.length === 200) break;
      }
    }
    const fragment = document.createDocumentFragment();
    visibleMatches.forEach((match) => {
      const link = document.createElement("a");
      link.className = "publication-collection-result";
      link.href = `publication-viewer.html?id=${encodeURIComponent(match.publication.id)}&page=${match.pageNumber}#book-search`;
      link.innerHTML = `<strong>${escapeHtml(match.publication.title)}</strong><span>Page ${match.pageNumber}</span><span>${escapeHtml(matchExcerpt(match.text, normalizedQuery))}</span>`;
      fragment.append(link);
    });
    collectionSearch.results.append(fragment);
    collectionSearch.results.hidden = false;
  } catch (error) {
    console.error(error);
    collectionSearch.message.textContent = "The integrated-publication search could not be loaded.";
  }
}

function toggleIntegratedSearchResults() {
  if (collectionSearch.toggle.hidden || !collectionSearch.results.childElementCount) return;
  const expanded = collectionSearch.toggle.getAttribute("aria-expanded") === "true";
  collectionSearch.toggle.setAttribute("aria-expanded", String(!expanded));
  collectionSearch.results.hidden = expanded;
}

function metadata(publication) {
  const parts = [];
  if (publication.publicationInfo) parts.push(publication.publicationInfo);
  if (publication.year) parts.push(String(publication.year));
  if (publication.pageCount) parts.push(`${publication.pageCountApproximate ? "Approximately " : ""}${publication.pageCount.toLocaleString()} pages`);
  if (publication.publicationStatus === "unpublished manuscript" && publication.showPublicationStatus !== false) parts.unshift("Unpublished manuscript");
  return parts;
}

function actionLink(label, href, className, external = false) {
  const link = document.createElement("a");
  link.className = `publication-link ${className}`;
  link.href = href;
  link.textContent = label;
  if (external) { link.target = "_blank"; link.rel = "noopener"; }
  return link;
}

function publicationHeading(publication, level, linkTitle = true) {
  const heading = document.createElement(level);
  const mainTitle = publication.displayTitle || publication.title;
  if (publication.viewerAvailable && linkTitle) {
    const titleLink = document.createElement("a");
    titleLink.className = "publication-title-link";
    titleLink.href = `publication-viewer.html?id=${encodeURIComponent(publication.id)}`;
    titleLink.textContent = mainTitle;
    titleLink.setAttribute("aria-label", publication.title);
    heading.append(titleLink);
  } else {
    const main = document.createElement("span");
    main.className = "publication-main-title";
    main.textContent = mainTitle;
    heading.append(main);
  }
  if (publication.displaySubtitle) {
    if (!publication.viewerAvailable || !linkTitle) {
      const separator = document.createElement("span");
      separator.className = "sr-only";
      separator.textContent = ": ";
      heading.append(separator);
    }
    const subtitle = document.createElement("span");
    subtitle.className = "publication-subtitle";
    subtitle.textContent = publication.displaySubtitle;
    if (publication.viewerAvailable && linkTitle) subtitle.setAttribute("aria-hidden", "true");
    heading.append(subtitle);
  }
  return heading;
}

function publicationSubentry(publication) {
  const subentry = document.createElement("div");
  subentry.className = "publication-subentry";
  subentry.dataset.publicationSubentry = "";
  subentry.dataset.publicationId = publication.id;
  const title = publicationHeading(publication, "h5");
  subentry.append(title);
  const details = metadata(publication);
  if (details.length) {
    const meta = document.createElement("p");
    meta.className = "publication-meta";
    meta.textContent = details.join(" · ");
    subentry.append(meta);
  }
  return subentry;
}

function publicationEntry(publication, relatedSubworks = []) {
  const article = document.createElement("article");
  article.className = `publication-entry${publication.publicationStatus === "unpublished manuscript" && publication.showPublicationStatus !== false ? " publication-entry-unavailable" : ""}`;
  article.dataset.publicationEntry = "";
  article.dataset.publicationId = publication.id;
  article.id = publication.id;
  const information = document.createElement("div");
  information.className = `ronald-publication-information${publication.viewerAvailable ? " ronald-publication-information-clickable" : ""}`;
  if (publication.viewerAvailable) {
    const viewerUrl = `publication-viewer.html?id=${encodeURIComponent(publication.id)}`;
    information.setAttribute("role", "link");
    information.tabIndex = 0;
    information.setAttribute("aria-label", `Open ${publication.title}`);
    const openViewer = () => { window.location.href = viewerUrl; };
    information.addEventListener("click", openViewer);
    information.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openViewer();
    });
  }
  const title = publicationHeading(publication, "h4", false);
  information.append(title);
  const details = metadata(publication);
  if (details.length) {
    const meta = document.createElement("p");
    meta.className = "publication-meta";
    meta.textContent = details.join(" · ");
    if (publication.comingSoon) {
      meta.append(" — ");
      const status = document.createElement("span");
      status.className = "publication-coming-soon";
      status.textContent = "(coming soon)";
      meta.append(status);
    }
    information.append(meta);
  }
  if (publication.description && !(publication.id === "on-trial-welsh-press" && publication.description === "The final published edition.")) {
    const description = document.createElement("p");
    description.textContent = publication.description;
    information.append(description);
  }
  if (publication.relationshipNote && !publication.relatedPublication) {
    const relationship = document.createElement("p");
    relationship.className = "publication-relationship";
    relationship.textContent = publication.relationshipNote;
    information.append(relationship);
  }
  if (publication.localAvailability === "present-not-integrated") {
    const availability = document.createElement("p");
    availability.className = "publication-availability";
    availability.textContent = "Local source available — viewer/search coming soon";
    information.append(availability);
  }
  if (publication.localAvailability === "inventory-pending") {
    const availability = document.createElement("p");
    availability.className = "publication-availability";
    availability.textContent = "Source inventory in progress — viewer/search not yet available";
    information.append(availability);
  }
  article.append(information);
  if (publication.relationshipNote && publication.relatedPublication) {
    const relationship = document.createElement("p");
    relationship.className = "publication-relationship";
    relationship.append(`${publication.relationshipNote}${publication.relatedPublication ? ": " : ""}`);
    if (publication.relatedPublication) {
      const link = document.createElement("a");
      link.href = publication.relatedPublication.href;
      link.textContent = publication.relatedPublication.label;
      relationship.append(link);
    }
    article.append(relationship);
  }
  const actions = document.createElement("p");
  actions.className = "publication-actions";
  if (publication.searchable && publication.viewerAvailable) actions.append(actionLink("Search this book", `publication-viewer.html?id=${encodeURIComponent(publication.id)}#book-search`, "publication-search-link"));
  if (publication.publicUrl) actions.append(actionLink(publication.publicActionLabel || "Open publication", publication.publicUrl, "publication-original-link", true));
  if (actions.childElementCount) article.append(actions);
  if (relatedSubworks.length) {
    const subworks = document.createElement("div");
    subworks.className = "publication-related-subworks";
    subworks.setAttribute("aria-label", `Related parts of ${publication.title}`);
    subworks.append(...relatedSubworks.map(publicationSubentry));
    article.append(subworks);
  }
  return article;
}

async function renderCatalog() {
  const catalog = await fetch("data/publications.json").then((response) => {
    if (!response.ok) throw new Error(`Publication catalog returned ${response.status}`);
    return response.json();
  });
  catalogData = catalog;
  if (catalog.collectionSearch?.enabled) {
    collectionSearch.scope.textContent = catalog.collectionSearch.scopeNote;
    populateIntegratedPublicationChoices();
    updatePublicationScopeSummary();
    collectionSearch.root.hidden = false;
    collectionSearch.form.addEventListener("submit", searchIntegratedPublications);
    collectionSearch.sourceSelectAll.addEventListener("click", setAllPublicationScopes);
    collectionSearch.sourceClear.addEventListener("click", clearPublicationScopes);
    document.addEventListener("click", (event) => { if (collectionSearch.source.open && !collectionSearch.source.contains(event.target)) collectionSearch.source.open = false; });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && collectionSearch.source.open) { collectionSearch.source.open = false; collectionSearch.source.querySelector("summary")?.focus(); } });
    collectionSearch.toggle.addEventListener("click", toggleIntegratedSearchResults);
    collectionSearch.input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      searchIntegratedPublications(event);
    });
  }
  const fragment = document.createDocumentFragment();
  catalog.categories.forEach((category) => {
    if (category.id === "historical-publications") return;
    const publications = catalog.publications
      .map((publication, sourceOrder) => ({ publication, sourceOrder }))
      .filter(({ publication }) => publication.category === category.id && !publication.parentPublicationId)
      .sort((left, right) => (left.publication.displayOrder ?? left.sourceOrder) - (right.publication.displayOrder ?? right.sourceOrder))
      .map(({ publication }) => publication);
    if (!publications.length) return;
    const section = document.createElement("section");
    section.className = "publication-group";
    section.id = category.id;
    const heading = document.createElement("h3");
    heading.id = `publication-category-${category.id}`;
    heading.textContent = category.label;
    section.setAttribute("aria-labelledby", heading.id);
    const list = document.createElement("div");
    list.className = "publication-list";
    list.append(...publications.map((publication) => publicationEntry(
      publication,
      catalog.publications.filter((candidate) => candidate.parentPublicationId === publication.id),
    )));
    section.append(heading, list);
    fragment.append(section);
  });
  catalogRoot.replaceChildren(fragment);
}

renderCatalog().catch((error) => {
  console.error(error);
  catalogRoot.innerHTML = '<p class="publication-catalog-error">The publication catalog could not be loaded.</p>';
});
