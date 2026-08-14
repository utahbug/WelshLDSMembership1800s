(() => {
  const monthNames = new Map([
    ["ionawr", "January"], ["ion", "January"],
    ["chwefror", "February"], ["chwef", "February"],
    ["mawrth", "March"], ["maw", "March"],
    ["ebrill", "April"], ["ebr", "April"],
    ["mai", "May"],
    ["mehefin", "June"], ["meh", "June"],
    ["gorffennaf", "July"], ["gorff", "July"],
    ["awst", "August"],
    ["medi", "September"],
    ["hydref", "October"], ["hyd", "October"],
    ["tachwedd", "November"], ["tach", "November"],
    ["rhagfyr", "December"], ["rhag", "December"],
  ]);
  const englishMonths = new Map([
    ["jan", "January"], ["january", "January"], ["feb", "February"], ["february", "February"],
    ["mar", "March"], ["march", "March"], ["apr", "April"], ["april", "April"],
    ["may", "May"], ["jun", "June"], ["june", "June"], ["jul", "July"], ["july", "July"],
    ["aug", "August"], ["august", "August"], ["sep", "September"], ["sept", "September"],
    ["september", "September"], ["oct", "October"], ["october", "October"],
    ["nov", "November"], ["november", "November"], ["dec", "December"], ["december", "December"],
  ]);

  const registry = () => window.WELSH_BRANCH_REGISTRY?.registry || [];
  const centuryForBranch = (branch) => {
    const entry = registry().find((item) => item.canonicalName === branch);
    const years = [entry?.earliestYear, entry?.latestYear].filter((year) => Number.isInteger(year));
    if (years.length !== 2) return null;
    const centuries = new Set(years.map((year) => Math.floor(year / 100) * 100));
    return centuries.size === 1 ? [...centuries][0] : null;
  };
  const cleanToken = (value) => String(value || "").toLocaleLowerCase("en").replace(/[^a-z]/g, "");
  const dayNumber = (value) => Number(String(value || "").replace(/(?:st|nd|rd|th)$/i, ""));

  function interpretDate(value, branch) {
    const original = String(value || "").trim();
    if (!original) return "";
    const tokens = original.replace(/[,./-]+/g, " ").split(/\s+/).filter(Boolean);
    if (tokens.length !== 3) return "";
    let monthToken = "", dayToken = "", yearToken = "";
    if (monthNames.has(cleanToken(tokens[0])) || englishMonths.has(cleanToken(tokens[0]))) {
      [monthToken, dayToken, yearToken] = tokens;
    } else if (monthNames.has(cleanToken(tokens[1])) || englishMonths.has(cleanToken(tokens[1]))) {
      [dayToken, monthToken, yearToken] = tokens;
    } else return "";
    const monthKey = cleanToken(monthToken);
    const welshMonth = monthNames.get(monthKey);
    const month = welshMonth || englishMonths.get(monthKey);
    const day = dayNumber(dayToken);
    if (!month || !Number.isInteger(day) || day < 1 || day > 31 || !/^\d{2}$|^\d{4}$/.test(yearToken)) return "";
    const shortYear = yearToken.length === 2;
    if (!welshMonth && !shortYear) return "";
    let year = Number(yearToken);
    if (shortYear) {
      const century = centuryForBranch(branch);
      if (century == null) return "";
      year += century;
    }
    return `${month} ${day}, ${year}`;
  }

  function interpretationRows(branch, birth, baptism) {
    return [["Birth", interpretDate(birth, branch)], ["Baptism", interpretDate(baptism, branch)]]
      .filter(([, value]) => value);
  }

  function enhanceMemberSearchCard(card) {
    if (card.dataset.dateInterpretationReady) return;
    const facts = [...card.querySelectorAll(".people-key-facts .people-fact")];
    const valueFor = (label) => facts.find((fact) => fact.querySelector("strong")?.textContent.trim() === `${label}:`)?.textContent.replace(`${label}:`, "").trim() || "";
    const branch = valueFor("Branch");
    const rows = interpretationRows(branch, valueFor("Birth"), valueFor("Baptism"));
    if (rows.length) {
      const details = document.createElement("div");
      details.className = "people-date-interpretations";
      details.innerHTML = rows.map(([label, value]) => `<p class="people-source-detail"><strong>${label}:</strong> ${value}</p>`).join("");
      card.querySelector(".people-key-facts")?.insertAdjacentElement("afterend", details);
    }
    const sourceSpelling = [...card.querySelectorAll(".people-source-detail")]
      .find((item) => item.querySelector("strong")?.textContent.trim() === "Source branch spelling:");
    const action = card.querySelector(".people-result-action");
    if (sourceSpelling && action) action.insertAdjacentElement("beforebegin", sourceSpelling);
    card.dataset.dateInterpretationReady = "true";
  }

  function enhanceBranchMember(details) {
    if (details.dataset.dateInterpretationReady) return;
    const list = details.querySelector("dl");
    if (!list) return;
    const facts = [...list.querySelectorAll(":scope > div")];
    const valueFor = (label) => facts.find((fact) => fact.querySelector("dt")?.textContent.trim() === label)?.querySelector("dd")?.textContent.trim() || "";
    const branch = document.querySelector("#branchTitle")?.textContent.trim() || "";
    const rows = interpretationRows(branch, valueFor("Birth"), valueFor("Baptism"));
    rows.reverse().forEach(([label, value]) => {
      const row = document.createElement("div");
      row.className = "branch-member-date-interpretation";
      row.innerHTML = `<dt>${label}</dt><dd>${value}</dd>`;
      list.prepend(row);
    });
    details.dataset.dateInterpretationReady = "true";
  }

  function enhanceMemberDates(root = document) {
    if (root.matches?.(".people-result:not(.all-records-result)")) enhanceMemberSearchCard(root);
    if (root.matches?.(".branch-member-record-details")) enhanceBranchMember(root);
    root.querySelectorAll?.(".people-result:not(.all-records-result)").forEach(enhanceMemberSearchCard);
    root.querySelectorAll?.(".branch-member-record-details").forEach(enhanceBranchMember);
  }

  function initializeStickyNavigation() {
    const nav = document.querySelector(".search-sticky-nav");
    if (!nav) return;
    let threshold = nav.getBoundingClientRect().top + window.scrollY;
    const update = () => nav.classList.toggle("is-stuck", window.scrollY > Math.max(1, threshold));
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", () => {
      const wasStuck = nav.classList.contains("is-stuck");
      nav.classList.remove("is-stuck");
      threshold = nav.getBoundingClientRect().top + window.scrollY;
      if (wasStuck) update();
    }, { passive: true });
    update();
  }

  function initializeHomeSearchEmphasis() {
    const input = document.querySelector("#collectionSearch");
    if (!input || location.search) return;
    input.classList.add("home-search-emphasis");
    const clear = () => input.classList.remove("home-search-emphasis");
    input.addEventListener("pointerdown", clear, { once: true });
    input.addEventListener("keydown", clear, { once: true });
    setTimeout(clear, 1500);
  }

  function initializeBranchReviewPopover() {
    const disclosure = document.querySelector(".presentation-branch-review");
    const summary = disclosure?.querySelector("summary");
    if (!disclosure || !summary) return;
    document.addEventListener("pointerdown", (event) => {
      if (disclosure.open && innerWidth > 820 && !disclosure.contains(event.target)) disclosure.open = false;
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !disclosure.open || innerWidth <= 820) return;
      disclosure.open = false;
      summary.focus();
    });
  }

  function initializePublicViewerAvailability() {
    const parameters = new URLSearchParams(location.search);
    const collectionId = parameters.get("collection");
    if (!collectionId || window.WELSH_RECORD_CATALOG?.edition !== "public") return false;
    const collection = window.WELSH_RECORD_CATALOG.collections?.find((item) => item.id === collectionId);
    if (!collection || collection.availability?.online) return false;
    const viewer = document.querySelector("#recordViewer");
    const position = document.querySelector("#imagePosition");
    if (!viewer || !position) return false;
    viewer.classList.add("viewer-portable-only");
    const suppressUnavailablePages = () => {
      viewer.querySelectorAll(".image-load-status").forEach((status) => status.remove());
      viewer.querySelector("#recordImage")?.removeAttribute("src");
      viewer.querySelector("#continuousView")?.replaceChildren();
    };
    suppressUnavailablePages();
    new MutationObserver(suppressUnavailablePages).observe(viewer, { childList: true, subtree: true });
    viewer.addEventListener("click", (event) => {
      if (event.target.closest("[data-view]")) event.stopImmediatePropagation();
    }, true);
    let notice = viewer.querySelector(".viewer-portable-availability");
    if (!notice) {
      notice = document.createElement("div");
      notice.className = "viewer-portable-availability";
      notice.setAttribute("role", "status");
      const message = document.createElement("p");
      message.textContent = "Page images are available in the portable/archive edition.";
      notice.append(message);
      const documentUrl = [collection.publicDocumentUrl, collection.documentUrl, collection.sourceUrl]
        .find((value) => /^https?:\/\//i.test(String(value || "")));
      if (documentUrl) {
        const link = document.createElement("a");
        link.href = documentUrl;
        link.textContent = "Open document";
        notice.append(link);
      }
      viewer.querySelector(".viewer-sticky-header")?.insertAdjacentElement("afterend", notice);
    }
    return true;
  }

  function releaseFacingViewerTransition() {
    const parameters = new URLSearchParams(location.search);
    if (!parameters.get("collection") || !["facing", "continuous"].includes(parameters.get("view"))) return;
    const finish = () => {
      document.documentElement.classList.remove("source-route-pending");
      document.querySelector(".source-route-status")?.remove();
    };
    const viewer = document.querySelector("#recordViewer");
    const pages = document.querySelector("#continuousView");
    if (!viewer || !pages) return;
    const check = () => {
      const images = [...pages.querySelectorAll("img")];
      if (images.some((image) => image.complete && image.naturalWidth > 0)) return finish();
      if (!viewer.hidden && document.querySelector("#collectionTitle")?.textContent.trim() && pages.querySelector(".scroll-page, .page-spread")) finish();
    };
    document.addEventListener("load", (event) => { if (pages.contains(event.target)) finish(); }, true);
    document.addEventListener("error", (event) => { if (pages.contains(event.target)) finish(); }, true);
    new MutationObserver(check).observe(pages, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
    check();
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) for (const node of mutation.addedNodes) if (node.nodeType === Node.ELEMENT_NODE) enhanceMemberDates(node);
  });
  enhanceMemberDates();
  observer.observe(document.body, { childList: true, subtree: true });
  initializeStickyNavigation();
  initializeHomeSearchEmphasis();
  initializeBranchReviewPopover();
  initializePublicViewerAvailability();
  releaseFacingViewerTransition();
})();
