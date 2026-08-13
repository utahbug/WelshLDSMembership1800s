import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(process.argv[2] || path.join(import.meta.dirname, "../build/research-beta"));
const failures = [];
const files = fs.readdirSync(root, { recursive: true }).map(String).map((name) => name.replaceAll("\\", "/"));
if (files.some((name) => name.startsWith("data/private/") || /\.local\.(?:js|json|csv)$/i.test(name))) failures.push("private/local artifact present");
for (const file of files.filter((name) => /\.(?:html|js|json|css|txt|md|csv)$/i.test(name))) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  if (/data\/private\//i.test(text)) failures.push(`${file}: private-data path reference`);
  if (/[A-Z]:[\\/]Users[\\/]/i.test(text)) failures.push(`${file}: local Windows path reference`);
}

const htmlFiles = files.filter((name) => name.endsWith(".html"));
for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(root, file), "utf8");
  if (!/<meta name="robots" content="noindex,nofollow,noarchive">/.test(html)) failures.push(`${file}: no noindex metadata`);
  if (/data\/private\//.test(html)) failures.push(`${file}: private link/reference`);
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const value = match[1];
    if (/^(?:https?:|mailto:|#|data:)/i.test(value) || /\{/.test(value)) continue;
    const relative = decodeURIComponent(value.split(/[?#]/)[0]);
    if (!relative) continue;
    const target = path.resolve(path.dirname(path.join(root, file)), relative);
    if (!fs.existsSync(target)) failures.push(`${file}: missing ${value}`);
  }
}

const peopleContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "data/beta/people-index.beta.js"), "utf8"), peopleContext);
const people = peopleContext.window.WELSH_PEOPLE_BETA_INDEX;
if (!people?.betaPublicIndex || people.records.length !== 11473) failures.push("Member Search beta index count/marker invalid");
if (people.records.some((record) => !record.verified || record.occurrenceType !== "member")) failures.push("Unverified/non-member record in Member Search beta");
if (people.records.some((record) => record.onlineViewerAvailable && (!record.collectionId || !record.imageFilename && !record.imageSequence))) failures.push("Online member result lacks exact viewer target");

const saintsContext = { window: {} };
const saintsText = fs.readFileSync(path.join(root, "data/beta/welsh-saints-index.beta.js"), "utf8");
vm.runInNewContext(saintsText, saintsContext);
const saints = saintsContext.window.WELSH_SAINTS_BETA_INDEX;
if (!saints?.betaPublicIndex || saints.records.length !== 7234) failures.push("Welsh Saints beta count/marker invalid");
if (/detailText|Spouses and Children|Vital Information\s+Close/.test(saintsText)) failures.push("Welsh Saints full prose/private field leaked");
if (saints.records.some((record) => !/^https:\/\/welshsaints\.byu\.edu\//.test(record.url))) failures.push("Invalid Welsh Saints canonical URL");

const report = JSON.parse(fs.readFileSync(path.join(root, "RESEARCH_BETA_BUILD_REPORT.json"), "utf8"));
if (!report.noIndex || report.privacy.dataPrivateIncluded || report.privacy.privateLeaks.length) failures.push("Build privacy report failed");
if (!fs.existsSync(path.join(root, "robots.txt")) || !/Disallow:\s*\//.test(fs.readFileSync(path.join(root, "robots.txt"), "utf8"))) failures.push("robots.txt does not disallow crawling");
if (!fs.existsSync(path.join(root, "familysearch-comparison.html"))) failures.push("FamilySearch comparison beta artifact missing");
if (!report.researchSupportPages?.every((file) => fs.existsSync(path.join(root, file)))) failures.push("Research-support page missing");

const registry = JSON.parse(fs.readFileSync(path.join(root, "data/branch-registry.json"), "utf8")).registry || [];
const canonicalNames = new Set(registry.map((branch) => branch.canonicalName));
if (!registry.length || report.branchRoutes?.canonicalBranches !== registry.length || report.branchRoutes?.audited !== registry.length || report.branchRoutes?.routes?.length !== registry.length) failures.push("Canonical branch route audit count invalid");
const duplicateBranches = registry.map((branch) => branch.canonicalName).filter((name, index, names) => names.indexOf(name) !== index);
if (duplicateBranches.length) failures.push(`Duplicate canonical branch routes: ${duplicateBranches.join(", ")}`);
const historicalNames = JSON.parse(fs.readFileSync(path.join(root, "data/historical-names.json"), "utf8"));
if (historicalNames.canonicalCount !== registry.length) failures.push("Historical Names canonical count is stale");
for (const row of historicalNames.rows || []) {
  if (row.canonicalName && !canonicalNames.has(row.canonicalName)) failures.push(`Historical Names references retired canonical branch: ${row.name} -> ${row.canonicalName}`);
  if (row.resourceUrl && !report.branchRoutes.routes.includes(row.resourceUrl)) failures.push(`Historical Names has broken branch route: ${row.resourceUrl}`);
}

const coreContext = {};
vm.runInNewContext(fs.readFileSync(path.join(root, "people-search-core.js"), "utf8"), coreContext);
const core = coreContext.WELSH_PEOPLE_SEARCH_CORE;
const catalogContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "data/catalog.public.js"), "utf8"), catalogContext);
const collections = new Map(catalogContext.window.WELSH_RECORD_CATALOG.collections.map((collection) => [collection.id, collection]));
const memberSearch = (query) => people.records.filter((record) => core.matches(record, query, collections.get(record.collectionId)));
if (!memberSearch("Thomas Phillips Stepaside 1810").some((record) => record.nameAsWritten === "Thomas Phillips" && record.birthDate)) failures.push("Beta birth-date search failed");
if (!memberSearch("May 24 1846").some((record) => record.nameAsWritten === "David Roberts" && record.baptismDate)) failures.push("Beta baptism-date search failed");
const thomasPhillips = memberSearch("Thomas Phillips Stepaside 1810").find((record) => record.nameAsWritten === "Thomas Phillips" && record.birthDate === "Augt 4th 1810");
const davidRoberts = memberSearch("David Roberts Ffestiniog 1846").find((record) => record.nameAsWritten === "David Roberts");
if (thomasPhillips?.birthDate !== "Augt 4th 1810") failures.push("Thomas Phillips original birth-date text missing from beta index");
if (davidRoberts?.baptismDate !== "Mai 24 46") failures.push("David Roberts original baptism-date text missing from beta index");
const alltwenMargaret = memberSearch("Margaret Lewis Alltwen Janr 14=23").find((record) => record.nameAsWritten === "Margaret Lewis" && record.entryNumber === "13");
const alltwenMary = memberSearch("Mary Lewis Alltwen Gorff 1/56").find((record) => record.nameAsWritten === "Mary Lewis" && record.entryNumber === "56");
const abersychanLydia = memberSearch("Lydia Sophia Wheeler 23 Jul 1884").find((record) => record.nameAsWritten === "Lydia Sophia Wheeler");
if (alltwenMargaret?.birthDate !== "Janr 14=23" || alltwenMargaret?.baptismDate !== "Mehef 16=49" || alltwenMargaret?.residence !== "Alltwen") failures.push("Alltwen entry 13 structured fields missing from beta index");
if (alltwenMary?.birthDate !== "Jan 17/48" || alltwenMary?.baptismDate !== "Gorff 1/56" || alltwenMary?.residence !== "Alltwen") failures.push("Alltwen entry 56 structured fields missing from beta index");
if (abersychanLydia?.baptismDate !== "23 Jul 1884") failures.push("Abersychan paragraph baptism correction missing from beta index");
const peopleHtml = fs.readFileSync(path.join(root, "people-search.html"), "utf8");
const peopleJs = fs.readFileSync(path.join(root, "people-search.js"), "utf8");
if (!/Loading member index…/.test(peopleHtml) || !/stepaside-backfill-20260813/.test(peopleHtml)) failures.push("Member Search loading state/cache key missing");
if (!peopleJs.includes("let searchStarted = false")) failures.push("Member Search should not render records before a search/filter action");
if (!peopleJs.includes("matches.slice(0, visibleLimit)")) failures.push("Member Search should batch result rendering");
if (!peopleJs.includes("Show more results")) failures.push("Member Search show-more control is missing");
for (const label of ["Birth:", "Baptism:", "Residence:", "Entry:"]) if (!peopleJs.includes(label)) failures.push(`Member result label missing: ${label}`);
if (people.records.some((record) => record.onlineViewerAvailable && record.sourceAvailability !== "online-viewer-available")) failures.push("Online viewer availability label mismatch");
if (people.records.some((record) => !record.onlineViewerAvailable && record.sourceAvailability === "online-viewer-available")) failures.push("Local-only source mislabeled online");
if (failures.length) throw new Error(failures.join("\n"));
console.log(JSON.stringify({
  root,
  files: files.length,
  htmlPages: htmlFiles.length,
  memberRecords: people.records.length,
  memberViewerAvailability: people.viewerAvailability,
  welshSaintsRecords: saints.records.length,
  welshSaintsCategories: saints.counts,
  typedExtractSearchIncluded: report.typedExtractSearchIncluded,
  canonicalBranchRoutes: report.branchRoutes.audited,
  researchSupportPages: report.researchSupportPages,
  birthSearchMatches: memberSearch("Thomas Phillips Stepaside 1810").length,
  baptismSearchMatches: memberSearch("May 24 1846").length,
  privateFiles: 0,
  brokenStaticLinks: 0,
}, null, 2));
