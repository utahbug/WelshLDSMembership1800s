(() => {
  const catalog = window.WELSH_RECORD_CATALOG;
  const $ = (selector) => document.querySelector(selector);
  const list = $("#collectionList");
  const branchList = $("#branchList");
  const search = $("#collectionSearch");
  const globalSearch = $("#globalSearch");
  const suggestions = $("#collectionSuggestions");
  const searchResults = $("#searchResults");
  const searchResultList = $("#searchResultList");
  const count = $("#collectionCount");
  const directoryPanel = $("#directoryPanel");
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
  const branchesButton = $("#branchesButton");
  const branchPicker = $("#branchPicker");
  const pickerSearch = $("#pickerSearch");
  const pickerBranchList = $("#pickerBranchList");
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
  const jumpFirstPage = $("#jumpFirstPage");
  const jumpLastPage = $("#jumpLastPage");
  const lineGuideTool = $("#lineGuideTool");
  const guideControls = $("#guideControls");
  const guideAngleOutput = $("#guideAngle");
  const imageTools = $("#imageTools");
  const backToResources = $("#backToResources");
  const viewContext = $("#viewContext");
  const number = new Intl.NumberFormat("en-US");
  const minutesCdByCall = new Map(Object.entries({
    "141622": "35", "122087": "36", "241210": "37", "1761621": "38", "984611": "39",
    "1761622": "40", "1761721": "41", "1175711": "42/55", "1001111": "43/60",
    "1272711": "44", "1201521": "45", "886310": "46", "101123": "47", "1240410": "48",
    "1314511": "49", "1219911": "50", "1175911": "51", "1128011": "52", "1128021": "53",
    "1175710": "54", "1277011": "56", "1240421": "57", "1134311": "58", "1115222": "59",
    "886311": "61", "708611": "62",
  }));

  let registry = window.WELSH_BRANCH_REGISTRY?.registry || [];
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
  let lineGuidesEnabled = false;
  const lineGuidePositions = [38, 38];
  let lineGuideAngle = 0;
  let lineGuideSpacing = 12;
  const imageRotations = new Map();
  const swappedSpreads = new Set();

  if (!catalog) {
    directoryPanel.innerHTML = "<h2>Catalog not generated</h2><p>Run the catalog builder before opening this viewer.</p>";
    return;
  }

  function recordUrl(record) {
    if (catalog.edition === "public" && currentCollection?.publicStorage?.baseUrl) return `${currentCollection.publicStorage.baseUrl}${encodeURIComponent(record.name)}`;
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

  function transcriptionPdfRange(cdText) {
    const firstCd = Number.parseInt(cdText, 10);
    if (firstCd >= 35 && firstCd <= 39) return "CDs 35–39";
    if (firstCd >= 40 && firstCd <= 43) return "CDs 40–43";
    if (firstCd >= 44 && firstCd <= 59) return "CDs 44–59";
    if (firstCd >= 60 && firstCd <= 62) return "CDs 60–62";
    return "";
  }

  function resourceProvenance(collection) {
    const leadingCd = collection.name.match(/^(\d{1,2})\s*[-–]/)?.[1];
    if (leadingCd) {
      const pdfRange = transcriptionPdfRange(leadingCd);
      return pdfRange ? `CD ${leadingCd} · Included in transcription PDF ${pdfRange}` : `CD ${leadingCd}`;
    }
    const searchable = [collection.name, ...collection.images.slice(0, 8).map((record) => record.name)].join(" ");
    const callMatch = searchable.match(/\bLR\D*(\d+)\D+(\d+)\b/i);
    const compactName = collection.name.replace(/\D/g, "");
    const joinedCallKey = [...minutesCdByCall.keys()].sort((a, b) => b.length - a.length).find((key) => compactName.endsWith(key));
    const callKey = callMatch ? `${callMatch[1]}${callMatch[2]}` : joinedCallKey ?? "";
    const minutesCd = minutesCdByCall.get(callKey);
    if (minutesCd) return `Source CD ${minutesCd}`;
    const branchCds = branchDetails(currentBranchName)?.filmAndCallNumbers?.match(/\bCD\s+(\d+)/gi) ?? [];
    if (branchCds.length) return `Source ${branchCds.join(", ")}`;
    return "CD source not yet identified";
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
      button.addEventListener("click", () => window.WELSH_ROUTE_BRANCH ? window.WELSH_ROUTE_BRANCH(name) : openBranch(name, button));
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
    directoryPanel.hidden = true;
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
        button.innerHTML = `<span class="resource-kind">${resourceKind(collection)}</span><strong>${collection.name}</strong><small>${number.format(records.length)} item${records.length === 1 ? "" : "s"}</small><span class="resource-provenance">${resourceProvenance(collection)}</span>`;
        const online = catalog.edition !== "public" || (collection.availability?.online && collection.publicStorage);
        if (online) button.addEventListener("click", () => openCollection(collection, { keepResources: true, initialView: records.some((record) => record.type === "image") ? "continuous" : "index" }));
        else {
          button.classList.add("unavailable");
          button.disabled = true;
          button.insertAdjacentHTML("beforeend", '<span class="availability-note">Images are preserved in the local and portable editions but are not yet published online.</span>');
        }
        return button;
      }));
    }
    sidebar.classList.remove("open");
    menu.setAttribute("aria-expanded", "false");
  }

  window.WELSH_OPEN_BRANCH = openBranch;

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
      pageImage.dataset.rotation = String(imageRotations.get(index) || 0);
      applyImageTransform(pageImage);
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

  function renderScrollable(targetIndex = currentImage) {
    continuousView.replaceChildren();
    continuousView.classList.remove("facing-current");
    currentRecords.forEach((record, index) => continuousView.append(makeRecordFigure(record, index)));
    startLazyLoading();
    requestAnimationFrame(() => {
      scrollContinuousToPage(targetIndex, "start", "auto");
      startPagePositionTracking();
    });
  }

  function scrollContinuousToPage(index, block = "start", behavior = "smooth") {
    const boundedIndex = Math.max(0, Math.min(index, currentRecords.length - 1));
    const page = continuousView.querySelector(`[data-page-index="${boundedIndex}"]`);
    if (!page) return;
    currentImage = boundedIndex;
    page.scrollIntoView({ behavior, block, inline: "nearest" });
    position.textContent = `Page ${number.format(currentImage + 1)} of ${number.format(currentRecords.length)} · full-resolution source`;
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

  function makeLineGuide(side) {
    const guide = document.createElement("button");
    guide.type = "button";
    guide.className = "ledger-guide";
    guide.dataset.side = String(side);
    guide.style.top = `${lineGuidePositions[side]}%`;
    guide.style.setProperty("--guide-angle", `${lineGuideAngle}deg`);
    guide.style.setProperty("--guide-spacing", `${lineGuideSpacing / 2}px`);
    guide.setAttribute("aria-label", `Adjust ${side === 0 ? "left" : "right"} ledger row guide`);
    guide.title = "Drag this line up or down";
    guide.addEventListener("pointerdown", (event) => {
      guide.setPointerCapture?.(event.pointerId);
      const page = guide.parentElement;
      const move = (moveEvent) => {
        const box = page.getBoundingClientRect();
        const percent = Math.max(2, Math.min(98, ((moveEvent.clientY - box.top) / box.height) * 100));
        lineGuidePositions[side] = percent;
        guide.style.top = `${percent}%`;
      };
      guide.addEventListener("pointermove", move);
      const stop = () => guide.removeEventListener("pointermove", move);
      guide.addEventListener("pointerup", stop, { once: true });
      guide.addEventListener("pointercancel", stop, { once: true });
      event.preventDefault();
    });
    guide.addEventListener("keydown", (event) => {
      if (["ArrowUp", "ArrowDown"].includes(event.key)) {
        lineGuidePositions[side] = Math.max(2, Math.min(98, lineGuidePositions[side] + (event.key === "ArrowUp" ? -1 : 1)));
        guide.style.top = `${lineGuidePositions[side]}%`;
        event.preventDefault();
      }
      if (["[", "]"].includes(event.key)) { lineGuideAngle = Math.max(-8, Math.min(8, lineGuideAngle + (event.key === "[" ? -.5 : .5))); updateGuideDisplay(); event.preventDefault(); }
    });
    return guide;
  }

  function updateGuideDisplay() {
    guideAngleOutput.textContent = `${lineGuideAngle.toFixed(1).replace(".0", "")}°`;
    continuousView.querySelectorAll(".ledger-guide").forEach((guide) => {
      guide.style.setProperty("--guide-angle", `${lineGuideAngle}deg`);
      guide.style.setProperty("--guide-spacing", `${lineGuideSpacing / 2}px`);
    });
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
    indexes.forEach((index, side) => {
      if (index == null) spread.append(Object.assign(document.createElement("div"), { className: "blank-page", ariaHidden: "true" }));
      else {
        const page = makeRecordFigure(currentRecords[index], index);
        if (lineGuidesEnabled) page.append(makeLineGuide(side));
        spread.append(page);
      }
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
    facingPageWidth = Math.max(120, Math.min(1600, Math.round(width)));
    continuousView.classList.remove("fit-spread");
    continuousView.style.setProperty("--facing-page-width", `${facingPageWidth}px`);
  }

  function fitFacingSpread() {
    continuousView.classList.add("fit-spread");
    continuousView.style.removeProperty("--facing-page-width");
    continuousView.scrollLeft = 0;
  }

  function setView(mode) {
    if (viewMode === "continuous" && mode !== "continuous") syncCurrentPageFromScroll();
    const savedPage = currentImage;
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
    lineGuideTool.hidden = !facing;
    guideControls.hidden = !facing || !lineGuidesEnabled;
    jumpFirstPage.hidden = mode !== "continuous";
    jumpLastPage.hidden = mode !== "continuous";
    setPanEnabled(false);
    facingTools.hidden = !facing;
    if (!facing) facingTools.open = false;
    if (mode === "continuous") renderScrollable(savedPage);
    if (facing) {
      fitFacingSpread();
      renderFacingPair();
    }
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
    [stage, continuousView].forEach((surface) => surface.querySelectorAll("img.pan-moved, img.image-zoomed").forEach((item) => {
      item.classList.remove("pan-moved");
      item.classList.remove("image-zoomed");
      item.style.removeProperty("transform");
      item.style.removeProperty("transform-origin");
      delete item.dataset.panX;
      delete item.dataset.panY;
      delete item.dataset.imageZoom;
    }));
  }

  function applyImageTransform(item) {
    const panX = Number(item.dataset.panX || 0);
    const panY = Number(item.dataset.panY || 0);
    const zoom = Number(item.dataset.imageZoom || 1);
    const rotation = Number(item.dataset.rotation || 0);
    item.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom}) rotate(${rotation}deg)`;
  }

  function rotateVisibleImages(delta, reset = false) {
    const targets = viewMode === "single" ? [image] : [...continuousView.querySelectorAll("img")].filter((item) => {
      const box = item.getBoundingClientRect(); return box.bottom > 0 && box.top < innerHeight;
    });
    targets.forEach((item) => { const index = Number(item.closest("[data-page-index]")?.dataset.pageIndex ?? currentImage); const angle = reset ? 0 : Math.max(-10, Math.min(10, Number(item.dataset.rotation || imageRotations.get(index) || 0) + delta)); item.dataset.rotation = String(angle); imageRotations.set(index, angle); applyImageTransform(item); });
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
      applyImageTransform(panTarget);
    });
    const stop = () => { dragging = false; panTarget = null; surface.classList.remove("is-panning"); };
    surface.addEventListener("pointerup", stop);
    surface.addEventListener("pointercancel", stop);
  }

  function enableImageWheelZoom(surface) {
    surface.addEventListener("wheel", (event) => {
      if (!event.ctrlKey) return;
      const target = event.target.closest("img");
      if (!target) return;
      event.preventDefault();
      const currentZoom = Number(target.dataset.imageZoom || 1);
      const nextZoom = Math.max(.5, Math.min(4, currentZoom * (event.deltaY < 0 ? 1.12 : .89)));
      const box = target.getBoundingClientRect();
      const originX = Math.max(0, Math.min(100, ((event.clientX - box.left) / box.width) * 100));
      const originY = Math.max(0, Math.min(100, ((event.clientY - box.top) / box.height) * 100));
      target.style.transformOrigin = `${originX}% ${originY}%`;
      target.dataset.imageZoom = String(nextZoom);
      target.classList.toggle("image-zoomed", Math.abs(nextZoom - 1) > .01);
      applyImageTransform(target);
      if (!panEnabled) setPanEnabled(true);
    }, { passive: false });
  }

  function openCollection(collection, options = {}) {
    const { keepResources = false, initialView = "index" } = options;
    currentCollection = collection;
    currentRecords = visibleRecords(collection);
    currentImage = 0;
    imageRotations.clear();
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

  window.WELSH_OPEN_COLLECTION = openCollection;

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
      image.dataset.rotation = String(imageRotations.get(currentImage) || 0);
      applyImageTransform(image);
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
  facingZoomFit.addEventListener("click", fitFacingSpread);
  swapFacingPages.addEventListener("click", () => {
    const indexes = facingIndexes();
    const spreadKey = indexes.map((index) => index ?? "blank").join("-");
    if (swappedSpreads.has(spreadKey)) swappedSpreads.delete(spreadKey);
    else swappedSpreads.add(spreadKey);
    renderFacingPair();
  });
  panTool.addEventListener("click", () => setPanEnabled(!panEnabled));
  resetPan.addEventListener("click", resetPannedImages);
  lineGuideTool.addEventListener("click", () => {
    lineGuidesEnabled = !lineGuidesEnabled;
    lineGuideTool.classList.toggle("active", lineGuidesEnabled);
    lineGuideTool.setAttribute("aria-pressed", String(lineGuidesEnabled));
    guideControls.hidden = !lineGuidesEnabled;
    renderFacingPair();
  });
  $("#guideRotateLeft").addEventListener("click", () => { lineGuideAngle = Math.max(-8, lineGuideAngle - .5); updateGuideDisplay(); });
  $("#guideRotateRight").addEventListener("click", () => { lineGuideAngle = Math.min(8, lineGuideAngle + .5); updateGuideDisplay(); });
  $("#guideNarrow").addEventListener("click", () => { lineGuideSpacing = Math.max(2, lineGuideSpacing - 2); updateGuideDisplay(); });
  $("#guideWiden").addEventListener("click", () => { lineGuideSpacing = Math.min(80, lineGuideSpacing + 2); updateGuideDisplay(); });
  $("#guideReset").addEventListener("click", () => { lineGuideAngle = 0; lineGuideSpacing = 12; lineGuidePositions[0] = 38; lineGuidePositions[1] = 38; renderFacingPair(); updateGuideDisplay(); });
  imageTools.addEventListener("click", (event) => { if (event.target.dataset.rotateReset !== undefined) rotateVisibleImages(0, true); else if (event.target.dataset.rotate) rotateVisibleImages(Number(event.target.dataset.rotate)); });
  jumpFirstPage.addEventListener("click", () => scrollContinuousToPage(0));
  jumpLastPage.addEventListener("click", () => scrollContinuousToPage(currentRecords.length - 1, "end"));
  enableDragPan(stage);
  enableDragPan(continuousView);
  enableImageWheelZoom(stage);
  enableImageWheelZoom(continuousView);
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

  if (registry.length) renderBrowse();
  else fetch("data/branch-registry.json").then((response) => response.json()).then((data) => {
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
