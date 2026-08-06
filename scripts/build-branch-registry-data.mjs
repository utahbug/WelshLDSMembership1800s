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
  "gwernllwyn": "Dowlais", "dowlais": "Dowlais",
  "llanelly": "Llanelli", "llanelli": "Llanelli",
  "llanelltud": "Llanelltyd", "llanelltyd": "Llanelltyd",
  "merthr tydfil": "Merthyr Tydfil", "merthry tydfil": "Merthyr Tydfil", "merthyr tydfil": "Merthyr Tydfil", "merthyr tudful": "Merthyr Tydfil",
  "nanty glo": "Nantyglo", "nantyglo": "Nantyglo",
  "pen y cae": "Pen-y-cae",
  "pen y darran": "Pen-y-Darran", "penydarran": "Pen-y-Darran",
  "gymmer": "Cymmer",
  "treboth": "Treboeth", "treboeth": "Treboeth",
  "treforis": "Treforest", "treforest": "Treforest",
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
function addEvidence(rawName, source, dateText = "", reference = "", sourceUrl = "", localPath = "") {
  const crossReference = baseName(rawName).match(/^(.+?)\s*\(see\s+(.+?)\)$/i);
  evidence.push({
    rawName, canonicalName: canonical(rawName),
    relatedBranch: crossReference ? canonical(crossReference[2]) : "",
    relationshipNote: crossReference ? `See ${crossReference[2].trim()} — possible rename, merger, transfer, or cross-reference; verify before classifying.` : "",
    source, dateText, reference, sourceUrl, localPath,
  });
}

for (const [name, dateText, callNumber, cd] of cdIndex) addEvidence(name, "2007 CD branch index", dateText, `CD ${cd}; ${callNumber}`, "", originalSource?.path ?? "");

// Names appearing in the 2007 meeting-transcription checklist. These are
// additional local-record evidence, not proof that each was an independent
// branch throughout the whole date range.
const meetingChecklist = [
  ["Pen-y-Darran", "", "CD 36; two-page baptism list"],
  ["Gymmer", "1852-1857; 1863", "CD 59; meeting transcription checklist"],
  ["Stepaside", "1858-1860", "CD 44; LR 12727 11; general minutes"],
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

if (notesSource) {
  const branchesPath = path.join(notesSource.path, "Branches");
  for (const entry of fs.readdirSync(branchesPath, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.html?$/i.test(entry.name) || /^(INTRO|First_Missionaries|Mixed_)/i.test(entry.name)) continue;
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
  const localCd = entries.some((entry) => ["2007 CD branch index", "2007 meeting transcription checklist"].includes(entry.source));
  const localNote = entries.some((entry) => entry.source === "Recovered RoboHelp branch note");
  const familySearch = entries.some((entry) => entry.source === "FamilySearch catalog");
  let comparisonStatus = "Research note only";
  if (familySearch && localCd) comparisonStatus = "Matched: FamilySearch and local CD";
  else if (familySearch && !localCd) comparisonStatus = "FamilySearch only / locate local record";
  else if (!familySearch && localCd) comparisonStatus = "Local CD only / verify with FamilySearch";
  const entityType = /conference/i.test(canonicalName) ? "Conference" : "Branch";
  return {
    canonicalName, entityType, variants: variants.join("; "),
    earliestYear: allYears.length ? Math.min(...allYears) : null,
    latestYear: allYears.length ? Math.max(...allYears) : null,
    localCd, localNote, familySearch, comparisonStatus,
    filmAndCallNumbers: [...new Set(entries.map((entry) => entry.reference).filter(Boolean))].join("; "),
    relatedBranches: [...new Set(entries.map((entry) => entry.relatedBranch).filter(Boolean))].join("; "),
    relationshipNotes: [...new Set(entries.map((entry) => entry.relationshipNote).filter(Boolean))].join("; "),
    notes: comparisonStatus.includes("only") ? "Needs human review; absence from one source is not proof the branch or record was absent." : "",
    sourceUrls: [...new Set(entries.map((entry) => entry.sourceUrl).filter(Boolean))].join("; "),
  };
}).sort((a, b) => a.canonicalName.localeCompare(b.canonicalName, "en", { sensitivity: "base" }));

fs.mkdirSync(path.join(root, "data"), { recursive: true });
const output = { generatedAt: new Date().toISOString(), registry, evidence };
fs.writeFileSync(path.join(root, "data", "branch-registry.json"), JSON.stringify(output, null, 2), "utf8");
fs.writeFileSync(path.join(root, "data", "branch-registry.js"), `window.WELSH_BRANCH_REGISTRY = ${JSON.stringify(output)};\n`, "utf8");

function csvCell(value) { const text = value == null ? "" : String(value); return `"${text.replaceAll('"', '""')}"`; }
const headers = Object.keys(registry[0]);
const csv = [headers.map(csvCell).join(","), ...registry.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\r\n");
fs.writeFileSync(path.join(root, "BRANCH_REGISTRY.csv"), `${csv}\r\n`, "utf8");
console.log(JSON.stringify({ branchesAndEntities: registry.length, evidenceRows: evidence.length }, null, 2));
