import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(process.argv[2] || path.join(import.meta.dirname, "../full"));
const files = [];
const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else files.push(target);
  }
};
walk(root);

const htmlFiles = files.filter((file) => file.endsWith(".html"));
const brokenLinks = [];
const noIndexFailures = [];
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  if (!/<meta name="robots" content="noindex,nofollow,noarchive">/i.test(html)) noIndexFailures.push(path.relative(root, file));
  const attributes = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const reference of attributes) {
    if (!reference || reference.includes("${") || /^(?:https?:|mailto:|#|data:|javascript:)/i.test(reference)) continue;
    const clean = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
    if (!clean) continue;
    const target = path.resolve(path.dirname(file), clean);
    if (!fs.existsSync(target)) brokenLinks.push({ page: path.relative(root, file), reference });
  }
}

const textFiles = files.filter((file) => /\.(?:html|js|json|css|txt|csv)$/i.test(file));
const leakPatterns = [
  /LOCAL DEVELOPMENT\s*[—-]\s*NOT PUBLISHED/i,
  /Local Development reading copy/i,
  /data[\\/]private/i,
  /C:\\Users\\kenro/i,
  /D:\\Users\\kenro/i,
  /:codex-file-citation/i,
  /member-data-completeness-(?:report|review-queue)\.local\.(?:json|csv)/i,
  /(?:^|["'])file:\/\//i,
];
const leaks = [];
for (const file of textFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const pattern of leakPatterns) if (pattern.test(text)) leaks.push({ file: path.relative(root, file), pattern: String(pattern) });
}

const catalogContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "data/catalog.public.js"), "utf8"), catalogContext);
const catalog = catalogContext.window.WELSH_RECORD_CATALOG;
const peopleContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "data/beta/people-index.beta.js"), "utf8"), peopleContext);
const people = peopleContext.window.WELSH_PEOPLE_BETA_INDEX;
const discoveryContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "data/discovery/manifest.js"), "utf8"), discoveryContext);
const discovery = discoveryContext.window.ALL_RECORDS_DISCOVERY_MANIFEST;

const requiredPages = ["index.html", "people-search.html", "welsh-saints-research.html", "transcriptions-translations.html", "about.html", "resources.html", "historical-names.html", "ronald-dennis-publications.html", "welsh-historical-publications.html", "publication-viewer.html"];
const missingPages = requiredPages.filter((file) => !fs.existsSync(path.join(root, file)));
const failures = [
  ...brokenLinks.map((item) => `Broken link: ${item.page} -> ${item.reference}`),
  ...noIndexFailures.map((file) => `Missing noindex: ${file}`),
  ...leaks.map((item) => `Private/local leak: ${item.file} (${item.pattern})`),
  ...missingPages.map((file) => `Missing page: ${file}`),
];
if (catalog.edition !== "public" || catalog.fullOnline !== true) failures.push("Catalog is not marked as the full public-storage edition.");
if (fs.existsSync(path.join(root, "resources/original-cds"))) failures.push("Local original-CD files were published; Full Online must use Archive.org and preserve reviewer-only exclusions.");
const runtimeContext = { window: { WELSH_FULL_ONLINE: true } };
vm.runInNewContext(fs.readFileSync(path.join(root, "data/catalog.public.js"), "utf8"), runtimeContext);
vm.runInNewContext(fs.readFileSync(path.join(root, "local-catalog-overrides.js"), "utf8"), runtimeContext);
const runtimeCatalog = runtimeContext.window.WELSH_RECORD_CATALOG;
const pontlanfraith = runtimeCatalog.collections.find((collection) => collection.id === "collection-47");
const archiveCollection = runtimeCatalog.collections.find((collection) => collection.publicStorage?.provider === "internet-archive" && collection.availability?.online);
const transcriptCollection = runtimeCatalog.collections.find((collection) => collection.viewerRepresentation && collection.sources?.includes("typed-viewer-pages"));
if (runtimeCatalog.edition !== "public" || !archiveCollection) failures.push("Full Online runtime no longer preserves public Archive.org source routing.");
if (pontlanfraith?.availability?.online || pontlanfraith?.publicStorage) failures.push("Pontlanfraith reviewer-only source images became publicly available.");
if (!transcriptCollection?.availability?.online || transcriptCollection?.publicStorage?.provider !== "full-online") failures.push("Packaged transcript viewer mappings are unavailable in Full Online.");
if (people.records?.length !== 11473) failures.push(`Member count is ${people.records?.length}, expected 11473.`);
if (discovery.counts?.allRecords !== 26354) failures.push(`Full Search count is ${discovery.counts?.allRecords}, expected 26354.`);

const report = {
  root,
  files: files.length,
  htmlPages: htmlFiles.length,
  bytes: files.reduce((sum, file) => sum + fs.statSync(file).size, 0),
  brokenLinks: brokenLinks.length,
  noIndexFailures: noIndexFailures.length,
  privateOrLocalLeaks: leaks.length,
  canonicalBranches: JSON.parse(fs.readFileSync(path.join(root, "FULL_ONLINE_BUILD_REPORT.json"), "utf8")).branchRoutes.canonicalBranches,
  memberRecords: people.records.length,
  fullSearchRecords: discovery.counts.allRecords,
  archiveCollections: catalog.collections.filter((collection) => collection.publicStorage?.provider === "internet-archive" && collection.availability?.online).length,
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
