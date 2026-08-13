import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const privateDir = path.join(root, "data", "private");
const sourcePath = path.join(privateDir, "people-index-source.csv");
const alltwenStagingPath = path.join(privateDir, "people-index-staging-alltwen-production.csv");
const reportPath = path.join(privateDir, "people-index-abersychan-alltwen-backfill-report.json");
const reviewPath = path.join(privateDir, "people-index-alltwen-structured-field-review.csv");
const promote = process.argv.includes("--promote");

function parseCsv(text) {
  const rows = []; let row = []; let field = ""; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field.replace(/\r$/, "")); if (row.some(Boolean)) rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field || row.length) { row.push(field.replace(/\r$/, "")); if (row.some(Boolean)) rows.push(row); }
  return rows;
}
const quote = (value) => /[",\r\n]/.test(String(value ?? "")) ? `"${String(value ?? "").replaceAll('"', '""')}"` : String(value ?? "");
const readObjects = (file) => {
  const parsed = parseCsv(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  const headers = parsed[0];
  return { headers, rows: parsed.slice(1).map((values) => Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""]))) };
};
const writeObjects = (file, headers, rows) => fs.writeFileSync(file, `${headers.join(",")}\n${rows.map((row) => headers.map((header) => quote(row[header] ?? "")).join(",")).join("\n")}\n`, "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const abersychan = [
  ["Thomas Wheeler", "23 Jul 1884"],
  ["Lydia Sophia Wheeler", "23 Jul 1884"],
  ["Fanny Sophia Thomas", "23 Jul 1884"],
  ["Florence Edith Wheeler", "23 Jul 1884"],
  ["Minnie Barbara Wheeler", "11 Aug 1889"],
  ["Frederick John Wheeler", "11 Aug 1889"],
].map(([nameAsWritten, baptismDate]) => ({
  branch: "Abersychan", nameAsWritten, imageFilename: "LR 10468 7_v1_00016.jpg", entryNumber: "", baptismDate,
  sourceGroupId: "abersychan-v1-paragraph-baptisms",
}));

