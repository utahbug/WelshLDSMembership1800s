(() => {
  const catalog = window.WELSH_RECORD_CATALOG;
  const $ = (selector) => document.querySelector(selector);
  const list = $("#collectionList");
  const branchList = $("#branchList");
  const search = $("#collectionSearch");
  const suggestions = $("#collectionSuggestions");
  const count = $("#collectionCount");
  const categoryFilter = $("#categoryFilter");
  const categorySelect = $("#categorySelect");
  const welcome = $("#welcome");
  const resourcePanel = $("#resourcePanel");
  const resourceList = $("#resourceList");
  const branchTitle = $("#branchTitle");
  const branchMeta = $("#branchMeta");
  const viewer = $("#recordViewer");
  const title = $("#collectionTitle");
  const position = $("#imagePosition");
  const image = $("#recordImage");
  const stage = $(".record-stage");
  const documentPreview = $("#documentPreview");
  const documentType = $("#documentType");
  const documentName = $("#documentName");
  const documentFrame = $("#documentFrame");
  const documentLink = $("#documentLink");
  const caption = $("#recordCaption");
  const strip = $("#thumbnailStrip");
  const continuousView = $("#continuousView");
  const previous = $("#previousImage");
  const next = $("#nextImage");
  const sidebar = $("#sidebar");
  const menu = $("#menuButton");
  const sidebarToggle = $("#sidebarToggle");
  const sidebarResizer = $("#sidebarResizer");
  const branchTab = $("#browseBranches");
  const collectionTab = $("#browseCollections");
  const facingTools = $("#facingTools");
  const facingZoomOut = $("#facingZoomOut");
  const facingZoomFit = $("#facingZoomFit");
  const facingZoomIn = $("#facingZoomIn");
  const swapFacingPages = $("#swapFacingPages");
  const panTool = $("#panTool");
  const resetPan = $("#resetPan");
  const backToResources = $("#backToResources");
  const viewContext = $("#viewContext");
  const number = new Intl.NumberFormat("en-US");

  let registry = [];
  let currentCollection = null;
  let currentRecords = [];
  let currentImage = 0;
  let currentCategory = "All collections";
  let browseMode = "branches";
  let viewMode = "index";
  let currentBranchName = "";
  let facingPageWidth = 720;
  let lazyObserver = null;
  let pagePositionObserver = null;
  let resizingSidebar = false;
  let panEnabled = false;
  const swappedSpreads = new Set();

  if (!catalog) {
    welcome.innerHTML = "<h2>Catalog not generated</h2><p>Run the catalog builder before opening this viewer.</p>";
    return;
  }

  function recordUrl(record) {
    return location.protocol === "http:" || location.protocol === "https:" ? record.serveUrl : record.url;
  }

  function normalized(value) {
    return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/\bff/g, "f").replace(/[^a-z0-9]/g, "");
  }

  function editDistance(left, right) {
    if (!left) return right.length;
    if (!right) return left.length;
    const previousRow = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let i = 1; i <= left.length; i += 1) {
      const row = [i];
      for (let j = 1; j <= right.length; j += 1) {
        row[j] = Math.min(row[j - 1] + 1, previousRow[j] + 1, previousRow[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
      }
      previousRow.splice(0, previousRow.length, ...row);
    }
    return previousRow[right.length];
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
    return Math.min(...[collection.name, ...(collection.aliases || []), ...collection.images.map((record) => record.name)]
      .map((name) => nameScore(query, name)));
  }

  function visibleRecords(collection) {
    const hasImages = collection.images.some((record) => record.type === "image");
    return collection.images.filter((record) => {
      if (record.type === "image" && /(?:\d|_)t(?:a)?\.[^.]+$/i.test(record.name)) return false;
      const legacyHtml = [".htm", ".html"].includes(record.extension?.toLowerCase())
        && (hasImages || ["robohelp", "primary", "original-cds"].includes(record.source));
      if (legacyHtml) return false;
      return true;
    });
  }

  function resourceKind(collection) {
    const records = visibleRecords(collection);
    const images = records.filter((record) => record.type === "image").length;
    const documents = records.length - images;
    if (/transcription/i.test(collection.category) || records.some((record) => /transcript/i.test(record.name))) return "Transcription";
    if (/minute|conference/i.test(collection.category + collection.name)) return "Minutes";
    if (images) return "Record images";
    if (documents) return "Documents";
    return "Resource";
  }

  const nonBranchLabels = new Set(["branches", "assets", "general transcriptions and indexes", "master branch registry"]);
  const derivedBranches = [...new Set(catalog.collections
    .filter((collection) => /membership|branch/i.test(collection.category + collection.name))
    .map((collection) => collection.name.replace(/[,([]?\s*\d{4}[\s\S]*$/i, "").replace(/^\d+\s*-\s*/, "").trim()))]
    .filter((name) => name && !nonBranchLabels.has(name.toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));

  function branchNames() {
    return registry.length ? registry.map((item) => item.canonicalName) : derivedBranches;
  }

  function branchDetails(name) {
    return registry.find((item) => item.canonicalName === name) || null;
  }

  function yearLabel(item) {
    if (!item?.earliestYear) return "";
    return item.latestYear && item.latestYear !== item.earliestYear
      ? `${item.earliestYear}–${item.latestYear}`
      : String(item.earliestYear);
  }

  function relatedCollections(name) {
    return catalog.collections.map((collection) => ({ collection, score: collectionScore(collection, name) }))
      .filter(({ collection, score }) => Number.isFinite(score)
        && visibleRecords(collection).length
        && !nonBranchLabels.has(collection.name.toLowerCase()))
      .sort((a, b) => {
        const kindDifference = (resourceKind(a.collection) === "Record images" ? 0 : 1) - (resourceKind(b.collection) === "Record images" ? 0 : 1);
        return kindDifference || a.score - b.score || a.collection.name.localeCompare(b.collection.name);
      })
      .map(({ collection }) => collection);
  }

  function renderSuggestions(value) {
    const names = [...new Set([...branchNames(), ...catalog.collections.flatMap((collection) => [collection.name, ...(collection.aliases || [])])])];
    const ranked = names.map((name) => ({ name, score: nameScore(value, name) })).filter((item) => Number.isFinite(item.score))
      .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name)).slice(0, 12);
    suggestions.replaceChildren(...ranked.map(({ name }) => Object.assign(document.createElement("option"), { value: name })));
  }

  function renderBranches() {
    const query = search.value.trim();
    const matches = branchNames().map((name) => ({ name, score: nameScore(query, name) }))
      .filter(({ score }) => !query || Number.isFinite(score))
      .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
    count.textContent = `${matches.length} of ${branchNames().length} branches`;
    branchList.replaceChildren(...matches.map(({ name }) => {
      const details = branchDetails(name);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "collection-link";
      button.innerHTML = `<span>${name}</span>${yearLabel(details) ? `<small>Sources: ${yearLabel(details)}</small>` : ""}`;
      button.addEventListener("click", () => openBranch(name, button));
      return button;
    }));
  }

  function renderCollections() {
    const query = search.value.trim();
    const matches = catalog.collections.map((collection) => ({ collection, score: collectionScore(collection, query) }))
      .filter(({ collection, score }) => visibleRecords(collection).length
        && (currentCategory === "All collections" || collection.category === currentCategory)
        && (!query || Number.isFinite(score)))
      .sort((a, b) => a.score - b.score || a.collection.name.localeCompare(b.collection.name));
    count.textContent = `${matches.length} of ${catalog.collections.length} collections`;
    list.replaceChildren(...matches.map(({ collection }) => {
      const records = visibleRecords(collection);
      const imageCount = records.filter((item) => item.type === "image").length;
      const documentCount = records.length - imageCount;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `collection-link${currentCollection?.id === collection.id ? " active" : ""}`;
      button.innerHTML = `<span>${collection.name}</span><small>${[imageCount && `${number.format(imageCount)} images`, documentCount && `${number.format(documentCount)} documents`].filter(Boolean).join(" · ")}</small>`;
      button.addEventListener("click", () => openCollection(collection));
      return button;
    }));
  }

  function renderBrowse() {
    const branches = browseMode === "branches";
    branchList.hidden = !branches;
    list.hidden = branches;
    categoryFilter.hidden = branches;
    branchTab.classList.toggle("active", branches);
    collectionTab.classList.toggle("active", !branches);
    if (branches) renderBranches(); else renderCollections();
    renderSuggestions(search.value);
  }

  function openBranch(name, selectedButton) {
    currentBranchName = name;
    [...branchList.children].forEach((button) => button.classList.toggle("active", button === selectedButton));
    welcome.hidden = true;
    viewer.hidden = true;
    resourcePanel.hidden = false;
    resourcePanel.open = true;
    resourcePanel.classList.remove("compact");
    $(".viewer").classList.remove("record-open");
    $(".viewer").scrollTop = 0;
    branchTitle.textContent = name;
    const details = branchDetails(name);
    const facts = [];
    if (yearLabel(details)) facts.push(`<span><strong>Years found:</strong> ${yearLabel(details)}</span>`);
    if (details?.variants) facts.push(`<span><strong>Known variants:</strong> ${details.variants}</span>`);
    if (details?.relatedBranches) facts.push(`<span><strong>Related branch:</strong> ${details.relatedBranches}</span>`);
    branchMeta.innerHTML = facts.join("");
    branchMeta.hidden = !facts.length;
    const matches = relatedCollections(name);
    if (!matches.length || (matches.length === 1 && matches[0].id === "public-branch-registry")) {
      viewer.hidden = true;
      resourceList.innerHTML = `<div class="empty-resource"><strong>Branch recorded</strong><p>Record images for this branch are not yet included in the online starter. Its name and evidence remain available in the branch registry.</p><a href="branch-registry.html">Open branch registry</a></div>`;
    } else {
      resourceList.replaceChildren(...matches.map((collection) => {
        const records = visibleRecords(collection);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "resource-card";
        button.dataset.collectionId = collection.id;
        button.innerHTML = `<span class="resource-kind">${resourceKind(collection)}</span><strong>${collection.name}</strong><small>${number.format(records.length)} item${records.length === 1 ? "" : "s"}</small>`;
        button.addEventListener("click", () => openCollection(collection, { keepResources: true, initialView: records.some((record) => record.type === "image") ? "continuous" : "index" }));
        return button;
      }));
    }
    sidebar.classList.remove("open");
    menu.setAttribute("aria-expanded", "false");
  }

  function buildPageIndex() {
    strip.replaceChildren(...currentRecords.map((record, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "page-index-button";
      button.innerHTML = `<strong>${index + 1}</strong><small>${record.type === "image" ? "Image" : record.extension.replace(".", "").toUpperCase()}</small>`;
      button.title = record.name;
      button.addEventListener("click", () => { showImage(index); setView("single"); });
      return button;
    }));
  }

  function makeRecordFigure(record, index) {
    const figure = document.createElement("figure");
    figure.className = "scroll-page";
    figure.id = `page-${index + 1}`;
    figure.dataset.pageIndex = String(index);
    if (record.type === "image") {
      const pageImage = document.createElement("img");
      pageImage.dataset.src = recordUrl(record);
      pageImage.alt = `${currentCollection.name}, page ${index + 1}`;
      pageImage.decoding = "async";
      pageImage.draggable = false;
      figure.append(pageImage);
    } else {
      const link = document.createElement("a");
      link.className = "document-card";
      link.href = recordUrl(record);
      link.innerHTML = `<strong>${record.extension.replace(".", "").toUpperCase()} document</strong><span>${record.name}</span>`;
      figure.append(link);
    }
    const label = document.createElement("figcaption");
    label.textContent = `Page ${index + 1} · ${record.name}`;
    figure.append(label);
    return figure;
  }

  function startLazyLoading() {
    lazyObserver?.disconnect();
    const pending = continuousView.querySelectorAll("img[data-src]");
    if (!("IntersectionObserver" in window)) {
      pending.forEach((item) => { item.src = item.dataset.src; delete item.dataset.src; });
      return;
    }
    lazyObserver = new IntersectionObserver((entries, observer) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.src = entry.target.dataset.src;
      delete entry.target.dataset.src;
      observer.unobserve(entry.target);
    }), { rootMargin: "1200px 0px" });
    pending.forEach((item) => lazyObserver.observe(item));
  }

  function renderScrollable() {
    continuousView.replaceChildren();
    continuousView.classList.remove("facing-current");
    currentRecords.forEach((record, index) => continuousView.append(makeRecordFigure(record, index)));
    startLazyLoading();
    startPagePositionTracking();
  }

  function startPagePositionTracking() {
    pagePositionObserver?.disconnect();
    pagePositionObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) syncCurrentPageFromScroll();
    }, { root: $(".viewer"), rootMargin: "-40% 0px -40% 0px", threshold: 0 });
    continuousView.querySelectorAll(".scroll-page").forEach((page) => pagePositionObserver.observe(page));
  }

  function syncCurrentPageFromScroll() {
    const pages = [...continuousView.querySelectorAll(".scroll-page")];
    if (!pages.length) return;
    const viewer = $(".viewer");
    const viewerCenter = viewer.getBoundingClientRect().top + viewer.clientHeight / 2;
    const nearestPage = pages.reduce((nearest, page) => {
      const pageBox = page.getBoundingClientRect();
      const nearestBox = nearest.getBoundingClientRect();
      const pageDistance = Math.abs(pageBox.top + pageBox.height / 2 - viewerCenter);
      const nearestDistance = Math.abs(nearestBox.top + nearestBox.height / 2 - viewerCenter);
      return pageDistance < nearestDistance ? page : nearest;
    });
    currentImage = Number(nearestPage.dataset.pageIndex);
    position.textContent = `Page ${number.format(currentImage + 1)} of ${number.format(currentRecords.length)} · full-resolution source`;
  }

  function facingIndexes() {
    return [currentImage, currentImage + 1 < currentRecords.length ? currentImage + 1 : null];
  }

  function renderFacingPair() {
    continuousView.replaceChildren();
    continuousView.classList.add("facing-current");
    const spread = document.createElement("section");
    spread.className = "page-spread";
    const naturalIndexes = facingIndexes();
    const spreadKey = naturalIndexes.map((index) => index ?? "blank").join("-");
    const swapped = swappedSpreads.has(spreadKey);
    const indexes = swapped ? [...naturalIndexes].reverse() : naturalIndexes;
    swapFacingPages.classList.toggle("active", swapped);
    swapFacingPages.textContent = swapped ? "Left/right swapped" : "Swap left/right";
    indexes.forEach((index) => {
      if (index == null) spread.append(Object.assign(document.createElement("div"), { className: "blank-page", ariaHidden: "true" }));
      else spread.append(makeRecordFigure(currentRecords[index], index));
    });
    continuousView.append(spread);
    const shown = indexes.filter((index) => index != null).map((index) => index + 1).sort((a, b) => a - b);
    position.textContent = `Pages ${shown.join("–")} of ${number.format(currentRecords.length)} · full-resolution sources`;
    previous.disabled = shown[0] <= 1;
    next.disabled = shown[shown.length - 1] >= currentRecords.length;
    startLazyLoading();
    continuousView.scrollLeft = 0;
  }

  function setFacingZoom(width) {
    facingPageWidth = Math.max(320, Math.min(1600, Math.round(width)));
    continuousView.style.setProperty("--facing-page-width", `${facingPageWidth}px`);
  }

  function setView(mode) {
    if (viewMode === "continuous" && mode !== "continuous") syncCurrentPageFromScroll();
    if (mode !== "continuous") pagePositionObserver?.disconnect();
    viewMode = mode;
    $(".view-toolbar").querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === mode));
    const single = mode === "single";
    const facing = mode === "facing";
    const index = mode === "index";
    stage.hidden = !single;
    strip.hidden = !index;
    continuousView.hidden = single || index;
    previous.hidden = !(single || facing);
    next.hidden = !(single || facing);
    panTool.hidden = !(single || facing || mode === "continuous");
    setPanEnabled(false);
    facingTools.hidden = !facing;
    if (!facing) facingTools.open = false;
    if (mode === "continuous") renderScrollable();
    if (facing) renderFacingPair();
    if (single) showImage(currentImage);
  }

  function navigatePages(direction) {
    if (viewMode === "facing") {
      currentImage = Math.max(0, Math.min(currentImage + direction * 2, currentRecords.length - 1));
      renderFacingPair();
      return;
    }
    showImage(currentImage + direction);
  }

  function resetPannedImages() {
    [stage, continuousView].forEach((surface) => surface.querySelectorAll("img.pan-moved").forEach((item) => {
      item.classList.remove("pan-moved");
      item.style.removeProperty("transform");
      delete item.dataset.panX;
      delete item.dataset.panY;
    }));
  }

  function setPanEnabled(enabled) {
    if (!enabled) resetPannedImages();
    panEnabled = enabled;
    panTool.classList.toggle("active", enabled);
    panTool.setAttribute("aria-pressed", String(enabled));
    panTool.textContent = enabled ? "↖" : "✋";
    panTool.title = enabled ? "Return to normal pointer" : "Pan image: drag a full-size image left, right, up, or down";
    panTool.setAttribute("aria-label", enabled ? "Turn off image panning" : "Pan image");
    resetPan.hidden = !enabled;
    stage.classList.toggle("pan-enabled", enabled && viewMode === "single");
    continuousView.classList.toggle("pan-enabled", enabled && ["continuous", "facing"].includes(viewMode));
  }

  function enableDragPan(surface) {
    let dragging = false;
    let panTarget = null;
    let startX = 0;
    let startY = 0;
    let startPanX = 0;
    let startPanY = 0;
    surface.addEventListener("pointerdown", (event) => {
      if (!panEnabled || event.button !== 0) return;
      panTarget = event.target.closest("img");
      if (!panTarget) return;
      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      startPanX = Number(panTarget.dataset.panX || 0);
      startPanY = Number(panTarget.dataset.panY || 0);
      surface.classList.add("is-panning");
      surface.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    surface.addEventListener("pointermove", (event) => {
      if (!dragging || !panTarget) return;
      const panX = startPanX + event.clientX - startX;
      const panY = startPanY + event.clientY - startY;
      panTarget.dataset.panX = String(panX);
      panTarget.dataset.panY = String(panY);
      panTarget.classList.add("pan-moved");
      panTarget.style.transform = `translate(${panX}px, ${panY}px)`;
    });
    const stop = () => { dragging = false; panTarget = null; surface.classList.remove("is-panning"); };
    surface.addEventListener("pointerup", stop);
    surface.addEventListener("pointercancel", stop);
  }

  function openCollection(collection, options = {}) {
    const { keepResources = false, initialView = "index" } = options;
    currentCollection = collection;
    currentRecords = visibleRecords(collection);
    currentImage = 0;
    swappedSpreads.clear();
    welcome.hidden = true;
    resourcePanel.hidden = true;
    if (!keepResources) resourcePanel.classList.remove("compact");
    $(".viewer").classList.add("record-open");
    backToResources.hidden = !keepResources;
    backToResources.textContent = keepResources ? `← Back to ${currentBranchName} resources` : "← Back to branch resources";
    viewer.hidden = false;
    title.textContent = collection.name;
    viewContext.innerHTML = keepResources
      ? `<strong>Branch: ${currentBranchName}</strong><small>${collection.name}</small>`
      : `<strong>${collection.name}</strong>`;
    buildPageIndex();
    setView(initialView);
    resourceList.querySelectorAll(".resource-card").forEach((button) => button.classList.toggle("active", button.dataset.collectionId === collection.id));
    position.textContent = `${number.format(currentRecords.length)} available item${currentRecords.length === 1 ? "" : "s"} · full resolution loads on demand`;
    renderCollections();
    sidebar.classList.remove("open");
    menu.setAttribute("aria-expanded", "false");
    requestAnimationFrame(() => $(".viewer").scrollTo({ top: 0, behavior: "smooth" }));
  }

  function showImage(index) {
    if (!currentRecords.length) return;
    currentImage = Math.max(0, Math.min(index, currentRecords.length - 1));
    const record = currentRecords[currentImage];
    const isImage = record.type === "image";
    image.hidden = !isImage;
    documentPreview.hidden = isImage;
    if (isImage) {
      image.src = recordUrl(record);
      image.alt = `${currentCollection.name}, record image ${currentImage + 1}`;
    } else {
      image.removeAttribute("src");
      documentType.textContent = `${record.extension.replace(".", "").toUpperCase()} document`;
      documentName.textContent = record.name;
      documentLink.href = recordUrl(record);
      const inline = [".pdf"].includes(record.extension.toLowerCase());
      documentFrame.hidden = !inline;
      if (inline) documentFrame.src = recordUrl(record); else documentFrame.removeAttribute("src");
    }
    caption.textContent = record.name;
    position.textContent = `Page ${number.format(currentImage + 1)} of ${number.format(currentRecords.length)} · full-resolution source`;
    previous.disabled = currentImage === 0;
    next.disabled = currentImage === currentRecords.length - 1;
  }

  $("#archiveStats").innerHTML = [["Collections", catalog.stats.collections], ["Unique images", catalog.stats.uniqueImages], ["Duplicates collapsed", catalog.stats.exactDuplicates]]
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${number.format(value)}</dd></div>`).join("");

  const categories = ["All collections", ...new Set(catalog.collections.map((collection) => collection.category))];
  categorySelect.replaceChildren(...categories.map((category) => Object.assign(document.createElement("option"), { value: category, textContent: category })));
  categorySelect.addEventListener("change", () => {
    currentCategory = categorySelect.value;
    renderCollections();
  });

  const requestedSearch = new URLSearchParams(location.search).get("search");
  if (requestedSearch) search.value = requestedSearch;
  search.addEventListener("input", renderBrowse);
  branchTab.addEventListener("click", () => { browseMode = "branches"; renderBrowse(); });
  collectionTab.addEventListener("click", () => {
    browseMode = "collections";
    document.body.classList.remove("sidebar-collapsed");
    sidebarToggle.textContent = "Hide branches";
    sidebarToggle.setAttribute("aria-expanded", "true");
    renderBrowse();
  });
  $(".view-toolbar").addEventListener("click", (event) => { if (event.target.dataset.view) setView(event.target.dataset.view); });
  facingZoomOut.addEventListener("click", () => setFacingZoom(facingPageWidth - 160));
  facingZoomIn.addEventListener("click", () => setFacingZoom(facingPageWidth + 160));
  facingZoomFit.addEventListener("click", () => setFacingZoom(Math.max(320, (continuousView.clientWidth - 36) / 2)));
  swapFacingPages.addEventListener("click", () => {
    const indexes = facingIndexes();
    const spreadKey = indexes.map((index) => index ?? "blank").join("-");
    if (swappedSpreads.has(spreadKey)) swappedSpreads.delete(spreadKey);
    else swappedSpreads.add(spreadKey);
    renderFacingPair();
  });
  panTool.addEventListener("click", () => setPanEnabled(!panEnabled));
  resetPan.addEventListener("click", resetPannedImages);
  enableDragPan(stage);
  enableDragPan(continuousView);
  backToResources.addEventListener("click", () => {
    viewer.hidden = true;
    resourcePanel.hidden = false;
    resourcePanel.open = true;
    $(".viewer").classList.remove("record-open");
    $(".viewer").scrollTo({ top: 0, behavior: "smooth" });
  });
  previous.addEventListener("click", () => navigatePages(-1));
  next.addEventListener("click", () => navigatePages(1));
  menu.addEventListener("click", () => {
    const open = sidebar.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(open));
  });
  sidebarToggle.addEventListener("click", () => {
    const collapsed = document.body.classList.toggle("sidebar-collapsed");
    sidebarToggle.textContent = collapsed ? "Show branches" : "Hide branches";
    sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
    try { localStorage.setItem("welsh-sidebar-collapsed", String(collapsed)); } catch {}
  });
  function setSidebarWidth(width) {
    const bounded = Math.max(72, Math.min(width, window.innerWidth * 0.55));
    sidebar.style.width = `${bounded}px`;
    sidebarResizer.setAttribute("aria-valuenow", String(Math.round(bounded)));
    return bounded;
  }
  function fitSidebarToBranchNames() {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    context.font = getComputedStyle(branchList).font || "16px Georgia";
    const segments = branchNames().flatMap((name) => name.split(",").map((part) => part.trim()));
    const longest = Math.max(0, ...segments.map((name) => context.measureText(name).width));
    setSidebarWidth(Math.max(250, Math.min(360, Math.ceil(longest + 64))));
  }
  sidebarResizer.addEventListener("pointerdown", (event) => {
    resizingSidebar = true;
    sidebarResizer.setPointerCapture?.(event.pointerId);
    document.body.classList.add("resizing-sidebar");
    event.preventDefault();
  });
  window.addEventListener("pointermove", (event) => {
    if (!resizingSidebar) return;
    const workspaceLeft = $(".workspace").getBoundingClientRect().left;
    setSidebarWidth(event.clientX - workspaceLeft);
  });
  window.addEventListener("pointerup", () => {
    if (!resizingSidebar) return;
    resizingSidebar = false;
    document.body.classList.remove("resizing-sidebar");
    try { localStorage.setItem("welsh-sidebar-width", sidebar.style.width); } catch {}
  });
  sidebarResizer.addEventListener("dblclick", () => {
    fitSidebarToBranchNames();
    try { localStorage.removeItem("welsh-sidebar-width"); } catch {}
  });
  sidebarResizer.addEventListener("keydown", (event) => {
    const current = sidebar.getBoundingClientRect().width;
    if (!["ArrowLeft", "ArrowRight", "Home"].includes(event.key)) return;
    setSidebarWidth(event.key === "Home" ? 320 : current + (event.key === "ArrowLeft" ? -20 : 20));
    event.preventDefault();
  });
  document.addEventListener("keydown", (event) => {
    if (!currentCollection || !["single", "facing"].includes(viewMode) || event.target.matches("input")) return;
    if (event.key === "ArrowLeft") navigatePages(-1);
    if (event.key === "ArrowRight") navigatePages(1);
  });

  fetch("data/branch-registry.json").then((response) => response.json()).then((data) => {
    registry = data.registry || [];
    try { if (!localStorage.getItem("welsh-sidebar-width")) fitSidebarToBranchNames(); } catch { fitSidebarToBranchNames(); }
    renderBrowse();
  }).catch(() => renderBrowse());
  try {
    const collapsed = localStorage.getItem("welsh-sidebar-collapsed") === "true";
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    sidebarToggle.textContent = collapsed ? "Show branches" : "Hide branches";
    sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
    const savedWidth = Number.parseFloat(localStorage.getItem("welsh-sidebar-width"));
    if (Number.isFinite(savedWidth)) setSidebarWidth(savedWidth);
  } catch {}
  renderBrowse();
})();
