import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const privateDir = path.join(root, "data", "private");
const sourcePath = path.join(privateDir, "people-index-source.csv");
const jsPath = path.join(privateDir, "people-index.local.js");
const jsonPath = path.join(privateDir, "people-index.local.json");
const reportPath = path.join(privateDir, "people-index-report.local.json");
const allowedTypes = new Set(["member", "associated"]);
const requiredColumns = ["nameAsWritten", "aliases", "branch", "sourceBranchSpelling", "baptismDate", "residence", "entryNumber", "imageRef", "imageFilename", "pageNumber", "notes", "verified", "occurrenceType"];

function parseCsv(text) {
  const rows = []; let row = []; let field = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") { row.push(field); field = ""; }
    else if (character === "\n") { row.push(field.replace(/\r$/, "")); if (row.some((value) => value !== "")) rows.push(row); row = []; field = ""; }
    else field += character;
  }
  if (quoted) throw new Error("CSV ends inside a quoted field.");
  if (field || row.length) { row.push(field.replace(/\r$/, "")); if (row.some((value) => value !== "")) rows.push(row); }
  return rows;
}

const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en").replace(/[^a-z0-9]+/g, " ").trim();
const splitAliases = (value) => String(value || "").split("|").map((item) => item.trim()).filter(Boolean);
const booleanValue = (value, rowNumber, errors) => {
  const normalized = normalize(value);
  if (["true", "yes", "1"].includes(normalized)) return true;
  if (["false", "no", "0", ""].includes(normalized)) return false;
  errors.push(`Row ${rowNumber}: verified must be true/false, yes/no, or 1/0.`); return false;
};

if (!fs.existsSync(sourcePath)) throw new Error(`Missing private source CSV: ${sourcePath}`);
const parsed = parseCsv(fs.readFileSync(sourcePath, "utf8").replace(/^\uFEFF/, ""));
if (!parsed.length) throw new Error("People source CSV is empty.");
const headers = parsed[0].map((value) => value.trim());
const missingColumns = requiredColumns.filter((name) => !headers.includes(name));
if (missingColumns.length) throw new Error(`Missing CSV columns: ${missingColumns.join(", ")}`);

