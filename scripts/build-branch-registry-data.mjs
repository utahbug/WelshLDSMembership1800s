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
  ["Dinas", "1848-1879", "LR 182 7", "1"], ["Castell Nedd", "1849-1884", "LR 196 7", "2"],
  ["Alltwen", "1849-1859", "LR 225 7", "3"], ["Brechfa", "1846-1875", "LR 11000 7", "4"],
  ["Tredegar", "1844-1876", "LR 164 7", "5"], ["Cuffern Mountain", "1849-1876", "LR 198 7", "6"],
  ["Gilwern", "1849-1858", "LR 13987 7", "7"], ["Cwmtillery", "1847-1862", "LR 188 7", "8"],
  ["Cymmer", "1850-1866", "LR 11152 23", "9"], ["Brynmawr", "1848-1868", "LR 215 7", "10"],
  ["Llanelli", "1847-1868", "LR 11757 7", "11"], ["Cefn Coed-y-Cymmer", "1847-1864", "LR 176 7", "12"],
  ["Bryntroedgam", "1847-1860", "LR 129 7", "13"], ["Llansawel (Carmarthenshire)", "1849-1855", "LR 221 7", "14"],
  ["Llanfabon", "1847-1869", "LR1687", "15"], ["Treboeth", "1844-1880", "LR 228 7", "16"],
  ["Pen-y-cae", "1844-1866", "LR 230 7", "17"], ["Llansawel (Glamorgan)", "1850-1889", "LR 11759 7", "18"],
  ["Cwm Celyn", "1851-1883", "LR 195 7", "19"], ["Rhymney", "1850-1887", "LR 12451 7", "20"],
  ["Cardiff", "1847-1876", "LR 1416 7", "21"], ["Llandebie", "1849-1886", "LR 113 7", "22"],
  ["Haverfordwest", "1847-1860", "CR 11343 11 V.1; CR 11343 11 V.2", "23; 58"], ["Nantyglo", "1846-1867", "LR 174 7", "24"],
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
  "abertawe": "Swansea", "swansea": "Swansea",
  "castell nedd": "Castell Nedd (Neath)", "castellned": "Castell Nedd (Neath)", "neath": "Castell Nedd (Neath)",
  "cefncoedycymer": "Cefn Coed-y-Cymmer", "cefncoed y cymar": "Cefn Coed-y-Cymmer", "cefn coed y cymmer": "Cefn Coed-y-Cymmer",
  "coal brook vale": "Coalbrookvale", "coalbrook vale": "Coalbrookvale", "coal brock vale": "Coalbrookvale", "coalbrookvale": "Coalbrookvale",
  "cog": "Cogan", "cogan": "Cogan",
  "cwm celin": "Cwm Celyn", "cwm celyn": "Cwm Celyn",
  "cwn tillery": "Cwmtillery", "cwmtillery": "Cwmtillery",
  "ebbrow vale": "Ebbw Vale", "ebbro vale": "Ebbw Vale", "ebbw vale": "Ebbw Vale",
  "bryn": "Bryntroedgam", "bryn branch": "Bryntroedgam", "canghen y bryn": "Bryntroedgam",
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
  "pendoylan": "Pendoylon", "pendoylon": "Pendoylon",
  "overton": "Overton", "owrtyn": "Overton",
  "eglwysbach": "Eglwysbach", "eglwys bach": "Eglwysbach", "eglwys fach": "Eglwysbach",
  "aberaman": "Aberaman", "aberamman": "Aberaman", "aberamon": "Aberaman",
  "aberdare": "Aberdare", "aberdar": "Aberdare",
  "abergavenny": "Abergavenny", "abergyfeny": "Abergavenny", "y fenni": "Abergavenny",
  "hirwaun": "Hirwaun", "hirwaen": "Hirwaun",
  "pontrlanfraith": "Pontlanfraith", "pontlanfraith": "Pontlanfraith",
  "gymmer": "Cymmer",
  "treboth": "Treboeth", "treboeth": "Treboeth",
  "treforis": "Treforest", "treforest": "Treforest",
  "treorky": "Treorchy", "treorchy": "Treorchy",
  "twynyrodyn": "Twyn-yr-Odyn", "twyn yr odyn": "Twyn-yr-Odyn",
  "twyn carno": "Twyncarno", "twyncarno": "Twyncarno",
  "newmarket": "Newmarket", "trelawnyd": "Newmarket",
  "towyn": "Towyn", "tywyn": "Towyn",
  "st clears": "St Clears", "saint clears": "St Clears",
  "fleur de lis": "Fleur-de-Lis", "fleur-de-lis": "Fleur-de-Lis",
  "garnddiffaith": "Garndiffaith", "garndiffaith": "Garndiffaith",
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
addEvidence("Cwmtillery", "Recovered full-resolution local source", "1847-1857", "CD 8; LR 188 7; photographed library identifier 859; 69 authoritative full-resolution images", "", originalSource?.path ?? "", {
  collectionTitle: "Cwmtillery Branch Record of Members, 1847-1857",
  collectionBranch: "Cwmtillery",
  note: "The source heading supports 1847-1857 for the Record of Members. The broader inherited 1847-1862 range describes additional deaths, children and historical material and is not used as the membership-register range.",
});
addEvidence("Trinant", "Direct-FHC microfilm recovery", "1849-1853", "Photographed library identifier 859; compound PDF pages 4-5", "", originalSource?.path ?? "", {
  collectionTitle: "Trinant Branch surviving Record of Members page, 1849-1853",
  collectionBranch: "Trinant",
  note: "The Library 859 label identifies a Trinant Record of Members dated 1849-1853. Compound PDF page 5 preserves the closing register leaf, entries 19-29; entries 1-18 are not currently recovered. Candidate captures 294-295 are later member/status pages and captures 296-306 are Stepaside financial records, so they are retained as context but excluded from Trinant.",
});
addEvidence("Crumlin", "Direct-FHC microfilm recovery", "1857-1862", "Photographed library identifier 859; four bounded register frames within a nine-frame compound packet", "", originalSource?.path ?? "", {
  collectionTitle: "Crumlin Branch Record of Members, 1857-1862",
  collectionBranch: "Crumlin",
  note: "PDF pages 6-9 contain the Crumlin register. Pages 1-4 are structural/catalog frames and page 5 closes the preceding Trinant section.",
});
addEvidence("Machen", "Direct-FHC microfilm recovery", "1854-1865", "18 recovered PDF frames; photographed identifier unresolved as 1565 versus 1765", "", originalSource?.path ?? "", {
  collectionTitle: "Machen Branch Record of Members, 1854-1865",
  collectionBranch: "Machen",
  note: "The local PDF is a documented direct-FHC fallback. The photographed/library identifier discrepancy 1565 versus 1765 remains unresolved.",
});
addEvidence("Twyn Carno", "Direct-FHC microfilm recovery", "1856-1857", "Captures 314-338; photographed library identifier 1602; 25 retained source frames", "", originalSource?.path ?? "", {
  collectionTitle: "Twyn Carno Branch Record, 1856-1857",
  collectionBranch: "Twyncarno",
  note: "The retained branch section begins with the printed/narrative source at capture 314; the regular register begins at capture 318. Earlier captures 308-312 belong to adjacent context, and captures 307 and 313 were not found.",
});
addEvidence("Welsh Conference", "Recovered direct-FHC microfilm components", "1850-1922", "Film 104172 item 11 context; Library 1614 early-1892; Library 3114 1887-1901; Library 3118 early-1911 partial capture; LR1001123 incomplete minutes, 1884", "", originalSource?.path ?? "", {
  collectionTitle: "Welsh Conference records and minutes",
  collectionBranch: "Welsh Conference",
  note: "Three distinct member books and a separate 1884 minutes fragment survive locally. Library 3118 is incomplete after direct-FHC component 474. The Film 86987 convenience PDF includes Bristol Conference material and is not treated as a single Welsh Conference source.",
});
addEvidence("Cwmcillyn", "2026 bounded local recovery audit", "1847-1856", "Film 104168 Item 12; no matching local image or PDF packet located", "", "", {
  collectionTitle: "Cwmcillyn Branch source attestation",
  collectionBranch: "Cwmcillyn",
  note: "Checked project source CDs, recovered CD copies, Microfilm PDFs/direct-FHC component holdings, manifests, catalogs, and legacy Wales2Utah material. The source remains historically attested, but no authoritative local image collection was found.",
});
addEvidence("Pendoylon", "2026 bounded local recovery audit", "1851-1886", "DGS 106248102; indexing images 195-239; no matching local image or PDF packet located", "", "", {
  collectionTitle: "Pendoylon Branch source attestation",
  collectionBranch: "Pendoylon",
  note: "The indexing map identifies images 195-239 and preserves Pendoylan as a source spelling. Project source CDs, recovered CD copies, Microfilm PDFs/direct-FHC holdings, manifests, catalogs, and typed sources yielded no matching authoritative local collection.",
});
addEvidence("Llansawel (Carmarthenshire)", "Recovered full-resolution local source", "1849-1855", "CD 14; LR 221 7; photographed library identifier 318; 28 authoritative images", "", originalSource?.path ?? "", {
  collectionTitle: "Llansawel Branch Record of Members, 1849-1855",
  filename: "318__M_00002.jpg",
  viewerSequence: 2,
  collectionBranch: "Llansawel (Carmarthenshire)",
  lrContext: "CD 14 / LR 221 7; photographed library identifier 318.",
  note: "Dedicated register. Member residences and the CD assignment support the Carmarthenshire identity; it is distinct from the later Glamorgan section in LR 11759 7.",
});
addEvidence("Llansawel (Glamorgan)", "Recovered full-resolution compound source section", "1850-1889", "CD 18; LR 11759 7; explicit images 00009-00048; 40 authoritative in-place images", "", originalSource?.path ?? "", {
  collectionTitle: "Llansawel Branch Record, 1850-1889",
  filename: "LR-11759-7_v1575_M_00009.jpg",
  viewerSequence: 1,
  collectionBranch: "Llansawel (Glamorgan)",
  lrContext: "CD 18 / LR 11759 7 compound Swansea-related volume.",
  note: "The photographed heading explicitly identifies Glamorgan. The Llansawel section is images 00009-00048; Swansea resumes at image 00049.",
});
addEvidence("Pontlanfraith", "Direct-FHC microfilm recovery", "Early to 1947", "10-page source packet; photographed library identifier 27560", "", originalSource?.path ?? "", {
  collectionTitle: "Pontlanfraith Branch Record of Members and Children",
  collectionBranch: "Pontlanfraith",
  note: "Mixed members-and-children record. Source spelling Pontrlanfraith is preserved where photographed; later children/index and post-1920 material are classified separately.",
});
addEvidence("Abertillery", "Recovered full-resolution compound source", "1861-1866", "CD 19; LR 195 7 compound section; images 00046-00057; 12 authoritative images", "", originalSource?.path ?? "", {
  collectionTitle: "Abertillery Branch Record of Members, 1861-1866",
  filename: "LR-195-7_M_00046.jpg",
  viewerSequence: 1,
  collectionBranch: "Abertillery",
  lrContext: "CD 19 / LR 195 7 compound volume",
  note: "Abertillery occupies images 00046-00057 of the compound source. Cwm Celyn precedes this section and Tredegar begins at image 00058. The physical volume remains intact; the site exposes this range as a virtual collection.",
});
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
addEvidence("Bryn", "Recovered full-resolution local source", "1847-1860", "CD 13; LR 129 7; 44 authoritative images; source heading Bryn Branch / Canghen y Bryn", "", originalSource?.path ?? "");
addEvidence("Ebbro Vale", "Recovered full-resolution local source", "1847-1864", "CD 26; LR 9846 7; 76 authoritative images; historical/source spelling for Ebbw Vale", "", originalSource?.path ?? "");
addEvidence("Gwaen Helygen", "Original CD contents description", "1848-1868", "Historical/source name for Brynmawr", "", originalSource?.path ?? "");
addEvidence("Cog", "Recovered full-resolution local source", "1848-1876", "CD 31; LR 109 7; 68 authoritative images; historical/source name for Cogan", "", originalSource?.path ?? "");
addEvidence("Cefncoed-y-Cymar", "Recovered full-resolution local source", "1847-1864", "CD 12; LR 176 7; 109 authoritative images; historical/source spelling for Cefn Coed-y-Cymmer", "", originalSource?.path ?? "");

