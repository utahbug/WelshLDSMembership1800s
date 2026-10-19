import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const privateDir = path.join(root, "data/private");
const preservationDir = path.join(privateDir, "welsh-saints-preservation");
const discoveryDir = path.join(privateDir, "all-records-prototype");
const outputFile = path.join(privateDir, "welsh-saints-discovery.local.json");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, "").toLocaleLowerCase("en");
const tokens = (value) => [...new Set(normalize(value).match(/[a-z0-9]+/g) || [])];

const master = readJson(path.join(privateDir, "welsh-saints-index.local.json"));
const preservation = readJson(path.join(preservationDir, "id-manifest.local.json"));
const relationships = readJson(path.join(preservationDir, "relationships.local.json"));
const personTitles = new Map(preservation.items.filter((item) => item.recordType === "person").map((item) => [Number(item.sourceId), item.title]));
const resourceManifest = new Map(preservation.items.filter((item) => item.recordType === "resource").map((item) => [Number(item.sourceId), item]));
const linksByResource = new Map();
for (const link of relationships.personResources || []) {
  const resourceId = Number(link.resourceId), personId = Number(link.personId);
  const values = linksByResource.get(resourceId) || [];
  if (!values.some((value) => value.sourceId === personId)) values.push({ sourceId: personId, name: personTitles.get(personId) || null });
  linksByResource.set(resourceId, values);
}
for (const values of linksByResource.values()) values.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")) || a.sourceId - b.sourceId);

const personSearchLabels = ["Birth date", "Birth place", "Baptism date", "Marriage date", "Death date", "Death place"];
const personDetailLabels = ["Gender", "Birth date", "Birth place", "Christening date", "Christening place", "Baptism date", "Baptism place", "Confirmation date", "Confirmation place", "Marriage date", "Marriage place", "Death date", "Death place", "Burial date", "Burial place", "Father", "Mother"];
function extractPersonDetails(record) {
  if (record.type !== "immigrant" || !record.detailText) return null;
  const text = String(record.detailText).replace(/&nbsp;?/gi, " ").replace(/\s+/g, " ");
  const found = personDetailLabels.map((label) => ({ label, marker: `${label}:`, index: text.indexOf(`${label}:`) })).filter((item) => item.index >= 0).sort((a, b) => a.index - b.index);
  const details = Object.fromEntries(found.map((item, index) => {
    const value = text.slice(item.index + item.marker.length, found[index + 1]?.index ?? text.length).split(/\bView Sources\b|\bParents and Siblings\b|\bSiblings\b|\bSpouses and Children\b|\bChildren\b|\bCensus Records\b|\bMigration\b|\bComments\b|\bResources\b/i)[0].trim();
    return [item.label, value];
  }).filter(([, value]) => value));
  return Object.keys(details).length ? details : null;
}
function searchTerms(record, personDetails, linkedPeople = []) {
  const listingMarriageLabel = record.type === "immigrant" && record.cells?.length > 4 && record.cells[3] ? "Marriage date" : "";
  return tokens([record.detailText, record.title, record.summary, ...(record.cells || []), ...(record.categories || []), ...(record.matchedBranches || []), listingMarriageLabel,
    ...personSearchLabels.map((label) => personDetails?.[label]), ...linkedPeople.flatMap((person) => [person.name, person.sourceId]), record.type === "resource" ? "Welsh Saints Project resource" : ""].join(" ")).join(" ");
}

