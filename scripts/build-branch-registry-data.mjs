import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const config = JSON.parse(fs.readFileSync(path.join(root, "sources.local.json"), "utf8"));
const notesSource = config.sources.find((source) => source.id === "robohelp-research-notes");
const originalSource = config.sources.find((source) => source.id === "original-cds");

const familySearch104168 = [
  ["Cardiff", "Items 1-6", "ca. 1846-1947"],
  ["Cefncoedycymer", "Item 7", "1847-1864"],
  ["Coalbrook Vale", "Item 8", "ca. 1856-1867"],
  ["Cogan", "Item 9", "ca. 1848-1876"],
  ["Crumlin", "Item 10", "ca. 1857-1862"],
  ["Cuffern Mountain", "Item 11", "1849-1876"],
  ["Cwmcillyn", "Item 12", "1847-1856"],
  ["Cwmbran", "Item 13", "1850-1874"],
  ["Llanelltud", "Item 13", "1850-1874"],
  ["Treorchy", "Item 13", "1875-1882"],
];
const familySearch104172 = [
  ["Treboeth", "Item 1", "1844-1880"],
  ["Tredegar", "Items 2-3", "ca. 1844-1883"],
  ["Treforest", "Item 4", "1851-1873"],
  ["Morriston", "Item 5", "1853-1868"],
  ["Treorchy", "Item 6", "1875-1882"],
  ["Trinant", "Item 6", "ca. 1849-1853"],
  ["Rhymney English", "Items 7-8", "1851-1883"],
  ["Twyncarno", "Items 7-8", "1851-1883"],
  ["Twyn-yr-Odyn", "Items 9-10", "1847-1901"],
  ["Welsh Conference", "Item 11", "ca. 1850-1922"],
  ["Ystrad", "Item 12", "ca. 1885-1911"],
];

const cdIndex = [
  ["Dinas", "1848-1879", "LR 182 7", "1"], ["Castell Nedd", "1879-1884", "LR 196 7", "2"],
  ["Alltwen", "1849-1859", "LR 225 7", "3"], ["Brechfa", "1846-1875", "LR 11000 7", "4"],
  ["Tredegar", "1844-1876", "LR 164 7", "5"], ["Cuffern Mountain", "1849-1876", "LR 198 7", "6"],
  ["Gilwern", "1849-1858", "LR 13987 7", "7"], ["Cwmtillery", "1847-1862", "LR 188 7", "8"],
  ["Cymmer", "1850-1866", "LR 11152 23", "9"], ["Brynmawr", "1848-1868", "LR 215 7", "10"],
  ["Llanelli", "1847-1868", "LR 11757 7", "11"], ["Cefn Coed-y-Cymmer", "1847-1864", "LR 176 7", "12"],
  ["Bryntroedgam", "1847-1860", "LR 129 7", "13"], ["Llansawel (Carmarthenshire)", "1849-1855", "LR 221 7", "14"],
  ["Llanfabon", "1847-1869", "LR 168 7", "15"], ["Treboeth", "1844-1880", "LR 228 7", "16"],
  ["Pen-y-cae", "1844-1866", "LR 230 7", "17"], ["Llansawel (Glamorgan)", "1850-1889", "LR 11759 7", "18"],
  ["Cwm Celyn", "1851-1883", "LR 195 7", "19"], ["Rhymney", "1850-1887", "LR 12451 7", "20"],
  ["Cardiff", "1847-1876", "LR 1416 7", "21"], ["Llandebie", "1849-1886", "LR 113 7", "22"],
  ["Haverfordwest", "1847-1853", "LR 11343 21", "23"], ["Nantyglo", "1846-1867", "LR 174 7", "24"],
  ["Abersychan", "1849-1898", "LR 10468 7", "25"], ["Ebbw Vale", "1847-1864", "LR 9846 7", "26"],
  ["Dowlais", "1851-1872", "LR 128 7", "27"], ["Newport", "1848-1857; 1863-1866", "LR 6071 7", "28"],
  ["Merthyr Tydfil", "1843-1857; 1861-1896", "LR 5450 7", "29"], ["Treforest", "1853-1868", "LR 12886 7", "30"],
  ["Cogan", "1848-1876", "LR 109 7", "31"], ["Swansea", "1872-1879", "LR 8863 7", "32"],
  ["Twyn-yr-Odyn", "1852-1892", "LR 165 7", "33"], ["Llanelltyd", "1850-1882", "LR 172 7", "34"],
];