// Preserve the source/indexing-map spelling without creating a duplicate branch.
addEvidence("Altwen", "Local LR2257 membership register", "1849-1859", "LR 225 7; historical/source spelling of Alltwen", "", originalSource?.path ?? "");

// North Wales branches supported by historical narrative and biographical
// sources. No local membership-register collection is currently identified
// for either branch, so these rows preserve attestation without inventing a
// Church History Library/CD holding.
addEvidence("Overton", "Welsh Saints Project historical resource", "1840-1842", "Overton: The First LDS Branch in Wales; organized 30 October 1840; earliest documented branch in Wales", "https://welshsaints.byu.edu/Resource_Info.aspx?id=24497", "", {
  collectionTitle: "Overton: The First LDS Branch in Wales",
  collectionBranch: "Overton",
  note: "Overton, historically in Flintshire and now in Wrexham County Borough, was organized on 30 October 1840 after the mission of Henry Royle and Frederick Cook. Contemporary journal references continue into 1842. The historical resource explicitly states that no Overton branch record is known to have survived.",
});
addEvidence("Owrtyn", "Welsh Saints Project place-name evidence", "1840-1842", "Welsh spelling used in Welsh Saints person records for Overton, Flintshire", "https://welshsaints.byu.edu/Resource_Info.aspx?id=24497");
addEvidence("Overton", "Ronald D. Dennis historical narrative", "1840", "Opposition to the Gospel Message in Wales, PDF page 23; missionaries arrived 16 October and organized a branch 30 October 1840");