const records = master.records.filter((record) => ["immigrant", "voyage", "resource"].includes(record.type)).map((record) => {
  const personDetails = extractPersonDetails(record);
  const linkedPeople = record.type === "resource" ? linksByResource.get(Number(record.sourceId)) || [] : [];
  return { type: record.type, sourceId: Number(record.sourceId), title: record.title, summary: record.summary, cells: record.cells || [], category: record.category || null,
    categories: record.categories || [], matchedBranches: record.matchedBranches || [], url: record.url, personDetails, linkedPeople,
    metadataOnly: false, searchTerms: searchTerms(record, personDetails, linkedPeople) };
});
const existingResourceIds = new Set(records.filter((record) => record.type === "resource").map((record) => record.sourceId));
for (const [sourceId, item] of resourceManifest) {
  if (existingResourceIds.has(sourceId)) continue;
  const linkedPeople = linksByResource.get(sourceId) || [];
  const record = { type: "resource", sourceId, title: item.title, summary: "", cells: [], category: item.categories?.[0] || null, categories: item.categories || [],
    matchedBranches: [], url: item.currentUrl, personDetails: null, linkedPeople, metadataOnly: true };
  record.searchTerms = searchTerms(record, null, linkedPeople);
  records.push(record);
}
const counts = Object.fromEntries(["immigrant", "voyage", "resource"].map((type) => [type, records.filter((record) => record.type === type).length]));
if (counts.immigrant !== 5007 || counts.voyage !== 299 || counts.resource !== 3708 || records.length !== 9014) throw new Error(`Unexpected Welsh Saints discovery counts: ${JSON.stringify({ counts, total: records.length })}`);
if (new Set(records.filter((record) => record.type === "resource").map((record) => record.sourceId)).size !== 3708) throw new Error("Duplicate Welsh Saints resource IDs remain");
if (records.some((record) => "detailText" in record || "contentHtml" in record || "currentFileReference" in record)) throw new Error("Resource discovery output contains prohibited content fields");
const payload = { betaPublicIndex: true, metadataDiscoveryOnly: true, version: 2, generatedAt: new Date().toISOString(), source: "Welsh Saints Project", counts, records };
fs.writeFileSync(outputFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

const context = { window: {} };
context.window.ALL_RECORDS_DISCOVERY = { terms: new Map(), records: new Map(), registerTerms(values) { Object.entries(values).forEach(([term, ids]) => this.terms.set(term, ids)); }, registerRecords(values) { values.forEach((record) => this.records.set(record.id, record)); } };
vm.runInNewContext(fs.readFileSync(path.join(discoveryDir, "manifest.js"), "utf8"), context);
const discoveryManifest = context.window.ALL_RECORDS_DISCOVERY_MANIFEST;
for (const file of discoveryManifest.termFiles) vm.runInNewContext(fs.readFileSync(path.join(discoveryDir, file.file), "utf8"), context);
for (const file of discoveryManifest.metadataFiles) vm.runInNewContext(fs.readFileSync(path.join(discoveryDir, file.file), "utf8"), context);
const discovery = context.window.ALL_RECORDS_DISCOVERY;
const represented = new Map([...discovery.records.values()].filter((record) => record.sourceType === "welsh-saints").map((record) => [record.sourceId, record]));
let nextId = Math.max(...discovery.records.keys()) + 1;
for (const source of records.filter((record) => record.type === "resource")) {
  const sourceId = `welsh-saints:resource:${source.sourceId}`;
  const existing = represented.get(sourceId);
  const record = { id: existing?.id ?? nextId++, sourceType: "welsh-saints", sourceId, title: source.title, snippet: "", location: `Welsh Saints source ID ${source.sourceId}`,
    branches: [], branchConfidence: "No automatic branch assertion", provenance: "Welsh Saints Project", sourceUrl: source.url, publicAvailability: true,
    viewerAvailability: false, downloadAvailability: false, recordSubtype: "resource", categories: source.categories, linkedPeople: source.linkedPeople, metadataOnly: true };
  discovery.records.set(record.id, record);
  for (const term of tokens(source.searchTerms)) {
    const ids = discovery.terms.get(term) || [];
    if (!ids.includes(record.id)) ids.push(record.id);
    discovery.terms.set(term, ids);
  }
}
const allRecords = [...discovery.records.values()].sort((a, b) => a.id - b.id);
const shardSize = discoveryManifest.metadataShardSize;
for (const file of fs.readdirSync(discoveryDir).filter((name) => /^records-\d+\.js$/.test(name))) fs.unlinkSync(path.join(discoveryDir, file));
const metadataFiles = [];
for (let start = 0; start < allRecords.length; start += shardSize) {
  const shard = allRecords.slice(start, start + shardSize), name = `records-${String(start / shardSize).padStart(3, "0")}.js`;
  fs.writeFileSync(path.join(discoveryDir, name), `window.ALL_RECORDS_DISCOVERY.registerRecords(${JSON.stringify(shard)});\n`, "utf8");
  metadataFiles.push({ file: name, first: start, last: start + shard.length - 1 });
}
const termFiles = [];
for (const file of discoveryManifest.termFiles) {
  const shardNumber = file.shard;
  const values = Object.fromEntries([...discovery.terms].filter(([term]) => {
    let value = 2166136261;
    for (const byte of Buffer.from(term, "utf8")) { value ^= byte; value = Math.imul(value, 16777619) >>> 0; }
    return value % discoveryManifest.termShardCount === shardNumber;
  }).sort(([a], [b]) => a.localeCompare(b)).map(([term, ids]) => [term, [...new Set(ids)].sort((a, b) => a - b)]));
  fs.writeFileSync(path.join(discoveryDir, file.file), `window.ALL_RECORDS_DISCOVERY.registerTerms(${JSON.stringify(values)});\n`, "utf8");
  termFiles.push({ file: file.file, shard: shardNumber, terms: Object.keys(values).length });
}
discoveryManifest.metadataFiles = metadataFiles;
discoveryManifest.termFiles = termFiles;
discoveryManifest.counts.welshSaints = 9014;
discoveryManifest.counts.historicalRecords = allRecords.length;
discoveryManifest.counts.allRecords = discoveryManifest.counts.members + allRecords.length;
discoveryManifest.rightsNote = "Discovery metadata and bounded existing snippets only. Newly added Welsh Saints resources contain titles, categories, explicit person links, IDs, and source URLs; no resource files, photos, scans, PDFs, or long-form prose are included.";
fs.writeFileSync(path.join(discoveryDir, "manifest.js"), `window.ALL_RECORDS_DISCOVERY_MANIFEST = ${JSON.stringify(discoveryManifest)};\n`, "utf8");
fs.writeFileSync(path.join(discoveryDir, "build-report.json"), `${JSON.stringify(discoveryManifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ outputFile, counts, total: records.length, fullSearchWelshSaints: discoveryManifest.counts.welshSaints, fullSearchTotal: discoveryManifest.counts.allRecords }, null, 2));
