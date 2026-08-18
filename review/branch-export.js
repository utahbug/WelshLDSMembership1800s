(() => {
  const directory = document.querySelector("#directoryPanel");
  const heading = directory?.querySelector(".directory-heading");
  const utilitySlot = directory?.querySelector(".branch-export-slot");
  const topSlot = directory?.querySelector(".branch-export-top-slot");
  const data = window.WELSH_BRANCH_EXPORT_DATA;
  if (!directory || !heading || !data) return;
  const details = document.createElement("details");
  details.className = "branch-export-control";
  details.innerHTML = `<summary aria-expanded="false">Export branch data</summary><div class="branch-export-menu"><fieldset><legend>Scope</legend><label><input type="radio" name="branch-export-scope" value="canonical" checked>Identified branches</label><label><input type="radio" name="branch-export-scope" value="possible">Possible branches under review</label><label><input type="radio" name="branch-export-scope" value="both">Both</label></fieldset><button type="button" data-export="copy-list">Copy branch list</button><button type="button" data-export="copy-details">Copy branch list with details</button><button type="button" data-export="csv">Download CSV</button><button type="button" data-export="xlsx">Download Excel</button><span class="branch-export-status" aria-live="polite"></span></div>`;
  (utilitySlot || heading).append(details);
  const summary = details.querySelector("summary");
  const topTrigger = topSlot ? document.createElement("button") : null;
  if (topTrigger) {
    topTrigger.type = "button";
    topTrigger.className = "branch-export-top-trigger";
    topTrigger.setAttribute("aria-label", "Export branch data");
    topTrigger.setAttribute("title", "Export branch data");
    topTrigger.setAttribute("aria-expanded", "false");
    topTrigger.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 14v5h14v-5"/></svg>';
    topSlot.append(topTrigger);
  }
  const menu = details.querySelector(".branch-export-menu");
  const status = details.querySelector(".branch-export-status");
  const scope = () => details.querySelector('input[name="branch-export-scope"]:checked')?.value || "canonical";
  const rows = () => scope() === "canonical" ? data.canonical : scope() === "possible" ? data.possible : [...data.canonical, ...data.possible];
  const columns = ["Branch", "Years", "Members", "Record collections", "Sources and Evidence", "Leadership / Officers", "Historical Names", "Status"];
  const csvCell = (input) => `"${String(input ?? "").replaceAll('"', '""')}"`;
  const download = (blob, filename) => { const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = filename; link.hidden = true; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); };
  const showCopied = () => { status.textContent = "Copied"; setTimeout(() => { status.textContent = ""; }, 1400); };
  const copy = async (text) => { await navigator.clipboard.writeText(text); showCopied(); };
  const workbookNames = { canonical: "Welsh-LDS-Canonical-Branches.xlsx", possible: "Welsh-LDS-Possible-Branches.xlsx", both: "Welsh-LDS-Branches-Canonical-and-Possible.xlsx" };
  let activeTrigger = summary;
  const positionMenu = () => {
    if (!details.open) return;
    const margin = 12;
    const triggerRect = activeTrigger.getBoundingClientRect();
    const width = Math.min(310, window.innerWidth - (margin * 2));
    const left = Math.min(Math.max(margin, triggerRect.right - width), window.innerWidth - margin - width);
    menu.style.width = `${width}px`;
    menu.style.left = `${left}px`;
    menu.style.right = "auto";
    menu.style.top = `${Math.max(margin, triggerRect.bottom + 3)}px`;
    requestAnimationFrame(() => {
      const menuRect = menu.getBoundingClientRect();
      const below = triggerRect.bottom + 3;
      const above = triggerRect.top - menuRect.height - 3;
      const preferredTop = below + menuRect.height <= window.innerHeight - margin ? below : above >= margin ? above : below;
      menu.style.top = `${Math.min(Math.max(margin, preferredTop), window.innerHeight - margin - menuRect.height)}px`;
    });
  };
  summary.addEventListener("click", () => { activeTrigger = summary; });
  topTrigger?.addEventListener("click", (event) => {
    event.stopPropagation();
    activeTrigger = topTrigger;
    details.open = !details.open;
  });
  details.addEventListener("toggle", () => {
    const expanded = String(details.open);
    summary.setAttribute("aria-expanded", expanded);
    topTrigger?.setAttribute("aria-expanded", expanded);
    positionMenu();
  });
  window.addEventListener("resize", positionMenu, { passive: true });
  window.addEventListener("scroll", positionMenu, { passive: true });
  details.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-export]")?.dataset.export; if (!action) return;
    const selected = rows();
    if (action === "copy-list") return copy(selected.map((row) => row.Branch).join("\n"));
    if (action === "copy-details") return copy(selected.map((row) => columns.map((column) => row[column] ? `${column}: ${row[column]}` : "").filter(Boolean).join("\n")).join("\n\n"));
    if (action === "csv") { const csv = `\uFEFF${columns.map(csvCell).join(",")}\r\n${selected.map((row) => columns.map((column) => csvCell(row[column])).join(",")).join("\r\n")}\r\n`; return download(new Blob([csv], { type: "text/csv;charset=utf-8" }), `Welsh-LDS-Branches-${scope()}.csv`); }
    if (action === "xlsx") location.href = `exports/${workbookNames[scope()]}`;
  });
  document.addEventListener("click", (event) => { if (details.open && !details.contains(event.target) && event.target !== topTrigger) details.open = false; });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && details.open) { details.open = false; activeTrigger.focus(); } });
})();
