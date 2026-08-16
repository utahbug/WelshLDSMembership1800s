(() => {
  const catalog = window.WELSH_RECORD_CATALOG;
  const typedSourceCollection = catalog.collections.find((collection) => collection.name === "General transcriptions and indexes"
    && collection.images.some((record) => record.name === "A - CDs 60-62 - Typed Transcripts.pdf"));

  function addContextualDocumentCollection({ id, name, aliases, sourceFile, page }) {
    if (!typedSourceCollection || catalog.collections.some((collection) => collection.id === id)) return;
    const sourceRecord = typedSourceCollection.images.find((record) => record.name === sourceFile);
    if (!sourceRecord) return;
    const pageCollection = catalog.collections.find((collection) => collection.sourcePdf === sourceFile && collection.viewerRepresentation);
    const pageCollectionAvailable = catalog.edition !== "public"
      || Boolean(pageCollection?.availability?.online && pageCollection?.publicStorage);
    if (pageCollection && pageCollectionAvailable) {
      catalog.collections.push({ ...pageCollection, id, name, aliases, virtualSourceCollection: pageCollection.id, preferredInitialPage: page || 1 });
      return;
    }
    const pageFragment = page ? `#page=${page}` : "";
    catalog.collections.push({
      id,
      name,
      aliases,
      category: "LDS conference and district minutes",
      sources: typedSourceCollection.sources,
      availability: { ...typedSourceCollection.availability },
      publicStorage: typedSourceCollection.publicStorage,
      images: [{
        ...sourceRecord,
        url: sourceRecord.url ? `${sourceRecord.url}${pageFragment}` : sourceRecord.url,
        serveUrl: sourceRecord.serveUrl ? `${sourceRecord.serveUrl}${pageFragment}` : sourceRecord.serveUrl,
      }],
    });
  }

  addContextualDocumentCollection({
    id: "context-cwmbran-minutes",
    name: "Cwmbran reports in Pontypool/Abersychan General Minutes, 1857-1889",
    aliases: ["Cwmbran branch condition reports", "Cwmbran baptisms and additions", "CDs 60-62", "CD 62", "LR708611"],
    sourceFile: "A - CDs 60-62 - Typed Transcripts.pdf",
    page: 129,
  });
  addContextualDocumentCollection({
    id: "context-morriston-conference",
    name: "Morriston report in Western Glamorgan Conference Minutes, 1851-1870",
    aliases: ["Morriston fast offerings 1866", "Western Glamorgan Conference", "CD 41", "LR1761721"],
    sourceFile: "A - CDs 40-43 (2 of 2) - Typed Transcripts.pdf",
    page: 83,
  });
  addContextualDocumentCollection({
    id: "context-welsh-conference-minutes",
    name: "Welsh District and Conference General Minutes, 1849-1911 (typed extract)",
    aliases: ["Welsh Conference minutes", "Welsh District general minutes", "CD 43", "LR1001111"],
    sourceFile: "A - CDs 40-43 (2 of 2) - Typed Transcripts.pdf",
    page: 105,
  });
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
  const branchHeadingYears = $("#branchHeadingYears");
  const branchHeadingDetails = $("#branchHeadingDetails");
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
  const pageIndexButton = $("#pageIndexButton");
  pageIndexButton.textContent = "▦";
  const tiltIcon = $("#imageTools summary svg");
  if (tiltIcon) tiltIcon.innerHTML = '<path d="M3 13.9 21 10.1"/>';
  const pageIndexPanel = $("#pageIndexPanel");
  const closePageIndex = $("#closePageIndex");
  const continuousView = $("#continuousView");
  const previous = $("#previousImage");
  const next = $("#nextImage");
  const branchesButton = $("#branchesButton");
  const branchPicker = $("#branchPicker");
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
  const facingScale = $("#facingScale");
  const swapFacingPages = $("#swapFacingPages");
  const spreadModeToggle = $("#spreadModeToggle");
  const resetSpread = $("#resetSpread");
  const panTool = $("#panTool");
  const jumpFirstPage = $("#jumpFirstPage");
  const jumpLastPage = $("#jumpLastPage");
  const lineGuideTool = $("#lineGuideTool");
  const guideControls = $("#guideControls");
  const guideAngleOutput = $("#guideAngle");
  const activePageIndicator = $("#activePageIndicator");
  const imageTools = $("#imageTools");
  const temporaryToolPopovers = [
    ...document.querySelectorAll(".view-toolbar details.image-tools, .view-toolbar details.image-adjustments, .view-toolbar details.scale-tools"),
    guideControls,
  ];
  lineGuideTool.setAttribute("aria-controls", guideControls.id);
  lineGuideTool.setAttribute("aria-expanded", String(!guideControls.hidden));
  const brightnessValue = $("#brightnessValue");
  const contrastValue = $("#contrastValue");
  const brightnessSlider = $("#brightnessSlider");
  const contrastSlider = $("#contrastSlider");
  const enhanceStatus = $("#enhanceStatus");
  const rotationTarget = $("#rotationTarget");
  const viewerBranchResourcesLink = $("#viewerBranchResourcesLink");
  const viewerStickyHeader = $(".viewer-sticky-header");
  const viewerStickySentinel = $("#viewerStickySentinel");
  const branchResourceBreadcrumbs = $("#branchResourceBreadcrumbs");
  const branchBreadcrumbName = $("#branchBreadcrumbName");
  const viewContext = $("#viewContext");
  const number = new Intl.NumberFormat("en-US");
  let stickyStateFrame = 0;
  function updateViewerStickyState() {
    stickyStateFrame = 0;
    if (viewer.hidden) {
      viewerStickyHeader.classList.remove("is-stuck");
      return;
    }
    const triggerTop = viewerStickySentinel.getBoundingClientRect().top;
    if (!viewerStickyHeader.classList.contains("is-stuck") && triggerTop <= 0) {
      viewerStickyHeader.classList.add("is-stuck");
    } else if (viewerStickyHeader.classList.contains("is-stuck") && (triggerTop >= 96 || window.scrollY <= 1)) {
      viewerStickyHeader.classList.remove("is-stuck");
    }
  }
  function queueViewerStickyState() {
    if (!stickyStateFrame) stickyStateFrame = requestAnimationFrame(updateViewerStickyState);
  }
  window.addEventListener("scroll", queueViewerStickyState, { passive: true });
  window.addEventListener("resize", queueViewerStickyState);
  const minutesCdByCall = new Map(Object.entries({
    "141622": "35", "122087": "36", "241210": "37", "1761621": "38", "984611": "39",
    "1761622": "40", "1761721": "41", "1175711": "42/55", "1001111": "43/60",
    "1272711": "44", "1201521": "45", "886310": "46", "101123": "47", "1240410": "48",
    "1314511": "49", "1219911": "50", "1175911": "51", "1128011": "52", "1128021": "53",
    "1175710": "54", "1277011": "56", "1240421": "57", "1134311": "58", "1115222": "59",
    "886311": "61", "708611": "62",
  }));

  let registry = window.WELSH_BRANCH_REGISTRY?.registry || [];
  const contextualBranchMetadata = new Map([
    ["Cwmbran", {
      localCd: true,
      localNote: true,
      comparisonStatus: "Contextual typed minutes evidence; dedicated member register not recovered",
      filmAndCallNumbers: "CD 62 within source group CDs 60-62; LR 70861 1; Pontypool/Abersychan General Minutes, 1857-1889; Cwmbran reports on typed PDF pages 129, 167, 169, 171-172, 176; Film 104168 Item 13 retained as legacy discovery metadata",
      notes: "Cwmbran is repeatedly attested in branch-condition, missionary, baptism/addition, and appointment reports. This is contextual minutes evidence, not a dedicated Record of Members.",
    }],
    ["Morriston", {
      localCd: true,
      localNote: true,
      comparisonStatus: "Contextual conference-minutes evidence; dedicated member register not recovered",
      filmAndCallNumbers: "CD 41; LR 17617 21; Western Glamorgan Conference Minutes, 1851-1870; Morriston fast-offerings report, 1866; Film 104172 Item 5 retained as legacy discovery metadata",
      notes: "Morriston is explicitly attested by a 1866 fast-offerings report in the enclosing conference minutes. This is contextual conference material, not a dedicated Record of Members.",
    }],
  ]);
  registry.forEach((branch) => Object.assign(branch, contextualBranchMetadata.get(branch.canonicalName) || {}));
  let currentCollection = null;
  let currentRecords = [];
  let currentImage = 0;
  let selectedImageIndex = null;
  let currentCategory = "All collections";
  let browseMode = "branches";
  let viewMode = "index";
  let currentBranchName = "";
  let activeFacingSide = 0;
  let renderedFacingIndexes = [0, 1];
  let facingPairOffset = 0;
  let facingSelectionLocked = false;
  let lazyObserver = null;
  let pagePositionObserver = null;
  let facingScrollFrame = null;
  let resizingSidebar = false;
  let panEnabled = false;
  let lineGuidesEnabled = false;
  let spreadAdjustmentMode = false;
  const pageStates = new Map();
  const spreadStates = new Map();
  const swappedSpreads = new Set();

  function pageState(index) {
    if (!pageStates.has(index)) pageStates.set(index, { rotation: 0, scale: 1, brightness: 1, contrast: 1, guidePosition: 38, guideAngle: 0, guideSpacing: 12 });
    return pageStates.get(index);
  }

  function spreadState(key) {
    if (!spreadStates.has(key)) spreadStates.set(key, { scale: 1, panX: 0, panY: 0, originX: 50, originY: 50 });
    return spreadStates.get(key);
  }

  function activeFacingSpread() {
    return continuousView.querySelector(".active-facing-spread")
      || continuousView.querySelector(`[data-page-index="${selectedImageIndex ?? currentImage}"]`)?.closest(".page-spread")
      || continuousView.querySelector(".page-spread");
  }

  function spreadContent(spread = activeFacingSpread()) {
    return spread?.querySelector(":scope > .facing-spread-content") || null;
  }

  function applySpreadTransform(content) {
    if (!content) return;
    const state = spreadState(content.closest(".page-spread").dataset.spreadKey);
    content.style.transformOrigin = `${state.originX}% ${state.originY}%`;
    content.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.scale})`;
    content.classList.toggle("spread-adjusted", Math.abs(state.scale - 1) > .01 || state.panX !== 0 || state.panY !== 0);
  }

  function updateSpreadModeDisplay() {
    spreadModeToggle.classList.toggle("active", spreadAdjustmentMode);
    spreadModeToggle.setAttribute("aria-pressed", String(spreadAdjustmentMode));
    spreadModeToggle.title = spreadAdjustmentMode
      ? "Spread mode active: pan and zoom both pages together"
      : "Individual-page mode active; activate to pan and zoom both pages together";
    resetSpread.hidden = viewMode !== "facing" || !spreadAdjustmentMode;
    const scaleSummary = facingTools.querySelector(".scale-tools summary");
    const target = spreadAdjustmentMode ? "facing spread" : "selected page";
    scaleSummary.setAttribute("aria-label", `Zoom/Scale ${target}`);
    scaleSummary.title = `Zoom/Scale ${target}`;
  }

  function temporaryToolPopoverIsOpen(popover) {
    return popover instanceof HTMLDetailsElement ? popover.open : !popover.hidden;
  }

  function setGuideControlsOpen(open) {
    guideControls.hidden = !open;
    lineGuideTool.setAttribute("aria-expanded", String(open));
  }

  function closeTemporaryToolPopovers(except = null) {
    temporaryToolPopovers.forEach((popover) => {
      if (popover === except) return;
      if (popover instanceof HTMLDetailsElement) popover.removeAttribute("open");
      else setGuideControlsOpen(false);
    });
  }

  function selectedFacingIndex() {
    return renderedFacingIndexes[activeFacingSide] ?? renderedFacingIndexes.find((index) => index != null) ?? currentImage;
  }

  function selectedGuideIndex() {
    return viewMode === "facing" ? selectedFacingIndex() : (selectedImageIndex ?? currentImage);
  }

  function selectFacingSide(side) {
    activeFacingSide = Number(side) === 1 && renderedFacingIndexes[1] != null ? 1 : 0;
    rotationTarget.value = activeFacingSide ? "right" : "left";
    selectedImageIndex = selectedFacingIndex();
    activePageIndicator.querySelector("span").textContent = `${activeFacingSide ? "Right" : "Left"} page ${selectedFacingIndex() + 1}`;
    const activeSpread = continuousView.querySelector(".active-facing-spread");
    continuousView.querySelectorAll(".scroll-page").forEach((page) => page.classList.toggle(
      "active-facing-page",
      page.closest(".page-spread") === activeSpread && Number(page.dataset.facingSide) === activeFacingSide,
    ));
    updateGuideDisplay();
    updateScaleDisplay();
    updateImageAdjustmentDisplay();
  }

  if (!catalog) {
    directoryPanel.innerHTML = "<h2>Catalog not generated</h2><p>Run the catalog builder before opening this viewer.</p>";
    return;
  }

  function recordUrls(record) {
    if (catalog.edition === "public" && currentCollection?.publicStorage?.baseUrl) {
      if (currentCollection.publicStorage.provider === "internet-archive") {
        if (!record.archiveRelativePath) {
          console.error("Archive.org path missing for catalog record", { collection: currentCollection.name, record: record.name });
          return [];
        }
        const encodedPath = record.archiveRelativePath
          .replaceAll("\\", "/")
          .split("/")
          .map((segment) => encodeURIComponent(segment))
          .join("/");
        return [currentCollection.publicStorage.baseUrl, ...(currentCollection.publicStorage.fallbackBaseUrls || [])]
          .map((baseUrl) => `${baseUrl}${encodedPath}`);
      }
      return [`${currentCollection.publicStorage.baseUrl}${encodeURIComponent(record.name)}`];
    }
    return [location.protocol === "http:" || location.protocol === "https:" ? record.serveUrl : record.url].filter(Boolean);
  }

  function recordUrl(record) {
    return recordUrls(record)[0] || "";
  }

  function prepareRecordImage(image, record) {
    // Record images are displayed directly and are never read into a canvas.
    // Keep Archive.org delivery as an ordinary <img> request so redirects do
    // not become CORS-gated image loads (notably in mobile Safari).
    image.removeAttribute("crossorigin");
  }

  function prepareImageLoadFeedback(image, retry) {
    image._welshImageRetry = retry;
    if (image.dataset.loadFeedbackReady) return;
    image.dataset.loadFeedbackReady = "true";
    const status = document.createElement("span");
    status.className = "image-load-status";
    status.setAttribute("role", "status");
    const message = document.createElement("span");
    const retryButton = document.createElement("button");
    retryButton.type = "button";
    retryButton.textContent = "Retry";
    retryButton.hidden = true;
    retryButton.addEventListener("click", () => image._welshImageRetry?.());
    status.append(message, retryButton);
    image.insertAdjacentElement("afterend", status);
    image.addEventListener("load", () => {
      clearTimeout(image._welshImageLoadTimer);
      image.parentElement?.classList.remove("image-loading", "image-load-error");
      status.hidden = true;
    });
    image.addEventListener("error", () => {
      clearTimeout(image._welshImageLoadTimer);
      if (image._welshTryNextSource?.()) return;
      image.parentElement?.classList.remove("image-loading");
      image.parentElement?.classList.add("image-load-error");
      message.textContent = "Record image could not be loaded.";
      retryButton.hidden = false;
      status.hidden = false;
    });
  }

  function loadRecordImage(image, sources, retry, loadingText = "Loading record image…") {
    const candidates = [...new Set((Array.isArray(sources) ? sources : [sources]).filter(Boolean))];
    const restart = retry || (() => loadRecordImage(image, candidates, undefined, loadingText));
    prepareImageLoadFeedback(image, restart);
    const status = image.parentElement?.querySelector(":scope > .image-load-status");
    const message = status?.querySelector("span");
    const retryButton = status?.querySelector("button");
    image.parentElement?.classList.remove("image-load-error");
    image.parentElement?.classList.add("image-loading");
    if (message) message.textContent = loadingText;
    if (retryButton) retryButton.hidden = true;
    if (status) status.hidden = false;
    if (!candidates.length) {
      image.parentElement?.classList.remove("image-loading");
      image.parentElement?.classList.add("image-load-error");
      if (message) message.textContent = "Image path is unavailable.";
      if (retryButton) retryButton.hidden = false;
      return;
    }
    let sourceIndex = 0;
    const showFailure = () => {
      image.parentElement?.classList.remove("image-loading");
      image.parentElement?.classList.add("image-load-error");
      if (message) message.textContent = "Record image could not be loaded.";
      if (retryButton) retryButton.hidden = false;
      if (status) status.hidden = false;
    };
    const trySource = () => {
      clearTimeout(image._welshImageLoadTimer);
      image.src = candidates[sourceIndex];
      image._welshImageLoadTimer = setTimeout(() => {
        if (!image._welshTryNextSource?.()) showFailure();
      }, 12000);
    };
    image._welshTryNextSource = () => {
      if (sourceIndex + 1 >= candidates.length) return false;
      sourceIndex += 1;
      trySource();
      return true;
    };
    trySource();
  }

  function normalized(value) {
    return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/\bff/g, "f").replace(/[^a-z0-9]/g, "");
  }

  function displayTitle(value) {
    return String(value ?? "").replace(/,(?=\S)/g, ", ");
  }

  const collectionBranchAssignments = new Map([
    ["Cwmbran reports in Pontypool/Abersychan General Minutes, 1857-1889", new Set(["Cwmbran"])],
    ["Morriston report in Western Glamorgan Conference Minutes, 1851-1870", new Set(["Morriston"])],
    ["Welsh Conference,Record of Members,Early-1892,Library1614", new Set(["Welsh Conference"])],
    ["Welsh Conference,Record of Members,1887-1901,Library3114", new Set(["Welsh Conference"])],
    ["Welsh Conference,Record of Members,Early-1911,Library3118-partial", new Set(["Welsh Conference"])],
    ["Welsh Conference,Incomplete Conference Minutes,1884,LR1001123", new Set(["Welsh Conference"])],
    ["Welsh District and Conference General Minutes, 1849-1911 (typed extract)", new Set(["Welsh Conference"])],
    ["Cwmtillery,1847-1857,LR1887", new Set(["Cwmtillery"])],
    ["Trinant,1849-1853,Library859", new Set(["Trinant"])],
    ["Crumlin,1857-1862,Library859", new Set(["Crumlin"])],
    ["Machen,1854-1865,Library1565-or-1765", new Set(["Machen"])],
    ["Twyncarno,1856-1857,Library1602", new Set(["Twyncarno"])],
    ["Pontlanfraith,Early-to-1947,Library27560", new Set(["Pontlanfraith"])],
    ["Abertillery,1861-1866,LR1957", new Set(["Abertillery"])],
    ["Cog,1848-1876,LR1097", new Set(["Cogan"])],
    ["Ebbro Vale,1847-1864,LR98467", new Set(["Ebbw Vale"])],
    ["Llanelli,1847-1868,LR117577", new Set(["Llanelli"])],
    ["Treorchy,1874-1882,LR1727", new Set(["Treorchy"])],
    ["Llanelltyd,1850-1857,LR1727", new Set(["Llanelltyd"])],
    ["Cwm Saerbren,1858-1874,LR1727", new Set(["Cwm Saerbren"])],
    ["Llansawel,1849-1855,LR2217", new Set(["Llansawel (Carmarthenshire)"])],
    ["Llansawel (Glamorgan),1850-1889,LR117597", new Set(["Llansawel (Glamorgan)"])],
    // Retain the complete physical holding in the catalog for provenance, but
    // do not present it as a second branch resource. The bounded virtual
    // collection above is the researcher-facing Glamorgan section.
    ["Llansawel,1850-1889,LR117597", new Set()],
    ["Nantyglo,1846-1867,LR1747", new Set(["Nantyglo"])],
    ["Coalbrookvale,1856-1867,LR1747", new Set(["Coalbrookvale"])],
    ["Haverfordwest,1847-1853,LR1134321", new Set(["Haverfordwest"])],
    ["Haverfordwest,1852-1860,CR1134311-v2", new Set(["Haverfordwest"])],
    ["Llandebie,1849-1886,LR1137", new Set(["Llandebie"])],
    ["Castell Nedd,1879-1884,LR1967", new Set(["Castell Nedd (Neath)"])],
    ["Rhymney English,1851-1887,LIB1602-direct-FHC", new Set(["Rhymney English"])],
    ["Llanelly-production", new Set(["Llanelli"])],
  ]);

  const collectionDisplayNames = new Map([
    ["A - CDs 35-39 (1 of 2) - Typed Transcripts - Viewer Pages", "Cardiff Donations and Branch Records"],
    ["A - CDs 35-39 (2 of 2) - Typed Transcripts - Viewer Pages", "East Glamorgan Conference Minutes, 1853–1863"],
    ["A - CDs 39 - Typed Transcripts - Viewer Pages", "Ebbw Vale General Minutes, 1852–1854"],
    ["A - CDs 40-43 (1 of 2) - Typed Transcripts - Viewer Pages", "Welsh Branch and Conference Records, 1851–1870"],
    ["A - CDs 40-43 (2 of 2) - Typed Transcripts - Viewer Pages", "East Glamorgan Conference, 1851–1852"],
    ["A - CDs 44-59 - Typed Transcripts - Viewer Pages", "Welsh Branch and Conference Records"],
    ["A - CDs 60-62 - Typed Transcripts - Viewer Pages", "Welsh District and General Minutes"],
    ["Cwmbran reports in Pontypool/Abersychan General Minutes, 1857-1889", "Cwmbran reports in Pontypool/Abersychan General Minutes, 1857-1889"],
    ["Morriston report in Western Glamorgan Conference Minutes, 1851-1870", "Morriston report in Western Glamorgan Conference Minutes, 1851-1870"],
    ["Welsh Conference,Record of Members,Early-1892,Library1614", "Welsh Conference Record of Members, early to 1892"],
    ["Welsh Conference,Record of Members,1887-1901,Library3114", "Welsh Conference Record of Members, 1887-1901"],
    ["Welsh Conference,Record of Members,Early-1911,Library3118-partial", "Welsh Conference Record of Members, early to 1911 (partial local capture)"],
    ["Welsh Conference,Incomplete Conference Minutes,1884,LR1001123", "Welsh Conference incomplete semi-annual conference minutes, 1884"],
    ["Welsh District and Conference General Minutes, 1849-1911 (typed extract)", "Welsh District and Conference General Minutes, 1849-1911 (typed extract)"],
    ["Cwmtillery,1847-1857,LR1887", "Cwmtillery Branch Record of Members, 1847-1857"],
    ["Trinant,1849-1853,Library859", "Trinant Branch surviving Record of Members page, 1849-1853"],
    ["Crumlin,1857-1862,Library859", "Crumlin Branch Record of Members, 1857-1862"],
    ["Machen,1854-1865,Library1565-or-1765", "Machen Branch Record of Members, 1854-1865"],
    ["Twyncarno,1856-1857,Library1602", "Twyn Carno Branch Record of Members, 1856-1857"],
    ["Pontlanfraith,Early-to-1947,Library27560", "Record of Members — Early to 1947"],
    ["Abertillery,1861-1866,LR1957", "Abertillery Branch Record of Members, 1861-1866"],
    ["Llanfabon 1847-1869,LR1687", "Llanfabon Branch Record of Members, 1847-1869"],
    ["Llanelli,1847-1868,LR117577", "Llanelly Branch Record of Members, 1847-1868"],
    ["Llanelltyd,1850-1882,LR1727", "Compound volume: Llanelltyd, Cwm Saerbren, and Treorky, 1850-1882"],
    ["Llanelltyd,1850-1857,LR1727", "Llanelltyd Branch Record of Members, 1850-1857"],
    ["Cwm Saerbren,1858-1874,LR1727", "Cwm Saerbren Branch Record of Members, 1858-1874"],
    ["Treorchy,1874-1882,LR1727", "Treorky / Treorchy records, 1874-1882"],
    ["Coalbrookvale,1856-1867,LR1747", "Coal Brook Vale / Blaina records, 1856-1867"],
    ["Haverfordwest,1847-1853,LR1134321", "Haverfordwest Volume 1: Members and Historical Record, 1847-1853"],
    ["Haverfordwest,1852-1860,CR1134311-v2", "Haverfordwest Volume 2: Historical Record 1852-1854; Members 1857-1860"],
    ["Llandebie,1849-1886,LR1137", "Llandebie Branch Record of Members, 1849-1866"],
    ["Castell Nedd,1879-1884,LR1967", "Castell Nedd Branch Record of Members, 1849-1884"],
    ["Rhymney English,1851-1887,LIB1602-direct-FHC", "Rhymney English Branch Record of Members, 1851-1887"],
    ["Llanelly-production", "Llanelly mixed source holding"],
    ["Llansawel,1849-1855,LR2217", "Llansawel Branch Record of Members, 1849-1855 (Carmarthenshire)"],
    ["Llansawel (Glamorgan),1850-1889,LR117597", "Llansawel Branch Record, 1850-1889 (Glamorgan section)"],
    ["Cardiff Confererence,1857-1869,LR241210", "Cardiff Conference, 1857-1869, LR241210"],
  ]);

  const collectionProvenanceOverrides = new Map([
    ["Cwmbran reports in Pontypool/Abersychan General Minutes, 1857-1889", "Typed branch reports in Pontypool/Abersychan General Minutes · CD 62 within source group CDs 60-62 · LR708611 · PDF pages 129, 167, 169, 171-172, and 176"],
    ["Morriston report in Western Glamorgan Conference Minutes, 1851-1870", "Western Glamorgan Conference Minutes · CD 41 · LR1761721 · explicit Morriston fast-offerings report, 1866 · typed source page 83"],
    ["Welsh Conference,Record of Members,Early-1892,Library1614", "Direct-FHC microfilm components 345-393 · Library 1614 · Film 104172 context · 49 permanent viewer images"],
    ["Welsh Conference,Record of Members,1887-1901,Library3114", "Direct-FHC microfilm components 394-444 · Library 3114 · component 428 absent from the recovered local sequence · 50 permanent viewer images"],
    ["Welsh Conference,Record of Members,Early-1911,Library3118-partial", "Direct-FHC microfilm components 445-474 · Library 3118 · component 462 and continuation after 474 not recovered · 29 permanent viewer images"],
    ["Welsh Conference,Incomplete Conference Minutes,1884,LR1001123", "LR1001123 · incomplete semi-annual district-conference minutes · two authoritative full-resolution images; thumbnail excluded"],
    ["Welsh District and Conference General Minutes, 1849-1911 (typed extract)", "Typed branch-record extract · CD 43 · LR1001111 · source PDF begins at page 105"],
    ["Cwmtillery,1847-1857,LR1887", "CD 8 / LR 188 7 / photographed library identifier 859 / recovered full-resolution images"],
    ["Trinant,1849-1853,Library859", "Direct-FHC microfilm PDF fallback / photographed library identifier 859 / source label and surviving closing register page"],
    ["Crumlin,1857-1862,Library859", "Direct-FHC microfilm PDF / photographed library identifier 859 / bounded Crumlin register pages"],
    ["Machen,1854-1865,Library1565-or-1765", "Source: direct-FHC microfilm · Library 1565/1765 unresolved"],
    ["Twyncarno,1856-1857,Library1602", "Source: direct-FHC microfilm · Library 1602"],
    ["Pontlanfraith,Early-to-1947,Library27560", "Direct-FHC microfilm PDF / photographed library identifier 27560 / mixed members-and-children source"],
    ["Abertillery,1861-1866,LR1957", "CD 19 / LR 195 7 compound section / images 00046-00057 / 12 images"],
    ["Llanfabon 1847-1869,LR1687", "CD 15 / project LR1687 / photographed historical-library identifier 871 / 60 images"],
    ["Cwm Saerbren,1858-1874,LR1727", "CD 34 / LR 172 7 compound section / internal pages 6-24 / 38 images"],
    ["Treorchy,1874-1882,LR1727", "CD 34 / LR 172 7 compound sections / Treorky minutes and member register / 68 images"],
    ["Llanelltyd,1850-1857,LR1727", "CD 34 / LR 172 7 compound section / internal pages 1-5 / 10 images"],
    ["Coalbrookvale,1856-1867,LR1747", "CD 24 / LR 174 7 compound section / 83 images / membership registers 00080-00137"],
    ["Haverfordwest,1847-1853,LR1134321", "CD 23 / photographed CR 11343 11 V.1 / project source LR1134321 / 153 historical images"],
    ["Haverfordwest,1852-1860,CR1134311-v2", "CD 58 / photographed CR 11343 11 V.2 / retained filename prefix LR1134311 / 119 historical images"],
    ["Llandebie,1849-1886,LR1137", "CD 22 / project LR 113 7 / photographed library identifier 870 / 45 images"],
    ["Castell Nedd,1879-1884,LR1967", "CD 2 / project LR 196 7 / photographed source/library identifier 1544 / 112 images"],
    ["Rhymney English,1851-1887,LIB1602-direct-FHC", "Direct-FHC microfilm capture / library identifier 1602 / 57 images"],
    ["Llanelli,1847-1868,LR117577", "CD 11 · source label 1577 · recovered folder LR 11757 7 · image filename prefix LR 12451 7 (unresolved)"],
    ["Llanelltyd,1850-1882,LR1727", "CD 34 · LR 172 7 · internal starts: Llanelltyd page 1; Cwm Saerbren page 6; Treorky page 25"],
    ["Llanelly-production", "319 images · CR 11757 10 / source label 1578; CR 11757 11 / source label 1576; translation manuscript · boundaries unresolved"],
    ["Llansawel,1849-1855,LR2217", "CD 14 / LR 221 7 / photographed library identifier 318 / 28 full-resolution images"],
    ["Llansawel (Glamorgan),1850-1889,LR117597", "CD 18 / LR 11759 7 compound source / explicit Llansawel section images 00009-00048 / 40 images"],
  ]);

  const collectionResourceDescriptors = new Map([
    ["Cwmbran reports in Pontypool/Abersychan General Minutes, 1857-1889", { label: "Branch Reports in General Minutes", group: "historical" }],
    ["Morriston report in Western Glamorgan Conference Minutes, 1851-1870", { label: "Conference Report and Fast Offerings", group: "historical" }],
    ["Welsh Conference,Record of Members,Early-1892,Library1614", { label: "Record of Members", group: "primary" }],
    ["Welsh Conference,Record of Members,1887-1901,Library3114", { label: "Record of Members", group: "primary" }],
    ["Welsh Conference,Record of Members,Early-1911,Library3118-partial", { label: "Record of Members (Partial Local Capture)", group: "primary" }],
    ["Welsh Conference,Incomplete Conference Minutes,1884,LR1001123", { label: "Conference Minutes", group: "historical" }],
    ["Welsh District and Conference General Minutes, 1849-1911 (typed extract)", { label: "Typed Conference Minutes", group: "transcription" }],
    ["Cwmtillery,1847-1857,LR1887", { label: "Record of Members", group: "primary" }],
    ["Trinant,1849-1853,Library859", { label: "Surviving Record of Members", group: "primary" }],
    ["Crumlin,1857-1862,Library859", { label: "Record of Members", group: "primary" }],
    ["Machen,1854-1865,Library1565-or-1765", { label: "Record of Members", group: "primary" }],
    ["Twyncarno,1856-1857,Library1602", { label: "Record of Members", group: "primary" }],
    ["Pontlanfraith,Early-to-1947,Library27560", { label: "Members and Children", group: "primary" }],
    ["Abersychan,1849-1898,LR104687", { label: "Record of Members", group: "primary" }],
    ["Abertillery,1861-1866,LR1957", { label: "Record of Members", group: "primary" }],
    ["Alltwen,1849-1859,LR2257", { label: "Branch Record", group: "primary" }],
    ["Brechfa,1846-1875,LR110007", { label: "Branch Record", group: "primary" }],
    ["Britonferry,1850-1853,LR117597", { label: "Branch Record", group: "primary" }],
    ["Brynmawr,1848-1868,LR2157", { label: "Branch Record", group: "primary" }],
    ["Bryntroedgam,1847-1860,LR1297", { label: "Branch Record", group: "primary" }],
    ["Cardiff (1851-1867) - Donations, Expenditures, Minutes, Records", { label: "Mixed Historical Records", group: "historical" }],
    ["Cardiff Confererence,1857-1869,LR241210", { label: "Conference Record", group: "historical" }],
    ["Cardiff,1847-1876,LR14167", { label: "Record of Members", group: "primary" }],
    ["Cardiff,1851-1867,Donations,LR141622", { label: "Donations Record", group: "historical" }],
    ["Castell Nedd,1879-1884,LR1967", { label: "Record of Members", group: "primary" }],
    ["Cefn Coed-y-Cymmer,1847-1864,LR1767", { label: "Branch Record", group: "primary" }],
    ["Coalbrookvale,1856-1867,LR1747", { label: "Branch Record", group: "primary" }],
    ["Cog,1848-1876,LR1097", { label: "Record of Members", group: "primary" }],
    ["Cuffern Mountain,1849-1876,LR1987", { label: "Branch Record", group: "primary" }],
    ["Cwm Celyn,1851-1883,LR1957", { label: "Record of Members", group: "primary" }],
    ["Cwm Saerbren,1858-1874,LR1727", { label: "Record of Members", group: "primary" }],
    ["Dinas,1848-1879,LR1827", { label: "Branch Record", group: "primary" }],
    ["Dowlais,1851-1872,LR1287", { label: "Record of Members", group: "primary" }],
    ["Ebbro Vale,1847-1864,LR98467", { label: "Branch Record", group: "primary" }],
    ["Ffestiniog membership record", { label: "Record of Members", group: "primary" }],
    ["Georgetown-production", { label: "Branch Record", group: "primary" }],
    ["Gilwern,1849-1858,LR13987", { label: "Record of Members", group: "primary" }],
    ["Glamorgan East Conference,1853-1863,LR1761621", { label: "Conference Record", group: "historical" }],
    ["Gymner (1852-1857, 1863) - Minutes", { label: "Branch Minutes", group: "historical" }],
    ["Haverfordwest,1847-1853,LR1134321", { label: "Members and Historical Record", group: "primary" }],
    ["Haverfordwest,1852-1860,CR1134311-v2", { label: "Historical Record and Record of Members", group: "primary" }],
    ["Llanelltyd,1850-1882,LR1727", { label: "Compound Branch Volume", group: "historical" }],
    ["Llanelli,1847-1868,LR117577", { label: "Record of Members", group: "primary" }],
    ["Llanelltyd,1850-1857,LR1727", { label: "Record of Members", group: "primary" }],
    ["Llanelly-production", { label: "Mixed Historical Source Holding", group: "historical" }],
    ["Llanfabon 1847-1869,LR1687", { label: "Branch Record", group: "primary" }],
    ["Llandebie,1849-1886,LR1137", { label: "Record of Members", group: "primary" }],
    ["Llansawel,1849-1855,LR2217", { label: "Record of Members", group: "primary" }],
    ["Llansawel (Glamorgan),1850-1889,LR117597", { label: "Branch Record", group: "primary" }],
    ["Merthr Tydfil (1849-1857, 1861-1896)", { label: "Record of Members", group: "primary" }],
    ["Merthyr Tydfil,1843-1857 1861-1896,LR54507", { label: "Record of Members", group: "primary" }],
    ["Nantyglo,1846-1867,LR1747", { label: "Branch Record", group: "primary" }],
    ["Newport,1848-1857 1863-1866,LR60717", { label: "Branch Records", group: "primary" }],
    ["Pen-y-cae,1844-1866,LR2307", { label: "Branch Record", group: "primary" }],
    ["Pen-Y-Darran,1843-1844,Baptisms,LR122087", { label: "Baptism Record", group: "primary" }],
    ["Pontypool (and minutes from Abersychan) -2", { label: "Branch Minutes and Historical Record", group: "historical" }],
    ["Pontypridd,1877-1895,Library1612", { label: "Record of Members", group: "primary" }],
    ["Rhymney English,1851-1887,LIB1602-direct-FHC", { label: "Record of Members", group: "primary" }],
    ["Rhymney,1850-1887,LR124517", { label: "Record of Members", group: "primary" }],
    ["Stepaside,1848-1860,LR1272711", { label: "Members and Historical Record", group: "primary" }],
    ["Sutton Mountain,1853-1859,LR1277011", { label: "Members and Historical Record", group: "primary" }],
    ["Swansea-production", { label: "Historical Material and Record of Members", group: "historical" }],
    ["Swansea,1872-1879,LR88637", { label: "Record of Members", group: "primary" }],
    ["Treboth,1844-1880,LR2287", { label: "Record of Members", group: "primary" }],
    ["Tredegar District (1879-1882) - Confidential Minutes", { label: "District Minutes", group: "historical" }],
    ["Treorchy,1874-1882,LR1727", { label: "Members, Minutes, and Historical Record", group: "primary" }],
    ["Treforis,1853-1868,LR128867", { label: "Record of Members", group: "primary" }],
    ["Twynyrodyn,1852-1892,LR1657", { label: "Record of Members", group: "primary" }],
    ["Ystrad (1902-1910) - General Minutes", { label: "General Minutes", group: "historical" }],
  ]);

  function collectionDisplayName(collection) {
    if (collectionDisplayNames.has(collection?.name)) return collectionDisplayNames.get(collection.name);
    if (collection?.viewerRepresentation && /Typed Transcripts/i.test(collection?.name || "")) {
      return displayTitle(collection.name)
        .replace(/^A\s*-\s*/i, "")
        .replace(/\s*-\s*Viewer Pages$/i, "")
        .replace(/\((\d+) of (\d+)\)/i, "Part $1 of $2");
    }
    return displayTitle(collection?.name);
  }

  function collectionReference(collection = currentCollection) {
    if (collection?.name === "Llanelli,1847-1868,LR117577") return "Source label 1577 · filename identifier LR12451 7 unresolved";
    if (collection?.name === "Llanelltyd,1850-1882,LR1727") return "LR1727 · compound volume";
    if (collection?.name === "Llanelltyd,1850-1857,LR1727") return "LR1727 · Llanelltyd section";
    if (collection?.name === "Llanelly-production") return "CR11757 10 · CR11757 11 · manuscript 1576";
    if (collection?.name === "Treorchy,1874-1882,LR1727") return "LR1727 - Treorky / Treorchy sections";
    const library = collection?.name?.match(/Library\s*(\d+)/i)?.[1];
    if (library) return `Library ${library}`;
    return displayTitle(collection?.name).match(/\b(?:LR|CR)\s*\d+(?:\s+\d+)?\b/i)?.[0].replace(/\s+/g, "") || "Source reference not identified";
  }

  function collectionHeading(collection) {
    if (collection?.viewerRepresentation && /Typed Transcripts/i.test(collection?.name || "")) return collectionDisplayName(collection);
    if (collectionDisplayNames.has(collection?.name)) return collectionDisplayName(collection).replace(/(\b\d{4})-(\d{4}\b)/g, "$1–$2");
    return displayTitle(collection?.name).replace(/\s*,?\s*\b(?:LR|CR)\s*\d+(?:\s+\d+)?\b/gi, "").replace(/(\b\d{4})-(\d{4}\b)/g, "$1–$2").replace(/\s*,\s*$/, "").trim();
  }

  function branchResourceCardIdentity(collection, descriptor) {
    if (collection?.name === "Pontlanfraith,Early-to-1947,Library27560") {
      return { title: "Record of Members — Early to 1947", years: "Years not yet identified" };
    }
    if (descriptor.group !== "primary") {
      const title = collectionDisplayName(collection)
        .replace(/\s*,?\s*\b(?:LR|CR)\s*[-_]?\s*\d+(?:\s*[-_.]\s*[A-Za-z0-9]+)?\b/gi, "")
        .replace(/\s*,\s*$/, "")
        .trim();
      return { title, years: "" };
    }
    const sourceText = `${collection.name || ""} ${collectionDisplayName(collection)}`;
    const range = sourceText.match(/\b((?:18|19)\d{2})\s*[-–]\s*((?:18|19)\d{2})\b/);
    const singleYear = sourceText.match(/\b((?:18|19)\d{2})\b/);
    const years = range ? `${range[1]}–${range[2]}` : singleYear?.[1] || yearLabel(branchDetails(currentBranchName));
    return { title: currentBranchName || collectionHeading(collection), years };
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

  // Branch assignment and directory counts only need collection-level metadata.
  // Searching every image filename here makes initial directory rendering scale as
  // branches × images; retain that deeper scan for the explicit catalog search only.
  function collectionBranchScore(collection, query) {
    return Math.min(...[collection.name, ...(collection.aliases || [])]
      .map((name) => nameScore(query, name)));
  }

  function visibleRecords(collection) {
    const hasImages = collection.images.some((record) => record.type === "image");
    return collection.images.filter((record) => {
      if (record.type === "image" && /(?:\d|_)t(?:a)?\.[^.]+$/i.test(record.name)) return false;
      if (record.type === "image" && /_(?:color\d*|colort\d*|focus)\.[^.]+$/i.test(record.name)) return false;
      const legacyHtml = [".htm", ".html"].includes(record.extension?.toLowerCase())
        && (hasImages || ["robohelp", "primary", "original-cds"].includes(record.source));
      if (legacyHtml) return false;
      return true;
    });
  }

  function resourceDescriptor(collection) {
    const explicit = collectionResourceDescriptors.get(collection.name);
    if (explicit) return explicit;
    const records = visibleRecords(collection);
    const images = records.filter((record) => record.type === "image").length;
    const documents = records.length - images;
    if (/transcription|translation/i.test(collection.category) || records.some((record) => /transcript|translation/i.test(record.name))) return { label: "Transcription or Translation", group: "transcription" };
    if (/minutes?/i.test(collection.name)) return { label: "Minutes", group: "historical" };
    if (/conference/i.test(collection.name)) return { label: "Conference Record", group: "historical" };
    if (images) return { label: "Branch Record", group: "primary" };
    if (documents) return { label: "Research Documents", group: "research" };
    return { label: "Resource", group: "research" };
  }

  function resourceKind(collection) {
    return resourceDescriptor(collection).label;
  }

  window.WELSH_RESOURCE_DESCRIPTOR = resourceDescriptor;

  function transcriptionPdfRange(cdText) {
    const firstCd = Number.parseInt(cdText, 10);
    if (firstCd >= 35 && firstCd <= 39) return "CDs 35–39";
    if (firstCd >= 40 && firstCd <= 43) return "CDs 40–43";
    if (firstCd >= 44 && firstCd <= 59) return "CDs 44–59";
    if (firstCd >= 60 && firstCd <= 62) return "CDs 60–62";
    return "";
  }

  function resourceProvenance(collection) {
    const override = collectionProvenanceOverrides.get(collection.name);
    if (override) return override;
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

  function conciseResourceProvenance(collection) {
    const detailed = resourceProvenance(collection);
    const searchable = `${collection.name} ${detailed}`;
    const cd = searchable.match(/\b(?:Source\s+)?CD\s*(\d+)/i)?.[1];
    const reference = collection.name.match(/\b((?:LR|CR)\s*[-_]?\s*\d+(?:\s*[-_.]\s*[A-Za-z0-9]+)?)/i)?.[1]
      ?.replace(/\s+/g, "")
      .replace(/_/g, "-");
    const libraryNumber = collection.name.match(/\bLIB(?:RARY)?\s*(\d+)/i)?.[1];
    const library = libraryNumber ? `Library ${libraryNumber}` : "";
    const parts = [cd ? `CD ${cd}` : "", reference || library || ""].filter(Boolean);
    return parts.length ? `Source: ${parts.join(" · ")}` : detailed;
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

  const branchSourceStructure = new Map([
    ["Cwmbran", "Historically attested in the typed Pontypool/Abersychan General Minutes, with reports concerning branch condition, missionary activity, baptisms/additions, and appointments. No dedicated Cwmbran member register has been recovered."],
    ["Morriston", "Historically attested within the Western Glamorgan Conference minutes, including an explicit Morriston fast-offerings report dated 1866. The conference minutes are contextual historical material, not a dedicated Morriston member register."],
    ["Welsh Conference", "The surviving local material comprises separate conference-level sources rather than one continuous volume: Record of Members books identified as Library 1614 (early-1892), Library 3114 (1887-1901), and Library 3118 (early-1911, incomplete local capture), plus incomplete 1884 conference minutes and typed Welsh District/Conference minutes. The similarly titled Film 86987 convenience PDF includes Bristol Conference material after its opening Welsh index and is not treated as one Welsh Conference collection."],
    ["Llansawel (Carmarthenshire)", "Dedicated CD 14 / LR 221 7 Record of Members, 1849-1855, photographed under library identifier 318. Its member residences cluster around Llansawel-area Carmarthenshire localities. This is distinct from the later Glamorgan section in LR 11759 7."],
    ["Llansawel (Glamorgan)", "Explicitly headed Llansawel section within the CD 18 / LR 11759 7 compound Swansea-related physical volume. The source heading identifies Glamorgan; the bounded viewer reuses images 00009-00048 in place. Swansea resumes at image 00049."],
    ["Cwmtillery", "CD 8 / LR1887, photographed library identifier 859. The source heading dates the Record of Members 1847-1857; later deaths, children, narrative, blank and structural material remain separately preserved and the broader inherited 1847-1862 range is not presented as the member-register range."],
    ["Trinant", "Library 859 catalog material identifies a Trinant Record of Members, 1849-1853. The surviving bounded local source consists of the compound source label and one closing register page containing entries 19-29. Earlier entries 1-18 are not currently recovered. Candidate captures 294-295 are later member/status pages, while 296-306 are Stepaside financial records, so none are assigned to Trinant."],
    ["Crumlin", "Record of Members, 1857-1862, in the compound library-859 source packet. Only the four Crumlin register frames are exposed in the bounded viewer; preceding structural and Trinant material remains source context."],
    ["Machen", "Direct-FHC microfilm fallback for the Machen Record of Members, 1854-1865. The photographed/catalog identifier is unclear between 1565 and 1765, so both readings remain preserved pending further evidence."],
    ["Twyncarno", "Direct-FHC microfilm source internally using Twyn Carno. The recoverable source section begins with the printed/narrative material at capture 314 and the regular register at capture 318; the source supports 1856-1857 rather than the broader inherited range."],
    ["Pontlanfraith", "Library 27560 preserves a register extending into the twentieth century, including nineteenth-century birth and baptism information. Some individuals may have lived into recent decades; images are restricted to Local Development and offline/reviewer editions. Source spelling Pontrlanfraith is retained where photographed."],
    ["Abertillery", "Record of Members, 1861-1866, preserved on images 00046-00057 of the compound CD 19 / LR 195 7 physical volume. Cwm Celyn occupies the preceding source section and Tredegar begins at image 00058."],
    ["Alltwen", "Membership register 1849–1859; children-blessed register and a separate rebaptism-of-members sequence are preserved in the same LR2257 volume."],
    ["Brechfa", "Welsh branch historical narrative; main membership register 1846–1856; separately numbered later baptism/member register 1857–1868; later historical notes through 1875 are preserved in the same LR110007 volume."],
    ["Cuffern Mountain", "One CD 6 / LR1987 physical volume containing three independently numbered membership sequences: entries 1–14, entries 1–25, and a reformation-style register numbered 1–252 with the source gap at entry 177 preserved. Later special lists, statistics, and a detached handwritten narrative/list are preserved separately."],
    ["Dinas", "The cover identifies Dinas Branch Record of Members, 1848–1878, while the inherited project/indexing range is 1848–1879; no inspected entry or annotation establishes 1879. Welsh introductory narrative ends with apparent Cymer Branch wording. Membership begins on written page 9 and includes independently numbered/reorganized sections; Welsh narrative on written pages 27–28 and Blessings of Children beginning on written page 29 are preserved separately."],
    ["Ebbw Vale", "CD 26 / LR98467 volume internally headed Ebbro Vale, Record of Members 1847–1864. It contains an original membership sequence, an independently restarted register, and a separately numbered Rebaptism for Reformation register. Blessings of Children, deaths, narrative annotations, blanks, and structural leaves are preserved separately."],
    ["Brynmawr", "Membership register 1848–1868, including a separately headed Reformation register and a later independently numbered membership sequence; Blessings of Children begin on written page 58, deaths on written page 63, with narrative material preserved separately."],
    ["Bryntroedgam", "CD 13 / LR1297 physical volume internally identifies Bryn Branch / Canghen y Bryn. It contains an original membership register, an independently restarted register, a renewed/reorganized sequence, Blessings of Children, and a separately numbered Rebaptism of the Members of Bryn Branch register."],
    ["Cefn Coed-y-Cymmer", "Original membership register on written pages 1–24; a separately numbered/reformation-style membership register on written pages 25–37; narrative material on written pages 43–44; and a separately headed Blessings of Children register on written pages 45–48."],
    ["Britonferry", "Briton Ferry section, pages 43–46: children blessed, a rebaptized-members register, and Welsh narrative/branch record, 1850–1853."],
    ["Llanelli", "The 138-image CD 11 membership volume is internally labeled Llanelly Branch, 1847-1868, and source number 1577. Its retained filenames carry the conflicting prefix LR 12451 7; this identifier conflict remains explicitly unresolved. The separate Llanelly-production holding remains assigned only to Llanelli, but requires its planned review of unusual plain-paper material, the formal Llanelly Branch Record of Members 1847-1879 (source label 1578 / CR 11757 10), and Council/minutes material including 1881-1882 / CR 11757 before any indexing."],
    ["Llanelltyd", "Record of Members, 1850-1857, internal pages 1-5 of the compound CD 34 / LR 172 7 physical volume. Cwm Saerbren begins at page 6 and Treorky at page 25."],
    ["Cwm Saerbren", "Membership register 1858-1874, internal pages 6-24 of the compound CD 34 / LR 172 7 volume. The enclosing physical volume spans 1850-1882. The separate LR 11150 reference remains unconnected."],
    ["Coalbrookvale", "Coal Brook Vale was organized on 3 March 1856 from Nantyglo, Blaenau and Cwm Celyn. The compound CD 24 / LR 174 7 volume preserves two Coal Brook Vale / Blaina membership sequences (images 00080-00137), followed by special registers, statistics and narrative material through 1867."],
    ["Llanfabon", "CD 15 preserves 60 authoritative images: an original membership sequence (entries 1-87), a separate Reformation sequence (entries 1-72), and substantial Welsh historical narrative on written pages 19-28. The photographed source label separately shows identifier 871; its relationship to project reference LR1687 is not established."],
    ["Haverfordwest", "Two recovered physical volumes preserve 272 authoritative historical images. Volume 1 (CR 11343 11 V.1) contains the 1847-1853 membership ledger followed by minutes, subscriptions, deaths and historical narrative. Volume 2 (CR 11343 11 V.2) contains historical record 1852-1854 and a separate membership register 1857-1860. Project LR-style folder/filename forms are retained without silently equating them to the photographed CR identifiers."],
    ["Llandebie", "CD 22 preserves 45 authoritative full-resolution images. The photographed source label dates the Record of Members 1849-1866 and separately shows library number 870; its relationship to project reference LR 113 7 is not normalized. The volume contains an original membership sequence, an independently restarted sequence, a separate renewal/reformation sequence, opening Welsh historical narrative, and an additional-remarks page."],
    ["Castell Nedd (Neath)", "CD 2 preserves 112 authoritative full-resolution images. The cover uses Castellned and dates the Record of Members 1849-1883; the adjacent library label uses Castell Nedd and dates it 1849-1884. Project reference LR 196 7 and photographed source/library identifier 1544 remain separately preserved. The volume contains an original register, an independently numbered rebaptism/renewal register, a later independently restarted register, and Welsh historical narrative."],
    ["Rhymney English", "A distinct English-language branch source dated 1851-1887 and photographed library identifier 1602. The source contains four independently numbered membership sequences, a separate Rhymney English rebaptism list, English branch history, and an explicit transition to Twyn Carno children-blessed and council material. The latter is preserved but excluded from Rhymney English membership."],
    ["Treorchy", "Historical source spelling Treorky identifies two logical portions of the compound CD 34 / LR 172 7 volume: early minutes/narrative on images 00006-00025 (including Treorky Branch minutes dated 1874), and the member register on images 00074-00105, dated 1875-1882. Later narrative and Blessings of Children are preserved separately through image 00116."],
    ["Llanelly 2", "Temporary unresolved legacy holding label. Its RoboHelp topic is an empty draft. A separate 104-page convenience PDF labeled Llanelly 2 contains Wales/British Mission continued material, so the label is retained pending source-structure review; no active collection is assigned to it."],
    ["Stepaside", "Membership records 1848–1857; historical record and minutes 1858–1860."],
    ["Sutton Mountain", "Membership register 1853–1859; historical record and branch minutes 1853–1855."],
  ]);

  function relatedCollections(name) {
    return catalog.collections.map((collection) => ({
      collection,
      score: collectionBranchAssignments.get(collection.name)?.has(name) ? 0 : collectionBranchScore(collection, name),
    }))
      .filter(({ collection, score }) => Number.isFinite(score)
        && (!collectionBranchAssignments.has(collection.name) || collectionBranchAssignments.get(collection.name).has(name))
      && visibleRecords(collection).length
      && !nonBranchLabels.has(collection.name.toLowerCase()))
      .sort((a, b) => {
        const groupOrder = new Map([["primary", 0], ["transcription", 1], ["historical", 2], ["research", 3]]);
        const kindDifference = (groupOrder.get(resourceDescriptor(a.collection).group) ?? 4) - (groupOrder.get(resourceDescriptor(b.collection).group) ?? 4);
        return kindDifference || a.score - b.score || a.collection.name.localeCompare(b.collection.name);
      })
      .map(({ collection }) => collection);
  }
  window.WELSH_RELATED_COLLECTIONS = relatedCollections;

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
      button.innerHTML = `<span>${displayTitle(collection.name)}</span><small>${[imageCount && `${number.format(imageCount)} images`, documentCount && `${number.format(documentCount)} documents`].filter(Boolean).join(" · ")}</small>`;
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
    branchBreadcrumbName.textContent = name;
    branchResourceBreadcrumbs.hidden = false;
    [...branchList.children].forEach((button) => button.classList.toggle("active", button === selectedButton));
    welcome.hidden = true;
    viewer.hidden = true;
    resourcePanel.hidden = false;
    resourcePanel.classList.remove("compact");
    $(".viewer").classList.remove("record-open");
    window.scrollTo({ top: 0, behavior: "auto" });
    branchTitle.textContent = name;
    const details = branchDetails(name);
    branchTitle.textContent = name;
    branchHeadingYears.textContent = yearLabel(details) || "Years not yet identified";
    branchHeadingYears.hidden = false;
    let branchReference = String(details?.filmAndCallNumbers || "").match(/\b((?:LR|CR)\s*\d+(?:\s+\d+)?)/i)?.[1]?.replace(/\s+/g, "") || "";
    if (name === "Llanelli") branchReference = "Source label 1577 · identifier conflict under review";
    if (name === "Llanelltyd") branchReference = "CD 34 · LR1727 · internal pages 1-5";
    if (name === "Haverfordwest") branchReference = "CR 11343 11 V.1 · V.2";
    if (name === "Llandebie") branchReference = "CD 22 · LR1137 · source label 870";
    if (name === "Castell Nedd (Neath)") branchReference = "CD 2 · LR1967 · source label 1544";
    if (name === "Rhymney English") branchReference = "Direct-FHC microfilm · source label 1602";
    branchHeadingDetails.textContent = branchReference;
    branchHeadingDetails.hidden = !branchReference;
    branchHeadingDetails.textContent = "";
    branchHeadingDetails.hidden = true;
    const facts = [];
    if (yearLabel(details)) facts.push(`<span><strong>Years found:</strong> ${yearLabel(details)}</span>`);
    if (branchSourceStructure.has(name)) facts.push(`<span><strong>Source structure:</strong> ${branchSourceStructure.get(name)}</span>`);
    if (details?.variants) facts.push(`<span><strong>Known variants:</strong> ${details.variants}</span>`);
    if (details?.relatedBranches) facts.push(`<span><strong>Related branch:</strong> ${details.relatedBranches}</span>`);
    branchMeta.innerHTML = facts.join("");
    branchMeta.hidden = true;
    const matches = relatedCollections(name);
    if (!matches.length || (matches.length === 1 && matches[0].id === "public-branch-registry")) {
      viewer.hidden = true;
      resourceList.innerHTML = `<div class="empty-resource"><strong>No local record collection recovered yet.</strong><p>The branch and its surviving source evidence remain documented below.</p></div>`;
    } else {
      resourceList.replaceChildren(...matches.map((collection) => {
        const records = visibleRecords(collection);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "resource-card";
        button.dataset.collectionId = collection.id;
        const descriptor = resourceDescriptor(collection);
        const cardIdentity = branchResourceCardIdentity(collection, descriptor);
        button.dataset.resourceGroup = descriptor.group;
        const detailedProvenance = resourceProvenance(collection);
        const conciseProvenance = conciseResourceProvenance(collection);
        const mixedReviewHolding = /(?:review required|boundar(?:y|ies) unresolved)/i.test(`${collection.name} ${detailedProvenance}`);
        button.dataset.provenanceDetail = detailedProvenance;
        button.dataset.provenanceSummary = mixedReviewHolding ? "" : conciseProvenance;
        if (mixedReviewHolding) button.dataset.workRemaining = "Review and establish the internal source boundaries before treating this holding as separate record groups.";
        const scopeNote = collection.name === "Pontlanfraith,Early-to-1947,Library27560"
          ? '<span class="resource-scope-note">This register extends into the twentieth century and preserves nineteenth-century birth and baptism information. Some individuals may have lived into recent decades; images are restricted to Local Development and offline/reviewer editions. This register contains 15 member entries. Five names are currently represented in the searchable member data; the remaining entries require further review/extraction.</span>'
          : "";
        const cardProvenance = descriptor.group === "primary" || mixedReviewHolding ? "" : `<span class="resource-provenance">${conciseProvenance}</span>`;
        button.innerHTML = `<span class="resource-kind">${descriptor.label}</span><strong>${cardIdentity.title}</strong>${cardIdentity.years ? `<small class="resource-years">${cardIdentity.years}</small>` : ""}<small>${number.format(records.length)} item${records.length === 1 ? "" : "s"}</small>${scopeNote}${cardProvenance}`;
        const online = catalog.edition !== "public" || (collection.availability?.online && collection.publicStorage);
        if (online) button.addEventListener("click", () => openCollection(collection, { keepResources: true, initialView: collection.preferredInitialPage ? "single" : records.some((record) => record.type === "image") ? "continuous" : "index", initialImage: collection.preferredInitialPage ? collection.preferredInitialPage - 1 : null }));
        else {
          button.classList.add("unavailable");
          button.disabled = true;
          button.insertAdjacentHTML("beforeend", '<span class="availability-note">Record recovered; images currently available in the portable/reviewer edition.</span>');
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
      button.dataset.pageIndex = String(index);
      button.title = record.name;
      button.setAttribute("aria-label", `Open ${record.type === "image" ? "image" : "document"} ${index + 1}: ${record.name}`);
      if (record.type === "image") {
        const thumbnail = document.createElement("img");
        prepareRecordImage(thumbnail, record);
        thumbnail.dataset.src = recordUrl(record);
        thumbnail.alt = "";
        thumbnail.loading = "lazy";
        thumbnail.decoding = "async";
        button.append(thumbnail);
      }
      const pageNumber = document.createElement("span");
      pageNumber.textContent = String(index + 1);
      button.append(pageNumber);
      button.addEventListener("click", () => navigateFromPageIndex(index));
      return button;
    }));
  }

  function openPageIndex() {
    pageIndexPanel.hidden = false;
    strip.querySelectorAll("img[data-src]").forEach((thumbnail) => {
      thumbnail.src = thumbnail.dataset.src;
      delete thumbnail.dataset.src;
    });
    pageIndexButton.classList.add("active");
    pageIndexButton.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => strip.querySelector(`[data-page-index="${selectedImageIndex ?? currentImage}"]`)?.focus() || closePageIndex.focus());
  }

  function closePageIndexPanel(refocus = true) {
    pageIndexPanel.hidden = true;
    pageIndexButton.classList.remove("active");
    pageIndexButton.setAttribute("aria-expanded", "false");
    if (refocus) pageIndexButton.focus();
  }

  function navigateFromPageIndex(index) {
    closePageIndexPanel(false);
    if (viewMode === "single") {
      showImage(index);
      return;
    }
    if (viewMode === "continuous") {
      const page = continuousView.querySelector(`[data-page-index="${index}"]`);
      page?.click();
      scrollContinuousToPage(index, "center", "auto");
      return;
    }
    if (viewMode === "facing") {
      const page = continuousView.querySelector(`[data-page-index="${index}"]`);
      const spread = page?.closest(".page-spread");
      if (!page || !spread) return;
      facingSelectionLocked = true;
      activateFacingSpread(spread, Number(page.dataset.facingSide || 0));
      page.scrollIntoView({ block: "center", inline: "center", behavior: "auto" });
      return;
    }
    showImage(index);
    setView("single");
  }

  function makeRecordFigure(record, index) {
    const figure = document.createElement("figure");
    figure.className = "scroll-page";
    figure.id = `page-${index + 1}`;
    figure.dataset.pageIndex = String(index);
    figure.addEventListener("click", (event) => {
      if (viewMode !== "continuous" || event.target.closest("a, button")) return;
      selectedImageIndex = index;
      currentImage = index;
      continuousView.querySelectorAll(".selected-sequence-image").forEach((page) => page.classList.remove("selected-sequence-image"));
      figure.classList.add("selected-sequence-image");
      updateImageAdjustmentDisplay();
      position.textContent = `Selected image ${number.format(index + 1)} of ${number.format(currentRecords.length)} · will become the left facing image`;
    });
    if (record.type === "image") {
      const pageImage = document.createElement("img");
      prepareRecordImage(pageImage, record);
      pageImage.dataset.sources = JSON.stringify(recordUrls(record));
      pageImage.alt = `${currentCollection.name}, page ${index + 1}`;
      pageImage.decoding = "async";
      pageImage.loading = "lazy";
      pageImage.draggable = false;
      const state = pageState(index);
      pageImage.dataset.rotation = String(state.rotation);
      pageImage.dataset.imageZoom = String(state.scale);
      pageImage.dataset.imageBrightness = String(state.brightness);
      pageImage.dataset.imageContrast = String(state.contrast);
      applyImageTransform(pageImage);
      figure.append(pageImage);
      prepareImageLoadFeedback(pageImage, () => loadRecordImage(pageImage, recordUrls(record), undefined, `Loading page ${index + 1}…`));
    } else {
      const link = document.createElement("a");
      link.className = "document-card";
      link.href = recordUrl(record);
      link.innerHTML = `<strong>${record.extension.replace(".", "").toUpperCase()} document</strong><span>${record.name}</span>`;
      figure.append(link);
    }
    const label = document.createElement("figcaption");
    label.textContent = `Image sequence ${index + 1} · ${record.name}`;
    figure.append(label);
    return figure;
  }

  function startLazyLoading() {
    lazyObserver?.disconnect();
    const pending = [...continuousView.querySelectorAll("img[data-sources]")];
    if (!("IntersectionObserver" in window)) {
      pending.forEach((item) => { loadRecordImage(item, JSON.parse(item.dataset.sources)); delete item.dataset.sources; });
      return;
    }
    lazyObserver = new IntersectionObserver((entries, observer) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const index = Number(entry.target.closest("[data-page-index]")?.dataset.pageIndex);
      loadRecordImage(entry.target, JSON.parse(entry.target.dataset.sources), undefined, Number.isFinite(index) ? `Loading page ${index + 1}…` : "Loading record image…");
      delete entry.target.dataset.sources;
      observer.unobserve(entry.target);
    }), { rootMargin: "360px 0px" });
    const priorityIndexes = viewMode === "facing"
      ? new Set(facingIndexes(currentImage).filter((index) => index != null))
      : new Set([currentImage]);
    const priority = pending.filter((item) => priorityIndexes.has(Number(item.closest("[data-page-index]")?.dataset.pageIndex)));
    const observeRemaining = () => pending.filter((item) => item.dataset.sources).forEach((item) => lazyObserver.observe(item));
    if (!priority.length) {
      observeRemaining();
      return;
    }
    let nearbyLoadingStarted = false;
    const startNearbyLoading = () => {
      if (nearbyLoadingStarted) return;
      nearbyLoadingStarted = true;
      observeRemaining();
    };
    priority.forEach((item) => {
      item.addEventListener("load", startNearbyLoading, { once: true });
      item.addEventListener("error", startNearbyLoading, { once: true });
      const index = Number(item.closest("[data-page-index]")?.dataset.pageIndex);
      loadRecordImage(item, JSON.parse(item.dataset.sources), undefined, Number.isFinite(index) ? `Loading page ${index + 1}…` : "Loading record image…");
      delete item.dataset.sources;
    });
  }

  function renderScrollable(targetIndex = currentImage) {
    continuousView.replaceChildren();
    continuousView.classList.remove("facing-current");
    currentRecords.forEach((record, index) => continuousView.append(makeRecordFigure(record, index)));
    if (selectedImageIndex != null) continuousView.querySelector(`[data-page-index="${selectedImageIndex}"]`)?.classList.add("selected-sequence-image");
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
    position.textContent = `Page ${number.format(currentImage + 1)} of ${number.format(currentRecords.length)} · ${collectionReference()}`;
  }

  function startPagePositionTracking() {
    pagePositionObserver?.disconnect();
    pagePositionObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) syncCurrentPageFromScroll();
    }, { root: null, rootMargin: "-40% 0px -40% 0px", threshold: 0 });
    continuousView.querySelectorAll(".scroll-page").forEach((page) => pagePositionObserver.observe(page));
  }

  function syncCurrentPageFromScroll() {
    const pages = [...continuousView.querySelectorAll(".scroll-page")];
    if (!pages.length) return;
    const viewerCenter = window.innerHeight / 2;
    const nearestPage = pages.reduce((nearest, page) => {
      const pageBox = page.getBoundingClientRect();
      const nearestBox = nearest.getBoundingClientRect();
      const pageDistance = Math.abs(pageBox.top + pageBox.height / 2 - viewerCenter);
      const nearestDistance = Math.abs(nearestBox.top + nearestBox.height / 2 - viewerCenter);
      return pageDistance < nearestDistance ? page : nearest;
    });
    currentImage = Number(nearestPage.dataset.pageIndex);
    position.textContent = `Page ${number.format(currentImage + 1)} of ${number.format(currentRecords.length)} · ${collectionReference()}`;
  }

  function facingIndexes(index = currentImage) {
    const bounded = Math.max(0, index);
    if (facingPairOffset === 1 && bounded === 0) return [0, null];
    const first = facingPairOffset + Math.floor((Math.max(facingPairOffset, bounded) - facingPairOffset) / 2) * 2;
    return [first, first + 1 < currentRecords.length ? first + 1 : null];
  }

  function spreadIndexes(spread) {
    return [spread.dataset.leftIndex, spread.dataset.rightIndex].map((value) => value === "" ? null : Number(value));
  }

  function updateFacingPosition(indexes) {
    const shown = indexes.filter((index) => index != null).map((index) => index + 1).sort((a, b) => a - b);
    position.textContent = `Images ${shown.join("–")} of ${number.format(currentRecords.length)} · ${collectionReference()}`;
    previous.disabled = shown[0] <= 1;
    next.disabled = shown[shown.length - 1] >= currentRecords.length;
    const natural = facingIndexes(shown[0] - 1);
    const key = natural.map((index) => index ?? "blank").join("-");
    const swapped = swappedSpreads.has(key);
    swapFacingPages.disabled = natural.some((index) => index == null);
    swapFacingPages.classList.toggle("active", swapped);
    swapFacingPages.textContent = "⇄";
    swapFacingPages.setAttribute("aria-label", "Swap left/right");
    swapFacingPages.setAttribute("aria-pressed", String(swapped));
    swapFacingPages.title = swapped ? "Left/right swapped; activate to restore" : "Swap left/right";
  }

  function activateFacingSpread(spread, side = activeFacingSide) {
    continuousView.querySelectorAll(".page-spread").forEach((item) => item.classList.toggle("active-facing-spread", item === spread));
    renderedFacingIndexes = spreadIndexes(spread);
    currentImage = Math.min(...renderedFacingIndexes.filter((index) => index != null));
    selectFacingSide(side);
    updateFacingPosition(renderedFacingIndexes);
    updateSpreadModeDisplay();
  }

  function syncFacingSpreadFromScroll() {
    const spreads = [...continuousView.querySelectorAll(".page-spread")];
    if (!spreads.length) return;
    const viewerCenter = window.innerHeight / 2;
    const distanceFromCenter = (spread) => {
      const box = spread.getBoundingClientRect();
      if (viewerCenter < box.top) return box.top - viewerCenter;
      if (viewerCenter > box.bottom) return viewerCenter - box.bottom;
      return 0;
    };
    const nearest = spreads.reduce((best, spread) => {
      return distanceFromCenter(spread) < distanceFromCenter(best) ? spread : best;
    });
    if (!nearest.classList.contains("active-facing-spread")) {
      if (lineGuidesEnabled) {
        lineGuidesEnabled = false;
        lineGuideTool.classList.remove("active");
        lineGuideTool.setAttribute("aria-pressed", "false");
        guideControls.hidden = true;
        renderLineGuides();
      }
      activateFacingSpread(nearest, activeFacingSide);
    }
  }

  function startFacingPositionTracking() {
    pagePositionObserver?.disconnect();
    pagePositionObserver = null;
  }

  window.addEventListener("scroll", () => {
    if (viewMode !== "facing" || facingSelectionLocked || facingScrollFrame != null) return;
    facingScrollFrame = requestAnimationFrame(() => {
      facingScrollFrame = null;
      syncFacingSpreadFromScroll();
    });
  }, { passive: true });

  continuousView.addEventListener("wheel", (event) => { if (!event.ctrlKey) facingSelectionLocked = false; }, { passive: true });
  continuousView.addEventListener("touchstart", () => { facingSelectionLocked = false; }, { passive: true });
  window.addEventListener("keydown", (event) => {
    if (viewMode === "facing" && ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) facingSelectionLocked = false;
  });

  function makeLineGuide(pageIndex, side) {
    const state = pageState(pageIndex);
    const guide = document.createElement("button");
    guide.type = "button";
    guide.className = "ledger-guide";
    guide.dataset.side = String(side);
    guide.dataset.pageIndex = String(pageIndex);
    guide.style.top = `${state.guidePosition}%`;
    guide.style.setProperty("--guide-angle", `${state.guideAngle}deg`);
    guide.style.setProperty("--guide-spacing", `${state.guideSpacing / 2}px`);
    guide.setAttribute("aria-label", `Adjust ${side === 0 ? "left" : "right"} ledger row guide`);
    guide.title = "Drag this line up or down";
    guide.addEventListener("pointerdown", (event) => {
      if (viewMode === "facing") selectFacingSide(side);
      else {
        selectedImageIndex = pageIndex;
        currentImage = pageIndex;
        if (viewMode === "continuous") {
          continuousView.querySelectorAll(".selected-sequence-image").forEach((page) => page.classList.remove("selected-sequence-image"));
          guide.parentElement.classList.add("selected-sequence-image");
        }
        updateGuideDisplay();
      }
      guide.setPointerCapture?.(event.pointerId);
      const page = guide.parentElement;
      const move = (moveEvent) => {
        const box = page.getBoundingClientRect();
        const percent = Math.max(2, Math.min(98, ((moveEvent.clientY - box.top) / box.height) * 100));
        state.guidePosition = percent;
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
        state.guidePosition = Math.max(2, Math.min(98, state.guidePosition + (event.key === "ArrowUp" ? -1 : 1)));
        guide.style.top = `${state.guidePosition}%`;
        event.preventDefault();
      }
      if (["[", "]"].includes(event.key)) {
        state.guideAngle = Math.max(-8, Math.min(8, state.guideAngle + (event.key === "[" ? -.5 : .5)));
        selectFacingSide(side);
        updateGuideDisplay();
        event.preventDefault();
      }
    });
    return guide;
  }

  function updateGuideDisplay() {
    const selected = pageState(selectedGuideIndex());
    guideAngleOutput.textContent = `${selected.guideAngle.toFixed(1).replace(".0", "")}°`;
    viewer.querySelectorAll(".ledger-guide").forEach((guide) => {
      const state = pageState(Number(guide.dataset.pageIndex));
      guide.style.top = `${state.guidePosition}%`;
      guide.style.setProperty("--guide-angle", `${state.guideAngle}deg`);
      guide.style.setProperty("--guide-spacing", `${state.guideSpacing / 2}px`);
    });
  }

  function renderLineGuides() {
    stage.querySelectorAll(".ledger-guide").forEach((guide) => guide.remove());
    continuousView.querySelectorAll(".ledger-guide").forEach((guide) => guide.remove());
    if (!lineGuidesEnabled) return;
    if (viewMode === "single" && !image.hidden) stage.append(makeLineGuide(currentImage, 0));
    if (["continuous", "facing"].includes(viewMode)) continuousView.querySelectorAll(".scroll-page[data-page-index]").forEach((page) => {
      page.append(makeLineGuide(Number(page.dataset.pageIndex), Number(page.dataset.facingSide || 0)));
    });
    updateGuideDisplay();
  }

  function updateScaleDisplay() {
    const scale = spreadAdjustmentMode && activeFacingSpread()
      ? spreadState(activeFacingSpread().dataset.spreadKey).scale
      : pageState(selectedFacingIndex()).scale;
    facingScale.textContent = `${Math.round(scale * 100)}%`;
  }

  function updateImageAdjustmentDisplay() {
    const state = pageState(selectedGuideIndex());
    const brightness = Math.round(state.brightness * 100);
    const contrast = Math.round(state.contrast * 100);
    brightnessSlider.value = String(brightness);
    contrastSlider.value = String(contrast);
    brightnessValue.textContent = `${brightness}%`;
    contrastValue.textContent = `${contrast}%`;
    enhanceStatus.textContent = "";
  }

  function selectedAdjustmentTargets(index = selectedGuideIndex()) {
    return viewMode === "single"
      ? [image]
      : [...continuousView.querySelectorAll(`[data-page-index="${index}"] img`)];
  }

  function applySelectedImageAdjustments(index = selectedGuideIndex()) {
    const state = pageState(index);
    selectedAdjustmentTargets(index).forEach((target) => {
      target.dataset.imageBrightness = String(state.brightness);
      target.dataset.imageContrast = String(state.contrast);
      applyImageTransform(target);
    });
    updateImageAdjustmentDisplay();
  }

  function resetSelectedPageDisplay() {
    const index = selectedGuideIndex();
    const state = pageState(index);
    state.rotation = 0;
    state.scale = 1;
    state.brightness = 1;
    state.contrast = 1;
    selectedAdjustmentTargets(index).forEach((target) => {
      target.classList.remove("image-zoomed");
      target.classList.remove("pan-moved");
      delete target.dataset.panX;
      delete target.dataset.panY;
      target.style.removeProperty("transform-origin");
      target.dataset.rotation = "0";
      target.dataset.imageZoom = "1";
      target.dataset.imageBrightness = "1";
      target.dataset.imageContrast = "1";
      applyImageTransform(target);
    });
    if (viewMode === "facing") updateScaleDisplay();
    updateImageAdjustmentDisplay();
  }

  function adjustSelectedImage(property, value, reset = false) {
    const index = selectedGuideIndex();
    const state = pageState(index);
    if (reset) {
      state.brightness = 1;
      state.contrast = 1;
    } else {
      state[property] = Math.max(.5, Math.min(2, Math.round(value * 100) / 100));
    }
    applySelectedImageAdjustments(index);
  }

  async function autoEnhanceSelectedImage() {
    const index = selectedGuideIndex();
    const target = selectedAdjustmentTargets(index)[0];
    if (!target) return;
    enhanceStatus.textContent = "Analyzing…";
    const storedEnhancement = currentRecords[index]?.enhancement;
    if (storedEnhancement) {
      const state = pageState(index);
      state.brightness = storedEnhancement.brightness;
      state.contrast = storedEnhancement.contrast;
      applySelectedImageAdjustments(index);
      enhanceStatus.textContent = `Enhanced from tones ${storedEnhancement.low}–${storedEnhancement.high}`;
      return;
    }
    if (!target.complete || !target.naturalWidth) {
      await new Promise((resolve) => target.addEventListener("load", resolve, { once: true }));
    }
    const longestSide = 256;
    const ratio = Math.min(1, longestSide / Math.max(target.naturalWidth, target.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(target.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(target.naturalHeight * ratio));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    try {
      context.drawImage(target, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const histogram = new Uint32Array(256);
      let total = 0;
      for (let offset = 0; offset < pixels.length; offset += 4) {
        if (pixels[offset + 3] < 16) continue;
        const luminance = Math.round(.2126 * pixels[offset] + .7152 * pixels[offset + 1] + .0722 * pixels[offset + 2]);
        histogram[luminance] += 1;
        total += 1;
      }
      const nearBlackShare = histogram.slice(0, 24).reduce((sum, count) => sum + count, 0) / total;
      const weightedHistogram = nearBlackShare >= .3
        ? Array.from(histogram, (count, tone) => count * (tone < 12 ? .02 : tone < 24 ? .08 : tone < 40 ? .3 : 1))
        : histogram;
      const weightedTotal = weightedHistogram.reduce((sum, count) => sum + count, 0);
      const percentile = (fraction) => {
        const threshold = weightedTotal * fraction;
        let seen = 0;
        for (let tone = 0; tone < weightedHistogram.length; tone += 1) {
          seen += weightedHistogram[tone];
          if (seen >= threshold) return tone;
        }
        return 255;
      };
      const low = percentile(.02);
      const high = percentile(.98);
      const midpoint = Math.max(1, (low + high) / 2);
      const contrastCeiling = nearBlackShare >= .3 ? 1.15 : 1.3;
      const contrast = Math.max(.9, Math.min(contrastCeiling, 200 / Math.max(20, high - low)));
      const brightness = Math.max(.8, Math.min(1.3, (135 - 127.5 * (1 - contrast)) / (contrast * midpoint)));
      const state = pageState(index);
      state.brightness = Math.round(brightness * 20) / 20;
      state.contrast = Math.round(contrast * 20) / 20;
      applySelectedImageAdjustments(index);
      enhanceStatus.textContent = `Enhanced from tones ${low}–${high}`;
    } catch (error) {
      const cause = error?.name === "SecurityError" ? "browser blocked canvas pixel access" : (error?.message || "unknown error");
      enhanceStatus.textContent = `Auto Enhance unavailable: ${cause}.`;
    }
  }

  function renderFacingSeries(targetIndex = currentImage) {
    facingSelectionLocked = true;
    continuousView.replaceChildren();
    continuousView.classList.add("facing-current");
    for (let first = 0; first < currentRecords.length; first += first === 0 && facingPairOffset === 1 ? 1 : 2) {
      const naturalIndexes = facingIndexes(first);
      const spreadKey = naturalIndexes.map((index) => index ?? "blank").join("-");
      const indexes = swappedSpreads.has(spreadKey) ? [...naturalIndexes].reverse() : naturalIndexes;
      const spread = document.createElement("section");
      spread.className = `page-spread${indexes.some((index) => index == null) ? " single-page-spread" : ""}`;
      spread.dataset.spreadKey = spreadKey;
      spread.dataset.leftIndex = indexes[0] == null ? "" : String(indexes[0]);
      spread.dataset.rightIndex = indexes[1] == null ? "" : String(indexes[1]);
      const content = document.createElement("div");
      content.className = "facing-spread-content";
      indexes.forEach((index, side) => {
        if (index == null) return;
        const page = makeRecordFigure(currentRecords[index], index);
        page.dataset.facingSide = String(side);
        page.addEventListener("pointerdown", () => activateFacingSpread(spread, side));
        content.append(page);
      });
      spread.append(content);
      applySpreadTransform(content);
      continuousView.append(spread);
    }
    requestAnimationFrame(() => {
      const boundedTargetIndex = Math.max(0, Math.min(targetIndex, currentRecords.length - 1));
      const targetPage = continuousView.querySelector(`[data-page-index="${boundedTargetIndex}"]`);
      const target = targetPage?.closest(".page-spread") || continuousView.querySelector(".page-spread");
      if (!target) return;
      const targetSide = Math.max(0, spreadIndexes(target).indexOf(boundedTargetIndex));
      const centerSelectedPage = () => {
        if (!facingSelectionLocked || viewMode !== "facing" || selectedImageIndex !== boundedTargetIndex) return;
        activateFacingSpread(target, targetSide);
        (targetPage || target).scrollIntoView({ block: "center", inline: "center", behavior: "auto" });
        requestAnimationFrame(() => {
          if (!facingSelectionLocked || viewMode !== "facing" || selectedImageIndex !== boundedTargetIndex) return;
          const pageBox = (targetPage || target).getBoundingClientRect();
          const toolbarBottom = Math.max(0, $(".view-toolbar").getBoundingClientRect().bottom);
          const visibleCenter = toolbarBottom + (window.innerHeight - toolbarBottom) / 2;
          window.scrollBy({ top: pageBox.top + pageBox.height / 2 - visibleCenter, behavior: "auto" });
        });
      };
      const targetImage = targetPage?.querySelector("img");
      if (targetImage) targetImage.addEventListener("load", () => requestAnimationFrame(() => requestAnimationFrame(centerSelectedPage)), { once: true });
      startLazyLoading();
      centerSelectedPage();
      startFacingPositionTracking();
    });
  }

  function setFacingZoom(delta, reset = false) {
    if (spreadAdjustmentMode) {
      const spread = activeFacingSpread();
      if (!spread) return;
      const state = spreadState(spread.dataset.spreadKey);
      state.scale = reset ? 1 : Math.max(.5, Math.min(4, Math.round((state.scale + delta) * 100) / 100));
      if (reset) {
        state.panX = 0;
        state.panY = 0;
        state.originX = 50;
        state.originY = 50;
      }
      applySpreadTransform(spreadContent(spread));
      updateScaleDisplay();
      return;
    }
    const index = selectedFacingIndex();
    const state = pageState(index);
    state.scale = reset ? 1 : Math.max(.5, Math.min(2, Math.round((state.scale + delta) * 100) / 100));
    const target = continuousView.querySelector(`[data-page-index="${index}"] img`);
    if (target) { target.dataset.imageZoom = String(state.scale); applyImageTransform(target); }
    updateScaleDisplay();
  }

  function resetActiveSpread() {
    const spread = activeFacingSpread();
    if (!spread) return;
    spreadStates.set(spread.dataset.spreadKey, { scale: 1, panX: 0, panY: 0, originX: 50, originY: 50 });
    applySpreadTransform(spreadContent(spread));
    updateScaleDisplay();
  }

  function fitFacingSpread() {
    continuousView.classList.add("fit-spread");
    continuousView.style.removeProperty("--facing-page-width");
    continuousView.scrollLeft = 0;
  }

  function captureSimpleViewTransfer(previousMode, nextMode, pageIndex) {
    if (!([previousMode, nextMode].includes("single") && [previousMode, nextMode].includes("continuous"))) return null;
    const source = previousMode === "single" ? image : continuousView.querySelector(`[data-page-index="${pageIndex}"] img`);
    if (!source || source.hidden) return null;
    const box = source.getBoundingClientRect();
    if (!box.width || !box.height) return null;
    const toolbarBottom = Math.max(0, $(".view-toolbar").getBoundingClientRect().bottom);
    const viewportAnchor = toolbarBottom + (innerHeight - toolbarBottom) / 2;
    return { width: box.width, relativeY: Math.max(0, Math.min(1, (viewportAnchor - box.top) / box.height)), viewportAnchor };
  }

  function restoreSimpleViewTransfer(transfer, mode, pageIndex) {
    if (!transfer) return;
    const target = mode === "single" ? image : continuousView.querySelector(`[data-page-index="${pageIndex}"] img`);
    if (!target) return;
    const restore = () => requestAnimationFrame(() => requestAnimationFrame(() => {
      if (viewMode !== mode) return;
      const baseWidth = target.offsetWidth;
      if (!baseWidth) return;
      const state = pageState(pageIndex);
      state.scale = Math.max(.5, Math.min(4, transfer.width / baseWidth));
      target.dataset.imageZoom = String(state.scale);
      applyImageTransform(target);
      const box = target.getBoundingClientRect();
      window.scrollBy({ top: box.top + box.height * transfer.relativeY - transfer.viewportAnchor, behavior: "auto" });
    }));
    if (target.complete && target.naturalWidth) restore();
    else target.addEventListener("load", restore, { once: true });
  }

  function setView(mode) {
    const previousMode = viewMode;
    if (previousMode === "continuous" && mode !== "continuous" && selectedImageIndex == null) syncCurrentPageFromScroll();
    const savedPage = selectedImageIndex != null ? selectedImageIndex : currentImage;
    const simpleViewTransfer = captureSimpleViewTransfer(previousMode, mode, savedPage);
    if (mode !== "continuous") pagePositionObserver?.disconnect();
    viewMode = mode;
    $(".view-toolbar").querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === mode));
    const single = mode === "single";
    const facing = mode === "facing";
    const index = mode === "index";
    stage.hidden = !single;
    continuousView.hidden = single || index;
    previous.hidden = !single;
    next.hidden = !single;
    panTool.hidden = !(single || facing || mode === "continuous");
    lineGuideTool.hidden = index;
    activePageIndicator.hidden = !facing;
    rotationTarget.hidden = !facing;
    guideControls.hidden = index || !lineGuidesEnabled;
    jumpFirstPage.hidden = mode !== "continuous";
    jumpLastPage.hidden = mode !== "continuous";
    setPanEnabled(false);
    facingTools.hidden = !facing;
    spreadModeToggle.hidden = !facing;
    resetSpread.hidden = !facing || !spreadAdjustmentMode;
    if (!facing) facingTools.open = false;
    if (mode === "continuous") renderScrollable(savedPage);
    if (facing) {
      if (previousMode !== "facing") facingPairOffset = savedPage % 2;
      if (selectedImageIndex == null) selectedImageIndex = savedPage;
      fitFacingSpread();
      renderFacingSeries(savedPage);
    }
    if (single) showImage(savedPage);
    renderLineGuides();
    restoreSimpleViewTransfer(simpleViewTransfer, mode, savedPage);
    if (index) openPageIndex();
    updateSpreadModeDisplay();
  }

  function navigatePages(direction) {
    if (viewMode === "facing") {
      const targetIndex = Math.max(0, Math.min(Math.floor(currentImage / 2) * 2 + direction * 2, currentRecords.length - 1));
      const spread = continuousView.querySelector(`[data-page-index="${targetIndex}"]`)?.closest(".page-spread");
      if (spread) {
        activateFacingSpread(spread, activeFacingSide);
        spread.scrollIntoView({ block: "start", inline: "nearest", behavior: "smooth" });
      }
      return;
    }
    showImage(currentImage + direction);
  }

  function resetPannedImages() {
    [stage, continuousView].forEach((surface) => surface.querySelectorAll("img.pan-moved, img.image-zoomed").forEach((item) => {
      item.classList.remove("pan-moved");
      item.classList.remove("image-zoomed");
      item.style.removeProperty("transform-origin");
      delete item.dataset.panX;
      delete item.dataset.panY;
      const index = Number(item.closest("[data-page-index]")?.dataset.pageIndex ?? currentImage);
      const state = pageState(index);
      item.dataset.imageZoom = String(state.scale);
      item.dataset.rotation = String(state.rotation);
      applyImageTransform(item);
    }));
  }

  function applyImageTransform(item) {
    const panX = Number(item.dataset.panX || 0);
    const panY = Number(item.dataset.panY || 0);
    const zoom = Number(item.dataset.imageZoom || 1);
    const rotation = Number(item.dataset.rotation || 0);
    item.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom}) rotate(${rotation}deg)`;
    item.style.filter = `brightness(${Number(item.dataset.imageBrightness || 1)}) contrast(${Number(item.dataset.imageContrast || 1)})`;
  }

  function rotateVisibleImages(delta, reset = false) {
    let targets = viewMode === "single" ? [image] : [...continuousView.querySelectorAll("img")].filter((item) => {
      const box = item.getBoundingClientRect(); return box.bottom > 0 && box.top < innerHeight;
    });
    if (viewMode === "facing") targets = [...continuousView.querySelectorAll(`[data-page-index="${selectedFacingIndex()}"] img`)];
    targets.forEach((item) => { const index = Number(item.closest("[data-page-index]")?.dataset.pageIndex ?? currentImage); const state = pageState(index); state.rotation = reset ? 0 : Math.max(-10, Math.min(10, state.rotation + delta)); item.dataset.rotation = String(state.rotation); applyImageTransform(item); });
  }

  function setPanEnabled(enabled) {
    if (!enabled) resetPannedImages();
    panEnabled = enabled;
    panTool.classList.toggle("active", enabled);
    panTool.setAttribute("aria-pressed", String(enabled));
    panTool.textContent = enabled ? "↖" : "✋";
    panTool.title = enabled ? "Return to normal pointer" : "Pan image: drag a full-size image left, right, up, or down";
    panTool.setAttribute("aria-label", enabled ? "Turn off image panning" : "Pan image");
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
    let panSpreadState = null;
    surface.addEventListener("pointerdown", (event) => {
      if (!panEnabled || event.button !== 0) return;
      const targetImage = event.target.closest("img");
      if (!targetImage) return;
      const targetSpread = viewMode === "facing" && spreadAdjustmentMode ? targetImage.closest(".page-spread") : null;
      panTarget = targetSpread ? spreadContent(targetSpread) : targetImage;
      panSpreadState = targetSpread ? spreadState(targetSpread.dataset.spreadKey) : null;
      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      startPanX = panSpreadState?.panX ?? Number(panTarget.dataset.panX || 0);
      startPanY = panSpreadState?.panY ?? Number(panTarget.dataset.panY || 0);
      surface.classList.add("is-panning");
      surface.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });
    surface.addEventListener("pointermove", (event) => {
      if (!dragging || !panTarget) return;
      const panX = startPanX + event.clientX - startX;
      const panY = startPanY + event.clientY - startY;
      if (panSpreadState) {
        panSpreadState.panX = panX;
        panSpreadState.panY = panY;
        applySpreadTransform(panTarget);
      } else {
        panTarget.dataset.panX = String(panX);
        panTarget.dataset.panY = String(panY);
        panTarget.classList.add("pan-moved");
        applyImageTransform(panTarget);
      }
    });
    const stop = () => { dragging = false; panTarget = null; panSpreadState = null; surface.classList.remove("is-panning"); };
    surface.addEventListener("pointerup", stop);
    surface.addEventListener("pointercancel", stop);
  }

  function enableImageWheelZoom(surface) {
    surface.addEventListener("wheel", (event) => {
      if (!event.ctrlKey) return;
      const target = event.target.closest("img");
      if (!target) return;
      event.preventDefault();
      if (viewMode === "facing" && spreadAdjustmentMode) {
        const spread = target.closest(".page-spread");
        const content = spreadContent(spread);
        if (!spread || !content) return;
        const side = Number(target.closest("[data-facing-side]")?.dataset.facingSide || 0);
        activateFacingSpread(spread, side);
        const state = spreadState(spread.dataset.spreadKey);
        const nextScale = Math.max(.5, Math.min(4, state.scale * (event.deltaY < 0 ? 1.12 : .89)));
        const box = content.getBoundingClientRect();
        state.originX = Math.max(0, Math.min(100, ((event.clientX - box.left) / box.width) * 100));
        state.originY = Math.max(0, Math.min(100, ((event.clientY - box.top) / box.height) * 100));
        state.scale = nextScale;
        applySpreadTransform(content);
        updateScaleDisplay();
        return;
      }
      const currentZoom = Number(target.dataset.imageZoom || 1);
      const nextZoom = Math.max(.5, Math.min(4, currentZoom * (event.deltaY < 0 ? 1.12 : .89)));
      const box = target.getBoundingClientRect();
      const originX = Math.max(0, Math.min(100, ((event.clientX - box.left) / box.width) * 100));
      const originY = Math.max(0, Math.min(100, ((event.clientY - box.top) / box.height) * 100));
      target.style.transformOrigin = `${originX}% ${originY}%`;
      target.dataset.imageZoom = String(nextZoom);
      const index = Number(target.closest("[data-page-index]")?.dataset.pageIndex ?? currentImage);
      pageState(index).scale = nextZoom;
      if (viewMode === "facing") {
        const side = Number(target.closest("[data-facing-side]")?.dataset.facingSide || 0);
        selectFacingSide(side);
      }
      target.classList.toggle("image-zoomed", Math.abs(nextZoom - 1) > .01);
      applyImageTransform(target);
      if (!panEnabled && viewMode !== "facing") setPanEnabled(true);
    }, { passive: false });
  }

  function openCollection(collection, options = {}) {
    const { keepResources = false, initialView = "index", initialImage = null } = options;
    currentCollection = collection;
    currentRecords = visibleRecords(collection);
    const hasInitialImage = initialImage != null && Number.isFinite(Number(initialImage));
    currentImage = hasInitialImage ? Math.max(0, Math.min(Number(initialImage), currentRecords.length - 1)) : 0;
    selectedImageIndex = hasInitialImage ? currentImage : null;
    pageStates.clear();
    spreadStates.clear();
    spreadAdjustmentMode = false;
    swappedSpreads.clear();
    welcome.hidden = true;
    resourcePanel.hidden = true;
    branchResourceBreadcrumbs.hidden = true;
    if (!keepResources) resourcePanel.classList.remove("compact");
    $(".viewer").classList.add("record-open");
    viewerBranchResourcesLink.textContent = `← ${currentBranchName} Branch Resources`;
    viewerBranchResourcesLink.textContent = currentBranchName ? `\u2190 ${currentBranchName} Branch Resources` : "\u2190 All Branches";
    viewerBranchResourcesLink.href = currentBranchName ? `index.html?branch=${encodeURIComponent(currentBranchName)}` : "index.html?view=branches";
    viewer.hidden = false;
    title.textContent = collectionHeading(collection);
    viewContext.innerHTML = keepResources
      ? `<small>${collectionHeading(collection)}</small>`
      : `<strong>${collectionHeading(collection)}</strong>`;
    buildPageIndex();
    setView(initialView);
    resourceList.querySelectorAll(".resource-card").forEach((button) => button.classList.toggle("active", button.dataset.collectionId === collection.id));
    position.textContent = collection?.viewerRepresentation && /Typed Transcripts/i.test(collection?.name || "")
      ? `${number.format(currentRecords.length)} page${currentRecords.length === 1 ? "" : "s"}`
      : `${number.format(currentRecords.length)} available item${currentRecords.length === 1 ? "" : "s"} · ${collectionReference(collection)}`;
    renderCollections();
    sidebar.classList.remove("open");
    menu.setAttribute("aria-expanded", "false");
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  window.WELSH_OPEN_COLLECTION = openCollection;

  window.WELSH_OPEN_INDEXED_RECORD = ({ branch, collectionId, imageSequence, imageFilename, view = "single" }) => {
    const collection = catalog.collections.find((item) => item.id === collectionId);
    const records = collection ? visibleRecords(collection) : [];
    const imageIndex = imageFilename ? records.findIndex((record) => record.name === imageFilename) : Number(imageSequence) - 1;
    if (!collection || !Number.isInteger(imageIndex) || imageIndex < 0 || imageIndex >= records.length) return false;
    if (branch) openBranch(branch);
    else currentBranchName = "";
    openCollection(collection, { keepResources: Boolean(branch), initialView: ["single", "continuous", "facing"].includes(view) ? view : "single", initialImage: imageIndex });
    return true;
  };

  function showImage(index) {
    if (!currentRecords.length) return;
    currentImage = Math.max(0, Math.min(index, currentRecords.length - 1));
    selectedImageIndex = currentImage;
    const record = currentRecords[currentImage];
    const isImage = record.type === "image";
    image.hidden = !isImage;
    documentPreview.hidden = isImage;
    if (isImage) {
      prepareRecordImage(image, record);
      loadRecordImage(image, recordUrls(record), () => showImage(currentImage), `Loading page ${currentImage + 1}…`);
      image.alt = `${currentCollection.name}, record image ${currentImage + 1}`;
      const state = pageState(currentImage);
      image.dataset.rotation = String(state.rotation);
      image.dataset.imageZoom = String(state.scale);
      image.dataset.imageBrightness = String(state.brightness);
      image.dataset.imageContrast = String(state.contrast);
      applyImageTransform(image);
    } else {
      image.removeAttribute("src");
      stage.classList.remove("image-loading", "image-load-error");
      const loadStatus = stage.querySelector(":scope > .image-load-status");
      if (loadStatus) loadStatus.hidden = true;
      documentType.textContent = `${record.extension.replace(".", "").toUpperCase()} document`;
      documentName.textContent = record.name;
      documentLink.href = recordUrl(record);
      const inline = [".pdf"].includes(record.extension.toLowerCase());
      documentFrame.hidden = !inline;
      if (inline) documentFrame.src = recordUrl(record); else documentFrame.removeAttribute("src");
    }
    caption.textContent = record.name;
    position.textContent = `Page ${number.format(currentImage + 1)} of ${number.format(currentRecords.length)} · ${collectionReference()}`;
    previous.disabled = currentImage === 0;
    next.disabled = currentImage === currentRecords.length - 1;
    if (viewMode === "single") renderLineGuides();
    updateImageAdjustmentDisplay();
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
  pageIndexButton.addEventListener("click", openPageIndex);
  closePageIndex.addEventListener("click", () => closePageIndexPanel());
  $("#pageIndexBackdrop").addEventListener("click", () => closePageIndexPanel());
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !pageIndexPanel.hidden) closePageIndexPanel(); });
  temporaryToolPopovers.filter((popover) => popover instanceof HTMLDetailsElement).forEach((popover) => popover.addEventListener("toggle", () => {
    if (popover.open) closeTemporaryToolPopovers(popover);
  }));
  document.addEventListener("pointerdown", (event) => {
    const openPopover = temporaryToolPopovers.find(temporaryToolPopoverIsOpen);
    if (openPopover && !openPopover.contains(event.target)) closeTemporaryToolPopovers();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeTemporaryToolPopovers();
  });
  facingZoomOut.addEventListener("click", () => setFacingZoom(-.05));
  facingZoomIn.addEventListener("click", () => setFacingZoom(.05));
  facingZoomFit.addEventListener("click", () => setFacingZoom(0, true));
  spreadModeToggle.addEventListener("click", () => {
    spreadAdjustmentMode = !spreadAdjustmentMode;
    updateSpreadModeDisplay();
    updateScaleDisplay();
  });
  resetSpread.addEventListener("click", resetActiveSpread);
  swapFacingPages.addEventListener("click", () => {
    const selectedBeforeSwap = selectedFacingIndex();
    const indexes = facingIndexes();
    const spreadKey = indexes.map((index) => index ?? "blank").join("-");
    if (swappedSpreads.has(spreadKey)) swappedSpreads.delete(spreadKey);
    else swappedSpreads.add(spreadKey);
    renderFacingSeries(selectedBeforeSwap);
  });
  panTool.addEventListener("click", () => setPanEnabled(!panEnabled));
  lineGuideTool.addEventListener("click", () => {
    if (lineGuidesEnabled && guideControls.hidden) {
      closeTemporaryToolPopovers(guideControls);
      setGuideControlsOpen(true);
      return;
    }
    lineGuidesEnabled = !lineGuidesEnabled;
    lineGuideTool.classList.toggle("active", lineGuidesEnabled);
    lineGuideTool.setAttribute("aria-pressed", String(lineGuidesEnabled));
    if (lineGuidesEnabled) closeTemporaryToolPopovers(guideControls);
    setGuideControlsOpen(lineGuidesEnabled);
    renderLineGuides();
  });
  rotationTarget.addEventListener("change", () => selectFacingSide(rotationTarget.value === "right" ? 1 : 0));
  $("#guideRotateLeft").addEventListener("click", () => { const state = pageState(selectedGuideIndex()); state.guideAngle = Math.max(-8, state.guideAngle - .5); updateGuideDisplay(); });
  $("#guideRotateRight").addEventListener("click", () => { const state = pageState(selectedGuideIndex()); state.guideAngle = Math.min(8, state.guideAngle + .5); updateGuideDisplay(); });
  $("#guideReset").addEventListener("click", () => { const state = pageState(selectedGuideIndex()); state.guideAngle = 0; state.guidePosition = 38; updateGuideDisplay(); });
  imageTools.addEventListener("click", (event) => { if (event.target.dataset.rotateReset !== undefined) rotateVisibleImages(0, true); else if (event.target.dataset.rotate) rotateVisibleImages(Number(event.target.dataset.rotate)); });
  $("#autoEnhance").addEventListener("click", autoEnhanceSelectedImage);
  brightnessSlider.addEventListener("input", () => adjustSelectedImage("brightness", Number(brightnessSlider.value) / 100));
  contrastSlider.addEventListener("input", () => adjustSelectedImage("contrast", Number(contrastSlider.value) / 100));
  $("#imageAdjustmentsReset").addEventListener("click", () => adjustSelectedImage("brightness", 0, true));
  $("#resetPage").addEventListener("click", resetSelectedPageDisplay);
  jumpFirstPage.addEventListener("click", () => scrollContinuousToPage(0));
  jumpLastPage.addEventListener("click", () => scrollContinuousToPage(currentRecords.length - 1, "end"));
  enableDragPan(stage);
  enableDragPan(continuousView);
  enableImageWheelZoom(stage);
  enableImageWheelZoom(continuousView);
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
