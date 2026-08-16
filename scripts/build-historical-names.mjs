import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const registryData = JSON.parse(fs.readFileSync(path.join(root, "data", "branch-registry.json"), "utf8"));
const branchMap = JSON.parse(fs.readFileSync(path.join(root, "data", "private", "wales-indexing-branch-map.local.json"), "utf8"));
const comparison = JSON.parse(fs.readFileSync(path.join(root, "data", "private", "familysearch-comparison.local.json"), "utf8"));
const canonicalNames = new Set(registryData.registry.map((item) => item.canonicalName));
const entries = new Map();

const relationshipOverrides = new Map(Object.entries({
  "Abertawe": "Welsh name",
  "Abertawe (see Swansea)": "Known alias",
  "Festiniog": "Historical spelling",
  "Altwen": "Historical spelling",
  "Altwen Branch": "Historical spelling",
  "Cog": "Historical spelling",
  "Cog Branch": "Historical spelling",
  "Ebbro Vale": "Historical spelling",
  "Ebbrovale": "Historical spelling",
  "Ebbrovale Branch": "Historical spelling",
  "Treorky": "Historical spelling",
  "Treorky Branch": "Historical spelling",
  "Twyn Carno": "Alternate spelling",
  "Twyn Carno Branch": "Alternate spelling",
  "Merthyr Tudful": "Welsh name",
  "Neath": "Anglicized name",
  "Bryn": "Historical spelling",
  "Canghen y Bryn": "Historical spelling",
  "Gwaen Helygen": "Historical spelling",
  "Coal Brook Vale Branches": "Uncertain / needs review",
  "Abercarn, Newport, and Varteg Branch": "Uncertain / needs review",
  "Treforis Branch": "Unmapped",
}));

const variantTypeOverrides = new Map(Object.entries({
  "Abertawe": "Welsh form",
  "Merthyr Tudful": "Welsh form",
  "Neath": "English / anglicized form",
  "Cog": "Historical spelling",
  "Cog Branch": "Historical spelling",
}));

function variantTypeFor(name, relationship) {
  if (variantTypeOverrides.has(name)) return variantTypeOverrides.get(name);
  if (relationship === "Historical spelling" || relationship === "Alternate spelling") return "Historical spelling";
  if (relationship === "Welsh name") return "Welsh form";
  if (relationship === "Anglicized name") return "English / anglicized form";
  if (relationship === "Shared name / needs locality review" || relationship === "Uncertain / needs review") return "Related locality / uncertain relationship";
  return "";
}

const curated = [
  ["Canghen y Bryn", "Bryntroedgam", "Internal Welsh source heading for Bryn Branch."],
  ["Ebbrovale", "Ebbw Vale", "Earlier indexing-project spelling."],
  ["Merthyr Tudful", "Merthyr Tydfil", "Welsh place-name form retained in project research."],
  ["Twyn Carno", "Twyncarno", "Historical/source spacing retained."],
  ["Twynyrodyn", "Twyn-yr-Odyn", "Compact historical/source spelling."],
  ["Treboth", "Treboeth", "Historical/source spelling retained in CD and catalog evidence."],
];

function clean(value) { return String(value ?? "").trim(); }
function add(name, canonicalName, relationship, source, note = "") {
  name = clean(name);
  if (!name) return;
  const existing = entries.get(name) || { name, canonicalName: "", canonicalCandidates: new Set(), relationship: "", sources: new Set(), notes: new Set() };
  if (canonicalName && canonicalNames.has(canonicalName)) {
    existing.canonicalCandidates.add(canonicalName);
    existing.canonicalName = existing.canonicalCandidates.size === 1 ? canonicalName : "";
    if (existing.canonicalCandidates.size > 1) existing.relationship = "Shared name / needs locality review";
  }
  if (!existing.relationship || relationship === "Canonical" || relationship.includes("review") || relationship === "Unmapped") existing.relationship = relationship;
  if (source) existing.sources.add(source);
  if (note) existing.notes.add(note);
  entries.set(name, existing);
}

for (const item of registryData.registry) {
  add(item.canonicalName, item.canonicalName, "Canonical", "Current branch registry", item.entityType);
  for (const variant of clean(item.variants).split(";").map(clean).filter(Boolean)) {
    add(variant, item.canonicalName, relationshipOverrides.get(variant) || "Known alias", "Current branch registry", item.relationshipNotes);
  }
}

for (const evidence of registryData.evidence) {
  const canonicalName = canonicalNames.has(evidence.canonicalName) ? evidence.canonicalName : "";
  const relationship = relationshipOverrides.get(evidence.rawName)
    || (canonicalName && evidence.rawName === canonicalName ? "Canonical" : canonicalName ? "Source wording" : "Unmapped");
  add(evidence.rawName, canonicalName, relationship, evidence.source, [evidence.dateText, evidence.reference, evidence.relationshipNote].filter(Boolean).join(" · "));
}

for (const row of branchMap.rows) {
  const explicitlyUncertain = ["Abercarn, Newport, and Varteg Branch", "Coal Brook Vale Branches", "Treforis Branch"].includes(row.sourceBranchName);
  const canonicalName = !explicitlyUncertain && canonicalNames.has(row.canonicalBranch) ? row.canonicalBranch : "";
  const relationship = relationshipOverrides.get(row.sourceBranchName)
    || (canonicalName && row.sourceBranchName === canonicalName ? "Canonical" : canonicalName ? "Source wording" : "Unmapped");
  add(row.sourceBranchName, canonicalName, relationship, "2022 Wales indexing-project branch map", [row.sourceDateRange, row.chlTitle, `DGS ${row.dgs}, images ${row.imageStart}-${row.imageEnd}`, row.notes].filter(Boolean).join(" · "));
}

for (const row of comparison.rows) {
  const explicitlyUncertain = ["Abercarn, Newport, and Varteg Branch", "Coal Brook Vale Branches", "Treforis Branch"].includes(row.familySearchBranch);
  const canonicalName = !explicitlyUncertain && canonicalNames.has(row.canonicalBranch) ? row.canonicalBranch : "";
  add(row.familySearchBranch, canonicalName, relationshipOverrides.get(row.familySearchBranch) || (canonicalName ? "Source wording" : "Unmapped"), row.sourceKind, [row.provenance, row.notes].filter(Boolean).join(" · "));
}

for (const [name, canonicalName, note] of curated) add(name, canonicalName, relationshipOverrides.get(name) || "Known alias", "Project source and alias evidence", note);

const rows = [...entries.values()].map((entry) => ({
  name: entry.name,
  canonicalName: entry.canonicalName,
  relationship: entry.relationship,
  variantType: entry.relationship === "Canonical" ? "" : variantTypeFor(entry.name, entry.relationship),
  sourceNotes: [...entry.sources].join("; "),
  notes: [...entry.notes, ...(entry.canonicalCandidates.size > 1 ? [`Possible canonical branches: ${[...entry.canonicalCandidates].join("; ")}`] : [])].join("; "),
  resourceUrl: entry.canonicalName ? `index.html?branch=${encodeURIComponent(entry.canonicalName)}` : "",
})).sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  canonicalCount: canonicalNames.size,
  distinctNameCount: rows.length,
  rows,
};
fs.writeFileSync(path.join(root, "data", "historical-names.json"), JSON.stringify(output, null, 2), "utf8");
fs.writeFileSync(path.join(root, "data", "historical-names.js"), `window.WELSH_HISTORICAL_NAMES = ${JSON.stringify(output)};\n`, "utf8");
console.log(JSON.stringify({ canonicalBranches: output.canonicalCount, distinctHistoricalNames: output.distinctNameCount }, null, 2));
