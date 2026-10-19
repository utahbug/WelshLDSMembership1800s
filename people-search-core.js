(() => {
  const normalize = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const MONTHS = new Map(Object.entries({
    january: ["january", "jan", "jany", "ionawr"],
    february: ["february", "feb", "chwefror"],
    march: ["march", "mar", "mawrth"],
    april: ["april", "apr", "ebrill"],
    may: ["may", "mai"],
    june: ["june", "jun", "mehefin"],
    july: ["july", "jul", "gorffennaf", "gorphennaf", "gorphen"],
    august: ["august", "aug", "augt", "awst"],
    september: ["september", "sept", "sep", "medi"],
    october: ["october", "oct", "octr", "hydref"],
    november: ["november", "nov", "novr", "tachwedd", "tach"],
    december: ["december", "dec", "rhagfyr", "rhag"],
  }).flatMap(([english, aliases]) => aliases.map((alias) => [alias, english])));

  function expandHistoricalYear(value) {
    if (!/^\d{2}$/.test(value)) return /^\d{4}$/.test(value) ? Number(value) : null;
    const year = Number(value);
    return year <= 20 ? 1900 + year : 1800 + year;
  }

  function dateSearchVariants(value) {
    const original = normalize(value).replace(/\b(\d{1,2})(st|nd|rd|th)\b/g, "$1");
    if (!original) return [];
    const variants = new Set([original]);
    const parts = original.split(" ");
    const monthIndex = parts.findIndex((part) => MONTHS.has(part));
    if (monthIndex < 0) return [...variants];
    const month = MONTHS.get(parts[monthIndex]);
    const numericParts = parts.map((part, index) => ({ part, index })).filter(({ part }) => /^\d{1,4}$/.test(part));
    const yearCandidate = [...numericParts].reverse().find(({ part }) => part.length === 2 || part.length === 4);
    const year = yearCandidate ? expandHistoricalYear(yearCandidate.part) : null;
    if (!year || year < 1800 || year > 1920) return [...variants];
    const dayCandidate = numericParts.find(({ part, index }) => index !== yearCandidate.index && Number(part) >= 1 && Number(part) <= 31);
    variants.add(`${month} ${year}`);
    variants.add(String(year));
    if (dayCandidate) {
      const day = Number(dayCandidate.part);
      variants.add(`${month} ${day} ${year}`);
      variants.add(`${day} ${month} ${year}`);
    }
    return [...variants];
  }

  function collectionIdentity(collection) {
    if (!collection) return "";
    return [collection.name, ...(collection.aliases || []), collection.sourcePdf, ...(collection.sources || []), collection.publicStorage?.archivePath]
      .filter(Boolean)
      .join(" ");
  }

  function buildSearchText(record, collection) {
    const baptismVariants = dateSearchVariants(record.baptismDate);
    const birthVariants = dateSearchVariants(record.birthDate);
    return normalize([
      record.nameAsWritten,
      record.normalizedName,
      ...(record.aliases || []),
      record.branch,
      record.sourceBranchSpelling,
      record.baptismDate,
      ...baptismVariants,
      record.birthDate,
      ...birthVariants,
      record.residence,
      record.baptismPlace,
      record.confirmationDate,
      ...dateSearchVariants(record.confirmationDate),
      record.reconfirmationDate,
      ...dateSearchVariants(record.reconfirmationDate),
      record.rebaptismDate,
      ...dateSearchVariants(record.rebaptismDate),
      record.priesthoodOffice,
      record.ordinationDate,
      ...dateSearchVariants(record.ordinationDate),
      record.parents,
      record.spouse,
      record.children,
      record.officiator,
      record.branchTransfer,
      record.removal,
      record.emigration,
      record.death,
      record.membershipStatus,
      record.childBlessing,
      record.associatedPersons,
      record.entryNumber,
      record.entryNumber ? `entry ${record.entryNumber} member ${record.entryNumber}` : "",
      record.notes,
      record.year,
      record.date,
      record.pageNumber,
      record.imageRef,
      record.imageFilename,
      record.collectionId,
      collectionIdentity(collection),
    ].filter(Boolean).join(" "));
  }

  function structuredDateText(record) {
    return normalize([
      record.birthDate,
      ...dateSearchVariants(record.birthDate),
      record.baptismDate,
      ...dateSearchVariants(record.baptismDate),
      record.confirmationDate,
      ...dateSearchVariants(record.confirmationDate),
      record.reconfirmationDate,
      ...dateSearchVariants(record.reconfirmationDate),
      record.rebaptismDate,
      ...dateSearchVariants(record.rebaptismDate),
      record.ordinationDate,
      ...dateSearchVariants(record.ordinationDate),
      record.year,
      record.date,
    ].filter(Boolean).join(" "));
  }

  function matches(record, rawQuery, collection) {
    const words = normalize(rawQuery).split(/\s+/).filter(Boolean);
    if (!words.length) return true;
    const searchable = buildSearchText(record, collection);
    const searchableWords = new Set(searchable.split(" "));
    const dateWords = new Set(structuredDateText(record).split(" ").filter(Boolean));
    return words.every((word) => {
      if (MONTHS.has(word) || [...MONTHS.values()].includes(word)) return dateWords.has(word);
      if (/^\d+$/.test(word)) {
        const number = Number(word);
        if (word.length === 4 && number >= 1700 && number <= 1920) return dateWords.has(word);
        return dateWords.has(word) || searchableWords.has(word);
      }
      return searchable.includes(word);
    });
  }

  function baptismEnglishDisplay(value) {
    const readable = dateSearchVariants(value).find((variant) => /^\d{1,2} (?:january|february|march|april|may|june|july|august|september|october|november|december) \d{4}$/.test(variant));
    return readable ? readable.replace(/^(\d{1,2}) ([a-z]+) (\d{4})$/, (_, day, month, year) => `${month[0].toUpperCase()}${month.slice(1)} ${day}, ${year}`) : String(value || "");
  }

  function baptismSourceDiffers(sourceValue, readableValue) {
    if (!sourceValue || !readableValue) return false;
    const source = String(sourceValue).trim();
    if (source === readableValue) return false;
    const fullEnglishDate = /^(?:(?:january|february|march|april|may|june|july|august|september|october|november|december) \d{1,2},? \d{4}|\d{1,2} (?:january|february|march|april|may|june|july|august|september|october|november|december) \d{4})$/i;
    return !fullEnglishDate.test(source);
  }

  function memberCard(record, options = {}) {
    const escapeHtml = options.escapeHtml || ((value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]));
    const article = document.createElement("article");
    article.className = options.className || "research-result people-result";
    const aliases = Array.isArray(record.aliases) ? record.aliases.filter(Boolean) : [];
    const branchValue = options.branchUrl ? `<a class="people-result-branch-link" href="${escapeHtml(options.branchUrl)}">${escapeHtml(record.branch)}</a>` : escapeHtml(record.branch);
    const readableBaptism = record.baptismDate ? baptismEnglishDisplay(record.baptismDate) : "";
    const facts = [`<p class="people-fact people-branch-fact"><strong>Branch:</strong> ${branchValue}</p>`, readableBaptism ? `<p class="people-fact people-date-fact"><strong>Baptism:</strong> ${escapeHtml(readableBaptism)}</p>` : "", record.birthDate ? `<p class="people-fact people-date-fact"><strong>Birth:</strong> ${escapeHtml(record.birthDate)}</p>` : "", record.residence ? `<p class="people-fact"><strong>Residence:</strong> ${escapeHtml(record.residence)}</p>` : "", record.year || record.date ? `<p class="people-fact"><strong>Date:</strong> ${escapeHtml(record.year || record.date)}</p>` : "", record.entryNumber ? `<p class="people-fact"><strong>Entry:</strong> ${escapeHtml(record.entryNumber)}</p>` : "", aliases.length ? `<p class="people-fact"><strong>Also written:</strong> ${escapeHtml(aliases.join("; "))}</p>` : ""].filter(Boolean);
    const name = escapeHtml(record.nameAsWritten);
    const heading = options.sourceUrl ? `<h2><a class="people-result-name-link person-card-primary-action" href="${escapeHtml(options.sourceUrl)}">${name}</a></h2>` : `<h2>${name}</h2>`;
    const sourceBaptism = baptismSourceDiffers(record.baptismDate, readableBaptism) ? `<p class="people-source-detail people-baptism-source-detail"><strong>Source baptism record:</strong> ${escapeHtml(record.baptismDate)}</p>` : "";
    article.innerHTML = `${options.typeLabel ? `<small>${escapeHtml(options.typeLabel)}</small>` : ""}${heading}<div class="people-key-facts">${facts.join("")}</div>${options.sourceContext ? `<p class="people-source-detail"><strong>Source:</strong> ${escapeHtml(options.sourceContext)}</p>` : ""}${sourceBaptism}${record.sourceBranchSpelling ? `<p class="people-source-detail"><strong>Source branch spelling:</strong> ${escapeHtml(record.sourceBranchSpelling)}</p>` : ""}${options.displayNote ? `<p class="people-source-detail">${escapeHtml(options.displayNote)}</p>` : ""}`;
    if (options.sourceUrl) article.classList.add("person-primary-card");
    return article;
  }

  globalThis.WELSH_PEOPLE_SEARCH_CORE = { normalize, dateSearchVariants, buildSearchText, matches, baptismEnglishDisplay, baptismSourceDiffers, memberCard };
})();
