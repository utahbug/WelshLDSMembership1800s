import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const priv = path.join(root, "data", "private");
const q = (value) => /[",\r\n]/.test(String(value ?? ""))
  ? `"${String(value ?? "").replaceAll('"', '""')}"`
  : String(value ?? "");
const writeCsv = (relativePath, headers, rows) => fs.writeFileSync(
  path.join(root, relativePath),
  `${headers.join(",")}\n${rows.map((row) => headers.map((header) => q(row[header])).join(",")).join("\n")}\n`,
  "utf8",
);

const headers = [
  "nameAsWritten", "aliases", "branch", "sourceBranchSpelling", "baptismDate", "residence",
  "entryNumber", "imageFilename", "pageNumber", "occurrenceType", "nameConfidence",
  "baptismDateConfidence", "residenceConfidence", "reviewStatus", "sourceType", "sourceGroupId",
  "alternateImageFilenames", "reviewNotes",
];

const branches = {
  Machen: {
    slug: "machen",
    sourceSpelling: "Machen",
    aliases: [],
    folder: "resources/source-cds/Machen,1854-1865,Library1565-or-1765",
    image: (page) => `Machen-pdf-page-${String(page).padStart(3, "0")}.jpg`,
    sourceAuthority: "Direct-FHC microfilm PDF fallback; the original PDF remains unchanged.",
    sourceReference: "Library identifier discrepancy 1565 versus 1765; both readings retained pending resolution.",
    rows: [],
  },
  Twyncarno: {
    slug: "twyncarno",
    sourceSpelling: "Twyn Carno",
    aliases: ["Twyn Carno"],
    folder: "resources/source-cds/Twyncarno,1856-1857,Library1602",
    image: (frame) => `Twyn-Carno-FHC104171-${frame}-pdf-page-001.jpg`,
    sourceAuthority: "Direct-FHC microfilm captures 314-338; original one-page PDFs remain unchanged.",
    sourceReference: "Library 1602; frames 307 and 313 were not recovered; frames 308-312 are excluded adjacent context.",
    rows: [],
  },
};

function add(branch, pageOrFrame, groupId, entries) {
  const info = branches[branch];
  for (const entry of entries) {
    const [entryNumber, nameAsWritten, status = "clear", baptismDate = "", residence = "", notes = "", aliases = ""] = entry;
    info.rows.push({
      nameAsWritten,
      aliases,
      branch,
      sourceBranchSpelling: info.sourceSpelling,
      baptismDate,
      residence,
      entryNumber: String(entryNumber ?? ""),
      imageFilename: info.image(pageOrFrame),
      pageNumber: "",
      occurrenceType: "member",
      nameConfidence: status === "clear" ? "clear" : "uncertain",
      baptismDateConfidence: baptismDate ? "clear" : "not captured",
      residenceConfidence: residence ? "clear" : "not captured",
      reviewStatus: status,
      sourceType: "local recovered full-resolution membership register",
      sourceGroupId: groupId,
      alternateImageFilenames: "",
      reviewNotes: notes,
    });
  }
}

// Machen original register. Opposite/continuation leaves are preserved in the viewer but are not duplicate rows.
add("Machen", 1, "machen-original-register", [
  [1, "David Thomas Jones"], [2, "James G. Turner"], [3, "Richard Pierce"], [4, "Margaret Pierce"],
  [5, "William Watkins"], [6, "Rachael Jones"], [7, "Thomas Edmund"], [8, "Anne Jones"],
  [9, "Abraham Williams"], [10, "David Pierce"], [11, "Richard Morgan"],
]);
add("Machen", 3, "machen-original-register", [
  [12, "Rebecca Morgan"], [13, "William Morgan"], [14, "Elizabeth Jones"], [15, "William Williams"],
  [16, "Jane Jones"], [17, "Mary Anne Morgan"], [18, "Abraham Watson"], [19, "Ephraim Morgan"],
  [20, "George Conner"], [21, "Mary Anne Conner"], [22, "Charlotte Williams"],
]);

// Separately headed 1857 reformation register. These are distinct historical occurrences.
add("Machen", 5, "machen-reformation-register", [
  [1, "George Conner", "clear", "April 11, 1857", "Machen"],
  [2, "Abraham Watson", "clear", "April 11, 1857", "Machen"],
  [3, "Ephraim Morgan", "clear", "April 11, 1857", "Machen"],
  [4, "Charlotte Williams", "clear", "April 11, 1857", "Machen"],
  [5, "Mary Anne Conner", "clear", "April 24, 1857", "Machen"],
  [6, "Amy Smith", "clear", "April 24, 1857", "Machen"],
  [7, "James G. Conner", "needs manual review", "May 28, 1857", "Machen", "The source contains a corrected/alternate surname form in this row; retain for manual confirmation."],
  [8, "Elizabeth Conner", "clear", "Sept. 2, 1857", "Machen"],
  [9, "Elizabeth Hayrock", "clear", "Oct. 14, 1857", "Machen"],
]);
add("Machen", 7, "machen-reformation-register", [
  [10, "Emma Hayrock"], [11, "Elizabeth Williams"], [12, "Mary Anne Morgan"],
  [13, "Emmanuel Morgan Elias", "needs manual review", "", "", "The final name element and row alignment require confirmation."],
  [15, "Elizabeth Conner"],
]);
add("Machen", 7, "machen-reformation-register", [
  [21, "Margaret Smith"], [22, "James Richard"], [23, "William Richard"],
  ["", "George Conner"], ["", "Sarah Smith"], ["", "James John"], ["", "Harriet Richard"],
  ["", "Charlotte Williams"],
]);

// Twyn Carno member-name leaves. Opposite leaves contain continuation/status fields.
add("Twyncarno", 318, "twyn-carno-register", [
  [1, "Catharine Davies"], [2, "Morgan", "needs manual review", "", "", "Only one name element is clearly visible."],
  [3, "James Jones"], [4, "William Jones"], [5, "Mary Morgan"], [6, "Eleanor Morgan"],
  [7, "Ann Bone"], [8, "David Bone Junr"], [9, "David Bone Senr"], [10, "John Lewis"],
  [11, "Mary Davies"], [12, "Mary Jones"], [13, "Gwen Morgan", "needs manual review", "", "", "Given-name reading requires confirmation."],
]);
add("Twyncarno", 320, "twyn-carno-register", [
  [13, "Sophia Rees"], [14, "Jane Jones"], [15, "Joseph Jones"], [16, "David John Jones"],
  [17, "David Edwards"], [18, "Harrish Rees", "needs manual review", "", "", "Given-name spelling requires confirmation."],
  [19, "William Bone"], [20, "William Phelps"], [21, "John Morgan"], [22, "John Evans"],
  [23, "Elizabeth John"], [24, "Sarah Jones"],
]);
add("Twyncarno", 322, "twyn-carno-register", [
  [25, "Cordelia Robert", "needs manual review", "", "", "Surname may be Robert or Roberts."],
  [26, "Elizabeth Price"], [27, "Samuel Jones"], [28, "Ann Jones"], [29, "Mary Morgan"],
  [30, "Jane Matthews"], [31, "William Williams"], [32, "William Williams"], [33, "Ann Thomas"],
  [34, "Thomas Evans"], [35, "Ann Evans"], [36, "Ann Jones"],
]);
add("Twyncarno", 324, "twyn-carno-register", [
  [37, "Fanny Jones"], [38, "Wm Williams"], [39, "Henry Matthews"], [40, "Dd Davies"],
  [41, "Eliz Hopkins"], [42, "El Hanlyn", "needs manual review", "", "", "Surname is faint and requires confirmation."],
  [43, "Margt Davies"], [44, "Cath Morgan"], [45, "Dd Jenkins"], [46, "Margt Jenkins"],
  [47, "Rachel Beddoe"], [48, "Johanna Jones"], [49, "Eliz Bone"],
]);
add("Twyncarno", 326, "twyn-carno-register", [
  [51, "Ann Davies"], [52, "Ellen Morgan Edwards", "needs manual review", "", "", "Multiple written name elements require row-level confirmation."],
  [53, "Mary Harris"], [54, "Ellen John"], [55, "Mary Morris"], [56, "Rachel Rees"],
  [57, "John Brooker"], [58, "John Walters"], [59, "Mary Francis"], [60, "Emma Francis"],
  [61, "Mary Francis"], [62, "John Jenkins"], [63, "Margaret Davies"],
]);
add("Twyncarno", 328, "twyn-carno-register", [
  [64, "John Evans"], [65, "Jane Morgan"], [66, "Margt Morgan"], [67, "Wm Rosser"],
  [68, "Chas Rosser"], [69, "Henrietta Gwen", "needs manual review", "", "", "Name reading requires confirmation."],
  [70, "Joseph Gwen", "needs manual review", "", "", "Surname reading requires confirmation."],
  [71, "Thomas Francis"], [72, "Elizabeth Francis"], [73, "Susannah Francis"], [74, "Martha Francis"],
  [75, "Wm Hopkins"], [76, "Mary Jenkins"],
]);
add("Twyncarno", 330, "twyn-carno-register", [
  [77, "John Bone"], [78, "Mary Husband"], [79, "Ann Husband"], [80, "Ann Morgan"],
  [81, "Margt Morgan"], [82, "John R. Roberts"],
  [83, "John Jones alias Llewellyn", "needs manual review", "", "", "Alias and surname alignment require confirmation."],
  [84, "John Price alias Llewellyn", "needs manual review", "", "", "Alias and surname alignment require confirmation."],
  [85, "Ann Davies alias Edwards", "needs manual review", "", "", "Alias and surname alignment require confirmation."],
  [86, "John Evans", "needs manual review", "", "", "The row is crossed/annotated."],
  [87, "Deborah Monday", "needs manual review", "", "", "Surname reading requires confirmation."],
  [88, "Jane Hopkins"], [89, "Thomas Evans"],
]);
add("Twyncarno", 332, "twyn-carno-register", [
  [90, "Ann", "needs manual review", "", "", "Surname is not defensibly readable."], [91, "Elizabeth Evans"],
  [92, "John Williams", "needs manual review", "", "", "Crossed/overwritten row requires confirmation."],
  [93, "Wm John"], [94, "Jas Thomas"], [95, "Morgan Thomas"], [96, "Mary Ann Bone"],
  [97, "Phoebe Jane", "needs manual review", "", "", "Only two name elements are clearly visible; surname status requires review."],
  [98, "John Beynon"], [99, "Geo Roberts"], [100, "David Jones"], [102, "Wm Hughes"], [103, "Hannah Hughes"],
]);
add("Twyncarno", 334, "twyn-carno-register", [
  [104, "Mary Davies"], [105, "Wm Davies"], [106, "Wm Jones"], [107, "Dd Lewis"],
  [108, "Eliza Roberts"], [109, "Eliza Francis"], [110, "Dd Edwards Junr"], [111, "Susan Harding"],
  [112, "Samuel Morgan"], [113, "Wm Owen"], [114, "Jane Lewis"], [115, "Jane James"],
  [116, "John", "needs manual review", "", "", "Crossed surname is not defensibly readable."],
]);
add("Twyncarno", 336, "twyn-carno-register", [
  [116, "Isaac Williams", "needs manual review", "", "", "Given name and repeated entry number require confirmation."],
  [117, "James Walters"], [118, "John Walters"], [119, "Evans", "needs manual review", "", "", "Given name is not defensibly readable."],
  [120, "Thos Carter"], [121, "Thos Hellin"], [122, "Wm Richards"], [123, "Betsy Richards"],
  [124, "Mary Dyer"], [125, "Ann Carter"], [126, "Wm Dyer"], [127, "Richard Brittle"], [128, "Mary Ann Brookes"],
]);
add("Twyncarno", 338, "twyn-carno-register", [
  [129, "Geo Cutcliffe"], [130, "Mary Ann Cutcliffe"], [131, "Evan Machain", "needs manual review", "", "", "Surname reading requires confirmation."],
  [132, "Wm Hallen"], [133, "John Hughes"], [134, "Chas E. Cutliffe"], [135, "Susan Allen"],
  [136, "George Dyer"], [137, "Gwenllian Morgan"], [138, "Sarah Hughes"],
  [139, "Jane Beynon", "needs manual review", "", "", "Middle/alternate name marking requires confirmation."], [140, "Mary Ann Beynon"],
]);

const classificationHeaders = ["groupId", "recordType", "preferredEvidenceImage", "alternateOrContextImages", "membershipDisposition", "historicalTextDisposition", "notes"];
const classifications = {
  Machen: [
    { groupId: "MACHEN01", recordType: "original Record of Members", preferredEvidenceImage: branches.Machen.image(1), alternateOrContextImages: [2, 3, 4].map(branches.Machen.image).join(";"), membershipDisposition: "Extract defensible member rows", historicalTextDisposition: "Preserve paired continuation/status columns", notes: "Entries 1-22 on name-bearing pages 1 and 3; pages 2 and 4 carry the paired continuation fields." },
    { groupId: "MACHEN02", recordType: "separately headed reformation membership register", preferredEvidenceImage: branches.Machen.image(5), alternateOrContextImages: [6, 7, 8, 11, 12].map(branches.Machen.image).join(";"), membershipDisposition: "Extract clear member rows; retain ambiguous grouped additions for review", historicalTextDisposition: "Preserve paired ordinance/status fields", notes: "Independent 1857 register. Some later grouped additions do not align cleanly to a single numbered row." },
    { groupId: "MACHEN03", recordType: "Register of Children Blessed", preferredEvidenceImage: branches.Machen.image(9), alternateOrContextImages: branches.Machen.image(10), membershipDisposition: "Do not promote children, parents, or officiators as members", historicalTextDisposition: "Preserve as associated/historical material", notes: "Separate children-blessed register." },
    { groupId: "MACHEN04", recordType: "Register of Suspensions", preferredEvidenceImage: branches.Machen.image(13), alternateOrContextImages: "", membershipDisposition: "Do not create duplicate member occurrences from status-only rows", historicalTextDisposition: "Preserve disciplinary/status evidence", notes: "Status register, not a new membership sequence." },
    { groupId: "MACHEN05", recordType: "branch narrative/history", preferredEvidenceImage: branches.Machen.image(14), alternateOrContextImages: "", membershipDisposition: "Do not promote incidental names", historicalTextDisposition: "Preserve for future historical-text work", notes: "Narrative page." },
    { groupId: "MACHEN06", recordType: "title, catalog, index and structural frames", preferredEvidenceImage: branches.Machen.image(15), alternateOrContextImages: [16, 17, 18].map(branches.Machen.image).join(";"), membershipDisposition: "Do not promote", historicalTextDisposition: "Preserve provenance", notes: "The photographed evidence retains the unresolved Library 1565/1765 discrepancy." },
  ],
  Twyncarno: [
    { groupId: "TWYNCARNO01", recordType: "printed title and structural leaf", preferredEvidenceImage: branches.Twyncarno.image(314), alternateOrContextImages: "", membershipDisposition: "Do not promote", historicalTextDisposition: "Preserve provenance", notes: "First source-supported Twyn Carno frame." },
    { groupId: "TWYNCARNO02", recordType: "Twyn Carno narrative/history", preferredEvidenceImage: branches.Twyncarno.image(315), alternateOrContextImages: [316, 317].map(branches.Twyncarno.image).join(";"), membershipDisposition: "Do not promote incidental names", historicalTextDisposition: "Preserve for future historical-text work", notes: "Narrative/context immediately before the register." },
    { groupId: "TWYNCARNO03", recordType: "Record of Members", preferredEvidenceImage: branches.Twyncarno.image(318), alternateOrContextImages: Array.from({ length: 20 }, (_, i) => branches.Twyncarno.image(319 + i)).join(";"), membershipDisposition: "Extract defensible member rows from alternating name-bearing leaves", historicalTextDisposition: "Preserve opposite-leaf status/ordinance fields", notes: "Register frames 318-338. Frames 308-312 are excluded context; frames 307 and 313 were not recovered." },
  ],
};

for (const [branch, info] of Object.entries(branches)) {
  const stagingPath = `data/private/people-index-staging-${info.slug}-production.csv`;
  const reviewPath = `data/private/people-index-${info.slug}-review.csv`;
  const classificationPath = `data/private/people-index-${info.slug}-page-classification.csv`;
  const reportPath = `data/private/people-index-${info.slug}-production-report.json`;
  writeCsv(stagingPath, headers, info.rows);
  writeCsv(reviewPath, ["nameAsWritten", "branch", "imageFilename", "pageNumber", "reviewStatus", "reviewNotes", "sourceGroupId"], info.rows.filter((row) => row.reviewStatus !== "clear"));
  writeCsv(classificationPath, classificationHeaders, classifications[branch]);

  const sourceFilenames = fs.readdirSync(path.join(root, info.folder)).filter((name) => /\.jpg$/i.test(name)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const sourceFileCount = sourceFilenames.length;
  const clear = info.rows.filter((row) => row.reviewStatus === "clear");
  const report = {
    branch,
    sourceSpelling: info.sourceSpelling,
    generatedAt: "2026-08-12",
    sourceReference: info.sourceReference,
    sourceHistoricalPageCount: sourceFileCount,
    stagedOccurrences: info.rows.length,
    clearPromotableOccurrences: clear.length,
    manualReviewOccurrences: info.rows.length - clear.length,
    sourceAuthority: { primary: info.sourceAuthority, temporaryFilesRequired: false },
    outsideSourcesUsed: false,
  };
  fs.writeFileSync(path.join(root, reportPath), `${JSON.stringify(report, null, 2)}\n`);

  const config = JSON.parse(fs.readFileSync(path.join(priv, `branch-index-config-${info.slug}.json`), "utf8"));
  config.notes = `${clear.length} defensible member occurrences promoted; ${info.rows.length - clear.length} readings retained for manual review.`;
  config.sourceAuthority = { kind: "direct-FHC-microfilm-fallback", reason: info.sourceAuthority };
  config.outputs = { classification: classificationPath, staging: stagingPath, review: reviewPath, report: reportPath };
  config.sourceSegments = (config.sourceSegments || []).map((segment) =>
    segment.sourceFolder === info.folder ? { ...segment, filenames: sourceFilenames } : segment
  );
  fs.writeFileSync(path.join(priv, `branch-index-config-${info.slug}.json`), `${JSON.stringify(config, null, 2)}\n`);
}

const sourcePath = path.join(priv, "people-index-source.csv");
const sourceLines = fs.readFileSync(sourcePath, "utf8").replace(/^\uFEFF/, "").trimEnd().split(/\r?\n/);
const sourceHeaders = sourceLines[0].split(",");
const targetBranches = new Set(Object.keys(branches));
const parseCsv = (line) => {
  const result = []; let value = ""; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1; } else quoted = !quoted;
    } else if (character === "," && !quoted) { result.push(value); value = ""; } else value += character;
  }
  result.push(value); return result;
};
const kept = sourceLines.filter((line, index) => index === 0 || !targetBranches.has(parseCsv(line)[2]));
for (const [branch, info] of Object.entries(branches)) {
  for (const row of info.rows.filter((candidate) => candidate.reviewStatus === "clear")) {
    const sourceRow = {
      ...row,
      imageRef: "",
      notes: `${row.sourceGroupId}; ${info.sourceReference}${row.reviewNotes ? ` ${row.reviewNotes}` : ""}`,
      verified: "true",
    };
    kept.push(sourceHeaders.map((header) => q(sourceRow[header] ?? "")).join(","));
  }
}
fs.writeFileSync(sourcePath, `${kept.join("\n")}\n`);

console.log(JSON.stringify(Object.fromEntries(Object.entries(branches).map(([branch, info]) => [branch, {
  sourceImages: fs.readdirSync(path.join(root, info.folder)).filter((name) => /\.jpg$/i.test(name)).length,
  staged: info.rows.length,
  clear: info.rows.filter((row) => row.reviewStatus === "clear").length,
  review: info.rows.filter((row) => row.reviewStatus !== "clear").length,
}])), null, 2));
