(() => {
  const catalog = window.WELSH_RECORD_CATALOG;
  const list = document.querySelector("#collectionList");
  const search = document.querySelector("#collectionSearch");
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

  function recordUrl(record) {
    return location.protocol === "http:" || location.protocol === "https:" ? record.serveUrl : record.url;
  }

  if (!catalog) {
    welcome.innerHTML = "<h2>Catalog not generated</h2><p>Run the catalog builder before opening this viewer.</p>";
    return;
  }

  const number = new Intl.NumberFormat("en-US");
  document.querySelector("#archiveStats").innerHTML = [
    ["Collections", catalog.stats.collections],
    ["Unique images", catalog.stats.uniqueImages],
    ["Duplicates collapsed", catalog.stats.exactDuplicates],
  ].map(([label, value]) => `<div><dt>${label}</dt><dd>${number.format(value)}</dd></div>`).join("");

  function renderCollections(filter = "") {
    const query = filter.trim().toLowerCase();
    const matches = catalog.collections.filter((collection) =>
      (currentCategory === "All collections" || collection.category === currentCategory)
      && [collection.name, ...collection.aliases].some((name) => name.toLowerCase().includes(query)),
    );
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

  search.addEventListener("input", () => renderCollections(search.value));
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
  renderCollections();
})();