// Values below are conservative row-level readings from the exact member row on
// LR2257 images 00008, 00010, 00012 and 00014. Empty source cells stay empty.
// The separate RB sequence is reviewed below but is not mislabeled as ordinary baptism.
const alltwen = new Map(Object.entries({
  "13": { residence: "Alltwen", birthDate: "Janr 14=23", baptismDate: "Mehef 16=49" },
  "14": { residence: "Alltwen", birthDate: "Mai 8=27", baptismDate: "Awst 24=49" },
  "15": { residence: "Alltwen", baptismDate: "Medi =49" },
  "16": { residence: "Alltwen", baptismDate: "Medi =49", review: "Birth writing is present but not sufficiently clear for promotion." },
  "17": { residence: "Alltwen", birthDate: "Rhag 17=36" },
  "18": { residence: "Alltwen", birthDate: "Math 23=29", baptismDate: "Tach 21=49" },
  "19": { residence: "Alltwen", birthDate: "Janr 24=39", baptismDate: "Tach 22=49" },
  "20": { residence: "Alltwen", baptismDate: "Rhag 12=49", review: "Birth writing is present but its exact written form is ambiguous." },
  "21": { residence: "Alltwen", birthDate: "Jan 21=30", baptismDate: "Chwyf 18=50" },
  "22": { residence: "Alltwen", birthDate: "Jan 24=42", baptismDate: "Jan 24=50" },
  "23": { residence: "Alltwen", baptismDate: "Chwyf 28=50" },
  "25": { residence: "Llangyfelach", baptismDate: "Mai 2=50" },
  "26": { residence: "Llangyfelach", baptismDate: "Gor 18=50" },
  "27": { residence: "Alltwen", birthDate: "Medi 11=41", baptismDate: "Medi 23=50" },
  "28": { residence: "Pininose", birthDate: "Rhag 8=31", baptismDate: "Chwyf 8=51" },
  "29": { review: "Residence writing is present but the place spelling is not sufficiently clear for promotion." },
  "30": { residence: "Alltwen", birthDate: "Ebrill 28=30", baptismDate: "Chwyf 2=51" },
  "31": { residence: "Llangyfelach", birthDate: "Dec 28=28", review: "Two baptism-column dates are present; their relationship requires manual review." },
  "32": { residence: "Ynysymwn", birthDate: "Jan 29=33", baptismDate: "Hyd 18=51" },
  "34": { residence: "Alltwen", birthDate: "Tach 18=43", baptismDate: "Chwyf 3=52" },
  "35": { residence: "Alltwen", birthDate: "Medi 14=32", baptismDate: "Chwyf 3=52" },
  "36": { residence: "Ynysymwn", birthDate: "Medi 3=31", baptismDate: "Mawrth 20=52" },
  "37": { residence: "Alltwen", birthDate: "Ebr 4=43", baptismDate: "Mai 19=51" },
  "38": { residence: "Alltwen", birthDate: "Rhag 10=41", baptismDate: "Mai 20=51" },
  "39": { residence: "Alltwen", birthDate: "Ebrill 2=44", baptismDate: "Ebr 6=52" },
  "40": {},
  "41": { residence: "Ynysymwn", birthDate: "Gorff 2=36", baptismDate: "Medi 20=52" },
  "42": { residence: "Alltwen", birthDate: "Dec 25=28", baptismDate: "Mawr 8=53" },
  "43": { residence: "Ynysymwn", baptismDate: "Awst 30=53" },
  "44": { residence: "Pontardawe" },
  "45": { residence: "Pontardawe" },
  "46": { residence: "Pontardawe" },
  "47": { residence: "Ynysymwn", review: "An erased/overwritten birth value is not clear enough to promote." },
  "48": { residence: "Ynysymwn", birthDate: "Medi 11=40", baptismDate: "Awst 3=54" },
  "49": { residence: "Alltwen", birthDate: "Chwyf 11=46", baptismDate: "Chwyf 26=55; Ebrill 13=58" },
  "50": {},
  "51": { residence: "Pontardawe", baptismDate: "Mawrth 25=55" },
  "52": { residence: "Llangyfelach", baptismDate: "Mawrth 26=55" },
  "53": { residence: "Alltwen", birthDate: "Mai 15=47", baptismDate: "Hydref 20=55" },
  "54": { residence: "Llangyfelach", baptismDate: "Medi 26=55" },
  "55": {},
  "56": { residence: "Alltwen", birthDate: "Jan 17/48", baptismDate: "Gorff 1/56" },
  "57": { residence: "Alltwen", birthDate: "Medi 6=49", baptismDate: "Ebrill 13=58" },
  "58": { residence: "Alltwen", birthDate: "Rhagfyr 31=48", baptismDate: "Ebrill 13=58" },
  "59": {},
  "60": {},
}));

const source = readObjects(sourcePath);
const staging = readObjects(alltwenStagingPath);
const abersychanStaging = readObjects(path.join(privateDir, "people-index-staging-abersychan-production.csv"));
const abersychanChanges = [];
for (const expected of abersychan) {
  const stageMatches = abersychanStaging.rows.filter((row) => row.branch === expected.branch && row.nameAsWritten === expected.nameAsWritten && row.imageFilename === expected.imageFilename && row.entryNumber === expected.entryNumber && row.sourceGroupId === expected.sourceGroupId);
  assert(stageMatches.length === 1, `Expected one aligned Abersychan staging row for ${expected.nameAsWritten}; found ${stageMatches.length}.`);
  assert(stageMatches[0].reviewStatus === "clear" && stageMatches[0].baptismDateConfidence === "clear" && stageMatches[0].baptismDate === expected.baptismDate, `Abersychan staging value is not clear/aligned for ${expected.nameAsWritten}.`);
  const masterMatches = source.rows.filter((row) => row.branch === expected.branch && row.nameAsWritten === expected.nameAsWritten && row.imageFilename === expected.imageFilename && row.entryNumber === expected.entryNumber);
  assert(masterMatches.length === 1, `Expected one exact master occurrence for ${expected.nameAsWritten}; found ${masterMatches.length}.`);
  assert(masterMatches[0].baptismDate === "" || masterMatches[0].baptismDate === expected.baptismDate, `Refusing to overwrite existing Abersychan baptism for ${expected.nameAsWritten}.`);
  abersychanChanges.push({ occurrenceKey: [expected.branch, expected.nameAsWritten, expected.imageFilename, expected.entryNumber || "(no entry)"].join(" | "), before: masterMatches[0].baptismDate, after: expected.baptismDate });
  if (promote) masterMatches[0].baptismDate = expected.baptismDate;
}

