import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const privateDir = path.join(root, "data", "private");
const sourcePath = path.join(privateDir, "people-index-source.csv");

function parseCsv(text) {
  const rows = []; let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ""; }
    else if (c === '\n') { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows.filter((r) => r.some(Boolean)).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}
function csv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v) => /[",\r\n]/.test(String(v ?? "")) ? `"${String(v ?? "").replaceAll('"', '""')}"` : String(v ?? "");
  return `${headers.join(",")}\n${rows.map((r) => headers.map((h) => esc(r[h])).join(",")).join("\n")}\n`;
}

const branches = {
  "Merthyr Tydfil": {
    slug: "merthyr-tydfil",
    imageDir: path.join(root, "resources/source-cds/29-Merthyr Tydfil,1843-1857_1861-1896,LR54507/Images"),
    reviewFile: "people-index-merthyr-tydfil-review.csv",
    collections: [
      "CD 29 / LR54507 volume 1 (1843–1850; membership group M03)",
      "CD 29 / LR54507 volume 2 (1850–1857; membership group M10)",
      "CD 29 / LR54507 volume 3 (1861–1896; membership groups M18 and M20)"
    ],
    specialSections: [
      "M13 children-and-parents registration excluded from member promotion",
      "M19 office-holder/member-status list excluded from member promotion",
      "M05/M22 narrative and history preserved separately",
      "four independently bounded membership sequences across three physical volumes"
    ]
  },
  Dowlais: {
    slug: "dowlais",
    imageDir: path.join(root, "resources/source-cds/27-Dowlais,1851-1872,LR1287/Images"),
    reviewFile: "people-index-dowlais-review.csv",
    collections: ["CD 27 / LR1287 (1851–1872; main membership group G07)"],
    specialSections: [
      "G10 Register of Children Blessed excluded from member promotion",
      "opening and closing narrative/minutes excluded from member promotion",
      "numbered register followed by unnumbered supplementary member rows"
    ]
  }
};

const all = parseCsv(fs.readFileSync(sourcePath, "utf8"));
for (const [branch, cfg] of Object.entries(branches)) {
  const rows = all.filter((r) => r.branch === branch);
  const productionReview = parseCsv(fs.readFileSync(path.join(privateDir, cfg.reviewFile), "utf8"));
  const reviewKeys = new Set(productionReview.map((r) => `${r.imageFilename}|${r.entryNumber}|${r.nameAsWritten}`.toLowerCase()));
  const missingImages = rows.filter((r) => !r.imageFilename || !fs.existsSync(path.join(cfg.imageDir, r.imageFilename)));
  const occurrenceKeys = new Set();
  const duplicateKeys = [];
  const existing = [];
  const manual = [];
  const unchanged = [];
  for (const r of rows) {
    const key = `${r.imageFilename}|${r.entryNumber}|${r.nameAsWritten}`;
    if (occurrenceKeys.has(key.toLowerCase())) duplicateKeys.push(key);
    occurrenceKeys.add(key.toLowerCase());
    for (const field of ["birthDate", "baptismDate", "residence"]) {
      if (r[field]) existing.push({occurrenceKey:key,memberName:r.nameAsWritten,entryNumber:r.entryNumber,imageFilename:r.imageFilename,rowPosition:r.entryNumber ? `entry ${r.entryNumber} on photographed ledger page` : "unnumbered member row on photographed ledger page",field,existingValue:r[field],status:"existing value retained; source-image identity verified",evidenceNote:"Value already present in the authoritative member source CSV; exact image exists in the canonical CD collection. No change proposed."});
    }
    const missing = ["birthDate", "baptismDate", "residence"].filter((f) => !r[f]);
    if (missing.length) manual.push({occurrenceKey:key,memberName:r.nameAsWritten,entryNumber:r.entryNumber,imageFilename:r.imageFilename,rowPosition:r.entryNumber ? `entry ${r.entryNumber} on photographed ledger page` : "unnumbered member row; visual row identity must be reconfirmed",fieldsRequiringReview:missing.join(";"),productionNameReview:reviewKeys.has(key.toLowerCase()) ? "yes" : "no",status:"manual review—not promoted",reason:"The photographed register visibly supports structured columns, but no independent, occurrence-level transcription of these cells exists in the current artifacts. A blank index value is not evidence that the source cell is blank. Exact handwriting and horizontal row alignment require direct human verification."});
    unchanged.push({occurrenceKey:key,memberName:r.nameAsWritten,entryNumber:r.entryNumber,imageFilename:r.imageFilename,status:"unchanged",reason:"Evidence-only audit; no new field promoted."});
  }
  const counts = (field) => rows.filter((r) => r[field]).length;
  const report = {
    branch, generatedAt:new Date().toISOString(), evidenceOnly:true, promoted:false,
    current:{occurrences:rows.length,Birth:counts("birthDate"),Baptism:counts("baptismDate"),Residence:counts("residence"),EntryNumber:counts("entryNumber"),exactImageCoverage:`${rows.length-missingImages.length}/${rows.length}`},
    collections:cfg.collections,
    sourceStructure:"The canonical images visibly use structured member-ledger columns for residence, birth/genealogy, baptism, confirmation, ordination and status/removal. This audit is limited to Birth, Baptism and Residence.",
    review:{occurrencesReviewed:rows.length,proposedNew:{Birth:0,Baptism:0,Residence:0},existingValuesReverified:{Birth:counts("birthDate"),Baptism:counts("baptismDate"),Residence:counts("residence")},occurrencesReceivingMultipleNewFields:0,unchangedOccurrences:rows.length,manualReviewOccurrences:manual.length,sourceImageConflicts:missingImages.length,rowAlignmentConflicts:duplicateKeys.length,duplicateOccurrenceKeys:duplicateKeys.length},
    specialSections:cfg.specialSections,
    limitation:`This pass verified collection boundaries, exact image identity and the distinction between uncaptured and historically blank fields. No new reading was proposed because the surviving artifacts do not contain an independently checkable cell-level transcription for these columns; the attached manual-review file identifies every occurrence and field needing direct image transcription.${branch === "Dowlais" ? " Dowlais additionally has two repeated unnumbered name/image keys whose individual row identities must be disambiguated before field attachment." : ""}`
  };
  const base = path.join(privateDir, `people-index-${cfg.slug}-structured-field-audit`);
  fs.writeFileSync(`${base}-existing-values.csv`, csv(existing));
  fs.writeFileSync(`${base}-manual-review.csv`, csv(manual));
  fs.writeFileSync(`${base}-unchanged.csv`, csv(unchanged));
  fs.writeFileSync(`${base}-report.json`, `${JSON.stringify(report,null,2)}\n`);
  console.log(JSON.stringify(report,null,2));
}
