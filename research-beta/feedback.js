(() => {
  const isLocalHost = ["", "localhost", "127.0.0.1"].includes(location.hostname);
  const isLocalFile = location.protocol === "file:";
  const catalogEdition = window.WELSH_RECORD_CATALOG?.edition;
  const feedbackEnabled = window.WELSH_RESEARCH_BETA === true || isLocalHost || isLocalFile || ["local", "portable"].includes(catalogEdition);
  if (!feedbackEnabled) return;
  const categories = [
    "Correction to a name/date/detail",
    "Missing person or record",
    "Missing branch or alternate name",
    "Incorrect branch/source relationship",
    "Transcription or handwriting issue",
    "Source/provenance information",
    "Broken link or viewer problem",
    "Other research information",
  ];
  const text = (selector, root = document) => root.querySelector(selector)?.textContent?.trim() || "";
  const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
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
    const branch = supplied.branch || parameters.get("branch") || text("#branchHeading") || clean(text("#viewerBranchResourcesLink").replace(/^←\s*/, "").replace(/\s+Branch Resources$/, ""));
    const collection = supplied.collection || (viewer ? text("#collectionTitle") : "");
    const viewerPage = parameters.get("image");
    const pageLine = supplied.page || (viewer ? [viewerPage ? `Page ${viewerPage}` : "", text("#imagePosition")].filter(Boolean).join(" · ") : "");
    const filename = supplied.filename || (viewer ? text("#recordCaption") : "");
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
  dialog.innerHTML = `<form method="dialog" class="research-feedback-form"><header><div><p class="eyebrow">Research review</p><h2>Report a correction or missing information</h2></div><button type="submit" class="feedback-close" aria-label="Close report form">×</button></header><p>Corrections, additional sources, and evidence about missing or uncertain records are welcome.</p><dl class="feedback-context" id="feedbackContext"></dl><label>Category<select id="feedbackCategory">${categories.map((category) => `<option>${category}</option>`).join("")}</select></label><label>What should be corrected or added?<textarea id="feedbackComments" rows="6" required></textarea></label><label>Evidence/source <span>(optional)</span><textarea id="feedbackEvidence" rows="3" placeholder="Citation, URL, book, document, or research note"></textarea></label><div class="feedback-contact"><label>Your name <span>(optional)</span><input id="feedbackName" autocomplete="name"></label><label>Email/contact <span>(optional; useful only if follow-up is needed)</span><input id="feedbackContact" autocomplete="email"></label></div><p class="feedback-delivery-note">No project delivery address is configured. Copy or download this report, then send it to the project owner through an agreed contact channel.</p><div class="feedback-actions"><button type="button" id="feedbackCopy">Copy report</button><button type="button" id="feedbackDownload">Download report</button><button type="submit">Close</button></div><p id="feedbackStatus" role="status" aria-live="polite"></p></form>`;
  document.body.append(dialog);
  let currentContext = {};

  function contextEntries(context) {
    return [["Page/view", context.pageType], ["Branch", context.branch], ["Historical/source spelling", context.sourceSpelling], ["Collection/resource", context.collection], ["Source reference", context.source], ["Viewer page", context.page], ["Image filename", context.filename], ["Subject/result", context.subject], ["Source ID", context.sourceId], ["Original record", context.originalUrl], ["Current URL", context.currentUrl]].filter(([, value]) => value);
  }
  function reportText() {
    const entries = contextEntries(currentContext);
    return [`LDS Welsh Records correction${currentContext.branch ? ` — ${currentContext.branch}` : ""}${currentContext.subject ? ` — ${currentContext.subject}` : ""}`, "", `Category: ${document.querySelector("#feedbackCategory").value}`, "", "What should be corrected or added?", document.querySelector("#feedbackComments").value.trim() || "[Not entered]", "", "Evidence/source:", document.querySelector("#feedbackEvidence").value.trim() || "[Not provided]", "", "Captured project context:", ...entries.map(([label, value]) => `${label}: ${value}`), "", `Researcher name: ${document.querySelector("#feedbackName").value.trim() || "[Not provided]"}`, `Email/contact: ${document.querySelector("#feedbackContact").value.trim() || "[Not provided]"}`].join("\n");
  }
  function openFeedback(trigger) {
    currentContext = contextFromPage(trigger);
    document.querySelector("#feedbackContext").innerHTML = contextEntries(currentContext).map(([label, value]) => `<div><dt>${label}</dt><dd></dd></div>`).join("");
    [...document.querySelectorAll("#feedbackContext dd")].forEach((item, index) => { item.textContent = contextEntries(currentContext)[index][1]; });
    document.querySelector("#feedbackStatus").textContent = "";
    dialog.showModal();
  }
  async function copyReport() {
    const report = reportText();
    try {
      await navigator.clipboard.writeText(report);
      document.querySelector("#feedbackStatus").textContent = "Report copied.";
    } catch {
      const area = document.createElement("textarea"); area.value = report; document.body.append(area); area.select(); document.execCommand("copy"); area.remove();
      document.querySelector("#feedbackStatus").textContent = "Report copied.";
    }
  }
  function downloadReport() {
    const blob = new Blob([reportText()], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `lds-welsh-records-report-${new Date().toISOString().slice(0, 10)}.txt`; link.click(); URL.revokeObjectURL(link.href);
    document.querySelector("#feedbackStatus").textContent = "Report downloaded.";
  }
  document.querySelector("#feedbackCopy").addEventListener("click", copyReport);
  document.querySelector("#feedbackDownload").addEventListener("click", downloadReport);
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
    document.querySelectorAll(".people-result").forEach((result) => addContextAction(result, {
      pageType: "Member Search result",
      subject: text("h2", result),
      branch: labeledValue(result, "Branch"),
      sourceSpelling: labeledValue(result, "Source branch spelling"),
      source: labeledValue(result, "Source"),
      page: labeledValue(result, "Entry"),
    }));
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
    if (!viewerToolbar && !branchHeader) addAction(document.querySelector("main"));
    installResultActions();
  };
  install();
  new MutationObserver(install).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["hidden"] });
})();