addEvidence("Eglwysbach", "Hugh and Mary Owens Roberts biographical history", "1849-1864", "Abel Evans organized a six-member branch; Hugh Roberts served as presiding elder and kept the branch record until emigrating in 1864", "https://welshsaints.byu.edu/Immigrant_View.aspx?id=806", "", {
  collectionTitle: "Hugh and Mary Owens Roberts biographical and genealogical evidence",
  collectionBranch: "Eglwysbach",
  note: "The family history says Abel Evans organized the Eglwysbach Branch with six members, Hugh Roberts was called as presiding elder, and Roberts kept the branch record until he emigrated in 1864, when he delivered it to John Roberts of Pensarn. The present location or survival of that branch record is not established.",
});
addEvidence("Eglwys Fach", "Welsh Saints Project place-name evidence", "1849-1864", "Historical/source spelling used in Hugh Roberts family records", "https://welshsaints.byu.edu/Immigrant_View.aspx?id=806");
addEvidence("Eglwys Bach", "Historical spacing variant", "1849-1864", "Variant spacing retained for discovery");
addEvidence("Eglwysbach", "Zion's Trumpet conference report", "1854", "Conwy Valley Conference held at Eglwysbach, 28 May 1854; five branches and 98 members reported for the conference", "", "resources/books/Zions Trumpet (1854).pdf");

// Historically verified branches identified in the completed 2026 candidate
// audit. These are branch attestations, not invented Records of Members; no
// dedicated local membership-register collection is currently assigned.
addEvidence("Aberaman", "East Glamorgan typed conference transcript", "1852", "Aberaman Branch council and branch business, typed transcript page 17", "", "", {
  collectionTitle: "East Glamorgan branch and conference minutes",
  collectionBranch: "Aberaman",
  note: "The transcript explicitly distinguishes Aberaman Branch from Aberdare Branch and records branch council activity in 1852.",
});
addEvidence("Aberamman", "Richard Jenkins journal", "1852", "Journal reference to an Aberaman Branch meeting", "https://welshsaints.byu.edu/Resource_Info.aspx?id=2759", "");
addEvidence("Aberamon", "Thomas Howells journal", "1852", "Journal reference to the saints meeting at Aberaman Branch", "https://welshsaints.byu.edu/Resource_Info.aspx?id=1347", "");

addEvidence("Aberdare", "Ronald D. Dennis historical narrative", "1844", "Named among the seven branches forming the Merthyr Tydfil Conference", "https://welshsaints.byu.edu/Resource_Info.aspx?id=2618", "", {
  collectionTitle: "The Welsh and the Gospel",
  collectionBranch: "Aberdare",
  note: "The historical narrative names Aberdare among the seven established branches forming the Merthyr Tydfil Conference.",
});
addEvidence("Aberdare", "East Glamorgan typed conference transcript", "1852", "Aberdare Branch council and branch business, typed transcript page 17");
addEvidence("Aberdar", "Historical spelling variant", "1844-1852", "Variant retained for branch discovery");

addEvidence("Abergavenny", "Ronald D. Dennis historical narrative", "1840-1844", "Missionaries arrived late 1840; Abergavenny Branch later transferred from Garway Conference to Merthyr Tydfil Conference", "https://welshsaints.byu.edu/Resource_Info.aspx?id=2618", "", {
  collectionTitle: "The Welsh and the Gospel",
  collectionBranch: "Abergavenny",
  note: "The narrative identifies Abergavenny as a branch, records missionary activity beginning in late 1840, and describes its later conference transfer.",
});
addEvidence("Abergavenny", "Indefatigable Veteran", "1840", "PDF page 30 describes the arrival of the first missionaries and the established branch");
addEvidence("Abergyfeny", "Historical journal spelling", "1840-1844", "Variant retained for discovery");
addEvidence("Y Fenni", "Welsh place-name variant", "1840-1844", "Variant retained for discovery");

