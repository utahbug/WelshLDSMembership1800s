import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const auditPath = path.join(root, "outputs", "internet-archive-reconciliation", "reconciliation.json");
const transcriptionRoot = path.join(root, "records", "transcriptions");
const metadataPath = process.argv[2] || path.join(process.env.TEMP || process.env.TMP || root, "ldswelshmembership-metadata.json");
const outputDir = path.join(root, "outputs", "internet-archive-upload-plan");

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [columns.join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function hashes(filePath) {
  const content = fs.readFileSync(filePath);
  return {
    md5: crypto.createHash("md5").update(content).digest("hex"),
    sha1: crypto.createHash("sha1").update(content).digest("hex"),
  };
}

function parseFolder(folder) {
  const yearMatches = [...folder.matchAll(/(\d{4})\s*[-_]\s*(\d{4})/g)];
  const years = yearMatches.map((match) => `${match[1]}-${match[2]}`).join("; ");
  const lr = folder.match(/\bLR\s*([0-9]+)/i)?.[1] || "";
  const branch = folder
    .replace(/^\d+-/, "")
    .replace(/[,_(]\s*\d{4}[\s\S]*$/i, "")
    .trim();
  return { branch, years, lr: lr ? `LR${lr}` : "" };
}

if (!fs.existsSync(auditPath)) throw new Error(`Reconciliation audit not found: ${auditPath}`);
if (!fs.existsSync(metadataPath)) throw new Error(`Archive metadata file not found: ${metadataPath}`);
const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
const existingRemote = new Map(metadata.files.map((item) => [String(item.name).replaceAll("\\", "/"), item]));

const missingImages = audit.files
  .filter((item) => item.status === "missing_remote")
  .map((item) => ({
    type: "membership-image",
    mapping_status: "ready",
    local_path: `records/source-cds/${item.local_path}`,
    remote_path: item.local_path,
    branch_folder: item.local_branch,
    size: item.local_size,
    md5: item.local_md5,
    sha1: item.local_sha1,
    existing_remote: existingRemote.has(item.local_path),
    proposed_action: existingRemote.has(item.local_path) ? "STOP-CONFLICT" : "upload-new",
    note: "Exact branch-relative source path preserved.",
  }));

const pdfMappings = [
  {
    name: "A - CDs 35-39 (1 of 2) - Typed Transcripts.pdf",
    pages: 86,
    primaryFolder: "35-Cardiff,1851-1867,Donations,LR141622",
    status: "ready",
    content: "Cardiff donations, expenditures, minutes, and membership material (LR141622).",
    related: "Cardiff",
  },
  {
    name: "A - CDs 35-39 (2 of 2) - Typed Transcripts.pdf",
    pages: 116,
    primaryFolder: "38-Glamorgan East Conference,1853-1863,LR1761621",
    status: "ready",
    content: "Glamorgan East Conference minutes, chiefly 1853-1863.",
    related: "Merthyr Tydfil; Georgetown; Troed-y-rhew and other conference branches",
  },
  {
    name: "A - CDs 39 - Typed Transcripts.pdf",
    pages: 44,
    primaryFolder: "26-Ebbro Vale,1847-1864,LR98467",
    status: "ready",
    content: "Ebbw Vale general minutes, 1852-1854 (LR984611).",
    related: "Ebbw Vale / Ebbro Vale",
  },
  {
    name: "A - CDs 40-43 (1 of 2) - Typed Transcripts.pdf",
    pages: 80,
    primaryFolder: "38-Glamorgan East Conference,1853-1863,LR1761621",
    status: "ready",
    content: "Glamorgan East Conference minutes, 1851-1852 (LR1761622).",
    related: "Merthyr Tydfil; Cardiff; Pen-y-Darran; Cefn Coed-y-Cymmer and other conference branches",
  },
  {
    name: "A - CDs 40-43 (2 of 2) - Typed Transcripts.pdf",
    pages: 155,
    primaryFolder: "38-Glamorgan East Conference,1853-1863,LR1761621",
    status: "needs-review-compound-pdf",
    content: "Compound bundle: continuation of Glamorgan East; Western Glamorgan Conference; Llanelli; Welsh District/Merthyr Tydfil material.",
    related: "Glamorgan East Conference; Western Glamorgan Conference; Llanelli; Welsh District; Merthyr Tydfil",
  },
  {
    name: "A - CDs 44-59 - Typed Transcripts.pdf",
    pages: 120,
    primaryFolder: "Stepaside",
    status: "needs-review-compound-pdf",
    content: "Compound bundle spanning CDs 44-59 and numerous branches/conferences.",
    related: "Stepaside; Neath; Swansea; Welsh Conference; Tredegar; Ystrad; Pen Parren; Llansawel; Georgetown; Llanelli; Sutton Mountain; Haverfordwest; Gymmer",
  },
  {
    name: "A - CDs 60-62 - Typed Transcripts.pdf",
    pages: 176,
    primaryFolder: "Welsh District",
    status: "needs-review-compound-pdf",
    content: "Compound bundle: Welsh District minutes, Swansea general minutes, and Pontypool/Abersychan minutes.",
    related: "Welsh District; Swansea; Pontypool; Abersychan",
  },
];

const pdfRows = pdfMappings.map((mapping) => {
  const localFile = path.join(transcriptionRoot, mapping.name);
  if (!fs.existsSync(localFile)) throw new Error(`Transcription PDF not found: ${localFile}`);
  const remotePath = `${mapping.primaryFolder}/Transcriptions/${mapping.name}`;
  const checksum = hashes(localFile);
  const existing = existingRemote.get(remotePath);
  return {
    type: "transcription-pdf",
    mapping_status: mapping.status,
    local_path: `records/transcriptions/${mapping.name}`,
    remote_path: remotePath,
    branch_folder: mapping.primaryFolder,
    pages: mapping.pages,
    size: fs.statSync(localFile).size,
    md5: checksum.md5,
    sha1: checksum.sha1,
    existing_remote: Boolean(existing),
    existing_remote_md5: existing?.md5 || "",
    proposed_action: existing ? "STOP-CONFLICT" : mapping.status === "ready" ? "upload-new" : "hold-for-mapping-review",
    content_summary: mapping.content,
    related_branches_or_entities: mapping.related,
  };
});

const folderOverrides = new Map([
  ["Cardiff (1851-1867) - Donations, Expenditures, Minutes, Records", { branch: "Cardiff", years: "1851-1867", lr: "LR141622" }],
  ["Ffestiniog membership record", { branch: "Ffestiniog", years: "not yet identified", lr: "not yet identified" }],
  ["Gymner (1852-1857, 1863) - Minutes", { branch: "Gymner / Cymmer", years: "1852-1857; 1863", lr: "LR1115222" }],
  ["Merthr Tydfil (1849-1857, 1861-1896)", { branch: "Merthyr Tydfil", years: "1849-1857; 1861-1896", lr: "LR54507" }],
  ["Pontypool (and minutes from Abersychan) -2", { branch: "Pontypool / Abersychan", years: "1857-1889", lr: "LR708611" }],
  ["Tredegar District (1879-1882) - Confidential Minutes", { branch: "Tredegar District", years: "1879-1882", lr: "LR1240410" }],
  ["Ystrad (1902-1910) - General Minutes", { branch: "Ystrad", years: "1902-1910", lr: "LR1314511" }],
  ["Stepaside", { branch: "Stepaside", years: "1858-1860", lr: "LR1272711" }],
  ["Welsh District", { branch: "Welsh District", years: "1849-1911", lr: "LR1001111" }],
]);

const existingFolders = [...new Set(audit.files.map((item) => item.local_branch))];
const proposedPdfOnlyFolders = pdfRows.map((item) => item.branch_folder).filter((folder) => !existingFolders.includes(folder));
const folders = [...new Set([...existingFolders, ...proposedPdfOnlyFolders])]
  .sort((a, b) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" }));
const indexRows = folders.map((folder) => {
  const parsed = folderOverrides.get(folder) || parseFolder(folder);
  const imageCount = audit.files.filter((item) => item.local_branch === folder).length;
  const mappedPdfs = pdfRows.filter((item) => item.branch_folder === folder);
  return {
    branch: parsed.branch,
    years: parsed.years || "not yet identified",
    lr_reference: parsed.lr || "not yet identified",
    intended_image_count: imageCount,
    transcription_pdf_count: mappedPdfs.length,
    archive_path: `${folder}/`,
    transcription_paths: mappedPdfs.map((item) => item.remote_path).join(" | "),
    transcription_mapping_status: mappedPdfs.length ? [...new Set(mappedPdfs.map((item) => item.mapping_status))].join(" | ") : "none mapped",
  };
});

const readmeText = `LDS WELSH MEMBERSHIP RECORDS - ARCHIVE FILE GUIDE\n\n` +
`Internet Archive item: ldswelshmembership\n` +
`Canonical download root: https://archive.org/download/ldswelshmembership/\n\n` +
`ORGANIZATION\n` +
`The top-level folders preserve historical branch, conference, district, or record-group names from the source collection. Numbered folders generally contain an images subfolder. Other recovered record groups may store images directly beneath the top-level folder. Transcription PDFs are placed beneath the most appropriate top-level folder in a Transcriptions subfolder.\n\n` +
`FILE NAMES AND ORDER\n` +
`Original image filenames and branch-relative paths are preserved. Image order must be taken from the full relative path and the project's catalog; bare filenames are not unique across all branches. INDEX.csv lists the branch/year/reference summary and proposed transcription associations.\n\n` +
`TRANSCRIPTIONS AND TRANSLATIONS\n` +
`The surviving PDFs are historical project bundles, sometimes covering more than one branch or conference. INDEX.csv identifies their primary Archive location. Compound PDFs marked needs-review-compound-pdf are not approved for upload until their placement policy is reviewed. No separate Translations folder is proposed because the source PDFs combine transcription, translation, and status material.\n\n` +
`PROVENANCE AND INDEPENDENCE\n` +
`Independent historical research project. This archive organization is not an official publication of or endorsed by The Church of Jesus Christ of Latter-day Saints, Brigham Young University, FamilySearch, or the Church History Library. Historical membership images remain distinct from the website code and original site content. Transcriptions and translations were independently created by Ron Dennis and his students and are not Church-produced materials.\n`;

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "README.txt"), readmeText, "utf8");
writeCsv(path.join(outputDir, "INDEX.csv"), indexRows, Object.keys(indexRows[0]));
writeCsv(path.join(outputDir, "missing-images.csv"), missingImages, Object.keys(missingImages[0]));
writeCsv(path.join(outputDir, "pdf-inventory.csv"), pdfRows, Object.keys(pdfRows[0]));

const topFiles = ["README.txt", "INDEX.csv"].map((name) => {
  const localFile = path.join(outputDir, name);
  const checksum = hashes(localFile);
  const existing = existingRemote.get(name);
  return {
    type: "archive-index",
    mapping_status: "ready",
    local_path: `outputs/internet-archive-upload-plan/${name}`,
    remote_path: name,
    branch_folder: "",
    size: fs.statSync(localFile).size,
    md5: checksum.md5,
    sha1: checksum.sha1,
    existing_remote: Boolean(existing),
    existing_remote_md5: existing?.md5 || "",
    proposed_action: existing ? "STOP-CONFLICT" : "upload-new",
    note: "Top-level human and machine-readable archive guide.",
  };
});

const uploadRows = [...missingImages, ...pdfRows, ...topFiles];
writeCsv(path.join(outputDir, "proposed-upload-manifest.csv"), uploadRows, [
  "type", "mapping_status", "local_path", "remote_path", "branch_folder", "size", "md5", "sha1", "existing_remote", "existing_remote_md5", "proposed_action", "note",
]);

const conflicts = uploadRows.filter((item) => item.existing_remote);
const plan = {
  generatedAt: new Date().toISOString(),
  archiveIdentifier: "ldswelshmembership",
  uploadAuthorized: false,
  viewerSourceChangeAuthorized: false,
  counts: {
    missingImagesReady: missingImages.length,
    distinctPdfsInventoried: pdfRows.length,
    pdfsReady: pdfRows.filter((item) => item.mapping_status === "ready").length,
    pdfsNeedingMappingReview: pdfRows.filter((item) => item.mapping_status !== "ready").length,
    topLevelGuideFiles: topFiles.length,
    proposedNewUploadObjectsIfAllPdfMappingsApproved: uploadRows.filter((item) => !item.existing_remote).length,
    existingRemotePathConflicts: conflicts.length,
  },
  safeguards: {
    verifiedExistingImagesExcluded: audit.totals.exactPathChecksumMatches,
    overwriteAllowed: false,
    renameAllowed: false,
    duplicateUploadAllowed: false,
    preflightRule: "Stop if any proposed remote path appears in fresh Archive.org metadata or if any local MD5 changes.",
    postUploadRule: "Rerun reconciliation and require zero missing intended images and zero checksum conflicts before Viewer integration.",
  },
  recommendedMethod: {
    client: "Official internetarchive ia CLI version 5.4.2 or newer (current 5.7.x preferred).",
    approach: "Create a temporary staging tree containing only approved manifest rows, preserving relative paths; then use ia upload with --keep-directories, --checksum, --verify, and retries. Re-fetch metadata and rerun the checksum audit afterward.",
    reason: "A staging tree avoids command-line length limits and makes it impossible for already-verified images to be selected accidentally.",
  },
  conflicts,
  pdfMappings: pdfRows,
};
fs.writeFileSync(path.join(outputDir, "plan.json"), `${JSON.stringify(plan, null, 2)}\n`, "utf8");

console.log(JSON.stringify(plan.counts, null, 2));
