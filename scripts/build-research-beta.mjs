import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const output = path.resolve(process.argv[2] || path.join(root, "build/research-beta"));
const privateDir = path.join(root, "data/private");
const betaDataDir = path.join(output, "data/beta");
const discoverySourceDir = path.join(privateDir, "all-records-prototype");
const discoveryDataDir = path.join(output, "data/discovery");
const betaIconNames = ["favicon-beta.svg", "favicon-beta-32.png", "apple-touch-icon-beta.png", "app-icon-beta-192.png", "app-icon-beta-512.png"];
const betaIconFallback = path.join(root, "build/research-beta/assets");
const betaIconBuffers = new Map(betaIconNames.map((file) => {
  const primary = path.join(root, "research-beta/assets", file);
  const fallback = path.join(betaIconFallback, file);
  const source = fs.existsSync(primary) ? primary : fallback;
  if (!fs.existsSync(source)) throw new Error(`Missing Research Beta icon source: ${file}`);
  return [file, fs.readFileSync(source)];
}));

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const copy = (source, destination) => {
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
};
const copyTree = (source, destination, accept = () => true) => {
  if (!fs.existsSync(source)) return;
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name), to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyTree(from, to, accept);
    else if (accept(from)) copy(from, to);
  }
};

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

const rootFiles = [
  ".nojekyll", "about.html", "app.js", "branch-registry.html", "feedback.js", "historical-names.html", "index.html",
  "local-private-features.js", "navigation.js", "branch-members.js", "source-transition.js", "people-search-core.js", "people-search.html", "people-search.js",
  "all-records-discovery.js", "search-page-navigation.js",
  "research-page-nav.css", "site.webmanifest", "styles.css", "transcriptions-translations.html", "welsh-saints-research.html", "welsh-saints-research.js", "beta-presentation-polish.js",
  "work-remaining.html", "WelshRecord-CreatingCommit1.jpg",
  "BRANCH_REGISTRY.csv",
];
for (const file of rootFiles) copy(path.join(root, file), path.join(output, file));
copyTree(path.join(root, "assets"), path.join(output, "assets"));
for (const [file, bytes] of betaIconBuffers) fs.writeFileSync(path.join(output, "assets", file), bytes);
copy(path.join(root, "research-beta/site.webmanifest"), path.join(output, "site.webmanifest"));
copy(path.join(root, "outputs/branch-registry/Welsh-LDS-Branch-Registry.xlsx"), path.join(output, "outputs/branch-registry/Welsh-LDS-Branch-Registry.xlsx"));
for (const file of ["catalog.public.js", "historical-names.js", "historical-names.json"]) {
  copy(path.join(root, "data", file), path.join(output, "data", file));
}
const sanitizePublicValue = (value) => {
  if (Array.isArray(value)) return value.map(sanitizePublicValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !["localPath", "localFile", "localDirectory", "sourcePath"].includes(key))
    .map(([key, child]) => [key, sanitizePublicValue(child)]));
};
const publicBranchRegistry = sanitizePublicValue(readJson(path.join(root, "data/branch-registry.json")));
fs.writeFileSync(path.join(output, "data/branch-registry.json"), `${JSON.stringify(publicBranchRegistry, null, 2)}\n`);
fs.writeFileSync(path.join(output, "data/branch-registry.js"), `window.WELSH_BRANCH_REGISTRY = ${JSON.stringify(publicBranchRegistry)};\n`);
// Typed transcript PDFs and their generated viewer pages are intentionally excluded until publication status is reviewed.

