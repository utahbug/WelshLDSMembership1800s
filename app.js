(() => {
  const catalog = window.WELSH_RECORD_CATALOG;
  const list = document.querySelector("#collectionList");
  const search = document.querySelector("#collectionSearch");
  const suggestions = document.querySelector("#collectionSuggestions");
  const count = document.querySelector("#collectionCount");
  const categoryList = document.querySelector("#categoryList");
  const welcome = document.querySelector("#welcome");
  const viewer = document.querySelector("#recordViewer");
  const title = document.querySelector("#collectionTitle");
  const position = document.querySelector("#imagePosition");
  const source = document.querySelector("#recordSource");
  const image = document.querySelector("#recordImage");
  const documentPreview = document.querySelector("#documentPreview");
  const documentType = document.querySelector("#documentType");
  const documentName = document.querySelector("#documentName");
  const documentFrame = document.querySelector("#documentFrame");
  const documentLink = document.querySelector("#documentLink");
  const caption = document.querySelector("#recordCaption");
  const strip = document.querySelector("#thumbnailStrip");
  const previous = document.querySelector("#previousImage");
  const next = document.querySelector("#nextImage");
  const sidebar = document.querySelector("#sidebar");
  const menu = document.querySelector("#menuButton");
  let currentCollection = null;
  let currentImage = 0;
  let currentCategory = "All collections";

  const requestedSearch = new URLSearchParams(location.search).get("search");
  if (requestedSearch) search.value = requestedSearch;

  function recordUrl(record) {
    return location.protocol === "http:" || location.protocol === "https:" ? record.serveUrl : record.url;
  }

  if (!catalog) {
    welcome.innerHTML = "<h2>Catalog not generated</h2><p>Run the catalog builder before opening this viewer.</p>";
    return;
  }

  const number = new Intl.NumberFormat("en-US");

  function normalized(value) {
    return value
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\bff/g, "f")
      .replace(/[^a-z0-9]/g, "");
  }

  function editDistance(left, right) {
    if (!left) return right.length;
    if (!right) return left.length;
    const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let i = 1; i <= left.length; i += 1) {
      const current = [i];
      for (let j = 1; j <= right.length; j += 1) {
        current[j] = Math.min(
          current[j - 1] + 1,
          previous[j] + 1,
          previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
        );
      }
      previous.splice(0, previous.length, ...current);
    }
    return previous[right.length];
  }

  function nameScore(query, candidate) {
    const q = normalized(query);
    const names = [candidate, ...String(candidate).split(/[^\p{L}\p{N}]+/u)].map(normalized).filter(Boolean);
    if (!q) return 0;
    if (names.some((name) => name.startsWith(q))) return 0;
    if (names.some((name) => name.includes(q))) return 1;
    const distance = Math.min(...names.map((name) => editDistance(q, name)));
    const allowance = q.length >= 8 ? 2 : q.length >= 5 ? 1 : 0;
    return distance <= allowance ? 2 + distance : Infinity;
  }

  function collectionScore(collection, query) {
    const score = Math.min(...[
      collection.name,
      ...collection.aliases,
      ...collection.images.map((record) => record.name),
    ].map((name) => nameScore(query, name)));

    // The GitHub starter intentionally carries only the finding aid, not every
    // record image. Keep that aid discoverable for branch-name searches.
    if (!Number.isFinite(score) && collection.id === "public-branch-registry") return 100;
    return score;
  }

  const allNames = [...new Set(catalog.collections.flatMap((collection) => [
    collection.name,
    ...collection.aliases,
    ...collection.images.map((record) => record.name.replace(/\.[^.]+$/, "")),
  ]))]
    .sort((left, right) => left.localeCompare(right, "en", { sensitivity: "base" }));

  function renderSuggestions(value) {
    if (!suggestions) return;
    const ranked = allNames
      .map((name) => ({ name, score: nameScore(value, name) }))
      .filter((item) => Number.isFinite(item.score))
      .sort((left, right) => left.score - right.score || left.name.localeCompare(right.name))
      .slice(0, 12);
    suggestions.replaceChildren(...ranked.map(({ name }) => {
      const option = document.createElement("option");
      option.value = name;
      return option;
    }));
  }
  document.querySelector("#archiveStats").innerHTML = [
    ["Collections", catalog.stats.collections],
    ["Unique images", catalog.stats.uniqueImages],
    ["Duplicates collapsed", catalog.stats.exactDuplicates],
  ].map(([label, value]) => `<div><dt>${label}</dt><dd>${number.format(value)}</dd></div>`).join("");

  function renderCollections(filter = "") {
    const query = filter.trim();
    const matches = catalog.collections.map((collection) => ({ collection, score: collectionScore(collection, query) })).filter(({ collection, score }) =>
      (currentCategory === "All collections" || collection.category === currentCategory)
      && (!query || Number.isFinite(score)),
    ).sort((left, right) => left.score - right.score || left.collection.name.localeCompare(right.collection.name)).map(({ collection }) => collection);
    count.textContent = `${matches.length} of ${catalog.collections.length} collections`;
    list.replaceChildren(...matches.map((collection) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `collection-link${currentCollection?.id === collection.id ? " active" : ""}`;
      const imageCount = collection.images.filter((item) => item.type === "image").length;
      const documentCount = collection.images.length - imageCount;
      const detail = [imageCount && `${number.format(imageCount)} images`, documentCount && `${number.format(documentCount)} documents`].filter(Boolean).join(" · ");
      button.innerHTML = `<span>${collection.name}</span><small>${detail}</small>`;
      button.addEventListener("click", () => openCollection(collection));
      return button;
    }));
  }

  function openCollection(collection) {
    currentCollection = collection;
    currentImage = 0;
    welcome.hidden = true;
    viewer.hidden = false;
    title.textContent = collection.name;
    strip.replaceChildren(...collection.images.map((record, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "thumbnail-button";
      button.title = `Page ${index + 1}: ${record.name}`;
      const thumb = document.createElement("img");
      if (record.type === "image") {
        thumb.src = recordUrl(record);
        thumb.alt = "";
        thumb.loading = "lazy";
        button.append(thumb);
      } else {
        button.classList.add("document");
        button.textContent = record.extension.replace(".", "").toUpperCase();
      }
      button.addEventListener("click", () => showImage(index));
      return button;
    }));
    showImage(0);
    renderCollections(search.value);
    sidebar.classList.remove("open");
    menu.setAttribute("aria-expanded", "false");
  }

  function showImage(index) {
    currentImage = Math.max(0, Math.min(index, currentCollection.images.length - 1));
    const record = currentCollection.images[currentImage];
    const isImage = record.type === "image";
    image.hidden = !isImage;
    documentPreview.hidden = isImage;
    if (isImage) {
      image.src = recordUrl(record);
      image.alt = `${currentCollection.name}, record image ${currentImage + 1}`;
    } else {
      image.removeAttribute("src");
      image.alt = "";
      documentType.textContent = `${record.extension.replace(".", "").toUpperCase()} transcription document`;
      documentName.textContent = record.name;
      documentLink.href = recordUrl(record);
      const isInline = [".pdf", ".html", ".htm"].includes(record.extension.toLowerCase());
      documentFrame.hidden = !isInline;
      if (isInline) documentFrame.src = recordUrl(record);
      else documentFrame.removeAttribute("src");
    }
    caption.textContent = record.name;
    source.textContent = catalog.sources.find((item) => item.id === record.source)?.label ?? record.source;
    position.textContent = `Image ${number.format(currentImage + 1)} of ${number.format(currentCollection.images.length)}`;
    previous.disabled = currentImage === 0;
    next.disabled = currentImage === currentCollection.images.length - 1;
    [...strip.children].forEach((button, buttonIndex) => button.classList.toggle("active", buttonIndex === currentImage));
    strip.children[currentImage]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  search.addEventListener("input", () => {
    renderSuggestions(search.value);
    renderCollections(search.value);
  });
  previous.addEventListener("click", () => showImage(currentImage - 1));
  next.addEventListener("click", () => showImage(currentImage + 1));
  menu.addEventListener("click", () => {
    const open = sidebar.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("keydown", (event) => {
    if (!currentCollection || event.target.matches("input")) return;
    if (event.key === "ArrowLeft") showImage(currentImage - 1);
    if (event.key === "ArrowRight") showImage(currentImage + 1);
  });

  const categories = ["All collections", ...new Set(catalog.collections.map((collection) => collection.category))];
  categoryList.replaceChildren(...categories.map((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `category-button${category === currentCategory ? " active" : ""}`;
    button.textContent = category;
    button.addEventListener("click", () => {
      currentCategory = category;
      [...categoryList.children].forEach((item) => item.classList.toggle("active", item === button));
      renderCollections(search.value);
    });
    return button;
  }));
  renderCollections(search.value);
  renderSuggestions(search.value);
})();
