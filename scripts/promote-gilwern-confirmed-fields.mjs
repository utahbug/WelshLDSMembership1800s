import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const privateDir = path.join(root, "data", "private");
const masterPath = path.join(privateDir, "people-index-source.csv");
const stagingPath = path.join(privateDir, "people-index-staging-gilwern-production.csv");
const proposalsPath = path.join(privateDir, "people-index-gilwern-structured-field-proposals.csv");
const reviewsPath = path.join(privateDir, "people-index-gilwern-structured-field-occurrence-review.csv");

function parseCsv(text) {
  const rows = []; let row = []; let value = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { value += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else value += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") { row.push(value); value = ""; }
    else if (character === "\n") { row.push(value.replace(/\r$/, "")); if (row.some(Boolean)) rows.push(row); row = []; value = ""; }
    else value += character;
  }
  if (value || row.length) { row.push(value.replace(/\r$/, "")); if (row.some(Boolean)) rows.push(row); }
  return rows;
}

const quote = (value) => /[",\r\n]/.test(String(value ?? "")) ? `"${String(value ?? "").replaceAll('"', '""')}"` : String(value ?? "");
const load = (file) => {
  const parsed = parseCsv(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  const headers = parsed.shift();
  return { headers, rows: parsed.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? "" ]))) };
};
const write = (file, data) => fs.writeFileSync(file, `${data.headers.join(",")}\n${data.rows.map((row) => data.headers.map((header) => quote(row[header])).join(",")).join("\n")}\n`);
const digest = (rows) => crypto.createHash("sha256").update(JSON.stringify(rows)).digest("hex");

const proposals = load(proposalsPath).rows;
const reviews = load(reviewsPath).rows;
const manualKeys = new Set(reviews.filter((row) => row.reviewStatus === "manual review").map((row) => row.occurrenceKey));
const confirmed = proposals.filter((row) => !manualKeys.has(row.occurrenceKey));
const excluded = proposals.filter((row) => manualKeys.has(row.occurrenceKey));
const fieldMap = { Birth: "birthDate", Baptism: "baptismDate", Residence: "residence" };

const count = (field) => confirmed.filter((row) => row.proposedField === field).length;
if (confirmed.length !== 77 || count("Birth") !== 17 || count("Baptism") !== 43 || count("Residence") !== 17) {
  throw new Error(`Confirmed proposal set changed: ${confirmed.length} total; Birth ${count("Birth")}, Baptism ${count("Baptism")}, Residence ${count("Residence")}.`);
}
if (excluded.length !== 9 || manualKeys.size !== 10) throw new Error(`Expected 9 excluded proposals and 10 manual-review occurrences; found ${excluded.length} and ${manualKeys.size}.`);

function apply(file, expectedRows, isStaging = false) {
  const data = load(file);
  if (isStaging) {
    if (!data.headers.includes("birthDate")) data.headers.splice(data.headers.indexOf("baptismDate"), 0, "birthDate");
    if (!data.headers.includes("birthDateConfidence")) data.headers.splice(data.headers.indexOf("baptismDateConfidence"), 0, "birthDateConfidence");
  }
  const branchRows = data.rows.filter((row) => row.branch === "Gilwern");
  if (branchRows.length !== expectedRows) throw new Error(`${path.basename(file)} has ${branchRows.length} Gilwern rows; expected ${expectedRows}.`);
  const otherRowsBefore = digest(data.rows.filter((row) => row.branch !== "Gilwern"));
  let changed = 0;
  for (const proposal of confirmed) {
    if (manualKeys.has(proposal.occurrenceKey)) throw new Error(`Manual-review proposal reached promotion: ${proposal.occurrenceKey}.`);
    const matches = branchRows.filter((row) => [row.imageFilename, row.entryNumber, row.nameAsWritten].join("|") === proposal.occurrenceKey);
    if (matches.length !== 1) throw new Error(`${path.basename(file)}: ${proposal.occurrenceKey} matched ${matches.length} rows.`);
    const row = matches[0];
    const field = fieldMap[proposal.proposedField];
    if (!field) throw new Error(`Unknown proposed field ${proposal.proposedField}.`);
    if (row[field] && row[field] !== proposal.exactValueAsWritten) throw new Error(`Conflicting ${field} for ${proposal.occurrenceKey}.`);
    if (!row[field]) { row[field] = proposal.exactValueAsWritten; changed += 1; }
    if (`${field}Confidence` in row) row[`${field}Confidence`] = "clear";
  }
  if (digest(data.rows.filter((row) => row.branch !== "Gilwern")) !== otherRowsBefore) throw new Error(`${path.basename(file)} changed a non-Gilwern row.`);
  write(file, data);
  return { changed, rows: branchRows };
}

const masterResult = apply(masterPath, 55);
const stagingResult = apply(stagingPath, 55, true);
const identity = (row) => [row.nameAsWritten, row.entryNumber, row.imageFilename].join("|");
const final = masterResult.rows;
const report = {
  branch: "Gilwern",
  promotedFields: masterResult.changed,
  promotedBirth: count("Birth"),
  promotedBaptism: count("Baptism"),
  promotedResidence: count("Residence"),
  uniqueOccurrencesEnriched: new Set(confirmed.map((row) => row.occurrenceKey)).size,
  finalOccurrences: final.length,
  finalBirth: final.filter((row) => row.birthDate).length,
  finalBaptism: final.filter((row) => row.baptismDate).length,
  finalResidence: final.filter((row) => row.residence).length,
  existingResidencesPreserved: 30,
  manualReviewOccurrencesExcluded: manualKeys.size,
  proposedFieldsExcluded: excluded.length,
  duplicateIdentities: final.length - new Set(final.map(identity)).size,
  stagingFieldsChanged: stagingResult.changed,
};
if (report.promotedFields !== 77 || report.finalBirth !== 17 || report.finalBaptism !== 43 || report.finalResidence !== 47 || report.duplicateIdentities !== 0) {
  throw new Error(`Post-promotion validation failed: ${JSON.stringify(report)}`);
}
fs.writeFileSync(path.join(privateDir, "people-index-gilwern-promotion-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
