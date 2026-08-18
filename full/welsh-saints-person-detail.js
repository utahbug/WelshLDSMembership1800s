(() => {
  let recordsPromise = null;
  let returnTarget = null;
  let returnScrollY = 0;

  const cleanText = (value) => {
    const decoder = document.createElement("textarea");
    decoder.innerHTML = String(value || "").replace(/&nbsp;?/gi, " ");
    return decoder.value.replace(/\s+/g, " ").replace(/^View On FamilySearch\s*/i, "").trim();
  };
  const sectionNames = ["Parents and Siblings", "Spouses and Children", "Census Records", "Migration", "Comments", "Resources"];
  const fieldLabels = ["Given Name", "Surname", "Maiden Name", "Gender", "Birth date", "Birth place", "Christening date", "Christening place", "Baptism date", "Baptism place", "Confirmation date", "Confirmation place", "Marriage date", "Marriage place", "Death date", "Death place", "Burial date", "Burial place", "Father", "Mother"];
  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, " ").trim().toLocaleLowerCase("en");

  function sourceNumber(value) {
    return String(value || "").split(":").at(-1);
  }

  function currentRecords() {
    return (window.WELSH_SAINTS_BETA_INDEX || window.WELSH_SAINTS_PRIVATE_INDEX)?.records || [];
  }

  function loadRecords() {
    const available = currentRecords();
    if (available.length) return Promise.resolve(available);
    if (recordsPromise) return recordsPromise;
    recordsPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "data/beta/welsh-saints-index.beta.js?v=local-dev-welsh-detail-20260815";
      script.addEventListener("load", () => resolve(currentRecords()));
      script.addEventListener("error", () => reject(new Error("Welsh Saints person details could not be loaded.")));
      document.head.append(script);
    });
    return recordsPromise;
  }

  function ensureDialog() {
    let dialog = document.querySelector("#welshSaintsDetail");
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "welshSaintsDetail";
    dialog.className = "welsh-saints-detail-dialog";
    dialog.setAttribute("aria-labelledby", "welshSaintsDetailTitle");
    dialog.innerHTML = `<article class="welsh-saints-detail-card"><header class="welsh-saints-detail-header"><button type="button" class="welsh-saints-detail-close" aria-label="Back to search results">Back to results</button><h2 id="welshSaintsDetailTitle"></h2></header><div id="welshSaintsDetailBody" class="welsh-saints-detail-body"></div><footer id="welshSaintsDetailActions" class="welsh-saints-detail-actions"></footer></article>`;
    document.body.append(dialog);
    dialog.querySelector(".welsh-saints-detail-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => {
      const target = returnTarget;
      const scrollY = returnScrollY;
      returnTarget = null;
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, left: 0, behavior: "instant" });
        target?.focus({ preventScroll: true });
      });
    });
    return dialog;
  }

  function splitSections(value) {
    const text = cleanText(value);
    const sections = [];
    const markers = sectionNames.map((name) => ({ name, index: text.indexOf(name) })).filter((item) => item.index >= 0).sort((a, b) => a.index - b.index);
    const vital = text.slice(0, markers[0]?.index ?? text.length).replace(/^Vital Information\s*(?:Close)?\s*/i, "").trim();
    markers.forEach((marker, index) => {
      const end = markers[index + 1]?.index ?? text.length;
      const content = text.slice(marker.index + marker.name.length, end).replace(/^\s*(?:Open|Close)\s*/i, "").trim();
      if (content) sections.push({ heading: marker.name, content });
    });
    return { vital, sections };
  }

  function parseFields(value) {
    const found = fieldLabels.map((label) => ({ label, marker: `${label}:`, index: value.indexOf(`${label}:`) })).filter((item) => item.index >= 0).sort((a, b) => a.index - b.index);
    return found.map((item, index) => ({
      label: item.label,
      value: value.slice(item.index + item.marker.length, found[index + 1]?.index ?? value.length).split(/\bView Sources\b/i)[0].replace(/\s+/g, " ").trim(),
    })).filter((item) => item.value);
  }

  function splitPlace(value, baseLabel) {
    const place = String(value || "").trim();
    if (!place) return [];
    const labelled = place.match(/^English Spelling:\s*(.*?)\s+Welsh Spelling:\s*(.*)$/i);
    return labelled
      ? [{ label: `${baseLabel} — English spelling`, value: labelled[1] }, { label: `${baseLabel} — Welsh spelling`, value: labelled[2] }]
      : [{ label: baseLabel, value: place }];
  }

  function documentedPlaceVariants(record, place) {
    const rows = window.WELSH_HISTORICAL_NAMES?.rows || [];
    const accepted = new Set(["Historical spelling", "Known alias", "Alternate spelling"]);
    const placeKey = normalize(place);
    return [...new Set((record.matchedBranches || []).flatMap((branch) => {
      const branchRows = rows.filter((row) => row.canonicalName === branch);
      const identifiesPlace = [branch, ...branchRows.map((row) => row.name)].some((name) => name && placeKey.includes(normalize(name.replace(/\s+Branch$/i, ""))));
      return identifiesPlace ? branchRows.filter((row) => accepted.has(row.relationship)).map((row) => row.name) : [];
    }))].filter((name) => name && !/[()]|\bBranch$/i.test(name) && !placeKey.includes(normalize(name)));
  }

  function orderedFields(record) {
    const cells = record.cells || [];
    const { vital, sections } = splitSections(record.detailText);
    const parsed = new Map(record.personDetails
      ? Object.entries(record.personDetails)
      : parseFields(vital).map((field) => [field.label, field.value]));
    const birthPlace = parsed.get("Birth place") || (cells.length > 3 ? cells.at(-1) : "");
    const listingMarriageDate = cells.length > 4 ? cells[3] : "";
    const fields = [{ label: "Name", value: record.title }];
    const add = (label, value) => { if (value) fields.push({ label, value }); };
    add("Birth date", parsed.get("Birth date") || cells[1]);
    fields.push(...splitPlace(birthPlace, "Birth place"));
    const variants = documentedPlaceVariants(record, birthPlace);
    if (variants.length) add("Also written as", variants.join("; "));
    add("Death date", parsed.get("Death date") || cells[2]);
    add("Death place", parsed.get("Death place"));
    add("Baptism", parsed.get("Baptism date"));
    add("Marriage date", parsed.get("Marriage date") || listingMarriageDate);
    if (record.matchedBranches?.length) add("Branch/place", record.matchedBranches.join("; "));
    ["Gender", "Maiden Name", "Christening date", "Christening place", "Baptism place", "Confirmation date", "Confirmation place", "Marriage place", "Burial date", "Burial place", "Father", "Mother"].forEach((label) => add(label, parsed.get(label)));
    add("Source ID", String(record.sourceId || ""));
    return { fields, sections };
  }

  function facts(record) {
    const cells = record?.cells || [];
    const details = record?.personDetails || {};
    const birthDate = cells[1] || "";
    const birthPlace = cells.length > 3 ? cells.at(-1) : "";
    const deathDate = details["Death date"] || cells[2] || "";
    const deathPlace = details["Death place"] || "";
    const listingMarriageDate = cells.length > 4 ? cells[3] : "";
    return [
      birthDate || birthPlace ? { label: "Birth", value: [birthDate, birthPlace].filter(Boolean).join(" · ") } : null,
      deathDate || deathPlace ? { label: "Death", value: [deathDate, deathPlace].filter(Boolean).join(" · ") } : null,
      details["Baptism date"] ? { label: "Baptism", value: details["Baptism date"] } : null,
      details["Marriage date"] || listingMarriageDate ? { label: "Marriage", value: details["Marriage date"] || listingMarriageDate } : null,
      record?.matchedBranches?.length ? { label: "Branch/place", value: record.matchedBranches.join("; ") } : null,
    ].filter(Boolean);
  }

  function open(record, trigger) {
    const dialog = ensureDialog();
    returnTarget = trigger;
    returnScrollY = window.scrollY;
    const title = dialog.querySelector("#welshSaintsDetailTitle");
    const body = dialog.querySelector("#welshSaintsDetailBody");
    const actions = dialog.querySelector("#welshSaintsDetailActions");
    const { fields, sections } = orderedFields(record);
    title.textContent = record.title || "Welsh Saints person record";
    body.replaceChildren();
    if (fields.length) {
      const list = document.createElement("dl"); list.className = "welsh-saints-detail-fields";
      fields.forEach(({ label, value }) => { const row = document.createElement("div"); const dt = document.createElement("dt"); const dd = document.createElement("dd"); dt.textContent = label; dd.textContent = value; row.append(dt, dd); list.append(row); });
      body.append(list);
    } else if (record.summary) { const p = document.createElement("p"); p.textContent = record.summary; body.append(p); }
    sections.forEach(({ heading, content }) => { const section = document.createElement("section"); const h3 = document.createElement("h3"); const p = document.createElement("p"); h3.textContent = heading; p.textContent = content; section.append(h3, p); body.append(section); });
    if (record.matchedBranches?.length) { const section = document.createElement("section"); const h3 = document.createElement("h3"); const p = document.createElement("p"); h3.textContent = "Branch and place context"; p.textContent = record.matchedBranches.join("; "); section.append(h3, p); body.append(section); }
    actions.replaceChildren();
    if (record.url) { const source = document.createElement("a"); source.className = "welsh-saints-original-link"; source.href = record.url; source.target = "_blank"; source.rel = "noopener noreferrer"; source.textContent = "Open original Welsh Saints record"; actions.append(source); }
    dialog.showModal();
    dialog.querySelector(".welsh-saints-detail-close").focus({ preventScroll: true });
  }

  async function find(sourceId) {
    const records = await loadRecords();
    const id = sourceNumber(sourceId);
    return records.find((record) => record.type === "immigrant" && String(record.sourceId) === id) || null;
  }

  window.WELSH_SAINTS_PERSON_DETAIL = { loadRecords, find, facts, open };
})();
