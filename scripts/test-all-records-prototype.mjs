import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const dataDir = process.env.WELSH_ALL_RECORDS_TEST_DATA
  ? path.resolve(process.env.WELSH_ALL_RECORDS_TEST_DATA)
  : path.join(root, "data/private/all-records-prototype");
const context = { window: {} };
context.window.ALL_RECORDS_DISCOVERY = {
  terms: new Map(), records: new Map(),
  registerTerms(values) { Object.entries(values).forEach(([term, ids]) => this.terms.set(term, ids)); },
  registerRecords(values) { values.forEach((record) => this.records.set(record.id, record)); },
};
vm.runInNewContext(fs.readFileSync(path.join(dataDir, "manifest.js"), "utf8"), context);
const manifest = context.window.ALL_RECORDS_DISCOVERY_MANIFEST;
for (const file of manifest.termFiles) vm.runInNewContext(fs.readFileSync(path.join(dataDir, file.file), "utf8"), context);
for (const file of manifest.metadataFiles) vm.runInNewContext(fs.readFileSync(path.join(dataDir, file.file), "utf8"), context);
const api = context.window.ALL_RECORDS_DISCOVERY;
const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function search(query) {
  const words = [...new Set(normalize(query).split(/\s+/).filter(Boolean))];
  const groups = words.map((word) => api.terms.get(word) || []).sort((a, b) => a.length - b.length);
  if (!groups.length) return [];
  const sets = groups.slice(1).map((ids) => new Set(ids));
  return groups[0].filter((id) => sets.every((set) => set.has(id))).map((id) => api.records.get(id));
}
function relevance(record, rawQuery, words) {
  const query = normalize(rawQuery);
  const title = normalize(record.title);
  const alternates = normalize((record.alternateTitles || []).join(" "));
  const searchAliases = (record.searchAliases || []).map(normalize).filter(Boolean);
  const joinedSearchAliases = searchAliases.join(" ");
  const snippet = normalize(record.snippet);
  const contextText = normalize((record.branches || []).join(" "));
  let score = 0;
  if (record.recordLevel !== "page") {
    if (title === query) score += 120;
    else if (title.includes(query)) score += 70;
    if (alternates === query) score += 110;
    else if (alternates.includes(query)) score += 65;
  }
  if (snippet.includes(query)) score += 45;
  if (searchAliases.includes(query)) score += 180;
  else if (searchAliases.some((alias) => alias.includes(query))) score += 95;
  if (contextText.includes(query)) score += 35;
  if (record.recordLevel !== "page") score += words.filter((word) => title.includes(word)).length * 8;
  score += words.filter((word) => snippet.includes(word)).length * 3;
  score += words.filter((word) => joinedSearchAliases.includes(word)).length * 4;
  return score;
}
function rankedSearch(query, limit = 250) {
  const words = [...new Set(normalize(query).split(/\s+/).filter(Boolean))];
  const ranked = search(query).map((record) => ({ record, score: relevance(record, query, words) }))
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
  return records;
}
const checks = [
  ["Opposition to the Gospel Message in Wales", (rows) => rows.some((r) => r.title === "Opposition to the Gospel Message in Wales" && /Prepublication/.test(r.versionStatus))],
  ["On Trial in the Welsh Press", (rows) => rows.some((r) => r.title === "Opposition to the Gospel Message in Wales")],
  ["Zion's Trumpet 1854", (rows) => rows.some((r) => r.sourceType === "translation" && r.title === "Zion's Trumpet, 1854")],
  ["Minutes of a council", (rows) => rows.some((r) => r.sourceType === "transcription")],
  ["Liverpool", (rows) => rows.some((r) => r.sourceType === "welsh-saints") && rows.some((r) => r.sourceType === "translation" || r.sourceType === "ron-dennis-publication")],
  ["Merthyr", (rows) => new Set(rows.map((r) => r.sourceType)).size >= 3],
];
const failures = [];
const results = [];
for (const [query, predicate] of checks) {
  const rows = search(query); const types = Object.fromEntries([...new Set(rows.map((r) => r.sourceType))].map((type) => [type, rows.filter((r) => r.sourceType === type).length]));
  results.push({ query, matches: rows.length, types, sample: rows.slice(0, 4).map((r) => ({ type: r.sourceType, title: r.title, location: r.location })) });
  if (!predicate(rows)) failures.push(query);
}
const serialized = fs.readdirSync(dataDir).filter((name) => name.endsWith(".js")).map((name) => fs.readFileSync(path.join(dataDir, name), "utf8")).join("\n");
const prohibited = [/resources[\\/]books/i, /[A-Z]:\\Users\\/i, /ron-dennis[^"\n]*\.pdf/i];
if (prohibited.some((pattern) => pattern.test(serialized))) failures.push("private path or PDF filename leaked");
if (manifest.counts.members !== 11473 || manifest.counts.transcription !== 663 || manifest.counts.welshSaints !== 9014 || manifest.counts.ronDennisPages !== 6971 || manifest.counts.allRecords !== 28134) failures.push("unexpected source counts");
if (search("Opposition to the Gospel Message in Wales").filter((record) => record.title === "Opposition to the Gospel Message in Wales" && record.recordLevel === "source").length !== 1) failures.push("publication title source record missing or duplicated");
if (search("On Trial in the Welsh Press").filter((record) => record.title === "Opposition to the Gospel Message in Wales" && record.recordLevel === "source").length !== 1) failures.push("publication alias did not resolve uniquely");
const publicationRecords = [...api.records.values()].filter((record) => ["ron-dennis-publication", "translation"].includes(record.sourceType));
const availablePublicationRecords = publicationRecords.filter((record) => record.title !== "Opposition to the Gospel Message in Wales");
if (availablePublicationRecords.some((record) => !/^publication-viewer\.html\?id=[^&]+&page=\d+$/.test(record.viewerUrl || ""))) failures.push("available publication viewer route missing or invalid");
if (availablePublicationRecords.some((record) => record.recordLevel === "page" && !record.viewerUrl.endsWith(`page=${record.location.replace("PDF page ", "")}`))) failures.push("publication viewer route does not preserve exact PDF page");
if (publicationRecords.filter((record) => record.title === "Opposition to the Gospel Message in Wales").some((record) => record.viewerUrl || record.viewerAvailability)) failures.push("unavailable publication received a viewer route");
if (search("transcription project as of 24 november 2007").some((record) => record.sourceType === "transcription")) failures.push("administrative transcript page leaked into Full search");
const confirmedDanJonesIds = new Set([
  "typed-pdf:A - CDs 35-39 (2 of 2) - Typed Transcripts.pdf:3",
  "typed-pdf:A - CDs 35-39 (2 of 2) - Typed Transcripts.pdf:27",
  "typed-pdf:A - CDs 35-39 (2 of 2) - Typed Transcripts.pdf:29",
  "typed-pdf:A - CDs 35-39 (2 of 2) - Typed Transcripts.pdf:47",
  "typed-pdf:A - CDs 35-39 (2 of 2) - Typed Transcripts.pdf:73",
  "typed-pdf:A - CDs 40-43 (2 of 2) - Typed Transcripts.pdf:86",
  "typed-pdf:A - CDs 44-59 - Typed Transcripts.pdf:6",
]);
const authoritativeAliases = JSON.parse(fs.readFileSync(path.join(root, "data/search-aliases.json"), "utf8"));
if (authoritativeAliases.schemaVersion !== 1 || Object.keys(authoritativeAliases.transcriptPages || {}).length !== 7) failures.push("authoritative transcript search-alias source is invalid");
const danJonesTranscriptIds = new Set(search("Dan Jones").filter((record) => record.sourceType === "transcription").map((record) => record.sourceId));
if ([...confirmedDanJonesIds].some((id) => !danJonesTranscriptIds.has(id))) failures.push("confirmed Dan Jones transcript page missing from search");
if (danJonesTranscriptIds.has("typed-pdf:A - CDs 35-39 (2 of 2) - Typed Transcripts.pdf:91")) failures.push("Dewi Elfed Jones falsely promoted to Dan Jones");
for (const query of ["Captain Dan Jones", "Capt Dan Jones", "President Dan Jones", "Daniel Jones"]) {
  if (!search(query).some((record) => record.sourceType === "transcription" && confirmedDanJonesIds.has(record.sourceId))) failures.push(`Dan Jones variant failed: ${query}`);
}
if ([...confirmedDanJonesIds].some((id) => !(api.records.get([...api.records.keys()].find((recordId) => api.records.get(recordId)?.sourceId === id))?.searchAliases || []).includes("Dan Jones"))) failures.push("confirmed Dan Jones page missing curated search metadata");
const rankedDanJones = rankedSearch("Dan Jones");
const danJonesPositions = [...confirmedDanJonesIds].map((id) => rankedDanJones.findIndex((record) => record.sourceId === id) + 1);
if (danJonesPositions.some((position) => position < 1 || position > 40)) failures.push(`confirmed Dan Jones pages are not in the first visible batch: ${danJonesPositions.join(", ")}`);
if (failures.length) throw new Error(`All records prototype failures: ${failures.join("; ")}`);
console.log(JSON.stringify({ counts: manifest.counts, results, danJonesPositions }, null, 2));
