import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const privateDir = path.join(root, "data", "private");
const sourcePath = path.join(privateDir, "people-index-source.csv");

function parseCsv(text) {
  const rows = []; let row = []; let field = ""; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ""; }
    else if (c === '\n') { row.push(field.replace(/\r$/, "")); if (row.some(Boolean)) rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field || row.length) { row.push(field.replace(/\r$/, "")); if (row.some(Boolean)) rows.push(row); }
  return rows;
}
const quote = (value) => /[",\r\n]/.test(String(value ?? "")) ? `"${String(value ?? "").replaceAll('"', '""')}"` : String(value ?? "");
const writeCsv = (filename, headers, rows) => fs.writeFileSync(path.join(privateDir, filename), `${headers.join(",")}\n${rows.map((row) => headers.map((h) => quote(row[h])).join(",")).join("\n")}\n`);

const parsed = parseCsv(fs.readFileSync(sourcePath, "utf8").replace(/^\uFEFF/, ""));
const headers = parsed[0];
const allRows = parsed.slice(1).map((values) => Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""])));
const rows = allRows.filter((row) => row.branch === "Machen");
if (rows.length !== 42) throw new Error(`Expected 42 Machen occurrences; found ${rows.length}.`);

const keyOf = (row) => [row.branch, row.imageFilename, row.entryNumber, row.nameAsWritten].join("|");
const id = (image, entry, name) => `${image}|${entry}|${name}`;
const proposalMap = new Map();
function propose(image, entry, name, values, rowPosition, note) {
  proposalMap.set(id(image, String(entry), name), { values, rowPosition, note });
}

// Original register, name-bearing leaves 001 and 003.
for (const [entry, name] of [[1,"David Thomas Jones"],[2,"James G. Turner"],[3,"Richard Pierce"],[4,"Margaret Pierce"]])
  propose("Machen-pdf-page-001.jpg", entry, name, { residence: "Machen" }, `original register entry ${entry}`, "Residence is written in the same ruled row on the name-bearing leaf.");
for (const [entry, name, values] of [
  [13,"William Morgan",{ residence:"Machen" }],
  [15,"William Williams",{ residence:"Machen" }],
  [18,"Abraham Watson",{ residence:"Machen" }],
  [19,"Ephraim Morgan",{ residence:"Machen", birthDate:"March 20th 1822" }],
  [20,"George Conner",{ residence:"Machen", birthDate:"Oct. 17 1830" }],
  [21,"Mary Anne Conner",{ residence:"Machen", birthDate:"Sept 21st 1833" }],
  [22,"Charlotte Williams",{ residence:"Machen" }],
]) propose("Machen-pdf-page-003.jpg", entry, name, values, `original register entry ${entry}`, "Values are read across the same ruled row on the name-bearing leaf; neighboring entry rules preserve alignment.");

// Separately numbered reformation register. Existing Baptism and Residence are retained and checked separately below.
for (const [entry, name, birthDate] of [
  [1,"George Conner","Oct. 17 1830"],
  [3,"Ephraim Morgan","March 20th 1822"],
  [5,"Mary Anne Conner","Sept 21st 1833"],
  [9,"Elizabeth Hayrock","March 17th 1827"],
]) propose("Machen-pdf-page-005.jpg", entry, name, { birthDate }, `reformation register entry ${entry}`, "Birth date is written in the Nativity columns of the same numbered row; the occurrence remains distinct from the original register occurrence.");
for (const [entry, name, values] of [
  [10,"Emma Hayrock",{ residence:"Machen", birthDate:"July 7th 1847", baptismDate:"Oct. 14th 1857" }],
  [11,"Elizabeth Williams",{ residence:"Machen", birthDate:"July 29th 1847", baptismDate:"Oct. 14th 1857" }],
  [12,"Mary Anne Morgan",{ residence:"Machen" }],
  [15,"Elizabeth Conner",{ residence:"Machen", birthDate:"Nov. 28 1851", baptismDate:"March 21 1860" }],
]) propose("Machen-pdf-page-007.jpg", entry, name, values, `reformation register entry ${entry}`, "Values are written across the same numbered row; intervening horizontal rules and neighboring entries confirm alignment.");

const existingExpected = new Map([
  [id("Machen-pdf-page-005.jpg","1","George Conner"), ["April 11, 1857","Machen"]],
  [id("Machen-pdf-page-005.jpg","2","Abraham Watson"), ["April 11, 1857","Machen"]],
  [id("Machen-pdf-page-005.jpg","3","Ephraim Morgan"), ["April 11, 1857","Machen"]],
  [id("Machen-pdf-page-005.jpg","4","Charlotte Williams"), ["April 11, 1857","Machen"]],
  [id("Machen-pdf-page-005.jpg","5","Mary Anne Conner"), ["April 24, 1857","Machen"]],
  [id("Machen-pdf-page-005.jpg","6","Amy Smith"), ["April 24, 1857","Machen"]],
  [id("Machen-pdf-page-005.jpg","8","Elizabeth Conner"), ["Sept. 2, 1857","Machen"]],
  [id("Machen-pdf-page-005.jpg","9","Elizabeth Hayrock"), ["Oct. 14, 1857","Machen"]],
]);

