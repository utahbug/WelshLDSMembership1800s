import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = path.resolve(import.meta.dirname, "..");
const data = JSON.parse(await fs.readFile(path.join(root, "data", "branch-registry.json"), "utf8"));
const outputDir = path.join(root, "outputs", "branch-registry");
await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
const master = workbook.worksheets.add("Master Registry");
const evidence = workbook.worksheets.add("Evidence Log");
const guidance = workbook.worksheets.add("How to Use");
workbook.comments.setSelf({ displayName: "User" });

const masterHeaders = ["Canonical name", "Entity type", "Known variants", "Earliest year", "Latest year", "Local CD index", "Recovered note", "FamilySearch catalog", "Comparison status", "Film / call numbers", "Related branch", "Relationship note", "Research notes", "Source URLs"];
master.getRange("A1:N1").values = [masterHeaders];
master.getRangeByIndexes(1, 0, data.registry.length, masterHeaders.length).values = data.registry.map((row) => [
  row.canonicalName, row.entityType, row.variants, row.earliestYear, row.latestYear,
  row.localCd ? "Yes" : "No", row.localNote ? "Yes" : "No", row.familySearch ? "Yes" : "No",
  row.comparisonStatus, row.filmAndCallNumbers, row.relatedBranches, row.relationshipNotes, row.notes, row.sourceUrls,
]);
master.tables.add(`A1:N${data.registry.length + 1}`, true, "BranchRegistryTable").style = "TableStyleMedium4";
master.freezePanes.freezeRows(1);
master.freezePanes.freezeColumns(1);
master.showGridLines = false;
master.getRange("A1:N1").format = { fill: "#285848", font: { bold: true, color: "#FFFFFF" }, wrapText: true, rowHeight: 34 };
master.getRange(`A2:N${data.registry.length + 1}`).format = { verticalAlignment: "top" };
master.getRange(`C2:C${data.registry.length + 1}`).format.wrapText = true;
master.getRange(`I2:N${data.registry.length + 1}`).format.wrapText = true;
master.getRange(`D2:E${data.registry.length + 1}`).format.numberFormat = "0";
const widths = [24, 13, 30, 12, 12, 13, 14, 16, 34, 30, 24, 48, 42, 44];
widths.forEach((width, index) => { master.getRangeByIndexes(0, index, data.registry.length + 1, 1).format.columnWidth = width; });
master.getRange(`I2:I${data.registry.length + 1}`).conditionalFormats.add("containsText", { text: "FamilySearch only", format: { fill: "#FDE9D9", font: { color: "#9C3D10" } } });
master.getRange(`I2:I${data.registry.length + 1}`).conditionalFormats.add("containsText", { text: "Local CD only", format: { fill: "#FFF2CC", font: { color: "#7F6000" } } });
master.getRange(`I2:I${data.registry.length + 1}`).conditionalFormats.add("containsText", { text: "Matched", format: { fill: "#E2F0D9", font: { color: "#285848" } } });

const evidenceHeaders = ["Raw name as found", "Proposed canonical name", "Related branch", "Relationship note", "Source", "Date text", "Film / call reference", "Source URL", "Local file path"];
evidence.getRange("A1:I1").values = [evidenceHeaders];
evidence.getRangeByIndexes(1, 0, data.evidence.length, evidenceHeaders.length).values = data.evidence.map((row) => [row.rawName, row.canonicalName, row.relatedBranch, row.relationshipNote, row.source, row.dateText, row.reference, row.sourceUrl, row.localPath]);
evidence.tables.add(`A1:I${data.evidence.length + 1}`, true, "BranchEvidenceTable").style = "TableStyleMedium4";
evidence.freezePanes.freezeRows(1);
evidence.showGridLines = false;
evidence.getRange("A1:I1").format = { fill: "#285848", font: { bold: true, color: "#FFFFFF" }, wrapText: true, rowHeight: 34 };
[28, 28, 24, 48, 25, 22, 28, 45, 55].forEach((width, index) => { evidence.getRangeByIndexes(0, index, data.evidence.length + 1, 1).format.columnWidth = width; });
evidence.getRange(`A2:I${data.evidence.length + 1}`).format = { verticalAlignment: "top", wrapText: true };

guidance.showGridLines = false;
guidance.getRange("A1:F1").merge();
guidance.getRange("A1").values = [["Welsh LDS Historical Branch Registry"]];
guidance.getRange("A1:F1").format = { fill: "#163C31", font: { bold: true, color: "#FFFFFF", size: 18 }, rowHeight: 38, verticalAlignment: "center" };
guidance.getRange("A3:F3").merge();
guidance.getRange("A3").values = [["Purpose: create a living record of every Welsh LDS branch name found, while preserving historical spellings and showing where sources disagree."]];
guidance.getRange("A3:F3").format = { fill: "#F4F0E6", font: { color: "#25241F", italic: true }, wrapText: true, rowHeight: 44 };
const instructions = [
  ["Principle", "How to apply it"],
  ["Preserve names as written", "Record the historical spelling in the Evidence Log. Do not silently replace it with a modern form."],
  ["Canonical names are finding aids", "A canonical name groups likely variants; it does not declare one historical spelling correct."],
  ["Treat absence cautiously", "FamilySearch-only and local-only flags identify research tasks, not proof that a branch or record did not exist."],
  ["Use the CDs as the image source", "The surviving CDs contain the fuller records. FamilySearch is used here to discover and preserve branch names, not to replace or duplicate the CD images."],
  ["Separate entities", "Branches, conferences, districts, and mixed-film headings should be identified by entity type."],
  ["Review uncertain aliases", "Cwm Celyn/Cwmcillyn, Cwmbran/Cwmsaerbren, and similar names require geographic or record-level verification."],
  ["Add evidence, not guesses", "Enter a source URL, film/item number, call number, disc number, or local file path for every added name."],
];
guidance.getRange(`A5:B${4 + instructions.length}`).values = instructions;
guidance.getRange("A5:B5").format = { fill: "#B48A3C", font: { bold: true, color: "#FFFFFF" } };
guidance.getRange(`A5:B${4 + instructions.length}`).format.wrapText = true;
guidance.getRange(`A5:A${4 + instructions.length}`).format.columnWidth = 26;
guidance.getRange(`B5:B${4 + instructions.length}`).format.columnWidth = 85;
guidance.getRange(`A5:B${4 + instructions.length}`).format.rowHeight = 34;

const masterCheck = await workbook.inspect({ kind: "table", sheetId: "Master Registry", range: `A1:N${Math.min(data.registry.length + 1, 20)}`, include: "values,formulas", tableMaxRows: 20, tableMaxCols: 14 });
console.log(masterCheck.ndjson);
const errorCheck = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 100 }, summary: "formula error scan" });
console.log(errorCheck.ndjson);

for (const sheetName of ["Master Registry", "Evidence Log", "How to Use"]) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(path.join(outputDir, `${sheetName.replaceAll(" ", "-").toLowerCase()}.png`), new Uint8Array(await preview.arrayBuffer()));
}
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(path.join(outputDir, "Welsh-LDS-Branch-Registry.xlsx"));
console.log(path.join(outputDir, "Welsh-LDS-Branch-Registry.xlsx"));
