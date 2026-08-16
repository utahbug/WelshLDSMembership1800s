const catalogRoot = document.querySelector("#historicalPublicationCatalog");

function metadata(publication) {
  const values = [];
  if (publication.year) values.push(String(publication.year));
  if (publication.pageCount) values.push(`${publication.pageCount.toLocaleString()} page${publication.pageCount === 1 ? "" : "s"}`);
  return values;
}

function publicationTitle(publication) {
  const heading = document.createElement("h3");
  const main = document.createElement("span");
  main.className = "publication-main-title";
  main.textContent = publication.displayTitle || publication.title;
  heading.append(main);
  if (publication.displaySubtitle) {
    const subtitle = document.createElement("span");
    subtitle.className = "publication-subtitle";
    subtitle.textContent = publication.displaySubtitle;
    heading.append(subtitle);
  }
  return heading;
}

function publicationEntry(publication) {
  const article = document.createElement("article");
  article.className = "publication-entry historical-publication-entry";
  article.dataset.publicationId = publication.id;
  article.id = publication.id;
  const information = document.createElement("div");
  information.className = `historical-publication-information${publication.viewerAvailable ? " historical-publication-information-clickable" : ""}`;
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
  information.append(publicationTitle(publication));
  const details = metadata(publication);
  if (details.length) {
    const meta = document.createElement("p");
    meta.className = "publication-meta";
    meta.textContent = details.join(" · ");
    information.append(meta);
  }
  if (publication.description) {
    const description = document.createElement("p");
    description.textContent = publication.description;
    information.append(description);
  }
  article.append(information);
  if (publication.relationshipNote) {
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
  if (publication.localAvailability === "inventory-pending") {
    const availability = document.createElement("p");
    availability.className = "publication-availability";
    availability.textContent = "Source inventory in progress — viewer/search not yet available";
    article.append(availability);
  }
  if (publication.searchable && publication.viewerAvailable) {
    const actions = document.createElement("p");
    actions.className = "publication-actions";
    const search = document.createElement("a");
    search.className = "publication-link publication-search-link";
    search.href = `publication-viewer.html?id=${encodeURIComponent(publication.id)}#book-search`;
    search.textContent = "Search this publication";
    actions.append(search);
    article.append(actions);
  }
  return article;
}

fetch("data/publications.json")
  .then((response) => {
    if (!response.ok) throw new Error(`Publication catalog returned ${response.status}`);
    return response.json();
  })
  .then((catalog) => {
    const publications = catalog.publications.filter((publication) => publication.category === "historical-publications");
    const list = document.createElement("div");
    list.className = "publication-list historical-publication-list";
    list.append(...publications.map(publicationEntry));
    catalogRoot.replaceChildren(list);
  })
  .catch((error) => {
    console.error(error);
    catalogRoot.innerHTML = '<p class="publication-catalog-error">The historical-publication catalog could not be loaded.</p>';
  });
