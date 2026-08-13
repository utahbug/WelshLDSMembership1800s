import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const dataDir = path.join(root, "data/private/all-records-prototype");
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
if (manifest.counts.members !== 11473 || manifest.counts.transcription !== 663 || manifest.counts.welshSaints !== 7234 || manifest.counts.ronDennisPages !== 6971) failures.push("unexpected source counts");
if (search("Opposition to the Gospel Message in Wales").filter((record) => record.title === "Opposition to the Gospel Message in Wales" && record.recordLevel === "source").length !== 1) failures.push("publication title source record missing or duplicated");
if (search("On Trial in the Welsh Press").filter((record) => record.title === "Opposition to the Gospel Message in Wales" && record.recordLevel === "source").length !== 1) failures.push("publication alias did not resolve uniquely");
if (search("transcription project as of 24 november 2007").some((record) => record.sourceType === "transcription")) failures.push("administrative transcript page leaked into Full search");
if (failures.length) throw new Error(`All records prototype failures: ${failures.join("; ")}`);
console.log(JSON.stringify({ counts: manifest.counts, results }, null, 2));