addEvidence("Beaufort", "Ronald D. Dennis historical narrative", "1844", "Named among the seven branches forming the Merthyr Tydfil Conference", "https://welshsaints.byu.edu/Resource_Info.aspx?id=2618", "", {
  collectionTitle: "The Welsh and the Gospel",
  collectionBranch: "Beaufort",
  note: "The historical narrative explicitly lists Beaufort as one of the branches forming the Merthyr Tydfil Conference.",
});
addEvidence("Brecon", "Zion's Trumpet", "1856-1857", "A report identifies John Jones as formerly President of Brecon Branch; PDF page 445", "", "", {
  collectionTitle: "Zion's Trumpet, 1856-1857",
  collectionBranch: "Brecon",
  note: "The periodical explicitly identifies an officer who had served as President of Brecon Branch.",
});
addEvidence("Cefn Mawr", "Zion's Trumpet", "1854", "Explicit Cefn Mawr Branch reference; PDF page 688", "", "", {
  collectionTitle: "Zion's Trumpet, 1854",
  collectionBranch: "Cefn Mawr",
  note: "The periodical explicitly names Cefn Mawr Branch.",
});
addEvidence("Cwmbach", "Welsh branch and conference typed transcript", "1851-1852", "Cwmbach Branch president and council activity; typed transcript page 12", "", "", {
  collectionTitle: "East Glamorgan Conference minutes, 1851-1852",
  collectionBranch: "Cwmbach",
  note: "The minutes explicitly identify Cwmbach Branch, its president, and branch council activity.",
});
addEvidence("Gellifaelog", "East Glamorgan Conference typed transcript", "1851-1852", "Gellifaelog Branch and branch officer ordinations; typed pages 60 and 76", "", "", {
  collectionTitle: "East Glamorgan Conference minutes, 1851-1852",
  collectionBranch: "Gellifaelog",
  note: "Conference reporting and officer ordinations explicitly identify Gellifaelog Branch.",
});
addEvidence("Hirwaun", "Prophet of the Jubilee", "1846-1848", "Hirwaun Branch is identified in 1846 and in later priesthood and baptism statistics; PDF page 498", "", "", {
  collectionTitle: "Prophet of the Jubilee",
  collectionBranch: "Hirwaun",
  note: "The publication explicitly identifies Hirwaun Branch and preserves branch-level statistical evidence.",
});
addEvidence("Hirwaen", "Historical spelling variant", "1846-1848", "Variant retained for discovery");
addEvidence("Llantrisant", "Richard Jenkins journal", "1851", "Baptized by a priest of Llantrisant Branch and confirmed under Thomas Morgan, Branch President", "https://welshsaints.byu.edu/Resource_Info.aspx?id=2759", "", {
  collectionTitle: "Richard Jenkins journal",
  collectionBranch: "Llantrisant",
  note: "The journal directly identifies Llantrisant Branch, its priesthood activity, and its branch president in January 1851.",
});
addEvidence("Llantrisant", "Zion's Trumpet distribution table", "1850", "Llantrisant is listed with branch-level distribution and membership figures");
addEvidence("Mountain Ash", "Thomas Evans Jeremy journal", "1862", "Journal entry dated 30 January 1862 states that the writer came to Mountain Ash Branch", "https://welshsaints.byu.edu/Resource_Info.aspx?id=181", "", {
  collectionTitle: "Thomas Evans Jeremy journal",
  collectionBranch: "Mountain Ash",
  note: "The dated journal entry explicitly identifies Mountain Ash Branch.",
});
addEvidence("Pembroke", "Zion's Trumpet", "1856-1857", "Pembroke Branch is explicitly named in a contribution list; PDF page 974", "", "", {
  collectionTitle: "Zion's Trumpet, 1856-1857",
  collectionBranch: "Pembroke",
  note: "The periodical explicitly names Pembroke Branch in a branch contribution list.",
});
addEvidence("Victoria", "David John journal", "1858", "Journal entry dated 31 March 1858 records a visit to Victoria Branch", "https://welshsaints.byu.edu/Resource_Info.aspx?id=4078", "", {
  collectionTitle: "David John journal",
  collectionBranch: "Victoria",
  note: "The dated journal entry explicitly identifies Victoria Branch. A separate 1846 license documents earlier Latter-day Saint activity at Victoria but is not used to extend the branch date.",
});
addEvidence("Victoria", "Welsh Saints Project license record", "", "1846 Latter-day Saint meeting context at Victoria; contextual evidence only and not used to extend the verified branch date", "https://welshsaints.byu.edu/Resource_Info.aspx?id=24026");
addEvidence("Ynysgau", "Welsh Saints Project conference record", "1850", "Special conference on 8 March 1850 appointed John Argust president of Ynysgau Branch, Merthyr", "https://welshsaints.byu.edu/Resource_Info.aspx?id=571", "", {
  collectionTitle: "Merthyr special conference record",
  collectionBranch: "Ynysgau",
  note: "The conference record explicitly appoints a president of Ynysgau Branch in Merthyr.",
});

