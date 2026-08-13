(() => {
  const termData = new Map();
  const recordData = new Map();
  const loading = new Map();
  const dataBase = window.ALL_RECORDS_DISCOVERY_BASE || `data/${"private"}/all-records-prototype/`;
  const api = window.ALL_RECORDS_DISCOVERY = {
    registerTerms(values) { Object.entries(values).forEach(([term, ids]) => termData.set(term, ids)); },
    registerRecords(values) { values.forEach((record) => recordData.set(record.id, record)); },
  };
  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const hashShard = (term, count) => {
    let value = 2166136261;
    for (const byte of new TextEncoder().encode(term)) { value ^= byte; value = Math.imul(value, 16777619) >>> 0; }
    return value % count;
  };
  const loadScript = (src) => {
    if (loading.has(src)) return loading.get(src);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement("script"); script.src = src; script.onload = resolve; script.onerror = () => reject(new Error(`Could not load ${src}`)); document.head.append(script);
    });
    loading.set(src, promise); return promise;
  };
  async function ensureManifest() {
    if (!window.ALL_RECORDS_DISCOVERY_MANIFEST) await loadScript(`${dataBase}manifest.js`);
    return window.ALL_RECORDS_DISCOVERY_MANIFEST;
  }
  function intersect(groups) {
    if (!groups.length) return [];
    const [smallest, ...rest] = [...groups].sort((a, b) => a.length - b.length);
    const sets = rest.map((ids) => new Set(ids));
    return smallest.filter((id) => sets.every((set) => set.has(id)));
  }
  function relevance(record, rawQuery, words) {
    const query = normalize(rawQuery);
    const title = normalize(record.title);
    const alternates = normalize((record.alternateTitles || []).join(" "));
    const snippet = normalize(record.snippet);
    const context = normalize((record.branches || []).join(" "));
    let score = 0;
    if (record.recordLevel !== "page") {
      if (title === query) score += 120;
      else if (title.includes(query)) score += 70;
      if (alternates === query) score += 110;
      else if (alternates.includes(query)) score += 65;
    }
    if (snippet.includes(query)) score += 45;
    if (context.includes(query)) score += 35;
    if (record.recordLevel !== "page") score += words.filter((word) => title.includes(word)).length * 8;
    score += words.filter((word) => snippet.includes(word)).length * 3;
    return score;
  }
  api.search = async (rawQuery, limit = 250) => {
    const manifest = await ensureManifest();
    const words = [...new Set(normalize(rawQuery).split(/\s+/).filter(Boolean))];
    if (!words.length) return { records: [], manifest };
    const shards = [...new Set(words.map((word) => hashShard(word, manifest.termShardCount)))];
    await Promise.all(shards.map((shard) => loadScript(`${dataBase}terms-${String(shard).padStart(3, "0")}.js`)));
    const allIds = intersect(words.map((word) => termData.get(word) || []));
    const ids = allIds.slice(0, Math.max(limit * 4, 1000));
    const metadataShards = [...new Set(ids.map((id) => Math.floor(id / manifest.metadataShardSize)))];
    await Promise.all(metadataShards.map((shard) => loadScript(`${dataBase}records-${String(shard).padStart(3, "0")}.js`)));
    const ranked = ids.map((id) => recordData.get(id)).filter(Boolean)
      .map((record) => ({ record, score: relevance(record, rawQuery, words) }))
      .sort((a, b) => b.score - a.score || a.record.id - b.record.id);
    const records = [];
    const remaining = [...ranked];
    const openingTypes = new Set();
    const openingSources = new Map();
    while (remaining.length && records.length < limit) {
      let index = 0;
      if (records.length < 20) {
        index = remaining.slice(0, 50).findIndex(({ record }) => {
          const sourceKey = `${record.sourceType}:${record.title}`;
          return !openingTypes.has(record.sourceType) || (openingSources.get(sourceKey) || 0) < 2;
        });
        if (index < 0) index = 0;
      }
      const [{ record }] = remaining.splice(index, 1);
      records.push(record);
      openingTypes.add(record.sourceType);
      const sourceKey = `${record.sourceType}:${record.title}`;
      openingSources.set(sourceKey, (openingSources.get(sourceKey) || 0) + 1);
    }
    return { records, totalMatches: allIds.length, manifest };
  };
})();
