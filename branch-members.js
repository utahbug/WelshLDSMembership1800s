(() => {
  const index = window.WELSH_PEOPLE_BETA_INDEX || window.WELSH_PEOPLE_PRIVATE_INDEX;
  if (!index?.records?.length) return;

  const records = index.records.filter((record) => record.verified && record.occurrenceType === "member" && record.branch);
  const byBranch = new Map();
  for (const record of records) {
    if (!byBranch.has(record.branch)) byBranch.set(record.branch, []);
    byBranch.get(record.branch).push(record);
  }
  for (const branchRecords of byBranch.values()) {
    branchRecords.sort((a, b) => String(a.nameAsWritten || "").localeCompare(String(b.nameAsWritten || ""), "en", { sensitivity: "base" })
      || String(a.entryNumber || "").localeCompare(String(b.entryNumber || ""), "en", { numeric: true }));
  }

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const memberCountText = (count) => `${count.toLocaleString()} member${count === 1 ? "" : "s"}`;
  const exactSourceAvailable = (record) => (record.onlineViewerAvailable !== false
      || (window.WELSH_LOCAL_DEVELOPMENT && record.collectionName === "Georgetown-production"))
    && record.collectionId
    && ((Number.isInteger(record.imageSequence) && record.imageSequence > 0) || record.imageFilename);
  const recordUrl = (record) => `index.html?${new URLSearchParams({
    branch: record.branch,
    collection: record.collectionId,
    image: record.imageSequence ? String(record.imageSequence) : "",
    imageFilename: record.imageFilename || "",
    view: "single",
  })}`;

  function branchNameFromCard(card) {
    const label = card.querySelector("strong")?.textContent?.trim() || "";
    return label.replace(/\s*\(unresolved source identity\)\s*$/i, "");
  }

  function addDirectoryCounts(root = document) {
    root.querySelectorAll(".branch-card").forEach((card) => {
      if (card.querySelector(".branch-member-count")) return;
      const branchRecords = byBranch.get(branchNameFromCard(card));
      if (!branchRecords?.length) return;
      const line = document.createElement("small");
      line.className = "branch-member-count";
      line.textContent = memberCountText(branchRecords.length);
      card.append(line);
    });
  }

  function memberDetails(record) {
    const aliases = Array.isArray(record.aliases) ? record.aliases.filter(Boolean) : [];
    const facts = [
      ["Name as written", record.nameAsWritten],
      ["Birth", record.birthDate],
      ["Baptism", record.baptismDate],
      ["Residence", record.residence],
      ["Entry", record.entryNumber],
      ["Date", record.year || record.date],
      ["Also written", aliases.join("; ")],
      ["Source", record.collectionName],
      ["Source image", record.imageFilename],
      ["Notes", record.notes],
      ["Source branch spelling", record.sourceBranchSpelling && record.sourceBranchSpelling !== record.branch ? record.sourceBranchSpelling : ""],
    ].filter(([, value]) => value !== undefined && value !== null && String(value).trim());
    const source = exactSourceAvailable(record)
      ? `<p class="people-result-action"><a class="people-source-link" href="${escapeHtml(recordUrl(record))}">Open source<span class="people-source-link-icon" aria-hidden="true"></span></a></p>`
      : "";
    return `<dl>${facts.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>${source}`;
  }

  function buildMembersSection(branch, branchRecords) {
    const section = document.createElement("details");
    section.className = "branch-detail-disclosure branch-members-section";
    section.innerHTML = `<summary aria-expanded="false">Members (${branchRecords.length.toLocaleString()})</summary><div class="branch-detail-content branch-members-content"></div>`;
    const content = section.querySelector(".branch-members-content");
    let filter = null;
    let list = null;
    if (branchRecords.length > 25) {
      const label = document.createElement("label");
      label.className = "branch-member-filter";
      label.innerHTML = `<span>Filter names</span><small class="branch-member-filter-note">Some names may appear more than once.</small><input type="search" autocomplete="off" aria-label="Filter ${escapeHtml(branch)} member names">`;
      filter = label.querySelector("input");
      content.append(label);
    }
    list = document.createElement("div");
    list.className = "branch-member-list";
    for (const record of branchRecords) {
      const member = document.createElement("details");
      member.className = "branch-member-record";
      member.dataset.memberName = String(record.nameAsWritten || "").toLocaleLowerCase("en");
      member.innerHTML = `<summary>${escapeHtml(record.nameAsWritten)}</summary><div class="branch-member-record-details">${memberDetails(record)}</div>`;
      list.append(member);
    }
    content.append(list);
    if (filter) filter.addEventListener("input", () => {
      const query = filter.value.trim().toLocaleLowerCase("en");
      list.querySelectorAll(".branch-member-record").forEach((member) => { member.hidden = Boolean(query) && !member.dataset.memberName.includes(query); });
    });
    let filterEmphasisTimer = null;
    section.addEventListener("toggle", () => {
      section.querySelector("summary")?.setAttribute("aria-expanded", String(section.open));
      if (!section.open || !filter) return;
      clearTimeout(filterEmphasisTimer);
      filter.classList.remove("branch-member-filter-emphasis");
      requestAnimationFrame(() => filter.classList.add("branch-member-filter-emphasis"));
      filterEmphasisTimer = setTimeout(() => filter.classList.remove("branch-member-filter-emphasis"), 1100);
    });
    return section;
  }

  function enhanceBranchResource() {
    const branch = document.querySelector("#branchTitle")?.textContent?.trim();
    const list = document.querySelector("#resourceList");
    if (!branch || !list) return;
    const branchRecords = byBranch.get(branch);
    if (!branchRecords?.length) return;

    const recordCard = [...list.querySelectorAll(".resource-card")].find((card) => /record of members/i.test(card.querySelector(".resource-kind")?.textContent || ""));
    if (recordCard && !recordCard.querySelector(".resource-member-count")) {
      const line = document.createElement("small");
      line.className = "resource-member-count";
      line.textContent = memberCountText(branchRecords.length);
      const itemCount = recordCard.querySelector("small");
      itemCount?.insertAdjacentElement("afterend", line);
    }

    const information = list.querySelector(".branch-information");
    if (!information || information.querySelector(".branch-members-section")) return;
    const section = buildMembersSection(branch, branchRecords);
    const alternateNames = information.querySelector(".branch-detail-expanded");
    if (alternateNames) alternateNames.insertAdjacentElement("afterend", section);
    else information.prepend(section);
  }

  addDirectoryCounts();
  enhanceBranchResource();
  const observer = new MutationObserver(() => {
    addDirectoryCounts();
    enhanceBranchResource();
  });
  const directory = document.querySelector("#branchList");
  const resources = document.querySelector("#resourceList");
  if (directory) observer.observe(directory, { childList: true });
  if (resources) observer.observe(resources, { childList: true, subtree: true });
})();
