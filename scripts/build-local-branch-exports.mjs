import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";
import JSZip from "jszip";
const root = path.resolve(import.meta.dirname, "..");
const output = path.resolve(process.argv[2] || path.join(root, "outputs/local-development"));
if (output === path.join(root, "full")) throw new Error("Refusing to write branch exports to /full/.");
const loadWindowData = async (file, key) => { const context = { window: {} }; vm.runInNewContext(await fs.readFile(file, "utf8"), context); return context.window[key]; };
const registry = (await loadWindowData(path.join(output, "data/branch-registry.js"), "WELSH_BRANCH_REGISTRY")).registry;
const catalog = await loadWindowData(path.join(output, "data/catalog.public.js"), "WELSH_RECORD_CATALOG");
const people = await loadWindowData(path.join(output, "data/beta/people-index.beta.js"), "WELSH_PEOPLE_BETA_INDEX");
const possibleBranchProvenance = JSON.parse(await fs.readFile(path.join(output, "data/possible-branch-provenance.json"), "utf8"));
const clean = (value) => String(value || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&ndash;|&#8211;/g, "–").replace(/\s+/g, " ").trim();
const normalize = (value) => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const years = (row) => row.earliestYear ? row.latestYear && row.latestYear !== row.earliestYear ? `${row.earliestYear}–${row.latestYear}` : String(row.earliestYear) : "";
const memberCounts = new Map();
for (const record of people.records.filter((row) => row.verified && row.occurrenceType === "member")) memberCounts.set(record.branch, (memberCounts.get(record.branch) || 0) + 1);
const collectionCount = (row) => { const names = [row.canonicalName, ...String(row.variants || "").split(";")].map(normalize).filter(Boolean); return catalog.collections.filter((collection) => { const title = normalize(collection.name); return names.some((name) => title === name || title.startsWith(`${name} `)); }).length; };
const canonical = registry.map((row) => ({ Branch: row.canonicalName, Years: years(row), Members: memberCounts.get(row.canonicalName) || "", "Record collections": collectionCount(row) || "", "Sources and Evidence": [row.filmAndCallNumbers, row.notes, ...(row.nameSources || []).map((item) => [item.collectionTitle, item.note].filter(Boolean).join(": "))].filter(Boolean).join("; "), "Leadership / Officers": row.leadershipOfficers || "", "Historical Names": row.variants || "", Status: row.comparisonStatus || row.entityType || "Canonical" }));
const groupLabels = new Map(possibleBranchProvenance.groups.map((group) => [group.id, group.heading]));
const possible = possibleBranchProvenance.candidates.map((candidate) => ({ Branch: candidate.candidateName, Years: "", Members: "", "Record collections": "", "Sources and Evidence": candidate.status, "Leadership / Officers": "", "Historical Names": "", Status: groupLabels.get(candidate.group) || "Possible branch under review" }));
if (canonical.length !== 97) throw new Error(`Expected 97 canonical branches; found ${canonical.length}.`);
if (!possible.length) throw new Error("No possible branches were parsed from the review panel.");
const exportDir = path.join(output, "exports"); await fs.mkdir(exportDir, { recursive: true });
await fs.writeFile(path.join(output, "data/branch-export-data.js"), `window.WELSH_BRANCH_EXPORT_DATA=${JSON.stringify({ canonical, possible })};\n`, "utf8");
const columns = ["Branch", "Years", "Members", "Record collections", "Sources and Evidence", "Leadership / Officers", "Historical Names", "Status"];
async function buildWorkbook(filename, groups) {
  const workbook = Workbook.create();
  for (const [sheetName, rows] of groups) {
    const sheet = workbook.worksheets.add(sheetName); sheet.showGridLines = false;
    const matrix = [columns, ...rows.map((row) => columns.map((column) => row[column] ?? ""))];
    sheet.getRangeByIndexes(0, 0, matrix.length, columns.length).values = matrix;
    const table = sheet.tables.add(`A1:H${matrix.length}`, true, `${sheetName.replace(/[^A-Za-z0-9]/g, "")}Branches`); table.style = "TableStyleMedium4"; table.showFilterButton = true;
    await sheet.freezePanes.freezeRows(1);
    sheet.getRange("A1:H1").format = { fill: "#285848", font: { bold: true, color: "#FFFFFF" }, wrapText: true, rowHeight: 32 };
    sheet.getRange(`A2:H${matrix.length}`).format = { verticalAlignment: "top", wrapText: true };
    [25, 13, 11, 17, 55, 34, 34, 34].forEach((width, index) => { sheet.getRangeByIndexes(0, index, matrix.length, 1).format.columnWidth = width; });
    sheet.getRange(`C2:D${matrix.length}`).format.numberFormat = "#,##0";
  }
  const inspect = await workbook.inspect({ kind: "table", sheetId: groups[0][0], range: `A1:H${Math.min(groups[0][1].length + 1, 12)}`, include: "values,formulas", tableMaxRows: 12, tableMaxCols: 8 });
  if (!inspect.ndjson.includes('"Branch"')) throw new Error(`${filename}: workbook inspection failed.`);
  const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 50 }, summary: "formula error scan" });
  if (/"count"\s*:\s*[1-9]/.test(errors.ndjson)) throw new Error(`${filename}: formula error found.`);
  for (const [sheetName] of groups) { const preview = await workbook.render({ sheetName, range: "A1:H12", scale: 1, format: "png" }); await fs.writeFile(path.join(exportDir, `${filename}-${sheetName}.png`), new Uint8Array(await preview.arrayBuffer())); }
  const outputFile = path.join(exportDir, filename);
  const file = await SpreadsheetFile.exportXlsx(workbook); await file.save(outputFile);
  // artifact-tool currently omits the serialized pane even after freezeRows(1).
  // Preserve the artifact-tool workbook and add only the missing OOXML view flag.
  const zip = await JSZip.loadAsync(await fs.readFile(outputFile));
  for (let index = 1; index <= groups.length; index += 1) {
    const sheetPath = `xl/worksheets/sheet${index}.xml`;
    let xml = await zip.file(sheetPath).async("string");
    if (!xml.includes('state="frozen"')) {
      xml = xml.replace(/<x:sheetView([^>]*)\/>/, '<x:sheetView$1><x:pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen" /></x:sheetView>');
    }
    zip.file(sheetPath, xml);
  }
  await fs.writeFile(outputFile, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}
await buildWorkbook("Welsh-LDS-Canonical-Branches.xlsx", [["Canonical", canonical]]);
await buildWorkbook("Welsh-LDS-Possible-Branches.xlsx", [["Possible", possible]]);
await buildWorkbook("Welsh-LDS-Branches-Canonical-and-Possible.xlsx", [["Canonical", canonical], ["Possible", possible]]);
for (const name of await fs.readdir(exportDir)) {
  if (name.endsWith(".inspect.ndjson") || name.endsWith(".xlsx-Canonical.png") || name.endsWith(".xlsx-Possible.png")) {
    await fs.rm(path.join(exportDir, name), { force: true });
  }
}
process.exitCode = 0;
console.log(JSON.stringify({ canonical: canonical.length, possible: possible.length, both: canonical.length + possible.length, output: exportDir }));
