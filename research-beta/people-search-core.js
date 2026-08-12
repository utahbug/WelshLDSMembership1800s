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

  globalThis.WELSH_PEOPLE_SEARCH_CORE = { normalize, dateSearchVariants, buildSearchText, matches };
})();