const allAlltwen = source.rows.filter((row) => row.branch === "Alltwen");
assert(allAlltwen.length === 69, `Expected 69 existing Alltwen occurrences; found ${allAlltwen.length}.`);
const ordinary = allAlltwen.filter((row) => /^\d+$/.test(row.entryNumber));
const rebaptism = allAlltwen.filter((row) => /^RB-/.test(row.entryNumber));
assert(ordinary.length === 46 && rebaptism.length === 23, `Unexpected Alltwen sequence counts: ordinary ${ordinary.length}, RB ${rebaptism.length}.`);
const reviewRows = [];
for (const row of allAlltwen) {
  const values = alltwen.get(row.entryNumber) || {};
  if (/^\d+$/.test(row.entryNumber)) assert(alltwen.has(row.entryNumber), `No structured review for Alltwen entry ${row.entryNumber}.`);
  const classification = /^RB-/.test(row.entryNumber) ? "separate rebaptism sequence; requested ordinary fields not applicable/present" : values.review ? "manual review" : "reviewed";
  for (const field of ["birthDate", "baptismDate", "residence"]) {
    const value = values[field] || "";
    assert(!row[field] || row[field] === value, `Refusing to overwrite Alltwen ${row.entryNumber} ${field}.`);
    if (promote && value) row[field] = value;
  }
  reviewRows.push({ branch: row.branch, nameAsWritten: row.nameAsWritten, entryNumber: row.entryNumber, imageFilename: row.imageFilename, birthDate: values.birthDate || "", birthDateConfidence: values.birthDate ? "clear" : values.review?.toLowerCase().includes("birth") ? "manual review" : "not present/not applicable", baptismDate: values.baptismDate || "", baptismDateConfidence: values.baptismDate ? "clear" : values.review?.toLowerCase().includes("baptism") ? "manual review" : "not present/not applicable", residence: values.residence || "", residenceConfidence: values.residence ? "clear" : values.review?.toLowerCase().includes("residence") ? "manual review" : "not present/not applicable", reviewStatus: classification, reviewNotes: values.review || "" });
}

const summary = {
  reviewed: allAlltwen.length,
  withBirth: reviewRows.filter((row) => row.birthDate).length,
  withBaptism: reviewRows.filter((row) => row.baptismDate).length,
  withResidence: reviewRows.filter((row) => row.residence).length,
  withMultipleFields: reviewRows.filter((row) => [row.birthDate, row.baptismDate, row.residence].filter(Boolean).length > 1).length,
  unchanged: reviewRows.filter((row) => !row.birthDate && !row.baptismDate && !row.residence).length,
  manualReview: reviewRows.filter((row) => row.reviewStatus === "manual review").length,
  ordinaryRegisterOccurrences: ordinary.length,
  rebaptismSequenceOccurrences: rebaptism.length,
};

if (promote) {
  writeObjects(sourcePath, source.headers, source.rows);
  const enrichedHeaders = staging.headers.includes("birthDate") ? staging.headers : [...staging.headers.slice(0, 4), "birthDate", ...staging.headers.slice(4)];
  if (!enrichedHeaders.includes("birthDateConfidence")) enrichedHeaders.splice(enrichedHeaders.indexOf("baptismDateConfidence"), 0, "birthDateConfidence");
  for (const row of staging.rows.filter((item) => item.branch === "Alltwen" && item.reviewStatus === "clear")) {
    const reviewed = reviewRows.find((item) => item.entryNumber === row.entryNumber && item.imageFilename === row.imageFilename);
    if (!reviewed) continue;
    row.birthDate = reviewed.birthDate; row.birthDateConfidence = reviewed.birthDateConfidence;
    row.baptismDate = reviewed.baptismDate; row.baptismDateConfidence = reviewed.baptismDateConfidence;
    row.residence = reviewed.residence; row.residenceConfidence = reviewed.residenceConfidence;
  }
  writeObjects(alltwenStagingPath, enrichedHeaders, staging.rows);
}

writeObjects(reviewPath, ["branch","nameAsWritten","entryNumber","imageFilename","birthDate","birthDateConfidence","baptismDate","baptismDateConfidence","residence","residenceConfidence","reviewStatus","reviewNotes"], reviewRows);
const report = { mode: promote ? "promoted" : "dry-run", generatedAt: new Date().toISOString(), abersychan: { changes: abersychanChanges }, alltwen: summary };
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