// Twenty-two historically verified branches approved for Local Development
// promotion in August 2026. The publication date is retained in the citation,
// not converted into a speculative founding/closing range.
const verifiedBranchEvidence = [
  ["Rhosllanerchrugog", "A Steamboat for an Eldership", "PDF page 89; Dan Jones explicitly says that he established a branch at Rhosllanerchrugog", ""],
  ["Abergele", "Zion's Trumpet, 1850", "PDF page 281; Edward Parry appointed to preside after John Parry was released", "Branch president: John Parry; succeeded by Edward Parry"],
  ["Bagillt", "Zion's Trumpet, 1849", "PDF page 95; Bagillt explicitly identified as a branch in the Flintshire organization", "Branch president: John Jones"],
  ["Newmarket", "Zion's Trumpet, 1849", "PDF pages 117-118; Newmarket represented as a branch and Robert Parry set apart to preside", "Branch president: Robert Parry"],
  ["Llandudno", "Zion's Trumpet, 1850", "PDF page 417; branch established at Llandudno", "Branch president: Isaac Morris"],
  ["Llanddoged", "Zion's Trumpet, 1850 and 1854", "PDF page 417 (1850) and page 705 (1854); branch established and later presiding appointment recorded", "Branch presidents: John Davies (1850); John Ellis (1854)"],
  ["Harlech", "Zion's Trumpet, 1849", "PDF page 299; Harlech listed among represented Merionethshire branches", ""],
  ["Machynlleth", "Zion's Trumpet, 1849", "PDF page 299; Machynlleth listed among represented Merionethshire branches", ""],
  ["Llanbrynmair", "Zion's Trumpet, 1849", "PDF page 299; Llanbrynmair listed among represented Merionethshire branches", ""],
  ["Towyn", "Zion's Trumpet, 1849 and 1850", "PDF page 299 (1849); branch represented; PDF page 417 (1850); presiding appointment", "Branch president: John Evans"],
  ["Llanybydder", "Prophet of the Jubilee", "PDF page 59; explicit Llanybydder Branch report", ""],
  ["Carmarthen", "Zion's Trumpet, 1852", "PDF page 260; Carmarthen named among branches assigned to the Carmarthen Conference", ""],
  ["St Clears", "Zion's Trumpet, 1852 and 1854", "PDF page 260 (Saint Clears in branch list); PDF page 627 (St. Clears branch president referenced)", ""],
  ["Llanpumsaint", "Zion's Trumpet, 1852", "PDF page 260; Llanpumsaint named among branches assigned to the Carmarthen Conference", ""],
  ["Pencader", "Zion's Trumpet, 1852", "PDF page 260; Pencader named among branches assigned to the Carmarthen Conference", ""],
  ["Cellan", "Zion's Trumpet, 1852", "PDF page 65; William Evans identified as an elder in Cellan Branch", "Officer: William Evans, elder"],
  ["Fishguard", "Zion's Trumpet, 1856-1857", "PDF page 974; Fishguard appears in a branch-organized contribution list", ""],
  ["Letterston", "Zion's Trumpet, 1855", "PDF page 212; North Pembroke conference report held at Letterston with branch representation", ""],
  ["Maesteg", "Zion's Trumpet, 1855", "PDF page 203; William Evans explicitly identified as a member of Maesteg Branch", ""],
  ["Garndiffaith", "Zion's Trumpet, 1850", "PDF page 197; source spelling Garnddiffaith, branch presented to the Herefordshire District", ""],
  ["Blaenavon", "Zion's Trumpet, 1850", "PDF page 197; Blaenavon branch presented to the Herefordshire District", ""],
  ["Fleur-de-Lis", "Zion's Trumpet, 1850", "PDF page 197; William Howells appointed to preside over Fleur-de-Lis Branch", "Branch president: William Howells"],
];
for (const [name, source, reference, leadership] of verifiedBranchEvidence) {
  const evidenceType = /appointed|preside|president/i.test(`${reference} ${leadership}`)
    ? "Branch leadership/officer appointment"
    : /contribution/i.test(reference)
    ? "Branch contribution/account list"
    : /established|organized/i.test(reference)
    ? "Branch organization statement"
    : /represented|assigned|among branches|branch list|district/i.test(reference)
    ? "Conference organization/branch list"
    : "Explicit branch reference";
  addEvidence(name, source, "", reference, "", "", {
    collectionTitle: source,
    collectionBranch: name,
    evidenceType,
    note: reference,
    ...(leadership ? { leadership } : {}),
  });
}
addEvidence("Trelawnyd", "Modern locality relationship", "", "Modern name of historical Newmarket; historical source name remains canonical");
addEvidence("Tywyn", "Modern Welsh spelling", "", "Modern spelling retained as an alias of historical source form Towyn");
addEvidence("Saint Clears", "Historical source spelling", "", "Expanded source spelling retained as an alias of St Clears");
addEvidence("Garnddiffaith", "Zion's Trumpet source spelling", "", "Source spelling retained as an alias of Garndiffaith");

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
addEvidence("Festiniog", "Local membership record images", "1848-1856", "Ffestiniog membership record book integrated into local archive; surviving title uses Festiniog; 94 unique viewer images", "", "", {
  collectionTitle: "FESTINIOG BRANCH (Wales), WELSH MISSION, Historical Record and Record of Members, 1848, etc.",
  collectionBranch: "Ffestiniog",
  note: "The membership-book title page directly supports the 1848 start date with the wording '1848, etc.' The 1856 endpoint is the branch closing/end date documented in the project's historical context; 1856 is not printed on that title page.",
});
addEvidence("Abertawe", "Recovered Swansea source description and Welsh source heading", "", "Swansea / Abertawe source identity; Swansea Branch LR 8863 10", "", originalSource?.path ?? "", {
  collectionTitle: "Swansea Branch, England Southwest Mission, Confidential Minutes, 1849-1881",
  collectionBranch: "Swansea",
  lrContext: "LR 8863 10; the recovered source description states that the branch was known as Abertawe until 1866.",
  note: "Abertawe is the Welsh/historical source name for Swansea. A Welsh heading in the source reads 'yn Nghangen Abertawe'. The separate Swansea membership volume is LR 8863 7, library number 1606, Record of Members 1872-1879.",
});
addEvidence("Coal Brook Vale", "Recovered full-resolution compound source", "1856-1867", "CD 24; LR 174 7 compound section; 83 authoritative images; membership registers 00080-00137", "", originalSource?.path ?? "", {
  collectionTitle: "Coal Brook Vale / Blaina records, 1856-1867",
  filename: "LR-1175710_v1590_M_00078.jpg",
  viewerSequence: 1,
  collectionBranch: "Coalbrookvale",
  lrContext: "CD 24 / LR 174 7 compound volume",
  note: "Image 00078 records organization of Coal Brook Vale on 3 March 1856 from Nantyglo, Blaenau and Cwm Celyn; images 00080-00137 contain two membership sequences under Coal Brook Vale / Blaina headings.",
});
addEvidence("Llanfabon", "Recovered full-resolution local source", "1847-1869", "CD 15; project LR1687; historical/library identifier 871; 60 authoritative images", "", originalSource?.path ?? "", {
  collectionTitle: "Llanfabon Branch Record of Members, 1847-1869",
  filename: "871__M_00002.jpg",
  viewerSequence: 2,
  collectionBranch: "Llanfabon",
  lrContext: "Project reference LR1687; photographed source label separately shows 871.",
  note: "The relationship between historical/library identifier 871 and project LR1687 is not established. The volume contains an original register, a separate Reformation register, and Welsh historical narrative on written pages 19-28.",
});
addEvidence("Haverfordwest", "Recovered full-resolution local sources", "1847-1860", "CD 23 / CR 11343 11 V.1; CD 58 / CR 11343 11 V.2; 272 authoritative historical images", "", originalSource?.path ?? "", {
  collectionTitle: "Haverfordwest Branch volumes 1 and 2, 1847-1860",
  filename: "LR-1134321_v1_M_00001.jpg",
  viewerSequence: 1,
  collectionBranch: "Haverfordwest",
  lrContext: "Photographed identifiers CR 11343 11 V.1 and CR 11343 11 V.2; project folder/filename forms LR1134321 and LR1134311 are retained separately.",
  note: "Volume 1 contains member records 1847-1853 and historical material. Volume 2 contains historical record 1852-1854 and a separate member register 1857-1860. The exact catalog relationship among CR/LR forms is not normalized beyond the photographed evidence.",
});
addEvidence("Llandebie", "Recovered full-resolution local source", "1849-1866", "CD 22; project LR 113 7; photographed library identifier 870; 45 authoritative full-resolution images", "", originalSource?.path ?? "", {
  collectionTitle: "Llandebie Branch Record of Members, 1849-1866",
  filename: "LR-113-7_00002.jpg",
  viewerSequence: 2,
  collectionBranch: "Llandebie",
  lrContext: "Project reference LR 113 7; photographed source label separately shows library number 870.",
  note: "The photographed label states Record of Members 1849-1866. The volume contains two independently numbered membership registers, a separate renewal/reformation sequence, opening Welsh historical narrative, and an additional-remarks page.",
});
addEvidence("Castell Nedd", "Recovered full-resolution local source", "1849-1884", "CD 2; project LR 196 7; photographed source/library identifier 1544; 112 authoritative full-resolution images", "", originalSource?.path ?? "", {
  collectionTitle: "Castell Nedd Branch Record of Members, 1849-1884",
  filename: "1544__M_00002.jpg",
  viewerSequence: 2,
  collectionBranch: "Castell Nedd (Neath)",
  lrContext: "Project/CD reference LR 196 7; photographed source/library identifier 1544.",
  note: "The library label uses Castell Nedd and dates the Record of Members 1849-1884. The volume contains an original register, an independent rebaptism/renewal register, a later independently numbered register, and Welsh historical narrative.",
});
addEvidence("Castellned", "Historical source heading", "1849-1883", "CD 2; photographed source/library identifier 1544", "", originalSource?.path ?? "", {
  collectionTitle: "Castellned Branch Record of Members, 1849-1883",
  filename: "1544__M_00001.jpg",
  viewerSequence: 1,
  collectionBranch: "Castell Nedd (Neath)",
  lrContext: "Project/CD reference LR 196 7; photographed source/library identifier 1544.",
  note: "The cover uses the compact historical spelling Castellned and dates the volume 1849-1883; the adjacent library label uses Castell Nedd and extends the catalog coverage through 1884.",
});
addEvidence("Rhymney English", "Recovered direct-FHC microfilm source", "1851-1887", "Direct-FHC microfilm capture; library identifier 1602; 57 authoritative images", "", originalSource?.path ?? "", {
  collectionTitle: "Rhymney English Branch Record of Members, 1851-1887",
  filename: "FHC104171_003_frame-230.jpg",
  viewerSequence: 3,
  collectionBranch: "Rhymney English",
  lrContext: "Photographed Historian's Office/library identifier 1602; local microfilm folder 0,104,171.",
  note: "A distinct English-language branch source. No matching recovered CD set was located; the locally created direct-FHC microfilm PDFs are the documented fallback and their embedded JPEGs were recovered losslessly.",
});

