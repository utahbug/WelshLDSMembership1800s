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
  const temporaryToolPopovers = [...document.querySelectorAll(".view-toolbar details.image-tools, .view-toolbar details.image-adjustments, .view-toolbar details.scale-tools")];
  const brightnessValue = $("#brightnessValue");
  const contrastValue = $("#contrastValue");
  const brightnessSlider = $("#brightnessSlider");
  const contrastSlider = $("#contrastSlider");
  const enhanceStatus = $("#enhanceStatus");
  const rotationTarget = $("#rotationTarget");
  const backToResources = $("#backToResources");
  const viewerBreadcrumbs = $("#viewerBreadcrumbs");
  const breadcrumbCurrentPage = $("#breadcrumbCurrentPage");
  const branchResourceBreadcrumbs = $("#branchResourceBreadcrumbs");
  const branchBreadcrumbName = $("#branchBreadcrumbName");
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

  function closeTemporaryToolPopovers(except = null) {
    temporaryToolPopovers.forEach((popover) => {
      if (popover !== except) popover.removeAttribute("open");
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

  function recordUrl(record) {
    if (catalog.edition === "public" && currentCollection?.publicStorage?.baseUrl) {
      if (currentCollection.publicStorage.provider === "internet-archive") {
        if (!record.archiveRelativePath) {
          console.error("Archive.org path missing for catalog record", { collection: currentCollection.name, record: record.name });
          return "";
        }
        const encodedPath = record.archiveRelativePath
          .replaceAll("\\", "/")
          .split("/")
          .map((segment) => encodeURIComponent(segment))
          .join("/");
        return `${currentCollection.publicStorage.baseUrl}${encodedPath}`;
      }
      return `${currentCollection.publicStorage.baseUrl}${encodeURIComponent(record.name)}`;
    }
    return location.protocol === "http:" || location.protocol === "https:" ? record.serveUrl : record.url;
  }

  function prepareRecordImage(image, record) {
    if (catalog.edition === "public" && currentCollection?.publicStorage?.provider === "internet-archive" && record.archiveRelativePath) {
      image.crossOrigin = "anonymous";
    } else {
      image.removeAttribute("crossorigin");
    }
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
      image.parentElement?.classList.remove("image-loading", "image-load-error");
      status.hidden = true;
    });
    image.addEventListener("error", () => {
      image.parentElement?.classList.remove("image-loading");
      image.parentElement?.classList.add("image-load-error");
      message.textContent = "Image could not be loaded.";
      retryButton.hidden = false;
      status.hidden = false;
    });
  }

  function loadRecordImage(image, source, retry = () => loadRecordImage(image, source)) {
    prepareImageLoadFeedback(image, retry);
    const status = image.parentElement?.querySelector(":scope > .image-load-status");
    const message = status?.querySelector("span");
    const retryButton = status?.querySelector("button");
    image.parentElement?.classList.remove("image-load-error");
    image.parentElement?.classList.add("image-loading");
    if (message) message.textContent = "Loading image…";
    if (retryButton) retryButton.hidden = true;
    if (status) status.hidden = false;
    if (!source) {
      image.parentElement?.classList.remove("image-loading");
      image.parentElement?.classList.add("image-load-error");
      if (message) message.textContent = "Image path is unavailable.";
      if (retryButton) retryButton.hidden = false;
      return;
    }
    image.src = source;
  }

  function normalized(value) {
    return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/\bff/g, "f").replace(/[^a-z0-9]/g, "");
  }

  function displayTitle(value) {
    return String(value ?? "").replace(/,(?=\S)/g, ", ");
  }

  const collectionBranchAssignments = new Map([
    ["Cog,1848-1876,LR1097", new Set(["Cogan"])],
    ["Llanelli,1847-1868,LR117577", new Set(["Llanelli"])],
    ["Llanelltyd,1850-1882,LR1727", new Set(["Treorchy"])],
    ["Llanelltyd,1850-1857,LR1727", new Set(["Llanelltyd"])],
    ["Cwm Saerbren,1858-1874,LR1727", new Set(["Cwm Saerbren"])],
    ["Nantyglo,1846-1867,LR1747", new Set(["Nantyglo"])],
    ["Coalbrookvale,1856-1867,LR1747", new Set(["Coalbrookvale"])],
    ["Haverfordwest,1847-1853,LR1134321", new Set(["Haverfordwest"])],
    ["Haverfordwest,1852-1860,CR1134311-v2", new Set(["Haverfordwest"])],
    ["Llandebie,1849-1886,LR1137", new Set(["Llandebie"])],
    ["Llanelly-production", new Set(["Llanelli"])],
  ]);

  const collectionDisplayNames = new Map([
    ["Llanfabon 1847-1869,LR1687", "Llanfabon Branch Record of Members, 1847-1869"],
    ["Llanelli,1847-1868,LR117577", "Llanelly Branch Record of Members, 1847-1868"],
    ["Llanelltyd,1850-1882,LR1727", "Compound volume: Llanelltyd, Cwm Saerbren, and Treorky, 1850-1882"],
    ["Llanelltyd,1850-1857,LR1727", "Llanelltyd Branch Record of Members, 1850-1857"],
    ["Cwm Saerbren,1858-1874,LR1727", "Cwm Saerbren Branch Record of Members, 1858-1874"],
    ["Coalbrookvale,1856-1867,LR1747", "Coal Brook Vale / Blaina records, 1856-1867"],
    ["Haverfordwest,1847-1853,LR1134321", "Haverfordwest Volume 1: Members and Historical Record, 1847-1853"],
    ["Haverfordwest,1852-1860,CR1134311-v2", "Haverfordwest Volume 2: Historical Record 1852-1854; Members 1857-1860"],
    ["Llandebie,1849-1886,LR1137", "Llandebie Branch Record of Members, 1849-1866"],
    ["Llanelly-production", "Llanelly-production source holding (review required)"],
  ]);

  const collectionProvenanceOverrides = new Map([
    ["Llanfabon 1847-1869,LR1687", "CD 15 / project LR1687 / photographed historical-library identifier 871 / 60 images"],
    ["Cwm Saerbren,1858-1874,LR1727", "CD 34 / LR 172 7 compound section / internal pages 6-24 / 38 images"],
    ["Llanelltyd,1850-1857,LR1727", "CD 34 / LR 172 7 compound section / internal pages 1-5 / 10 images"],
    ["Coalbrookvale,1856-1867,LR1747", "CD 24 / LR 174 7 compound section / 83 images / membership registers 00080-00137"],
    ["Haverfordwest,1847-1853,LR1134321", "CD 23 / photographed CR 11343 11 V.1 / project source LR1134321 / 153 historical images"],
    ["Haverfordwest,1852-1860,CR1134311-v2", "CD 58 / photographed CR 11343 11 V.2 / retained filename prefix LR1134311 / 119 historical images"],
    ["Llandebie,1849-1886,LR1137", "CD 22 / project LR 113 7 / photographed library identifier 870 / 45 images"],
    ["Llanelli,1847-1868,LR117577", "CD 11 · source label 1577 · recovered folder LR 11757 7 · image filename prefix LR 12451 7 (unresolved)"],
    ["Llanelltyd,1850-1882,LR1727", "CD 34 · LR 172 7 · internal starts: Llanelltyd page 1; Cwm Saerbren page 6; Treorky page 25"],
    ["Llanelly-production", "319 images · CR 11757 10 / source label 1578; CR 11757 11 / source label 1576; translation manuscript · boundaries unresolved"],
  ]);

  function collectionDisplayName(collection) {
    return collectionDisplayNames.get(collection?.name) || displayTitle(collection?.name);
  }

  function collectionReference(collection = currentCollection) {
    if (collection?.name === "Llanelli,1847-1868,LR117577") return "Source label 1577 · filename identifier LR12451 7 unresolved";
    if (collection?.name === "Llanelltyd,1850-1882,LR1727") return "LR1727 · compound volume";
    if (collection?.name === "Llanelltyd,1850-1857,LR1727") return "LR1727 · Llanelltyd section";
    if (collection?.name === "Llanelly-production") return "CR11757 10 · CR11757 11 · manuscript 1576";
    return displayTitle(collection?.name).match(/\b(?:LR|CR)\s*\d+(?:\s+\d+)?\b/i)?.[0].replace(/\s+/g, "") || "Source reference not identified";
  }

  function collectionHeading(collection) {
    if (collectionDisplayNames.has(collection?.name)) return collectionDisplayName(collection).replace(/(\b\d{4})-(\d{4}\b)/g, "$1–$2");
    return displayTitle(collection?.name).replace(/\s*,?\s*\b(?:LR|CR)\s*\d+(?:\s+\d+)?\b/gi, "").replace(/(\b\d{4})-(\d{4}\b)/g, "$1–$2").replace(/\s*,\s*$/, "").trim();
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
      if (record.type === "image" && /_(?:color\d*|colort\d*|focus)\.[^.]+$/i.test(record.name)) return false;
      const legacyHtml = [".htm", ".html"].includes(record.extension?.toLowerCase())
        && (hasImages || ["robohelp", "primary", "original-cds"].includes(record.source));
      if (legacyHtml) return false;
      return true;
    });
  }

  function resourceKind(collection) {
    if (collection.name === "Llanelltyd,1850-1882,LR1727") return "Compound branch volume";
    if (collection.name === "Llanelly-production") return "Mixed historical source holding";
    const records = visibleRecords(collection);
    const images = records.filter((record) => record.type === "image").length;
    const documents = records.length - images;
    if (/transcription/i.test(collection.category) || records.some((record) => /transcript/i.test(record.name))) return "Transcription";
    if (/minute|conference/i.test(collection.category + collection.name)) return "Minutes";
    if (images) return "Membership Records";
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
    ["Treorchy", "Historical source spelling Treorky identifies a distinct section beginning at internal page 25 of the compound CD 34 / LR 172 7 volume; a photographed label also identifies Treorky Branch Minutes, 1874."],
    ["Llanelly 2", "Temporary unresolved legacy holding label. Its RoboHelp topic is an empty draft. A separate 104-page convenience PDF labeled Llanelly 2 contains Wales/British Mission continued material, so the label is retained pending source-structure review; no active collection is assigned to it."],
    ["Stepaside", "Membership records 1848–1857; historical record and minutes 1858–1860."],
    ["Sutton Mountain", "Membership register 1853–1859; historical record and branch minutes 1853–1855."],
  ]);

  function relatedCollections(name) {
    return catalog.collections.map((collection) => ({
      collection,
      score: collectionBranchAssignments.get(collection.name)?.has(name) ? 0 : collectionScore(collection, name),
    }))
      .filter(({ collection, score }) => Number.isFinite(score)
        && (!collectionBranchAssignments.has(collection.name) || collectionBranchAssignments.get(collection.name).has(name))
        && visibleRecords(collection).length
        && !nonBranchLabels.has(collection.name.toLowerCase()))
      .sort((a, b) => {
        const kindDifference = (resourceKind(a.collection) === "Membership Records" ? 0 : 1) - (resourceKind(b.collection) === "Membership Records" ? 0 : 1);
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
    backToResources.hidden = true;
    viewerBreadcrumbs.hidden = true;
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
    branchHeadingDetails.textContent = branchReference;
    branchHeadingDetails.hidden = !branchReference;
    const facts = [];
    if (yearLabel(details)) facts.push(`<span><strong>Years found:</strong> ${yearLabel(details)}</span>`);
    if (branchSourceStructure.has(name)) facts.push(`<span><strong>Source structure:</strong> ${branchSourceStructure.get(name)}</span>`);
    if (details?.variants) facts.push(`<span><strong>Known variants:</strong> ${details.variants}</span>`);
    if (details?.relatedBranches) facts.push(`<span><strong>Related branch:</strong> ${details.relatedBranches}</span>`);
    branchMeta.innerHTML = facts.join("");
    branchMeta.hidden = !facts.length;
    const matches = relatedCollections(name);
    if (!matches.length || (matches.length === 1 && matches[0].id === "public-branch-registry")) {
      viewer.hidden = true;
      resourceList.innerHTML = `<div class="empty-resource"><strong>Branch recorded</strong><p>Membership records for this branch are not yet included in the online starter. Its name and evidence remain available in the branch registry.</p><a href="branch-registry.html">Open branch registry</a></div>`;
    } else {
      resourceList.replaceChildren(...matches.map((collection) => {
        const records = visibleRecords(collection);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "resource-card";
        button.dataset.collectionId = collection.id;
        button.innerHTML = `<span class="resource-kind">${resourceKind(collection)}</span><strong>${collectionDisplayName(collection)}</strong><small>${number.format(records.length)} item${records.length === 1 ? "" : "s"}</small><span class="resource-provenance">${resourceProvenance(collection)}</span>`;
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
      button.dataset.pageIndex = String(index);
      button.title = record.name;
      button.setAttribute("aria-label", `Open ${record.type === "image" ? "image" : "document"} ${index + 1}: ${record.name}`);
      if (record.type === "image") {
        const thumbnail = document.createElement("img");
        prepareRecordImage(thumbnail, record);
        thumbnail.src = recordUrl(record);
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
      pageImage.dataset.src = recordUrl(record);
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
      prepareImageLoadFeedback(pageImage, () => loadRecordImage(pageImage, recordUrl(record)));
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
    const pending = continuousView.querySelectorAll("img[data-src]");
    if (!("IntersectionObserver" in window)) {
      pending.forEach((item) => { loadRecordImage(item, item.dataset.src); delete item.dataset.src; });
      return;
    }
    lazyObserver = new IntersectionObserver((entries, observer) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      loadRecordImage(entry.target, entry.target.dataset.src);
      delete entry.target.dataset.src;
      observer.unobserve(entry.target);
    }), { rootMargin: "1200px 0px" });
    pending.forEach((item) => lazyObserver.observe(item));
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
    viewerBreadcrumbs.hidden = !keepResources;
    backToResources.hidden = !keepResources;
    backToResources.textContent = keepResources ? `${currentBranchName} Resources` : "Branch Resources";
    backToResources.href = keepResources ? `?branch=${encodeURIComponent(currentBranchName)}` : "./";
    const kind = resourceKind(collection);
    breadcrumbCurrentPage.textContent = kind === "Membership Records" ? "Membership Record" : kind;
    viewer.hidden = false;
    title.textContent = collectionHeading(collection);
    viewContext.innerHTML = keepResources
      ? `<small>${displayTitle(collection.name)}</small>`
      : `<strong>${displayTitle(collection.name)}</strong>`;
    buildPageIndex();
    setView(initialView);
    resourceList.querySelectorAll(".resource-card").forEach((button) => button.classList.toggle("active", button.dataset.collectionId === collection.id));
    position.textContent = `${number.format(currentRecords.length)} available item${currentRecords.length === 1 ? "" : "s"} · ${collectionReference(collection)}`;
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
    if (!branch || !collection || !Number.isInteger(imageIndex) || imageIndex < 0 || imageIndex >= records.length) return false;
    openBranch(branch);
    openCollection(collection, { keepResources: true, initialView: ["single", "continuous", "facing"].includes(view) ? view : "single", initialImage: imageIndex });
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
      loadRecordImage(image, recordUrl(record), () => showImage(currentImage));
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
  temporaryToolPopovers.forEach((popover) => popover.addEventListener("toggle", () => {
    if (popover.open) closeTemporaryToolPopovers(popover);
  }));
  document.addEventListener("pointerdown", (event) => {
    const openPopover = temporaryToolPopovers.find((popover) => popover.open);
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
    lineGuidesEnabled = !lineGuidesEnabled;
    lineGuideTool.classList.toggle("active", lineGuidesEnabled);
    lineGuideTool.setAttribute("aria-pressed", String(lineGuidesEnabled));
    guideControls.hidden = !lineGuidesEnabled;
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
  backToResources.addEventListener("click", (event) => {
    event.preventDefault();
    viewer.hidden = true;
    viewerBreadcrumbs.hidden = true;
    resourcePanel.hidden = false;
    $(".viewer").classList.remove("record-open");
    window.scrollTo({ top: 0, behavior: "smooth" });
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
