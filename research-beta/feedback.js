(() => {
  const isLocalHost = ["", "localhost", "127.0.0.1"].includes(location.hostname);
  const isLocalFile = location.protocol === "file:";
  const catalogEdition = window.WELSH_RECORD_CATALOG?.edition;
  const feedbackEnabled = window.WELSH_RESEARCH_BETA === true || isLocalHost || isLocalFile || ["local", "portable"].includes(catalogEdition);
  if (!feedbackEnabled) return;

  const contactAddress = "KenRoberts@live.com";
  const text = (selector, root = document) => root.querySelector(selector)?.textContent?.trim() || "";
  const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const meaningful = (value) => {
    const normalized = clean(value);
    return normalized && !["—", "-", "n/a", "not available"].includes(normalized.toLowerCase()) ? normalized : "";
  };
  const query = () => new URLSearchParams(location.search);
  const labeledValue = (root, label) => {
    const item = [...root.querySelectorAll("p")].find((node) => node.querySelector("strong")?.textContent?.trim().toLowerCase() === `${label.toLowerCase()}:`);
    return item ? clean(item.textContent.replace(new RegExp(`^${label}:\\s*`, "i"), "")) : "";
  };

  function pageType() {
    if (document.querySelector("#recordViewer:not([hidden])")) return "Records viewer";
    if (document.querySelector("#resourcePanel:not([hidden])")) return "Branch Resource page";
    if (document.querySelector("#peopleApp")) return "Member Search";
    if (document.querySelector("#researchApp")) return "Welsh Saints Search";
    if (document.querySelector(".historical-names-page")) return "Historical Names and Variants";
    if (document.querySelector(".comparison-table, #comparisonQuery")) return "FamilySearch comparison";
    if (document.querySelector("#directoryPanel")) return "All Branches / Home";
    return clean(document.querySelector("h1")?.textContent) || document.title;
  }

  function contextFromPage(trigger) {
    let supplied = {};
    if (trigger?.dataset.feedbackContext) {
      try { supplied = JSON.parse(trigger.dataset.feedbackContext); } catch { supplied = {}; }
    }
    const parameters = query();
    const viewer = document.querySelector("#recordViewer:not([hidden])");
    let viewerBranch = viewer ? clean(text("#viewerBranchResourcesLink").replace(/^←\s*/, "").replace(/\s+Branch Resources$/, "")) : "";
    if (viewer && ["", "All Branches"].includes(viewerBranch)) viewerBranch = clean(text("#collectionTitle").split(",")[0]);
    const branch = meaningful(supplied.branch || parameters.get("branch") || viewerBranch || text("#branchHeading"));
    const collection = supplied.collection || (viewer ? text("#collectionTitle") : "");
    const viewerPage = parameters.get("image");
    const pageLine = supplied.page || (viewer ? [viewerPage ? `Page ${viewerPage}` : "", text("#imagePosition")].filter(Boolean).join(" · ") : "");
    const activeImage = viewer?.querySelector("#recordImage, .record-page.active img, .record-page[aria-current='page'] img");
    const imageSource = activeImage?.currentSrc || activeImage?.src || "";
    const filename = supplied.filename || (viewer ? text("#recordCaption") || decodeURIComponent(imageSource.split("/").pop()?.split("?")[0] || "") : "");
    const source = supplied.source || (viewer ? text("#viewContext") : "");
    return {
      pageType: supplied.pageType || pageType(),
      branch,
      sourceSpelling: supplied.sourceSpelling || "",
      collection,
      source,
      page: pageLine,
      filename,
      subject: supplied.subject || "",
      sourceId: supplied.sourceId || "",
      originalUrl: supplied.originalUrl || "",
      currentUrl: location.href,
    };
  }

  const dialog = document.createElement("dialog");
  dialog.className = "research-feedback-dialog";
  dialog.innerHTML = `<form method="dialog" class="research-feedback-form"><header><div><p class="eyebrow">Research review</p><h2>Report a correction or missing information</h2></div><button type="submit" class="feedback-close" aria-label="Close report panel">&times;</button></header><p>Corrections, additional sources, and information about missing or uncertain records are welcome.</p><dl class="feedback-context" id="feedbackContext"></dl><div class="feedback-actions"><a class="feedback-email" id="feedbackEmail" href="mailto:${contactAddress}">Email Ken Roberts</a><button type="button" id="feedbackCopy">Copy details</button><button type="submit">Close</button></div><p id="feedbackStatus" role="status" aria-live="polite"></p></form>`;
  document.body.append(dialog);
  let currentContext = {};

  function contextEntries(context) {
    return [["Page/view", context.pageType], ["Branch", context.branch], ["Historical/source spelling", context.sourceSpelling], ["Collection/resource", context.collection], ["Source reference", context.source], ["Viewer page", context.page], ["Image filename", context.filename], ["Member/result", context.subject], ["Source ID", context.sourceId], ["Original record", context.originalUrl], ["Page URL", context.currentUrl]].map(([label, value]) => [label, meaningful(value)]).filter(([, value]) => value);
  }
  function subjectText() {
    return ["LDS Welsh Records correction", meaningful(currentContext.branch), meaningful(currentContext.subject)].filter(Boolean).join(" — ");
  }
  function messageBody() {
    return [
      "I would like to report a correction or provide additional information.",
      "",
      ...contextEntries(currentContext).map(([label, value]) => `${label}: ${value}`),
      "",
      "Correction / additional information:",
      "",
      "",
      "Evidence / source, if available:",
      "",
    ].join("\n");
  }
  function reportText() {
    return [`Subject: ${subjectText()}`, "", messageBody()].join("\n");
  }
  function openFeedback(trigger) {
    currentContext = contextFromPage(trigger);
    const entries = contextEntries(currentContext);
    document.querySelector("#feedbackContext").innerHTML = entries.map(([label]) => `<div><dt>${label}</dt><dd></dd></div>`).join("");
    [...document.querySelectorAll("#feedbackContext dd")].forEach((item, index) => { item.textContent = entries[index][1]; });
    document.querySelector("#feedbackEmail").href = `mailto:${contactAddress}?subject=${encodeURIComponent(subjectText())}&body=${encodeURIComponent(messageBody())}`;
    document.querySelector("#feedbackStatus").textContent = "";
    dialog.showModal();
  }
  async function copyReport() {
    const report = reportText();
    try {
      await navigator.clipboard.writeText(report);
    } catch {
      const area = document.createElement("textarea"); area.value = report; document.body.append(area); area.select(); document.execCommand("copy"); area.remove();
    }
    document.querySelector("#feedbackStatus").textContent = "Details copied.";
  }
  document.querySelector("#feedbackCopy").addEventListener("click", copyReport);
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-feedback-action]");
    if (!trigger) return;
    event.preventDefault(); openFeedback(trigger);
  });

  function addAction(container, compact = false) {
    if (!container || container.querySelector("[data-feedback-action]")) return;
    const button = document.createElement("button"); button.type = "button"; button.dataset.feedbackAction = ""; button.className = `research-feedback-link${compact ? " compact" : ""}`; button.textContent = "Report a correction or missing information";
    container.append(button);
  }
  function addContextAction(container, context) {
    if (!container || container.querySelector(":scope > .research-feedback-link[data-feedback-action]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.feedbackAction = "";
    button.dataset.feedbackContext = JSON.stringify(context);
    button.className = "research-feedback-link compact";
    button.textContent = "Report a correction or missing information";
    container.append(button);
  }
  function installResultActions() {
    document.querySelectorAll(".welsh-saints-result").forEach((result) => {
      const original = result.querySelector('a[href*="welshsaints"]');
      const body = clean(result.textContent);
      addContextAction(result, {
        pageType: "Welsh Saints Search result",
        subject: text("h2, h3", result),
        branch: text(".result-branch", result),
        sourceId: body.match(/(?:Source ID|Welsh Saints ID)\s*:?\s*([^·|\n]+)/i)?.[1]?.trim() || "",
        originalUrl: original?.href || "",
      });
    });
    document.querySelectorAll(".historical-name-entry").forEach((entry) => addContextAction(entry, {
      pageType: "Historical Names and Variants entry",
      subject: text("h2, h3", entry),
      branch: text(".canonical-name, .historical-name-canonical", entry),
      sourceSpelling: text(".historical-name, .source-name", entry) || text("h2, h3", entry),
    }));
    document.querySelectorAll(".comparison-table tbody tr, table[data-feedback-comparison] tbody tr").forEach((row) => {
      const cells = [...row.querySelectorAll("td")].map((cell) => clean(cell.textContent));
      if (!cells.length) return;
      const target = row.lastElementChild || row;
      addContextAction(target, {
        pageType: "FamilySearch comparison entry",
        subject: text("td:first-child strong", row) || cells[0],
        branch: cells[1] || "",
        source: [cells[0], cells[2], cells[3]].filter(Boolean).join(" · "),
      });
    });
  }
  const install = () => {
    const viewerToolbar = document.querySelector("#recordViewer:not([hidden]) .view-toolbar");
    if (viewerToolbar) addAction(viewerToolbar, true);
    const branchHeader = document.querySelector("#resourcePanel:not([hidden]) .branch-resource-heading");
    if (branchHeader) addAction(branchHeader);
    if (!viewerToolbar && !branchHeader) {
      const pageTarget = document.querySelector("[data-page-feedback]")
        || document.querySelector("[data-home-feedback]")
        || (document.querySelector("#peopleApp")
        ? document.querySelector("#page-bottom")
        : document.querySelector("main"));
      addAction(pageTarget);
    }
    installResultActions();
  };
  install();
  new MutationObserver(install).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["hidden"] });
})();