// The 2022 indexing-project branch map establishes Pendoylon as a distinct
// branch source unit, but no corresponding local image collection has yet
// been recovered. Ron Dennis's typed conference material uses Pendoylan;
// preserve that spelling as an alias without treating the conference text as
// a substitute membership register.
addEvidence("Pendoylon", "2022 Wales indexing-project branch map", "1851-1886", "DGS 106248102; indexing images 195-239; WALES (Country), Part 5", "", "", {
  collectionTitle: "Wales Record of Members - List of Branches (2022 indexing project)",
  filename: "Wales Indexing Branch List.pdf",
  collectionBranch: "Pendoylon",
  note: "The map identifies Pendoylon Branch, 1851-1886, as images 195-239. No matching local/original image collection was located during the 2026-08-11 recovery audit.",
});
addEvidence("Pendoylan", "Ron Dennis typed conference material", "", "Historical/source spelling in typed Cardiff conference records");

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
addEvidence("Llanelltyd", "Recovered full-resolution compound source", "1850-1857", "CD 34; LR 172 7 compound section; internal pages 1-5; 10 authoritative images", "", "", {
  ...llanelltydStructuralSource,
  filename: "LR-1175710_v1574_M_00026.jpg",
  viewerSequence: 1,
  internalPage: 1,
  note: "The source label dates the Llanelltyd Record of Members 1850-1857. The virtual collection stops at image 00035; image 00036 begins Cwm Saerbren.",
});
addEvidence("Cwmsaerbren", "Historical structural image", "1858-1874", "CD 34; LR 172 7 compound section; 38 authoritative images; LR 11150 separate catalog reference not connected", "", "", {
  ...llanelltydStructuralSource,
  internalPage: 6,
  separateReference: "LR 11150",
  note: "Internal source label dates the Cwm Saerbren record of members 1858-1874. The enclosing physical volume spans 1850-1882. LR 11150 remains a separate catalog reference; no corresponding images are currently connected.",
});
addEvidence("Treorky", "Recovered full-resolution compound source", "1874-1882", "CD 34; LR 172 7 compound sections; 68 virtual images", "", "", {
  ...llanelltydStructuralSource,
  internalPage: 25,
  note: "Historical spelling written throughout the compound source. Early minutes appear at images 00006-00025; the member register occupies images 00074-00109; later history and children-blessed material continue at 00112-00116. Not associated with Troedyrhiw.",
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
    // The legacy generic Llansawel note predates the recovered source work.
    // Do not recreate a third artificial branch now that the dedicated
    // Carmarthenshire register and the Glamorgan compound-volume section are
    // independently identified and preserved below.
    if (baseName(rawName) === "Llansawel") continue;
    addEvidence(rawName, "Recovered RoboHelp branch note", years(rawName).join("-"), "Wales2Utah research note", "", path.join(branchesPath, entry.name));
  }
}