// Generate an allowlisted researcher-review artifact; never copy the private
// comparison HTML or expose its private/local path.
const comparisonSource = readJson(path.join(privateDir, "familysearch-comparison.local.json"));
const comparisonRows = (comparisonSource.rows || []).map((row) => ({
  familySearchBranch: String(row.familySearchBranch || ""),
  canonicalBranch: String(row.canonicalBranch || ""),
  familySearchCoverage: String(row.familySearchCoverage || ""),
  ourCoverage: String(row.ourCoverage || ""),
  visibleCollections: String(row.visibleCollections ?? ""),
  status: String(row.status || ""),
  matchGroup: String(row.matchGroup || ""),
  notes: String(row.notes || ""),
  provenance: String(row.provenance || ""),
  sourceIdentifier: String(row.sourceIdentifier || ""),
}));
const comparisonGroups = [...new Set(comparisonRows.map((row) => row.matchGroup).filter(Boolean))].sort();
const comparisonBody = comparisonRows.map((row) => `<tr data-group="${escapeHtml(row.matchGroup)}"><td><strong>${escapeHtml(row.familySearchBranch)}</strong><small>${escapeHtml(row.provenance)}</small></td><td>${escapeHtml(row.canonicalBranch || "—")}</td><td>${escapeHtml(row.familySearchCoverage)}</td><td>${escapeHtml(row.ourCoverage)}<small>${escapeHtml(row.visibleCollections)} visible collection${row.visibleCollections === "1" ? "" : "s"}</small></td><td>${escapeHtml(row.status)}<small>${escapeHtml(row.matchGroup)}</small></td><td>${escapeHtml(row.notes)}${row.sourceIdentifier ? `<small>Source: ${escapeHtml(row.sourceIdentifier)}</small>` : ""}</td></tr>`).join("");
const comparisonHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FamilySearch Branch Comparison</title><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="research-page-nav.css"><style>.comparison-main{max-width:1500px;margin:auto;padding:24px}.comparison-note{padding:14px;border:1px solid var(--line);background:var(--panel)}.comparison-summary{display:flex;flex-wrap:wrap;gap:12px;margin:18px 0}.comparison-summary span{padding:10px 14px;background:var(--panel);border:1px solid var(--line)}.comparison-filters{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}.comparison-filters input,.comparison-filters select{min-height:42px;padding:8px;border:1px solid var(--line);background:white}.comparison-table{overflow:auto}.comparison-table table{width:100%;min-width:1050px;border-collapse:collapse;background:var(--panel)}.comparison-table th,.comparison-table td{padding:10px;vertical-align:top;border:1px solid var(--line);text-align:left}.comparison-table th{background:var(--green-dark);color:white}.comparison-table small{display:block;margin-top:4px;color:var(--muted)}@media(max-width:760px){.comparison-main{padding:12px}}</style></head><body id="page-top"><nav class="research-page-nav" aria-label="Page navigation"><a href="index.html">← Home</a><a href="#page-top">↑ Top</a><a href="#page-bottom">↓ Bottom</a></nav><main class="comparison-main"><h1>FamilySearch Branch Comparison</h1><p class="comparison-note"><strong>Research comparison scope:</strong> Project branch coverage compared with the preserved 2022 FamilySearch indexing-project map and bounded catalog references. This is not a person-level or exhaustive live FamilySearch crawl, and comparison mappings do not change the project registry.</p><div class="comparison-summary"><span><strong>${comparisonRows.length}</strong> comparison rows</span><span><strong>${Number(comparisonSource.summary?.directMatches || 0)}</strong> direct matches</span><span><strong>${Number(comparisonSource.summary?.aliasMatches || 0)}</strong> alias matches</span></div><div class="comparison-filters"><input id="comparisonQuery" type="search" placeholder="Filter branches or notes" aria-label="Filter comparison"><select id="comparisonGroup" aria-label="Filter by match group"><option value="">All groups</option>${comparisonGroups.map((group) => `<option>${escapeHtml(group)}</option>`).join("")}</select></div><p id="comparisonCount"></p><div class="comparison-table"><table><thead><tr><th>FamilySearch branch</th><th>Project branch</th><th>FamilySearch coverage</th><th>Project coverage</th><th>Status</th><th>Notes and evidence</th></tr></thead><tbody>${comparisonBody}</tbody></table></div></main><footer class="site-disclaimer" id="page-bottom"><details class="footer-project"><summary>Project</summary><nav aria-label="Project"><a href="about.html">About this project</a><a href="branch-registry.html">Branch coverage</a><a href="historical-names.html">Historical Names and Variants</a><a href="familysearch-comparison.html">FamilySearch comparison</a><a href="work-remaining.html">Work remaining</a></nav></details><p>Independent historical research project. This website is not an official publication of or endorsed by FamilySearch.</p></footer><script src="local-private-features.js"></script><script>const q=document.querySelector('#comparisonQuery'),g=document.querySelector('#comparisonGroup'),rows=[...document.querySelectorAll('tbody tr')],count=document.querySelector('#comparisonCount');function filterComparison(){const term=q.value.toLowerCase(),group=g.value;let shown=0;for(const row of rows){const visible=(!term||row.textContent.toLowerCase().includes(term))&&(!group||row.dataset.group===group);row.hidden=!visible;if(visible)shown++}count.textContent=shown+' comparison rows shown'}q.addEventListener('input',filterComparison);g.addEventListener('change',filterComparison);filterComparison();</script></body></html>`;
const comparisonHtmlWithFeedback = comparisonHtml.replace("</body>", '<script src="feedback.js?v=email-feedback-20260813"></script></body>');
fs.writeFileSync(path.join(output, "familysearch-comparison.html"), comparisonHtmlWithFeedback);

const catalogContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "data/catalog.public.js"), "utf8"), catalogContext);
const catalog = catalogContext.window.WELSH_RECORD_CATALOG;
const collections = new Map(catalog.collections.map((collection) => [collection.id, collection]));
const archiveInventoryPath = path.join(root, "tmp/archive-remote-paths-ldswelshmembership.txt");
if (!fs.existsSync(archiveInventoryPath)) throw new Error("Archive.org path inventory is required. Refresh tmp/archive-remote-paths-ldswelshmembership.txt from the metadata API before building the beta.");
const remotePaths = new Set(fs.readFileSync(archiveInventoryPath, "utf8").split(/\r?\n/).filter(Boolean));
const betaCatalog = {
  ...catalog,
  edition: "public",
  researchBeta: true,
  collections: catalog.collections.map((collection) => {
    const imageRecords = collection.images.filter((image) => image.type === "image");
    const allImagesHosted = imageRecords.length > 0 && imageRecords.every((image) => image.archiveRelativePath && remotePaths.has(image.archiveRelativePath));
    const publishedPdf = collection.publicStorage?.provider === "github-pages" && collection.sourcePdfRelativePath && fs.existsSync(path.join(root, collection.sourcePdfRelativePath));
    const online = Boolean(allImagesHosted || publishedPdf);
    return { ...collection, availability: { ...collection.availability, online }, publicStorage: online ? collection.publicStorage : null };
  }),
};
fs.writeFileSync(path.join(output, "data/catalog.public.js"), `window.WELSH_RECORD_CATALOG = ${JSON.stringify(betaCatalog)};\n`);
const betaCollections = new Map(betaCatalog.collections.map((collection) => [collection.id, collection]));
const peopleMaster = readJson(path.join(privateDir, "people-index.local.json"));
const safeNotes = (value) => {
  const note = String(value || "").trim();
  if (!note || /\b(private|production transcription|manual review|ai-assisted|workflow)\b/i.test(note)) return undefined;
  const useful = note.split(/;\s*/).filter((part) => !/^[a-z0-9-]+(?:register|sequence|segment|production|ledger|rows?)$/i.test(part.trim()));
  return useful.join("; ") || undefined;
};
const memberAvailability = { onlineViewerAvailable: 0, localPortableOnly: 0, notYetHosted: 0 };
const memberRecords = peopleMaster.records.filter((record) => record.verified && record.occurrenceType === "member").map((record) => {
  const sourceCollection = collections.get(record.collectionId);
  const collection = betaCollections.get(record.collectionId);
  const image = collection?.images?.find((candidate) => candidate.name === record.imageFilename) || (record.imageSequence ? collection?.images?.[record.imageSequence - 1] : null);
  const exactImage = Boolean(image);
  const exactRemoteImage = Boolean(image?.archiveRelativePath && remotePaths.has(image.archiveRelativePath));
  const onlineViewerAvailable = Boolean(collection?.availability?.online && collection.publicStorage && exactImage && exactRemoteImage);
  const availability = onlineViewerAvailable ? "online-viewer-available" : sourceCollection ? "local-portable-only" : "not-yet-hosted";
  if (onlineViewerAvailable) memberAvailability.onlineViewerAvailable += 1;
  else if (collection) memberAvailability.localPortableOnly += 1;
  else memberAvailability.notYetHosted += 1;
  const result = {
    nameAsWritten: record.nameAsWritten,
    normalizedName: record.normalizedName,
    aliases: record.aliases || [],
    branch: record.branch,
    sourceBranchSpelling: record.sourceBranchSpelling || null,
    birthDate: record.birthDate || null,
    baptismDate: record.baptismDate || null,
    residence: record.residence || null,
    year: record.year || null,
    date: record.date || null,
    entryNumber: record.entryNumber || null,
    collectionId: record.collectionId || null,
    collectionName: collection?.name || null,
    imageFilename: record.imageFilename || null,
    imageSequence: record.imageSequence || null,
    pageNumber: record.pageNumber || null,
    notes: safeNotes(record.notes) || null,
    verified: true,
    occurrenceType: "member",
    onlineViewerAvailable,
    sourceAvailability: availability,
  };
  return result;
});

fs.mkdirSync(betaDataDir, { recursive: true });
const peoplePayload = {
  betaPublicIndex: true,
  version: 1,
  generatedAt: new Date().toISOString(),
  branchAliases: peopleMaster.branchAliases || {},
  counts: { occurrences: memberRecords.length, members: memberRecords.length, associated: 0, withBirthDate: memberRecords.filter((r) => r.birthDate).length, withBaptismDate: memberRecords.filter((r) => r.baptismDate).length },
  viewerAvailability: memberAvailability,
  records: memberRecords,
};
fs.writeFileSync(path.join(betaDataDir, "people-index.beta.js"), `window.WELSH_PEOPLE_BETA_INDEX = ${JSON.stringify(peoplePayload)};\n`);

// Package the reviewed Full search adapter data without copying authoritative
// private indexes, source PDFs, complete page prose, or local path metadata.
const discoveryReport = readJson(path.join(discoverySourceDir, "build-report.json"));
const expectedDiscoveryCounts = { members: 11473, transcription: 663, welshSaints: 7234, ronDennisPages: 6971, ronDennisSourceRecords: 13, allRecords: 26354 };
for (const [key, value] of Object.entries(expectedDiscoveryCounts)) {
  if (discoveryReport.counts?.[key] !== value) throw new Error(`Full search count mismatch for ${key}: ${discoveryReport.counts?.[key]} != ${value}`);
}
fs.mkdirSync(discoveryDataDir, { recursive: true });
for (const file of [...discoveryReport.metadataFiles, ...discoveryReport.termFiles].map((item) => item.file)) copy(path.join(discoverySourceDir, file), path.join(discoveryDataDir, file));
const discoveryManifest = {
  schemaVersion: discoveryReport.schemaVersion,
  researchBeta: true,
  counts: discoveryReport.counts,
  termShardCount: discoveryReport.termShardCount,
  metadataShardSize: discoveryReport.metadataShardSize,
  metadataFiles: discoveryReport.metadataFiles,
  termFiles: discoveryReport.termFiles,
  publicationSources: discoveryReport.bookReports.map(({ title, pages, textPages, sourceType, publicAvailability }) => ({ title, pages, textPages, sourceType, publicAvailability })),
  transcriptClassification: {
    sourceTextPages: discoveryReport.transcriptClassification.sourceTextPages,
    includedInFullSearch: discoveryReport.transcriptClassification.includedInFullSearch,
    excludedFromFullSearch: discoveryReport.transcriptClassification.excludedFromFullSearch,
    administrativeProgressPages: 3,
    structuralCatalogPages: 25,
    mixedContentReview: discoveryReport.transcriptClassification.mixedContentReview,
    pagesWithoutUsableEmbeddedText: discoveryReport.transcriptClassification.pagesWithoutUsableEmbeddedText,
  },
  rightsNote: discoveryReport.rightsNote,
};
fs.writeFileSync(path.join(discoveryDataDir, "manifest.js"), `window.ALL_RECORDS_DISCOVERY_MANIFEST = ${JSON.stringify(discoveryManifest)};\n`);

const saintsMaster = readJson(path.join(privateDir, "welsh-saints-index.local.json"));
const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, "").toLocaleLowerCase("en");
const tokenString = (record) => [...new Set(normalize([record.detailText, record.title, record.summary, ...(record.cells || []), ...(record.categories || []), ...(record.matchedBranches || [])].join(" ")).match(/[a-z0-9]+/g) || [])].join(" ");
const saintsRecords = saintsMaster.records.filter((record) => ["immigrant", "voyage", "resource"].includes(record.type)).map((record) => ({
  type: record.type,
  sourceId: record.sourceId,
  title: record.title,
  summary: record.summary,
  cells: record.cells || [],
  category: record.category || null,
  categories: record.categories || [],
  matchedBranches: record.matchedBranches || [],
  url: record.url,
  searchTerms: tokenString(record),
}));
const saintsCounts = Object.fromEntries(["immigrant", "voyage", "resource"].map((type) => [type, saintsRecords.filter((record) => record.type === type).length]));
const saintsPayload = { betaPublicIndex: true, version: 1, generatedAt: new Date().toISOString(), source: "Welsh Saints Project", counts: saintsCounts, records: saintsRecords };
fs.writeFileSync(path.join(betaDataDir, "welsh-saints-index.beta.js"), `window.WELSH_SAINTS_BETA_INDEX = ${JSON.stringify(saintsPayload)};\n`);

const betaFlag = '<script>window.WELSH_RESEARCH_BETA=true;</script>';
const robots = '<meta name="robots" content="noindex,nofollow,noarchive">';
const note = '<p class="research-beta-note">Research beta — records, classifications, and source relationships continue to be reviewed and expanded.</p>';
for (const file of fs.readdirSync(output).filter((name) => name.endsWith(".html"))) {
  const target = path.join(output, file);
  let html = fs.readFileSync(target, "utf8");
  html = html.replace(/<head>/i, `<head>\n  ${robots}`);
  html = html.replaceAll("assets/favicon.svg", "assets/favicon-beta.svg")
    .replaceAll("assets/favicon-32.png", "assets/favicon-beta-32.png")
    .replaceAll("assets/apple-touch-icon.png", "assets/apple-touch-icon-beta.png");
  const betaIconLinks = '<link rel="icon" href="assets/favicon-beta.svg" type="image/svg+xml"><link rel="icon" href="assets/favicon-beta-32.png" sizes="32x32" type="image/png"><link rel="apple-touch-icon" href="assets/apple-touch-icon-beta.png" sizes="180x180"><link rel="manifest" href="site.webmanifest"><meta name="theme-color" content="#163c31">';
  if (!/apple-touch-icon/i.test(html)) html = /<link rel="icon" href="assets\/favicon-beta\.svg"/i.test(html)
    ? html.replace(/(<link rel="icon" href="assets\/favicon-beta\.svg" type="image\/svg\+xml">)/i, '$1<link rel="icon" href="assets/favicon-beta-32.png" sizes="32x32" type="image/png"><link rel="apple-touch-icon" href="assets/apple-touch-icon-beta.png" sizes="180x180"><link rel="manifest" href="site.webmanifest"><meta name="theme-color" content="#163c31">')
    : html.replace(/<\/head>/i, `  ${betaIconLinks}\n</head>`);
  html = html.replace(/<\/head>/i, `  ${betaFlag}\n</head>`);
  html = html.replace(/<footer\b/i, `${note}\n  <footer`);
  html = html.replace(/<script src="data\/catalog\.local\.js[^>]*><\/script>/g, "");
  if (file === "people-search.html") html = html
    .replace('<a href="#people-search-controls">&uarr; Search</a>', '<a class="research-nav-icon" href="#people-search-controls" aria-label="Go to search"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 14 6-6 6 6"/></svg></a>')
    .replace('<a href="#page-bottom">&darr; Bottom</a>', '<a class="research-nav-icon" href="#page-bottom" aria-label="Go to bottom"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 10 6 6 6-6"/></svg></a>');
  if (file === "welsh-saints-research.html") html = html
    .replace('<a href="#welsh-saints-search-controls">&uarr; Search</a>', '<a class="research-nav-icon" href="#welsh-saints-search-controls" aria-label="Go to search"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 14 6-6 6 6"/></svg></a>')
    .replace('<a href="#page-bottom">&darr; Bottom</a>', '<a class="research-nav-icon" href="#page-bottom" aria-label="Go to bottom"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 10 6 6 6-6"/></svg></a>');
  html = html.replace(/<p class="home-secondary" data-local-feature hidden><a href="data\/private\/familysearch-comparison\.local\.html">Research comparisons<\/a>[\s\S]*?<\/p>/, "");
  if (file === "people-search.html") html = html
    .replace(/<script src="all-records-discovery\.js[^>]*><\/script>/, '<script>window.ALL_RECORDS_DISCOVERY_BASE="data/discovery/";</script><script src="all-records-discovery.js?v=full-search-beta-20260814"></script>')
    .replace(/<script src="people-search\.js[^>]*><\/script>/, '<script src="data/branch-registry.js?v=date-interpretation-20260814"></script><script src="data/beta/people-index.beta.js?v=member-fields-20260813"></script><script src="source-transition.js?v=source-transition-20260814"></script><script src="people-search.js?v=full-search-beta-20260814"></script><script src="beta-presentation-polish.js?v=beta-polish-20260814"></script>');
  if (file === "index.html") html = html
    .replace(/styles\.css\?v=[^"]+/, "styles.css?v=branch-context-cleanup-20260814")
    .replace(/data\/branch-registry\.js\?v=[^"]+/, "data/branch-registry.js?v=branch-members-20260814")
    .replace(/app\.js\?v=[^"]+/, "app.js?v=branch-context-cleanup-20260814")
    .replace(/navigation\.js\?v=[^"]+/, "navigation.js?v=branch-members-20260814")
    .replace("Search indexed members across Welsh branches.", "Search members across Welsh branches.")
    .replace('<section class="home-search" aria-labelledby="homeSearchTitle"><h3 id="homeSearchTitle">', '<section class="home-search" aria-labelledby="homeSearchTitle"><span class="home-category-label">Resources</span><h3 id="homeSearchTitle">')
    .replace('<a class="home-path-card" href="index.html?view=branches"><strong>', '<a class="home-path-card" href="index.html?view=branches"><span class="home-category-label">Branches</span><strong>')
    .replace('<a class="home-path-card" href="people-search.html" data-local-feature hidden><strong>', '<a class="home-path-card" href="people-search.html" data-local-feature hidden><span class="home-category-label">People</span><strong>')
    .replace('<a class="home-path-card" href="welsh-saints-research.html" data-local-feature hidden><strong>', '<a class="home-path-card" href="welsh-saints-research.html" data-local-feature hidden><span class="home-category-label">Welsh Saints Project</span><strong>')
    .replace('<div class="directory-heading"><h3>Identified nineteenth-century branches</h3><p id="collectionCount"></p></div><nav class="branch-grid" id="branchList"', `<div class="presentation-directory-top">
      <div class="directory-heading"><h3>Identified nineteenth-century branches</h3><p id="collectionCount"></p></div>
      <details class="presentation-branch-review">
        <summary aria-expanded="false">Possible branches under review</summary>
        <div class="presentation-branch-review-content">
          <p>Historically documented branch candidates not yet added to the canonical branch list.</p>
          <ul class="presentation-branch-candidates" aria-label="Stronger branch candidates">
            <li>Aberaman</li><li>Aberdare</li><li>Abergavenny</li><li>Beaufort</li><li>Brecon</li><li>Broadway</li><li>Cefn Mawr</li><li>Cwmbach</li><li>Freystrop</li><li>Gellifaelog</li><li>Hirwaun</li><li>Lawrenny</li><li>Llantrisant</li><li>Manorbier</li><li>Mountain Ash</li><li>Pembroke</li><li>Victoria</li><li>Ynysgau</li>
          </ul>
          <h3>Early border branches needing locality/spelling review</h3>
          <ul class="presentation-branch-candidates presentation-border-candidates">
            <li>Hewshovell</li><li>Lancathy</li><li>Llanellen</li><li>Llanfoist</li><li>Llantoney Abbey</li><li>Longtown</li><li>Welsh Iron Works</li>
          </ul>
        </div>
      </details>
    </div><nav class="branch-grid" id="branchList"`)
    .replace(/<\/section>\r?\n    <nav class="viewer-breadcrumbs" id="branchResourceBreadcrumbs"/, `</section>
    <div class="presentation-research-links">
      <div class="presentation-transcript-link"><a href="transcriptions-translations.html">Transcriptions &amp; Translations</a></div>
    </div>
    <nav class="viewer-breadcrumbs" id="branchResourceBreadcrumbs"`)
    .replace('<div class="pre-footer-feedback" data-branch-feedback></div><div class="pre-footer-feedback" data-home-feedback></div>', '<div class="pre-footer-feedback" data-branch-feedback></div>')
    .replace("</footer>", `</footer><div class="pre-footer-feedback presentation-footer-feedback" data-home-feedback></div>
    <script>
      document.querySelectorAll(".presentation-branch-review").forEach((disclosure) => {
        const summary = disclosure.querySelector("summary");
        const syncExpanded = () => summary.setAttribute("aria-expanded", disclosure.open ? "true" : "false");
        disclosure.addEventListener("toggle", syncExpanded);
        syncExpanded();
      });
    </script>`)
    .replace(/<script src="app\.js([^>]*)><\/script>/, '<script src="source-transition.js?v=source-transition-20260814"></script><script src="app.js$1></script>')
    .replace(/<script src="navigation\.js([^>]*)><\/script>/, '<script src="navigation.js$1></script><script src="data/beta/people-index.beta.js?v=branch-members-20260814"></script><script src="branch-members.js?v=branch-context-cleanup-20260814"></script><script src="beta-presentation-polish.js?v=beta-polish-20260814"></script>');
  if (file === "welsh-saints-research.html") html = html.replace(/<script src="feedback\.js([^>]*)><\/script>/, '<script src="beta-presentation-polish.js?v=beta-polish-20260814"></script><script src="feedback.js$1></script>');
  if (file === "welsh-saints-research.html") html = html.replace(/<script src="data\/private\/welsh-saints-index\.local\.js[^>]*><\/script><script src="data\/private\/typed-branch-record-index\.local\.js[^>]*><\/script>/, '<script src="data/beta/welsh-saints-index.beta.js"></script>');
  fs.writeFileSync(target, html);
}
const peopleSearchTarget = path.join(output, "people-search.js");
let betaPeopleSearch = fs.readFileSync(peopleSearchTarget, "utf8");
betaPeopleSearch = betaPeopleSearch.replace(
  /  if \(betaIndex\?\.betaPublicIndex\) \{ initialize\(\); return; \}\r?\n  const privateScript[\s\S]*?  document\.head\.append\(privateScript\);/,
  "  if (betaIndex?.betaPublicIndex) { initialize(); return; }\n  unavailable.hidden = false; return;",
);
if (/data\/private\//.test(betaPeopleSearch)) throw new Error("Member Search beta script still contains a private-data path.");
fs.writeFileSync(peopleSearchTarget, betaPeopleSearch);
const betaAppTarget = path.join(output, "app.js");
let betaApp = fs.readFileSync(betaAppTarget, "utf8")
  .replace(/    buildPageIndex\(\);\r?\n    setView\(initialView\);/, "    strip.replaceChildren();\n    setView(initialView);")
  .replace(/  function openPageIndex\(\) \{\r?\n    pageIndexPanel\.hidden = false;/, "  function openPageIndex() {\n    if (!strip.children.length) buildPageIndex();\n    pageIndexPanel.hidden = false;")
  .replace(/    if \(branch\) openBranch\(branch\);\r?\n    else currentBranchName = \"\";/, "    currentBranchName = branch || \"\";");
fs.writeFileSync(betaAppTarget, betaApp, "utf8");
fs.appendFileSync(path.join(output, "styles.css"), `
.home-category-label { display: block; margin: 0 0 5px; color: var(--gold-dark, #8a6b20); font: 600 .69rem/1.2 Arial, sans-serif; letter-spacing: .08em; text-transform: uppercase; }
.home-path-card .home-category-label { margin-bottom: 6px; }
.branch-member-count, .resource-member-count { display: block; color: var(--muted); font: 400 .75rem/1.35 Arial, sans-serif; }
.branch-member-count { margin-top: 3px !important; }
.branch-members-content { padding-top: 12px; }
.branch-member-filter { display: block; margin: 0 0 12px; max-width: 380px; color: var(--muted); font: 400 .78rem/1.35 Arial, sans-serif; }
.branch-member-filter span { display: block; margin-bottom: 4px; }
.branch-member-filter input { box-sizing: border-box; width: 100%; min-height: 40px; padding: 7px 10px; border: 1px solid var(--line); border-radius: 3px; background: white; color: var(--ink); font: 400 .92rem/1.3 Arial, sans-serif; }
.branch-member-filter input:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.branch-member-list { display: grid; gap: 1px; }
.branch-member-record { border-bottom: 1px solid var(--line); }
.branch-member-record > summary { min-height: 42px; padding: 10px 24px 9px 2px; color: var(--green-dark); cursor: pointer; font: 400 .94rem/1.35 Arial, sans-serif; }
.branch-members-section .branch-member-record > summary::after { transform: rotate(45deg) translateY(-2px); }
.branch-members-section .branch-member-record[open] > summary::after { transform: rotate(225deg) translate(-1px, -1px); }
.branch-member-record > summary:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.branch-member-record-details { padding: 0 4px 13px 18px; }
.branch-member-record-details dl { display: grid; gap: 4px; margin: 0; font: 400 .84rem/1.4 Arial, sans-serif; }
.branch-member-record-details dl div { display: grid; grid-template-columns: minmax(105px, max-content) minmax(0, 1fr); gap: 10px; }
.branch-member-record-details dt { color: var(--muted); font-weight: 600; }
.branch-member-record-details dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
.branch-member-record-details .people-result-action { margin: 10px 0 0; }
.source-route-status { width: min(420px, calc(100% - 32px)); margin: 26px auto; padding: 12px 14px; color: var(--green-dark); border-left: 3px solid var(--gold); background: var(--panel); font: 500 .9rem/1.4 Arial, sans-serif; }
.source-route-pending main > :not(.source-route-status) { visibility: hidden; }
.presentation-research-links { display: none; margin: calc(clamp(28px, 4vw, 54px) + 16px) 0 10px; font-family: Arial, sans-serif; }
body:has(#directoryPanel:not([hidden])) .presentation-research-links { display: block; }
.presentation-transcript-link a { color: var(--green-dark); font: 500 .9rem/1.4 Arial, sans-serif; text-decoration: none; }
.presentation-transcript-link a:hover, .presentation-transcript-link a:focus-visible { text-decoration: underline; text-underline-offset: 3px; }
.presentation-transcript-link a:focus-visible, .presentation-branch-review summary:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; border-radius: 2px; }
.presentation-directory-top { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, 520px); align-items: start; gap: 18px clamp(24px, 4vw, 52px); }
.presentation-directory-top .directory-heading { min-width: 0; }
.presentation-branch-review { width: 100%; margin-top: 1em; color: var(--ink); background: var(--panel); box-shadow: 0 1px 0 #d6cfbf; }
.presentation-branch-review summary { color: var(--green-dark); cursor: pointer; font: 500 .9rem/1.4 Arial, sans-serif; min-height: 44px; padding: 11px 28px 10px 18px; }
.presentation-branch-review-content { border-top: 2px solid var(--gold); margin: 0; padding: 12px 18px 14px; }
.presentation-branch-review-content p { font: 400 .88rem/1.5 Arial, sans-serif; margin: 0 0 8px; max-width: 62ch; }
.presentation-branch-review-content h3 { color: var(--ink); font: 600 .82rem/1.45 Arial, sans-serif; margin: 12px 0 5px; }
.presentation-branch-candidates { display: grid; grid-template-columns: repeat(3, minmax(120px, 1fr)); gap: 2px 18px; list-style: none; margin: 0; padding: 0; }
.presentation-branch-candidates li { font: 400 .86rem/1.45 Arial, sans-serif; }
.presentation-footer-feedback { margin-top: 10px; }
.directory-home-link, .directory-home-link:visited { color: var(--green-dark); font: 500 .8rem/1.25 Arial, sans-serif; text-decoration: none; }
.directory-home-link:hover, .directory-home-link:focus-visible { text-decoration: underline; text-underline-offset: 3px; }
.search-sticky-nav { padding-block: 3px; background: #fffdf8; }
.search-sticky-nav.is-stuck { border-bottom: 1px solid var(--gold); box-shadow: 0 3px 8px rgba(42, 49, 42, .12); }
.people-date-interpretations { margin: 8px 0 0; }
.people-date-interpretations .people-source-detail { margin: 2px 0; }
.viewer-portable-availability { margin: 3px 0 0; color: var(--muted); font: 400 .76rem/1.35 Arial, sans-serif; }
@media (max-width: 820px) { .presentation-directory-top { grid-template-columns: minmax(0, 1fr); gap: 10px; } .presentation-branch-review { margin: 0 0 6px; } }
@media (max-width: 520px) { .branch-member-record-details { padding-left: 8px; } .branch-member-record-details dl div { grid-template-columns: 1fr; gap: 0; } }
`, "utf8");
fs.writeFileSync(path.join(output, "local-private-features.js"), `(() => {
  if (window.WELSH_RESEARCH_BETA !== true) return;
  document.querySelectorAll("[data-local-feature]").forEach((element) => { element.hidden = false; });
  document.querySelectorAll(".footer-project nav").forEach((nav) => {
    const additions = [["historical-names.html", "Historical Names and Variants"], ["familysearch-comparison.html", "FamilySearch comparison"]];
    const workRemaining = nav.querySelector('[href="work-remaining.html"]');
    additions.forEach(([href, label]) => {
      if (nav.querySelector(\`[href="\${href}"]\`)) return;
      const link = document.createElement("a"); link.href = href; link.textContent = label;
      nav.insertBefore(link, workRemaining);
    });
  });
})();\n`);
fs.writeFileSync(path.join(output, "robots.txt"), "User-agent: *\nDisallow: /\n");

const outputFiles = fs.readdirSync(output, { recursive: true }).map(String).map((name) => name.replaceAll("\\", "/"));
const privateLeaks = outputFiles.filter((name) => name.startsWith("data/private/") || /\.local\.(?:js|json|csv)$/i.test(name));
if (privateLeaks.length) throw new Error(`Private files entered beta output: ${privateLeaks.join(", ")}`);
const serializedSaints = fs.readFileSync(path.join(betaDataDir, "welsh-saints-index.beta.js"), "utf8");
if (/detailText|Spouses and Children|Vital Information\s+Close/.test(serializedSaints)) throw new Error("Welsh Saints beta artifact contains prohibited prose/private fields.");
const serializedDiscovery = fs.readdirSync(discoveryDataDir).filter((name) => name.endsWith(".js")).map((name) => fs.readFileSync(path.join(discoveryDataDir, name), "utf8")).join("\n");
if (/[A-Z]:[\\/]Users[\\/]|resources[\\/]books|data[\\/]private|ron-dennis[^"\n]*\.pdf/i.test(serializedDiscovery)) throw new Error("Full search beta artifact contains a private path or source filename.");

const collectionHosting = catalog.collections.map((collection) => {
  const hosted = collection.images.filter((image) => image.archiveRelativePath && remotePaths.has(image.archiveRelativePath)).length;
  return { id: collection.id, name: collection.name, images: collection.images.length, hostedImages: hosted, status: hosted === collection.images.length && hosted > 0 ? "online-viewer-available" : hosted > 0 ? "partially-hosted" : "local-portable-only" };
});
const localOnlyCollections = collectionHosting.filter((collection) => collection.status !== "online-viewer-available");
const branchRegistry = readJson(path.join(root, "data/branch-registry.json")).registry || [];
const branchRoutes = branchRegistry.map((branch) => `index.html?branch=${encodeURIComponent(branch.canonicalName)}`);
const memberCollections = [...new Set(memberRecords.map((record) => record.collectionId).filter(Boolean))].map((id) => ({
  id,
  name: collections.get(id)?.name || null,
  records: memberRecords.filter((record) => record.collectionId === id).length,
  onlineViewerRecords: memberRecords.filter((record) => record.collectionId === id && record.onlineViewerAvailable).length,
  status: memberRecords.some((record) => record.collectionId === id && record.onlineViewerAvailable) ? (memberRecords.every((record) => record.collectionId !== id || record.onlineViewerAvailable) ? "online-viewer-available" : "partially-hosted") : "local-portable-only",
}));
const report = {
  edition: "unlisted-online-research-beta",
  generatedAt: new Date().toISOString(),
  output: path.relative(root, output).replaceAll("\\", "/"),
  noIndex: true,
  memberSearch: { records: memberRecords.length, viewerAvailability: memberAvailability, collections: memberCollections },
  welshSaints: { records: saintsRecords.length, categories: saintsCounts, completeProseIncluded: false },
  branchRoutes: { canonicalBranches: branchRegistry.length, audited: branchRoutes.length, routes: branchRoutes },
  researchSupportPages: ["about.html", "branch-registry.html", "historical-names.html", "work-remaining.html", "familysearch-comparison.html"],
  fullSearch: { counts: discoveryManifest.counts, artifactFiles: fs.readdirSync(discoveryDataDir).length, rightsNote: discoveryManifest.rightsNote },
  typedExtractSearchIncluded: true,
  localOnlyCollections,
  privacy: { dataPrivateIncluded: false, privateLeaks },
  files: outputFiles.length,
  archiveInventory: { item: "ldswelshmembership", remoteFiles: remotePaths.size },
};
fs.writeFileSync(path.join(output, "RESEARCH_BETA_BUILD_REPORT.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(output, "README-RESEARCH-BETA.txt"), `Unlisted research beta. Serve this folder over HTTP for review.\nNo security is implied by noindex. Private development data is intentionally absent.\nMember Search uses data/beta/people-index.beta.js. Welsh Saints Search uses data/beta/welsh-saints-index.beta.js and contains no complete detail-page prose.\n`);
console.log(JSON.stringify(report, null, 2));