const aliases = new Map(Object.entries({
  "altwen": "Alltwen", "alltwen": "Alltwen",
  "briton ferry": "Britonferry", "britonferry": "Britonferry",
  "abersycan": "Abersychan", "abersychan": "Abersychan",
  "swansea": "Swansea",
  "castell nedd": "Castell Nedd (Neath)", "neath": "Castell Nedd (Neath)",
  "cefncoedycymer": "Cefn Coed-y-Cymmer", "cefncoed y cymar": "Cefn Coed-y-Cymmer", "cefn coed y cymmer": "Cefn Coed-y-Cymmer",
  "coalbrook vale": "Coalbrookvale", "coal brock vale": "Coalbrookvale", "coalbrookvale": "Coalbrookvale",
  "cog": "Cogan", "cogan": "Cogan",
  "cwm celin": "Cwm Celyn", "cwm celyn": "Cwm Celyn",
  "cwn tillery": "Cwmtillery", "cwmtillery": "Cwmtillery",
  "ebbrow vale": "Ebbw Vale", "ebbro vale": "Ebbw Vale", "ebbw vale": "Ebbw Vale",
  "ffestiniog": "Ffestiniog", "festiniog": "Ffestiniog",
  "brynmawr": "Brynmawr", "gwaen helygen": "Brynmawr",
  "gwernllwyn": "Dowlais", "dowlais": "Dowlais",
  "llanelly": "Llanelli", "llanelli": "Llanelli",
  "llanellyd": "Llanelltyd", "llanelltud": "Llanelltyd", "llanelltyd": "Llanelltyd",
  "cwm saerbren": "Cwm Saerbren", "cwmsaerbren": "Cwm Saerbren",
  "merthr tydfil": "Merthyr Tydfil", "merthry tydfil": "Merthyr Tydfil", "merthyr tydfil": "Merthyr Tydfil", "merthyr tudful": "Merthyr Tydfil",
  "nanty glo": "Nantyglo", "nantyglo": "Nantyglo",
  "pen y cae": "Pen-y-cae",
  "pen y darran": "Pen-y-Darran", "penydarran": "Pen-y-Darran",
  "gymmer": "Cymmer",
  "treboth": "Treboeth", "treboeth": "Treboeth",
  "treforis": "Treforest", "treforest": "Treforest",
  "treorky": "Treorchy", "treorchy": "Treorchy",
  "twynyrodyn": "Twyn-yr-Odyn", "twyn yr odyn": "Twyn-yr-Odyn",
  "twyn carno": "Twyncarno", "twyncarno": "Twyncarno",
}));