for (const [name, item, dateText] of familySearch104168) addEvidence(name, "FamilySearch catalog", dateText, `Film 104168 ${item}`, "https://www.familysearch.org/search/catalog/results?query=film_number%3A104168");
for (const [name, item, dateText] of familySearch104172) addEvidence(name, "FamilySearch catalog", dateText, `Film 104172 ${item}`, "https://www.familysearch.org/search/catalog/results?query=film_number%3A104172");
addEvidence("Llansawel (Carmarthenshire)", "FamilySearch catalog context", "1849-1855", "Film 104169 items 14-15; locality assignment requires the recovered CD 14 source", "https://www.familysearch.org/search/catalog/209087");
addEvidence("Llansawel (Glamorgan)", "FamilySearch catalog context", "1850-1889", "Film 104169 items 14-15; locality assignment requires the recovered LR 11759 7 heading", "https://www.familysearch.org/search/catalog/209087");
addEvidence("Sutton Mountain", "FamilySearch catalog", "1853-1859", "Film 104171 item 6", "https://www.familysearch.org/search/catalog/results?query=film_number%3A104171");
addEvidence("Cwmbran", "Typed contextual minutes evidence", "1850-1874", "CD 62 within source group CDs 60-62; LR 70861 1; Pontypool/Abersychan General Minutes, 1857-1889; Cwmbran reports on typed PDF pages 129, 167, 169, 171-172, 176", "", "resources/transcriptions/A - CDs 60-62 - Typed Transcripts.pdf");
addEvidence("Morriston", "Typed contextual minutes evidence", "1853-1868", "CD 41; LR 17617 21; Western Glamorgan Conference Minutes, 1851-1870; Morriston fast-offerings report, 1866", "", "resources/transcriptions/A - CDs 40-43 (2 of 2) - Typed Transcripts.pdf");