const uncertainIds = new Map([
  [id("Machen-pdf-page-001.jpg","6","Rachael Jones"), "Residence and early baptism writing require a closer manual reading."],
  [id("Machen-pdf-page-001.jpg","8","Anne Jones"), "Residence and early baptism writing require a closer manual reading."],
  [id("Machen-pdf-page-003.jpg","13","William Morgan"), "A baptism date is present but its final year is not sufficiently clear for promotion."],
  [id("Machen-pdf-page-003.jpg","15","William Williams"), "A baptism date is present but its exact reading requires manual confirmation."],
  [id("Machen-pdf-page-007.jpg","12","Mary Anne Morgan"), "Birth and baptism annotations are incomplete/faint; Residence alone is clear."],
  [id("Machen-pdf-page-007.jpg","21","Margaret Smith"), "The added-member block is densely written; Birth, Baptism, and Residence are not all safely aligned for promotion."],
  [id("Machen-pdf-page-007.jpg","22","James Richard"), "The added-member block is densely written; Birth, Baptism, and Residence are not all safely aligned for promotion."],
  [id("Machen-pdf-page-007.jpg","23","William Richard"), "The added-member block is densely written; Birth, Baptism, and Residence are not all safely aligned for promotion."],
  [id("Machen-pdf-page-007.jpg","","George Conner"), "Unnumbered added-member row; no conservative Birth, Baptism, or Residence proposal."],
  [id("Machen-pdf-page-007.jpg","","Sarah Smith"), "Unnumbered added-member row; no conservative Birth, Baptism, or Residence proposal."],
  [id("Machen-pdf-page-007.jpg","","James John"), "Unnumbered added-member row; no conservative Birth, Baptism, or Residence proposal."],
  [id("Machen-pdf-page-007.jpg","","Harriet Richard"), "Unnumbered added-member row; no conservative Birth, Baptism, or Residence proposal."],
  [id("Machen-pdf-page-007.jpg","","Charlotte Williams"), "Unnumbered added-member row; no conservative Birth, Baptism, or Residence proposal."],
]);

const evidence = []; const occurrenceSummary = []; const existingChecks = [];
for (const row of rows) {
  const shortId = id(row.imageFilename, row.entryNumber, row.nameAsWritten);
  const proposal = proposalMap.get(shortId);
  const proposedFields = [];
  if (proposal) for (const [field, value] of Object.entries(proposal.values)) {
    if (row[field]) throw new Error(`Refusing to overwrite populated ${field} on ${keyOf(row)}.`);
    proposedFields.push(field);
    evidence.push({ occurrenceKey:keyOf(row), memberName:row.nameAsWritten, entryNumber:row.entryNumber, exactSourceImage:row.imageFilename, pairedOrContextImage:"", rowPosition:proposal.rowPosition, proposedField:field, exactValueAsWritten:value, confidence:"clear", evidenceNote:proposal.note });
  }
  if (existingExpected.has(shortId)) {
    const [baptismDate, residence] = existingExpected.get(shortId);
    if (row.baptismDate !== baptismDate || row.residence !== residence) throw new Error(`Existing field mismatch on ${keyOf(row)}.`);
    existingChecks.push({occurrenceKey:keyOf(row),memberName:row.nameAsWritten,entryNumber:row.entryNumber,exactSourceImage:row.imageFilename,baptismDate,residence,status:"re-verified against source"});
  }
  let classification = proposedFields.length ? "clear proposal" : "unchanged";
  let reviewReason = uncertainIds.get(shortId) ?? "";
  if (reviewReason) classification = proposedFields.length ? "clear proposal plus manual-review field(s)" : "manual review";
  occurrenceSummary.push({occurrenceKey:keyOf(row),memberName:row.nameAsWritten,entryNumber:row.entryNumber,exactSourceImage:row.imageFilename,classification,proposedFields:proposedFields.join(";"),manualReviewReason:reviewReason});
}

const evidenceHeaders=["occurrenceKey","memberName","entryNumber","exactSourceImage","pairedOrContextImage","rowPosition","proposedField","exactValueAsWritten","confidence","evidenceNote"];
writeCsv("people-index-machen-structured-field-proposals.csv", evidenceHeaders, evidence);
writeCsv("people-index-machen-structured-field-occurrence-review.csv", ["occurrenceKey","memberName","entryNumber","exactSourceImage","classification","proposedFields","manualReviewReason"], occurrenceSummary);
writeCsv("people-index-machen-existing-fields-reverified.csv", ["occurrenceKey","memberName","entryNumber","exactSourceImage","baptismDate","residence","status"], existingChecks);

const proposedBirth = evidence.filter((row) => row.proposedField === "birthDate").length;
const proposedBaptism = evidence.filter((row) => row.proposedField === "baptismDate").length;
const proposedResidence = evidence.filter((row) => row.proposedField === "residence").length;
const multiple = occurrenceSummary.filter((row) => row.proposedFields.split(";").filter(Boolean).length > 1).length;
const unchanged = occurrenceSummary.filter((row) => !row.proposedFields).length;
const manualReview = occurrenceSummary.filter((row) => row.manualReviewReason).length;
const conflicts = occurrenceSummary.filter((row) => row.classification.includes("source-image conflict")).length;
const report = {
  mode:"audit/evidence only — no master, staging, portable, or beta modification",
  branch:"Machen", totalOccurrencesReviewed:rows.length,
  proposedNew:{birth:proposedBirth,baptism:proposedBaptism,residence:proposedResidence},
  existingValuesReverified:{baptism:existingChecks.length,residence:existingChecks.length},
  occurrencesReceivingMultipleNewFields:multiple, unchangedOccurrences:unchanged,
  manualReviewOccurrences:manualReview, sourceAlignmentConflicts:conflicts,
  evidenceFiles:["data/private/people-index-machen-structured-field-proposals.csv","data/private/people-index-machen-structured-field-occurrence-review.csv","data/private/people-index-machen-existing-fields-reverified.csv"],
  protectedBranchesNotModified:["Georgetown","Pontlanfraith","Alltwen","Abersychan","Ffestiniog","Stepaside"],
};
fs.writeFileSync(path.join(privateDir,"people-index-machen-structured-field-report.json"), `${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify(report,null,2));
