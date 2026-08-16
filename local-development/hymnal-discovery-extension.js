(() => {
  const discovery = window.ALL_RECORDS_DISCOVERY;
  if (!discovery?.search) return;
  const originalSearch = discovery.search.bind(discovery);
  let indexPromise;
  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const loadIndex = () => indexPromise ||= fetch("data/publication-search/welsh-hymnal-1852.json").then((response) => {
    if (!response.ok) throw new Error(`Hymnal search index failed: ${response.status}`);
    return response.json();
  });
  const snippet = (text, terms) => {
    const normalized = normalize(text);
    const first = Math.max(0, terms.map((term) => normalized.indexOf(term)).filter((position) => position >= 0).sort((a, b) => a - b)[0] || 0);
    const start = Math.max(0, first - 95);
    const value = text.slice(start, start + 260).trim();
    return `${start ? "…" : ""}${value}${start + 260 < text.length ? "…" : ""}`;
  };
  discovery.search = async (query, limit = 250) => {
    const base = await originalSearch(query, limit);
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    if (!terms.length) return base;
    const index = await loadIndex();
    const titleText = normalize(index.title);
    const hymnal = index.pages.filter((page) => {
      const text = `${titleText} ${normalize(page.text)}`;
      return terms.every((term) => text.includes(term));
    }).map((page) => ({
      sourceType: "historical-publication",
      sourceId: `historical-publication:welsh-hymnal-1852:${page.pageNumber}`,
      recordLevel: "page",
      title: index.title,
      snippet: snippet(page.text, terms),
      location: `PDF page ${page.pageNumber}`,
      pageNumber: page.pageNumber,
      branches: [],
      provenance: "Historical Welsh publication",
      versionStatus: "Historical Welsh publication",
      viewerUrl: `publication-viewer.html?id=welsh-hymnal-1852&page=${page.pageNumber}#book-search`,
      viewerAvailability: true,
    }));
    const records = [...hymnal, ...(base.records || [])].slice(0, limit);
    return { ...base, records, totalMatches: Number(base.totalMatches || base.records?.length || 0) + hymnal.length };
  };
})();