const grouped = Map.groupBy(evidence, (item) => item.canonicalName);
const registry = [...grouped.entries()].map(([canonicalName, entries]) => {
  const allYears = entries.flatMap((entry) => years(`${entry.rawName} ${entry.dateText}`));
  const variants = [...new Set(entries.map((entry) => baseName(entry.rawName)).filter((name) => name !== canonicalName))];
  if (/^Llansawel \(/.test(canonicalName)) variants.unshift("Llansawel");
  const localCd = entries.some((entry) => ["2007 CD branch index", "2007 meeting transcription checklist", "Historical structural image", "Recovered full-resolution compound source", "Recovered full-resolution local source", "Recovered direct-FHC microfilm components", "Typed contextual minutes evidence"].includes(entry.source));
  const localNote = entries.some((entry) => entry.source === "Recovered RoboHelp branch note");
  const familySearch = entries.some((entry) => entry.source === "FamilySearch catalog");
  let comparisonStatus = "Research note only";
  if (familySearch && localCd) comparisonStatus = "Matched: FamilySearch and local CD";
  else if (familySearch && !localCd) comparisonStatus = "FamilySearch only / locate local record";
  else if (!familySearch && localCd) comparisonStatus = "Local CD only / verify with FamilySearch";
  else if (entries.some((entry) => entry.source === "Historical structural image")) comparisonStatus = "Historical source attestation; dedicated record collection not yet identified";
  if (["Brechfa", "Brynmawr", "Bryntroedgam", "Castell Nedd (Neath)", "Cogan", "Cefn Coed-y-Cymmer", "Cuffern Mountain", "Dinas", "Ebbw Vale", "Haverfordwest", "Llandebie", "Llanfabon"].includes(canonicalName)) comparisonStatus = "Verified local source collection";
  if (canonicalName === "Abertillery") comparisonStatus = "Verified compound local source section";
  if (canonicalName === "Rhymney English") comparisonStatus = "Verified direct-FHC microfilm fallback source";
  if (canonicalName === "Coalbrookvale") comparisonStatus = "Verified compound local source section";
  if (canonicalName === "Llanelltyd") comparisonStatus = "Verified compound local source section";
  if (canonicalName === "Cwm Saerbren") comparisonStatus = "Verified compound local source section; dedicated LR 11150 images not connected";
  if (canonicalName === "Treorchy") comparisonStatus = "Verified compound local source section";
  if (canonicalName === "Swansea") comparisonStatus = "Verified local source identity and collections";
  if (canonicalName === "Pendoylon") comparisonStatus = "Historical source attestation; local image collection not yet located";
  if (canonicalName === "Cwmbran") comparisonStatus = "Contextual typed minutes evidence; dedicated member register not recovered";
  if (canonicalName === "Morriston") comparisonStatus = "Contextual conference-minutes evidence; dedicated member register not recovered";
  if (canonicalName === "Overton") comparisonStatus = "Historically verified branch; no surviving local membership register identified";
  if (canonicalName === "Eglwysbach") comparisonStatus = "Historically verified branch; recorded branch book not currently located";
  if (["Aberaman", "Aberdare", "Abergavenny", "Beaufort", "Brecon", "Cefn Mawr", "Cwmbach", "Gellifaelog", "Hirwaun", "Llantrisant", "Mountain Ash", "Pembroke", "Victoria", "Ynysgau", ...verifiedBranchEvidence.map(([name]) => name)].includes(canonicalName)) comparisonStatus = "Historically verified branch; no dedicated local membership register identified";
  if (canonicalName === "Welsh Conference") comparisonStatus = "Verified local direct-FHC conference sources; Library 3118 incomplete";
  if (canonicalName === "Llansawel (Carmarthenshire)") comparisonStatus = "Verified dedicated local source collection";
  if (canonicalName === "Llansawel (Glamorgan)") comparisonStatus = "Verified compound local source section";
  const entityType = /conference/i.test(canonicalName) ? "Conference" : "Branch";
  return {
    canonicalName, entityType, variants: variants.join("; "),
    earliestYear: canonicalName === "Pontlanfraith" ? null : canonicalName === "Llanelltyd" ? 1850 : canonicalName === "Treorchy" ? 1874 : canonicalName === "Rhymney English" ? 1851 : canonicalName === "Cwmtillery" ? 1847 : canonicalName === "Trinant" ? 1849 : canonicalName === "Crumlin" ? 1857 : canonicalName === "Machen" ? 1854 : canonicalName === "Twyncarno" ? 1856 : canonicalName === "Llandebie" || canonicalName === "Castell Nedd (Neath)" ? 1849 : (allYears.length ? Math.min(...allYears) : null),
    latestYear: canonicalName === "Pontlanfraith" ? null : canonicalName === "Llanelltyd" ? 1857 : canonicalName === "Treorchy" ? 1882 : canonicalName === "Rhymney English" ? 1887 : canonicalName === "Cwmtillery" ? 1857 : canonicalName === "Trinant" ? 1853 : canonicalName === "Crumlin" ? 1862 : canonicalName === "Machen" ? 1865 : canonicalName === "Twyncarno" ? 1857 : canonicalName === "Llandebie" ? 1866 : canonicalName === "Castell Nedd (Neath)" ? 1884 : (allYears.length ? Math.max(...allYears) : null),
    localCd, localNote, familySearch, comparisonStatus,
    filmAndCallNumbers: canonicalName === "Brechfa"
      ? "CD 4; LR 11000 7; 62 authoritative full-resolution images"
      : canonicalName === "Brynmawr"
      ? "CD 10; LR 215 7; 93 authoritative full-resolution images"
      : canonicalName === "Bryntroedgam"
      ? "CD 13; LR 129 7; 44 authoritative full-resolution images; source heading Bryn Branch / Canghen y Bryn"
      : canonicalName === "Cogan"
      ? "CD 31; LR 109 7; 68 authoritative full-resolution images; source heading Cog"
      : canonicalName === "Cefn Coed-y-Cymmer"
      ? "CD 12; LR 176 7; 109 authoritative full-resolution images; source forms Cefncoed-y-Cymar and Cefncoedycymer"
      : canonicalName === "Cuffern Mountain"
      ? "CD 6; LR 198 7; 83 authoritative historical images"
      : canonicalName === "Dinas"
      ? "CD 1; LR 182 7; source image/catalog prefix 1555; 66 authoritative full-resolution images; cover states 1848-1878"
      : canonicalName === "Ebbw Vale"
      ? "CD 26; LR 9846 7; 76 authoritative full-resolution images; source heading Ebbro Vale"
      : canonicalName === "Haverfordwest"
      ? "CD 23 / CR 11343 11 V.1; CD 58 / CR 11343 11 V.2; 272 authoritative historical images; membership registers 1847-1853 and 1857-1860"
      : canonicalName === "Llandebie"
      ? "CD 22; project LR 113 7; photographed library identifier 870 preserved separately; 45 authoritative full-resolution images; source dates 1849-1866"
      : canonicalName === "Castell Nedd (Neath)"
      ? "CD 2; project LR 196 7; photographed source/library identifier 1544 preserved separately; 112 authoritative full-resolution images; source dates 1849-1884"
      : canonicalName === "Rhymney English"
      ? "Direct-FHC microfilm capture; photographed library identifier 1602; 57 authoritative images; source dates 1851-1887"
      : canonicalName === "Llanfabon"
      ? "CD 15; project LR1687; historical/library identifier 871 preserved separately; 60 authoritative full-resolution images"
      : canonicalName === "Cwm Saerbren"
      ? "CD 34; LR 172 7 compound section; internal pages 6-24; 38 authoritative full-resolution images; LR 11150 separate reference not connected"
      : canonicalName === "Llanelltyd"
      ? "CD 34; LR 172 7 compound section; internal pages 1-5; 10 authoritative full-resolution images; section dated 1850-1857"
      : canonicalName === "Treorchy"
      ? "CD 34; LR 172 7 compound logical sections; 68 authoritative full-resolution images; Treorky minutes 1874 and membership register 1875-1882"
      : canonicalName === "Coalbrookvale"
      ? "CD 24; LR 174 7 compound section; 83 authoritative full-resolution images; membership registers 00080-00137"
      : canonicalName === "Cwmbran"
      ? "CD 62 within source group CDs 60-62; LR 70861 1; Pontypool/Abersychan General Minutes, 1857-1889; Cwmbran reports on typed PDF pages 129, 167, 169, 171-172, 176; Film 104168 Item 13 retained as legacy discovery metadata"
      : canonicalName === "Morriston"
      ? "CD 41; LR 17617 21; Western Glamorgan Conference Minutes, 1851-1870; Morriston fast-offerings report, 1866; Film 104172 Item 5 retained as legacy discovery metadata"
      : [...new Set(entries.map((entry) => entry.reference).filter(Boolean))].join("; "),
    relatedBranches: canonicalName === "Coalbrookvale" ? "Blaina; Nantyglo; Cwm Celyn" : canonicalName === "Swansea" ? "" : [...new Set(entries.map((entry) => entry.relatedBranch).filter(Boolean))].join("; "),
    relationshipNotes: canonicalName === "Coalbrookvale" ? "The source records organization of Coal Brook Vale on 3 March 1856 after disorganization/reorganization involving Nantyglo, Blaenau and Cwm Celyn. Blaina appears throughout the membership registers as the branch/locality heading; the evidence is preserved without creating a duplicate branch." : canonicalName === "Swansea" ? "Abertawe is the Welsh/historical source name for Swansea; the recovered LR 8863 10 description states that the branch was known as Abertawe until 1866." : [...new Set(entries.map((entry) => entry.relationshipNote).filter(Boolean))].join("; "),
    notes: canonicalName === "Cwmbran"
      ? "Cwmbran is repeatedly attested in branch-condition, missionary, baptism/addition, and appointment reports. This is contextual minutes evidence, not a dedicated Record of Members."
      : canonicalName === "Morriston"
      ? "Morriston is explicitly attested by a 1866 fast-offerings report in the enclosing conference minutes. This is contextual conference material, not a dedicated Record of Members."
      : canonicalName === "Overton"
      ? "Organized 30 October 1840 and documented as the first branch in Wales. Activity is documented through 1842; no surviving Overton membership register is currently identified."
      : canonicalName === "Eglwysbach"
      ? "Organized by Abel Evans with six members after the Roberts family conversions; Hugh Roberts served as presiding elder and kept the branch record until 1864. The record's present survival or location is unknown."
      : ["Aberaman", "Aberdare", "Abergavenny", "Beaufort", "Brecon", "Cefn Mawr", "Cwmbach", "Gellifaelog", "Hirwaun", "Llantrisant", "Mountain Ash", "Pembroke", "Victoria", "Ynysgau", ...verifiedBranchEvidence.map(([name]) => name)].includes(canonicalName)
      ? "Explicit historical branch evidence is preserved in conference minutes, journals, Welsh Saints material, or Ronald D. Dennis publications. No dedicated Record of Members is currently identified."
      : comparisonStatus.includes("only") ? "Needs human review; absence from one source is not proof the branch or record was absent." : "",
    sourceUrls: [...new Set(entries.map((entry) => entry.sourceUrl).filter(Boolean))].join("; "),
    nameSources: entries.filter((entry) => entry.provenance).map((entry) => ({
      sourceName: baseName(entry.rawName),
      ...entry.provenance,
    })),
    leadershipOfficers: [...new Set(entries.map((entry) => entry.provenance?.leadership).filter(Boolean))].join("; "),
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