const registry = JSON.parse(fs.readFileSync(path.join(root, "data", "branch-registry.json"), "utf8")).registry || [];
const branchLookup = new Map();
for (const branch of registry) {
  branchLookup.set(normalize(branch.canonicalName), branch.canonicalName);
  String(branch.variants || "").split(/[;,]/).map((value) => value.trim()).filter(Boolean).forEach((variant) => branchLookup.set(normalize(variant.replace(/\s*\(see.*$/i, "")), branch.canonicalName));
}
branchLookup.set(normalize("Festiniog"), "Ffestiniog");

let catalog = null;
const catalogPath = path.join(root, "data", "catalog.local.js");
if (fs.existsSync(catalogPath)) { const context = { window: {} }; vm.runInNewContext(fs.readFileSync(catalogPath, "utf8"), context); catalog = context.window.WELSH_RECORD_CATALOG; }
// Some physical volumes contain separately identified branch sections. Keep the
// source collection intact while allowing a branch occurrence to open its exact
// image inside that compound volume.
const compoundBranchCollectionNames = new Map([
  [normalize("Abertillery"), normalize("Cwm Celyn,1851-1883,LR1957")],
  [normalize("Cogan"), normalize("Cog,1848-1876,LR1097")],
  [normalize("Ebbw Vale"), normalize("Ebbro Vale,1847-1864,LR98467")],
  [normalize("Cwm Celyn"), normalize("Cwm Celyn,1851-1883,LR1957")],
  [normalize("Cwm Saerbren"), normalize("Cwm Saerbren,1858-1874,LR1727")],
  [normalize("Llanelltyd"), normalize("Llanelltyd,1850-1857,LR1727")],
  [normalize("Llandebie"), normalize("Llandebie,1849-1886,LR1137")],
  [normalize("Coalbrookvale"), normalize("Coalbrookvale,1856-1867,LR1747")],
  [normalize("Tredegar"), normalize("Cwm Celyn,1851-1883,LR1957")],
]);
const collectionForBranch = (branch, imageFilename = "") => {
  const compoundCollectionName = compoundBranchCollectionNames.get(normalize(branch));
  if (compoundCollectionName && imageFilename) {
    const compoundMatches = (catalog?.collections || []).filter((collection) => normalize(collection.name) === compoundCollectionName && (collection.images || []).some((image) => image.name === imageFilename));
    if (compoundMatches.length === 1) return compoundMatches[0].id;
  }
  const matches = (catalog?.collections || []).filter((collection) => normalize(collection.name).includes(normalize(branch)) && (collection.images || []).length);
  if (imageFilename) {
    const filenameMatches = matches.filter((collection) => (collection.images || []).some((image) => image.name === imageFilename));
    if (filenameMatches.length === 1) return filenameMatches[0].id;
    const lrMatches = filenameMatches.filter((collection) => /\bLR\s*\d/i.test(collection.name));
    if (lrMatches.length === 1) return lrMatches[0].id;
    const productionMatches = filenameMatches.filter((collection) => normalize(collection.name) === normalize(`${branch}-production`));
    if (productionMatches.length === 1) return productionMatches[0].id;
  }
  return matches.length === 1 ? matches[0].id : "";
};

const warnings = []; const errors = []; const records = []; const duplicateKeys = new Map();
for (let rowIndex = 1; rowIndex < parsed.length; rowIndex += 1) {
  const rowNumber = rowIndex + 1; const values = parsed[rowIndex];
  const source = Object.fromEntries(headers.map((header, index) => [header, String(values[index] || "").trim()]));
  if (!source.nameAsWritten) { errors.push(`Row ${rowNumber}: nameAsWritten is required.`); continue; }
  if (!source.branch) { errors.push(`Row ${rowNumber}: branch is required.`); continue; }
  const canonicalBranch = branchLookup.get(normalize(source.branch));
  if (!canonicalBranch) warnings.push(`Row ${rowNumber}: unknown branch name “${source.branch}”.`);
  const branch = canonicalBranch || source.branch;
  const occurrenceType = normalize(source.occurrenceType || "member");
  if (!allowedTypes.has(occurrenceType)) { errors.push(`Row ${rowNumber}: invalid occurrenceType “${source.occurrenceType}”; use member or associated.`); continue; }
  for (const [field, value] of [["baptismDate", source.baptismDate]]) {
    for (const yearText of String(value || "").match(/\b\d{4}\b/g) || []) if (Number(yearText) > 1920) errors.push(`Row ${rowNumber}: ${field} contains year ${yearText}, after the 1920 limit.`);
  }
  const imageSequence = /^\d+$/.test(source.imageRef) ? Number(source.imageRef) : null;
  const record = {
    nameAsWritten: source.nameAsWritten,
    normalizedName: normalize(source.nameAsWritten),
    aliases: splitAliases(source.aliases),
    branch,
    sourceBranchSpelling: source.sourceBranchSpelling || (normalize(source.branch) !== normalize(branch) ? source.branch : ""),
    baptismDate: source.baptismDate || null,
    residence: source.residence || null,
    entryNumber: source.entryNumber || null,
    imageRef: source.imageRef || null,
    imageFilename: source.imageFilename || null,
    imageSequence,
    collectionId: (imageSequence || source.imageFilename) ? collectionForBranch(branch, source.imageFilename) : null,
    pageNumber: source.pageNumber || null,
    notes: source.notes || null,
    verified: booleanValue(source.verified, rowNumber, errors),
    occurrenceType,
  };
  const duplicateKey = normalize([record.nameAsWritten, record.branch, record.baptismDate, record.residence, record.entryNumber, record.imageRef, record.imageFilename, record.occurrenceType].join("|"));
  if (duplicateKeys.has(duplicateKey)) warnings.push(`Rows ${duplicateKeys.get(duplicateKey)} and ${rowNumber} look like duplicate occurrences.`);
  else duplicateKeys.set(duplicateKey, rowNumber);
  if ((record.imageRef || record.imageFilename) && !record.collectionId) warnings.push(`Row ${rowNumber}: image reference is present, but a unique branch collection could not be identified.`);
  records.push(record);
}

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
const payload = { privateLocalIndex: true, version: 2, generatedAt: new Date().toISOString(), branchAliases: { Ffestiniog: ["Festiniog"] }, counts: { occurrences: records.length, members: records.filter((record) => record.occurrenceType === "member").length, associated: records.filter((record) => record.occurrenceType === "associated").length }, records };
fs.mkdirSync(privateDir, { recursive: true });
fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
fs.writeFileSync(jsPath, `window.WELSH_PEOPLE_PRIVATE_INDEX = ${JSON.stringify(payload)};\n`, "utf8");
fs.writeFileSync(reportPath, `${JSON.stringify({ generatedAt: payload.generatedAt, source: path.relative(root, sourcePath).split(path.sep).join("/"), ...payload.counts, warnings, errors }, null, 2)}\n`, "utf8");
warnings.forEach((warning) => console.warn(`Warning: ${warning}`));
console.log(`Built ${records.length} private people-index occurrences (${payload.counts.members} members, ${payload.counts.associated} associated).`);