function baseName(raw) {
  return raw.replace(/\.(?:htm|html)$/i, "").replaceAll("_", " ").replace(/^\d+[-_]\s*/, "")
    .replace(/\s*\([^)]*\d{4}[^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
}
function key(raw) { return raw.toLowerCase().replace(/\bbranch\b/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
function canonical(raw) {
  const base = baseName(raw);
  const crossReference = base.match(/^(.+?)\s*\(see\s+(.+?)\)$/i);
  if (crossReference) return aliases.get(key(crossReference[1])) ?? crossReference[1].trim();
  const normalizedKey = key(base);
  const alias = aliases.get(normalizedKey);
  if (alias) return alias;
  if (/\bbranch\b/i.test(base)) return base.replace(/\s+branch\b/i, "").trim();
  return base;
}
function years(text) { return [...text.matchAll(/\b(1[6789]\d{2}|20\d{2})\b/g)].map((match) => Number(match[1])); }

const evidence = [];
function addEvidence(rawName, source, dateText = "", reference = "", sourceUrl = "", localPath = "", provenance = null) {
  const crossReference = baseName(rawName).match(/^(.+?)\s*\(see\s+(.+?)\)$/i);
  evidence.push({
    rawName, canonicalName: canonical(rawName),
    relatedBranch: crossReference ? canonical(crossReference[2]) : "",
    relationshipNote: crossReference ? `See ${crossReference[2].trim()} — possible rename, merger, transfer, or cross-reference; verify before classifying.` : "",
    source, dateText, reference, sourceUrl, localPath,
    ...(provenance ? { provenance } : {}),
  });
}

for (const [name, dateText, callNumber, cd] of cdIndex) addEvidence(name, "2007 CD branch index", dateText, `CD ${cd}; ${callNumber}`, "", originalSource?.path ?? "");

addEvidence("Brechfa", "Recovered full-resolution local source", "1846-1875", "CD 4; LR 11000 7; 62 authoritative images", "", originalSource?.path ?? "");
addEvidence("Cuffern Mountain", "Recovered full-resolution local source", "1849-1876", "CD 6; LR 198 7; 83 authoritative historical images", "", originalSource?.path ?? "");
addEvidence("Dinas", "Recovered full-resolution local source", "1848-1878", "CD 1; LR 182 7; source image/catalog prefix 1555; 66 authoritative images", "", originalSource?.path ?? "", {
  collectionTitle: "Dinas Branch Record of Members, 1848-1878",
  filename: "1555__M_00001.jpg",
  viewerSequence: 1,
  collectionBranch: "Dinas",
  lrContext: "Project/recovered-folder reference LR 182 7; retained source-image prefix 1555.",
  note: "The cover says 1848-1878 while the inherited project/indexing range says 1848-1879. No inspected membership entry or annotation establishes 1879. Introductory Welsh narrative ends with apparent Cymer Branch wording and is preserved as possible branch evidence.",
});
addEvidence("Brynmawr", "Recovered full-resolution local source", "1848-1868", "CD 10; LR 215 7; 93 authoritative images", "", originalSource?.path ?? "");
addEvidence("Gwaen Helygen", "Original CD contents description", "1848-1868", "Historical/source name for Brynmawr", "", originalSource?.path ?? "");
addEvidence("Cog", "Recovered full-resolution local source", "1848-1876", "CD 31; LR 109 7; 68 authoritative images; historical/source name for Cogan", "", originalSource?.path ?? "");
addEvidence("Cefncoed-y-Cymar", "Recovered full-resolution local source", "1847-1864", "CD 12; LR 176 7; 109 authoritative images; historical/source spelling for Cefn Coed-y-Cymmer", "", originalSource?.path ?? "");

// Preserve the source/indexing-map spelling without creating a duplicate branch.
addEvidence("Altwen", "Local LR2257 membership register", "1849-1859", "LR 225 7; historical/source spelling of Alltwen", "", originalSource?.path ?? "");

// Names appearing in the 2007 meeting-transcription checklist. These are
// additional local-record evidence, not proof that each was an independent
// branch throughout the whole date range.
const meetingChecklist = [
  ["Briton Ferry", "1850-1853", "LR 11759 7; explicit Briton Ferry section, pages 43-46, in compound Llansawel/Swansea/Briton Ferry volume"],
  ["Pen-y-Darran", "", "CD 36; two-page baptism list"],
  ["Gymmer", "1852-1857; 1863", "CD 59; meeting transcription checklist"],
  ["Stepaside", "1848-1860", "CD 44; LR 12727 11; membership records 1848-1857; historical record and general minutes 1858-1860"],
  ["Sutton Mountain", "1853-1859", "CD 56; LR 12770 11; membership register 1853-1859; historical record and branch minutes 1853-1855"],
  ["Swansea", "1852-1854", "CD 61; general minutes"],
  ["Pontypool", "1857-1884", "CD 62; general minutes"],
  ["Abersychan", "1889", "CD 62; general minutes"],
];
for (const [name, dateText, reference] of meetingChecklist) {
  addEvidence(name, "2007 meeting transcription checklist", dateText, reference, "", originalSource?.path ?? "");
}

// The surviving book title uses the anglicized single-F spelling. Preserve it
// as a visible historical variant of the Welsh double-F place name.
addEvidence("Festiniog", "Local membership record images", "", "Ffestiniog membership record book integrated into local archive; surviving title uses Festiniog; 94 unique viewer images");

// Structural labels in the Llanelltyd volume identify three record groups.
// Internal page numbers are transcribed from the source label and are not
// assumed to be the same as viewer image sequence numbers.
const llanelltydStructuralSource = {
  collectionTitle: "Llanelltyd, 1850-1882, LR1727",
  filename: "LR-1175710_v1574_M_00003.jpg",
  viewerSequence: 3,
  collectionBranch: "Llanelltyd",
  lrContext: "Enclosing Llanelltyd collection: LR 172 7",
};
addEvidence("Llanellyd", "Historical structural image", "", "CD 34; LR 172 7 compound volume", "", "", {
  ...llanelltydStructuralSource,
  internalPage: 1,
  note: "Historical spelling written on the volume index.",
});
addEvidence("Cwmsaerbren", "Historical structural image", "", "CD 34; LR 172 7 compound section; LR 11150 separate catalog reference not connected", "", "", {
  ...llanelltydStructuralSource,
  internalPage: 6,
  separateReference: "LR 11150",
  note: "Branch name attested inside the Llanelltyd volume. LR 11150 remains a separate catalog reference; no corresponding images are currently connected.",
});
addEvidence("Treorky", "Historical structural image", "", "CD 34; LR 172 7 compound section", "", "", {
  ...llanelltydStructuralSource,
  internalPage: 25,
  note: "Historical spelling of Treorchy written on the volume index; not associated with Troedyrhiw.",
});

// Keep the three identifiers preserved rather than silently normalizing the
// CD-folder/catalog label over the conflicting image filename prefix.
addEvidence("Llanelli", "Recovered CD 11 source labels", "1847-1868", "CD 11; source label 1577; recovered folder LR 11757 7; filename prefix LR 12451 7 (unresolved conflict)", "", originalSource?.path ?? "", {
  collectionTitle: "Llanelly Branch Record of Members, 1847-1868",
  filename: "LR 12451 7_00001.jpg",
  viewerSequence: 1,
  collectionBranch: "Llanelli",
  lrContext: "Internal source labels say 1577; recovered CD folder says LR 11757 7; all 138 retained filenames say LR 12451 7.",
  note: "The 138-image run is one continuous physical volume and is not checksum-duplicated from the Rhymney collection. The filename/catalog identifier conflict remains unresolved.",
});

if (notesSource) {
  const branchesPath = path.join(notesSource.path, "Branches");
  for (const entry of fs.readdirSync(branchesPath, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.html?$/i.test(entry.name) || /^(INTRO|First_Missionaries|Mixed_)/i.test(entry.name)) continue;
    // This empty draft placeholder is not evidence for the date coverage shown
    // on the Merthyr Tydfil branch page. Preserve the source file outside the
    // registry so it can be reviewed and placed separately later.
    if (entry.name === "Merthyr_Tydfil_(1932-1943).htm") continue;
    const rawName = entry.name.replace(/\.html?$/i, "").replaceAll("_", " ");
    addEvidence(rawName, "Recovered RoboHelp branch note", years(rawName).join("-"), "Wales2Utah research note", "", path.join(branchesPath, entry.name));
  }
}

for (const [name, item, dateText] of familySearch104168) addEvidence(name, "FamilySearch catalog", dateText, `Film 104168 ${item}`, "https://www.familysearch.org/search/catalog/results?query=film_number%3A104168");
for (const [name, item, dateText] of familySearch104172) addEvidence(name, "FamilySearch catalog", dateText, `Film 104172 ${item}`, "https://www.familysearch.org/search/catalog/results?query=film_number%3A104172");
addEvidence("Llansawel", "FamilySearch catalog", "1849-1855; 1850-1853; 1879", "Film 104169 items 14-15", "https://www.familysearch.org/search/catalog/209087");
addEvidence("Sutton Mountain", "FamilySearch catalog", "1853-1859", "Film 104171 item 6", "https://www.familysearch.org/search/catalog/results?query=film_number%3A104171");

const grouped = Map.groupBy(evidence, (item) => item.canonicalName);
const registry = [...grouped.entries()].map(([canonicalName, entries]) => {
  const allYears = entries.flatMap((entry) => years(`${entry.rawName} ${entry.dateText}`));
  const variants = [...new Set(entries.map((entry) => baseName(entry.rawName)).filter((name) => name !== canonicalName))];
  const localCd = entries.some((entry) => ["2007 CD branch index", "2007 meeting transcription checklist", "Historical structural image"].includes(entry.source));
  const localNote = entries.some((entry) => entry.source === "Recovered RoboHelp branch note");
  const familySearch = entries.some((entry) => entry.source === "FamilySearch catalog");
  let comparisonStatus = "Research note only";
  if (familySearch && localCd) comparisonStatus = "Matched: FamilySearch and local CD";
  else if (familySearch && !localCd) comparisonStatus = "FamilySearch only / locate local record";
  else if (!familySearch && localCd) comparisonStatus = "Local CD only / verify with FamilySearch";
  else if (entries.some((entry) => entry.source === "Historical structural image")) comparisonStatus = "Historical source attestation; dedicated record collection not yet identified";
  if (["Brechfa", "Brynmawr", "Cogan", "Cefn Coed-y-Cymmer", "Cuffern Mountain", "Dinas"].includes(canonicalName)) comparisonStatus = "Verified local source collection";
  if (canonicalName === "Llanelltyd") comparisonStatus = "Verified compound local source collection";
  if (canonicalName === "Cwm Saerbren") comparisonStatus = "Compound local source section located; dedicated LR 11150 images not connected";
  if (canonicalName === "Treorchy") comparisonStatus = "Compound local source section located";
  const entityType = /conference/i.test(canonicalName) ? "Conference" : "Branch";
  return {
    canonicalName, entityType, variants: variants.join("; "),
    earliestYear: allYears.length ? Math.min(...allYears) : null,
    latestYear: allYears.length ? Math.max(...allYears) : null,
    localCd, localNote, familySearch, comparisonStatus,
    filmAndCallNumbers: canonicalName === "Brechfa"
      ? "CD 4; LR 11000 7; 62 authoritative full-resolution images"
      : canonicalName === "Brynmawr"
      ? "CD 10; LR 215 7; 93 authoritative full-resolution images"
      : canonicalName === "Cogan"
      ? "CD 31; LR 109 7; 68 authoritative full-resolution images; source heading Cog"
      : canonicalName === "Cefn Coed-y-Cymmer"
      ? "CD 12; LR 176 7; 109 authoritative full-resolution images; source forms Cefncoed-y-Cymar and Cefncoedycymer"
      : canonicalName === "Cuffern Mountain"
      ? "CD 6; LR 198 7; 83 authoritative historical images"
      : canonicalName === "Dinas"
      ? "CD 1; LR 182 7; source image/catalog prefix 1555; 66 authoritative full-resolution images; cover states 1848-1878"
      : [...new Set(entries.map((entry) => entry.reference).filter(Boolean))].join("; "),
    relatedBranches: [...new Set(entries.map((entry) => entry.relatedBranch).filter(Boolean))].join("; "),
    relationshipNotes: [...new Set(entries.map((entry) => entry.relationshipNote).filter(Boolean))].join("; "),
    notes: comparisonStatus.includes("only") ? "Needs human review; absence from one source is not proof the branch or record was absent." : "",
    sourceUrls: [...new Set(entries.map((entry) => entry.sourceUrl).filter(Boolean))].join("; "),
    nameSources: entries.filter((entry) => entry.provenance).map((entry) => ({
      sourceName: baseName(entry.rawName),
      ...entry.provenance,
    })),
  };
}).sort((a, b) => a.canonicalName.localeCompare(b.canonicalName, "en", { sensitivity: "base" }));

fs.mkdirSync(path.join(root, "data"), { recursive: true });
const output = { generatedAt: new Date().toISOString(), registry, evidence };
fs.writeFileSync(path.join(root, "data", "branch-registry.json"), JSON.stringify(output, null, 2), "utf8");
fs.writeFileSync(path.join(root, "data", "branch-registry.js"), `window.WELSH_BRANCH_REGISTRY = ${JSON.stringify(output)};\n`, "utf8");

function csvCell(value) { const text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value); return `"${text.replaceAll('"', '""')}"`; }
const headers = Object.keys(registry[0]);
const csv = [headers.map(csvCell).join(","), ...registry.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\r\n");
fs.writeFileSync(path.join(root, "BRANCH_REGISTRY.csv"), `${csv}\r\n`, "utf8");
console.log(JSON.stringify({ branchesAndEntities: registry.length, evidenceRows: evidence.length }, null, 2));
