import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(import.meta.dirname, "..");
const destinationArg = process.argv[2];
if (!destinationArg) {
  console.error('Usage: node scripts/build-portable-drive.mjs "E:\\Welsh LDS Records"');
  process.exit(1);
}

const destination = path.resolve(destinationArg);
const markerPath = path.join(destination, ".welsh-records-portable");
const catalogSource = path.join(projectRoot, "data", "catalog.local.js");
if (!fs.existsSync(catalogSource)) throw new Error("Run node scripts/build-catalog.mjs first.");

if (fs.existsSync(destination)) {
  const contents = fs.readdirSync(destination);
  if (contents.length && !fs.existsSync(markerPath)) {
    throw new Error("The destination is not empty and is not an existing Welsh-records portable package. Choose an empty folder.");
  }
} else {
  fs.mkdirSync(destination, { recursive: true });
}
fs.writeFileSync(markerPath, "Welsh LDS records portable package\n", "utf8");

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(catalogSource, "utf8"), context);
const catalog = context.window.WELSH_RECORD_CATALOG;
const portableCatalog = structuredClone(catalog);
portableCatalog.edition = "portable";
let copied = 0;
let skipped = 0;
let copiedBytes = 0;

function portableRelativePath(item) {
  const archiveParts = item.serveUrl.split("/").filter(Boolean).slice(1).map(decodeURIComponent);
  return path.join("resources", ...archiveParts);
}

function copyResumable(source, target) {
  const sourceStat = fs.statSync(source);
  if (fs.existsSync(target) && fs.statSync(target).size === sourceStat.size) {
    skipped += 1;
    return;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  fs.utimesSync(target, sourceStat.atime, sourceStat.mtime);
  copied += 1;
  copiedBytes += sourceStat.size;
  if (copied % 100 === 0) console.log(`Copied ${copied} files...`);
}

for (const collection of portableCatalog.collections) {
  collection.availability = { local: true, portable: true, online: Boolean(collection.publicStorage) };
  for (const item of collection.images) {
    const source = fileURLToPath(item.url);
    const relative = portableRelativePath(item);
    copyResumable(source, path.join(destination, relative));
    const browserPath = relative.split(path.sep).map(encodeURIComponent).join("/");
    item.url = browserPath;
    item.serveUrl = browserPath;
  }
}

const portableFiles = [
  ["index.html", "index.html"],
  ["index.html", "START_HERE.html"],
  ["app.js", "app.js"],
  ["styles.css", "styles.css"],
  ["welsh-saints-research.html", "welsh-saints-research.html"],
  ["welsh-saints-research.js", "welsh-saints-research.js"],
  ["README.md", "PROJECT_README.md"],
  ["TRANSCRIPTION_INVENTORY.md", "TRANSCRIPTION_INVENTORY.md"],
  ["TRANSCRIPTION_STATUS_NOTES.md", "TRANSCRIPTION_STATUS_NOTES.md"],
  ["RECOVERY_PLACEHOLDERS.md", "RECOVERY_PLACEHOLDERS.md"],
  ["RIGHTS_AND_PROVENANCE.md", "RIGHTS_AND_PROVENANCE.md"],
  ["BRANCH_REGISTRY.csv", "BRANCH_REGISTRY.csv"],
  [path.join("outputs", "branch-registry", "Welsh-LDS-Branch-Registry.xlsx"), "Welsh-LDS-Branch-Registry.xlsx"],
];
for (const [sourceName, targetName] of portableFiles) {
  copyResumable(path.join(projectRoot, sourceName), path.join(destination, targetName));
}

const privateSourceDir = path.join(projectRoot, "data", "private");
const privateResearchFiles = [
  "welsh-saints-index.local.js",
  "welsh-saints-index.local.json",
  "welsh-saints-detail-cache.local.json",
  "welsh-saints-index-report.local.json",
];
for (const fileName of privateResearchFiles) {
  const source = path.join(privateSourceDir, fileName);
  if (!fs.existsSync(source)) throw new Error(`Missing private Welsh Saints file: ${source}. Run node scripts/build-welsh-saints-index.mjs first.`);
  copyResumable(source, path.join(destination, "data", "private", fileName));
}
const excludedPrivateFiles = fs.readdirSync(privateSourceDir, { withFileTypes: true })
  .map((entry) => entry.name)
  .filter((name) => !privateResearchFiles.includes(name));

fs.mkdirSync(path.join(destination, "data"), { recursive: true });
fs.writeFileSync(
  path.join(destination, "data", "catalog.local.js"),
  `window.WELSH_RECORD_CATALOG = ${JSON.stringify(portableCatalog)};\n`,
  "utf8",
);

const instructions = `WELSH LDS HISTORICAL RECORDS - PORTABLE EDITION

Start by opening START_HERE.html in a web browser.

This drive works offline. It contains a deduplicated working collection, conference-minute transcriptions, recovered research notes, recovery placeholders, the private full-text Welsh Saints research index, and clearly separated non-LDS Merthyr Bishop Records.

The Welsh Saints research index can be opened from About & tools or directly at welsh-saints-research.html. Search uses the copied local full-text index and does not require welshsaints.byu.edu. Original-record links still require internet access.

No original source archive was deleted or modified when this edition was built.

Important project documents:
- PROJECT_README.md
- TRANSCRIPTION_INVENTORY.md
- TRANSCRIPTION_STATUS_NOTES.md
- RECOVERY_PLACEHOLDERS.md
- RIGHTS_AND_PROVENANCE.md
- BRANCH_REGISTRY.csv
- Welsh-LDS-Branch-Registry.xlsx

If copying this package to another drive, copy the entire folder so its internal links remain intact.
`;
fs.writeFileSync(path.join(destination, "README_FIRST.txt"), instructions, "utf8");

const result = {
  destination,
  copiedFiles: copied,
  skippedExistingFiles: skipped,
  copiedBytes,
  catalogItems: portableCatalog.stats.uniqueItems,
  privateResearchFiles: privateResearchFiles.map((name) => path.posix.join("data", "private", name)),
  excludedPrivateFiles,
};
fs.writeFileSync(path.join(destination, "PORTABLE_BUILD_REPORT.json"), JSON.stringify(result, null, 2), "utf8");
console.log(JSON.stringify(result, null, 2));
