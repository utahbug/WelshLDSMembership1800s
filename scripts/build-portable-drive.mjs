import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(import.meta.dirname, "..");
const destinationArg = process.argv[2];
const profile = process.argv.includes("--presentation") ? "presentation" : "research";
if (!destinationArg) {
  console.error('Usage: node scripts/build-portable-drive.mjs "E:\\Welsh LDS Records"');
  process.exit(1);
}

const packageRoot = path.resolve(destinationArg);
const destination = profile === "presentation" ? path.join(packageRoot, "LDSWelshMembers-Portable") : packageRoot;
const markerPath = profile === "presentation" ? path.join(destination, ".welsh-records-portable") : path.join(packageRoot, ".welsh-records-portable");
const catalogSource = path.join(projectRoot, "data", "catalog.local.js");
const privateSourceDir = path.join(projectRoot, "data", "private");
if (!fs.existsSync(catalogSource)) throw new Error("Run node scripts/build-catalog.mjs first.");

if (fs.existsSync(packageRoot)) {
  const contents = fs.readdirSync(packageRoot);
  if (contents.length && !fs.existsSync(markerPath)) {
    throw new Error("The destination is not empty and is not an existing Welsh-records portable package. Choose an empty folder.");
  }
} else {
  fs.mkdirSync(packageRoot, { recursive: true });
}
fs.mkdirSync(destination, { recursive: true });
fs.writeFileSync(markerPath, "Welsh LDS records portable package\n", "utf8");
fs.rmSync(path.join(destination, "RIGHTS_AND_PROVENANCE.md"), { force: true });

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(catalogSource, "utf8"), context);
const catalog = context.window.WELSH_RECORD_CATALOG;
const portableCatalog = structuredClone(catalog);
portableCatalog.edition = "portable";
if (profile === "presentation") {
  for (const collection of portableCatalog.collections) {
    collection.images = (collection.images || []).filter((item) => !/\.pdf$/i.test(item.name || item.url || ""));
  }
  portableCatalog.collections = portableCatalog.collections.filter((collection) => (collection.images || []).length);
}
let copied = 0;
let skipped = 0;
let copiedBytes = 0;

function portableRelativePath(item) {
  const archiveParts = item.serveUrl.split("/").filter(Boolean).slice(1).map(decodeURIComponent);
  return path.join("resources", ...archiveParts);
}

function copyResumable(source, target) {
  if (!fs.existsSync(source)) {
    if (fs.existsSync(target)) {
      skipped += 1;
      return;
    }
    throw new Error(`Portable source is unavailable and has not previously been packaged: ${source}`);
  }
  const sourceStat = fs.statSync(source);
  if (fs.existsSync(target)) {
    const targetStat = fs.statSync(target);
    if (targetStat.size === sourceStat.size && Math.abs(targetStat.mtimeMs - sourceStat.mtimeMs) < 2) {
      skipped += 1;
      return;
    }
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
  ["navigation.js", "navigation.js"],
  ["branch-members.js", "branch-members.js"],
  ["source-transition.js", "source-transition.js"],
  ["feedback.js", "feedback.js"],
  ["styles.css", "styles.css"],
  ["research-page-nav.css", "research-page-nav.css"],
  [path.join("data", "catalog.public.js"), path.join("data", "catalog.public.js")],
  [path.join("data", "branch-registry.js"), path.join("data", "branch-registry.js")],
  [path.join("data", "historical-names.js"), path.join("data", "historical-names.js")],
  [path.join("data", "historical-names.json"), path.join("data", "historical-names.json")],
  ["historical-names.html", "historical-names.html"],
  ["about.html", "about.html"],
  ["branch-registry.html", "branch-registry.html"],
  ["work-remaining.html", "work-remaining.html"],
  ["transcriptions-translations.html", "transcriptions-translations.html"],
  ["beta-presentation-polish.js", "beta-presentation-polish.js"],
  ["welsh-saints-research.html", "welsh-saints-research.html"],
  ["welsh-saints-research.js", "welsh-saints-research.js"],
  ["people-search.html", "people-search.html"],
  ["people-search-core.js", "people-search-core.js"],
  ["people-search.js", "people-search.js"],
  ["search-page-navigation.js", "search-page-navigation.js"],
  ["local-private-features.js", "local-private-features.js"],
  [path.join("data", "private", "familysearch-comparison.local.html"), path.join("data", "private", "familysearch-comparison.local.html")],
  [path.join("data", "private", "familysearch-ffestiniog-person-pilot.local.html"), path.join("data", "private", "familysearch-ffestiniog-person-pilot.local.html")],
  ["PRIVATE_PEOPLE_INDEX.md", "PRIVATE_PEOPLE_INDEX.md"],
  ["PRIVATE_BRANCH_IMAGE_MAP.md", "PRIVATE_BRANCH_IMAGE_MAP.md"],
  ["PRIVATE_BRANCH_INDEXING_WORKFLOW.md", "PRIVATE_BRANCH_INDEXING_WORKFLOW.md"],
  ["README.md", "PROJECT_README.md"],
  ["TRANSCRIPTION_INVENTORY.md", "TRANSCRIPTION_INVENTORY.md"],
  ["TRANSCRIPTION_STATUS_NOTES.md", "TRANSCRIPTION_STATUS_NOTES.md"],
  ["RECOVERY_PLACEHOLDERS.md", "RECOVERY_PLACEHOLDERS.md"],
  ["BRANCH_REGISTRY.csv", "BRANCH_REGISTRY.csv"],
  [path.join("outputs", "branch-registry", "Welsh-LDS-Branch-Registry.xlsx"), "Welsh-LDS-Branch-Registry.xlsx"],
  [path.join("scripts", "wales-branch-map.mjs"), path.join("scripts", "wales-branch-map.mjs")],
  [path.join("scripts", "lookup-wales-branch.mjs"), path.join("scripts", "lookup-wales-branch.mjs")],
  [path.join("scripts", "branch-index-workflow.mjs"), path.join("scripts", "branch-index-workflow.mjs")],
  [path.join("templates", "branch-indexing", "branch-config.template.json"), path.join("templates", "branch-indexing", "branch-config.template.json")],
  [path.join("templates", "branch-indexing", "page-classification.template.csv"), path.join("templates", "branch-indexing", "page-classification.template.csv")],
  [path.join("templates", "branch-indexing", "member-staging.template.csv"), path.join("templates", "branch-indexing", "member-staging.template.csv")],
  [path.join("templates", "branch-indexing", "review.template.csv"), path.join("templates", "branch-indexing", "review.template.csv")],
];
if (profile === "presentation") {
  portableFiles.splice(1, 1);
  for (let index = portableFiles.length - 1; index >= 0; index -= 1) {
    const sourceName = String(portableFiles[index][0]).replaceAll("\\", "/");
    if (/^(?:data\/private\/|PRIVATE_|scripts\/|templates\/|README\.md|TRANSCRIPTION_|RECOVERY_|BRANCH_REGISTRY\.csv)/i.test(sourceName)) portableFiles.splice(index, 1);
  }
  portableFiles.push(["all-records-discovery.js", "all-records-discovery.js"]);
  portableFiles.push(["site.webmanifest", "site.webmanifest"]);
}

function copyTree(source, target) {
  if (!fs.existsSync(source)) return;
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else copyResumable(from, to);
  }
}
for (const [sourceName, targetName] of portableFiles) {
  copyResumable(path.join(projectRoot, sourceName), path.join(destination, targetName));
}
if (profile === "presentation") {
  copyTree(path.join(projectRoot, "assets"), path.join(destination, "assets"));
  copyTree(path.join(projectRoot, "data", "private", "all-records-prototype"), path.join(destination, "data", "discovery"));
  const discoveryRuntimePath = path.join(destination, "all-records-discovery.js");
  fs.writeFileSync(discoveryRuntimePath, fs.readFileSync(discoveryRuntimePath, "utf8").replace('window.ALL_RECORDS_DISCOVERY_BASE || `data/${"private"}/all-records-prototype/`', 'window.ALL_RECORDS_DISCOVERY_BASE || "data/discovery/"'), "utf8");
  copyResumable(path.join(projectRoot, "research-beta", "data", "beta", "welsh-saints-index.beta.js"), path.join(destination, "data", "portable", "welsh-saints-index.portable.js"));
  const peopleSource = fs.readFileSync(path.join(privateSourceDir, "people-index.local.js"), "utf8")
    .replace("window.WELSH_PEOPLE_PRIVATE_INDEX", "window.WELSH_PEOPLE_PRIVATE_INDEX");
  fs.mkdirSync(path.join(destination, "data", "portable"), { recursive: true });
  fs.writeFileSync(path.join(destination, "data", "portable", "people-index.portable.js"), peopleSource, "utf8");
  const peopleJsPath = path.join(destination, "people-search.js");
  fs.writeFileSync(peopleJsPath, fs.readFileSync(peopleJsPath, "utf8").replace("data/private/people-index.local.js", "data/portable/people-index.portable.js"), "utf8");
  const peopleHtmlPath = path.join(destination, "people-search.html");
  fs.writeFileSync(peopleHtmlPath, fs.readFileSync(peopleHtmlPath, "utf8").replace(/<script src="people-search\.js([^>]*)><\/script>/, '<script src="data/branch-registry.js?v=date-interpretation-20260814"></script><script src="source-transition.js?v=source-transition-20260814"></script><script src="people-search.js$1></script><script src="beta-presentation-polish.js?v=beta-polish-20260814d"></script>'), "utf8");
  const portableAppPath = path.join(destination, "app.js");
  const portableApp = fs.readFileSync(portableAppPath, "utf8")
    .replace(/    buildPageIndex\(\);\r?\n    setView\(initialView\);/, "    strip.replaceChildren();\n    setView(initialView);")
    .replace(/  function openPageIndex\(\) \{\r?\n    pageIndexPanel\.hidden = false;/, "  function openPageIndex() {\n    if (!strip.children.length) buildPageIndex();\n    pageIndexPanel.hidden = false;")
    .replace(/    if \(branch\) openBranch\(branch\);\r?\n    else currentBranchName = \"\";/, "    currentBranchName = branch || \"\";");
  fs.writeFileSync(portableAppPath, portableApp, "utf8");
  const localFeaturesPath = path.join(destination, "local-private-features.js");
  fs.writeFileSync(localFeaturesPath, fs.readFileSync(localFeaturesPath, "utf8").replace('["data/private/familysearch-comparison.local.html", "FamilySearch comparison"]', '["familysearch-comparison.html", "FamilySearch comparison"]'), "utf8");
  const saintsHtmlPath = path.join(destination, "welsh-saints-research.html");
  const saintsHtml = fs.readFileSync(saintsHtmlPath, "utf8")
    .replace(/<script src="data\/private\/welsh-saints-index\.local\.js[^>]*><\/script>/, '<script src="data/portable/welsh-saints-index.portable.js"></script>')
    .replace(/<script src="data\/private\/typed-branch-record-index\.local\.js[^>]*><\/script>/, "")
    .replace(/<script src="feedback\.js([^>]*)><\/script>/, '<script src="beta-presentation-polish.js?v=beta-polish-20260814d"></script><script src="feedback.js$1></script>');
  fs.writeFileSync(saintsHtmlPath, saintsHtml, "utf8");
  const homePath = path.join(destination, "index.html");
  let presentationHome = fs.readFileSync(homePath, "utf8")
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
    .replace('<div class="pre-footer-feedback" data-home-feedback></div>', "")
    .replace(/<script src="app\.js([^>]*)><\/script>/, '<script src="source-transition.js?v=source-transition-20260814"></script><script src="app.js$1></script>')
    .replace(/<script src="navigation\.js([^>]*)><\/script>/, '<script src="navigation.js$1></script><script src="data/portable/people-index.portable.js?v=branch-members-20260814"></script><script src="branch-members.js?v=branch-member-hierarchy-20260814"></script><script src="beta-presentation-polish.js?v=beta-polish-20260814d"></script>')
    .replace("</footer>", `</footer><div class="pre-footer-feedback presentation-footer-feedback" data-home-feedback></div>
    <script>
      document.querySelectorAll(".presentation-branch-review").forEach((disclosure) => {
        const summary = disclosure.querySelector("summary");
        const syncExpanded = () => summary.setAttribute("aria-expanded", disclosure.open ? "true" : "false");
        disclosure.addEventListener("toggle", syncExpanded);
        syncExpanded();
      });
    </script>`);
  fs.writeFileSync(homePath, presentationHome, "utf8");
  const presentationStylesPath = path.join(destination, "styles.css");
  fs.appendFileSync(presentationStylesPath, `
.presentation-research-links { display: none; margin: calc(clamp(28px, 4vw, 54px) + 16px) 0 10px; font-family: Arial, sans-serif; }
body:has(#directoryPanel:not([hidden])) .presentation-research-links { display: block; }
.presentation-transcript-link a { color: var(--green-dark); font: 500 .9rem/1.4 Arial, sans-serif; text-decoration: none; }
.presentation-transcript-link a:hover, .presentation-transcript-link a:focus-visible { text-decoration: underline; text-underline-offset: 3px; }
.presentation-transcript-link a:focus-visible,
.presentation-branch-review summary:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; border-radius: 2px; }
.presentation-directory-top { display: grid; grid-template-columns: minmax(0, 1fr) max-content; align-items: start; gap: 18px clamp(24px, 4vw, 52px); }
.presentation-directory-top .directory-heading { min-width: 0; }
.presentation-branch-review { position: relative; width: max-content; max-width: min(620px, 48vw); margin-top: 1em; color: var(--ink); background: var(--panel); box-shadow: 0 1px 0 #d6cfbf; z-index: 8; }
.presentation-branch-review summary { color: var(--green-dark); cursor: pointer; font: 500 .9rem/1.4 Arial, sans-serif; min-height: 44px; padding: 11px 28px 10px 18px; }
.presentation-branch-review-content { position: absolute; top: 100%; right: 0; box-sizing: border-box; width: min(620px, calc(100vw - 48px)); border: 1px solid #d6cfbf; border-top: 2px solid var(--gold); margin: 0; padding: 12px 18px 14px; background: var(--panel); box-shadow: 0 10px 24px rgba(42, 49, 42, .18); }
.presentation-branch-review-content p { font: 400 .88rem/1.5 Arial, sans-serif; margin: 0 0 8px; max-width: 62ch; }
.presentation-branch-review-content h3 { color: var(--ink); font: 600 .82rem/1.45 Arial, sans-serif; margin: 12px 0 5px; }
.presentation-branch-candidates { display: grid; grid-template-columns: repeat(3, minmax(120px, 1fr)); gap: 2px 18px; list-style: none; margin: 0; padding: 0; }
.presentation-branch-candidates li { font: 400 .86rem/1.45 Arial, sans-serif; }
.presentation-footer-feedback { margin-top: 10px; }
.directory-home-link, .directory-home-link:visited { color: var(--green-dark); font: 500 .8rem/1.25 Arial, sans-serif; text-decoration: none; }
.directory-home-link:hover, .directory-home-link:focus-visible { text-decoration: underline; text-underline-offset: 3px; }
.search-sticky-nav { padding-block: 3px; background: #fbf7ec; }
.search-sticky-nav.is-stuck { border-bottom: 1px solid var(--gold); box-shadow: 0 3px 8px rgba(42, 49, 42, .12); }
.people-date-interpretations { margin: 8px 0 0; }
.people-date-interpretations .people-source-detail { margin: 2px 0; }
.viewer-portable-availability { margin: 3px 0 0; color: var(--muted); font: 400 .76rem/1.35 Arial, sans-serif; }
.home-search input { max-width: 590px; transition: border-color .35s ease, box-shadow .35s ease; }
.home-search input.home-search-emphasis { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(173, 137, 48, .16); }
body .research-beta-note { box-sizing: border-box; max-width: none; margin: 10px clamp(18px, 4vw, 52px) 5px; padding: 0; }
body .research-beta-note + .site-disclaimer { margin-top: 0; padding-top: 10px; }
body:has(.search-sticky-nav) .research-beta-note { margin-top: 10px; }
body:has(.search-sticky-nav) .research-beta-note + .site-disclaimer { margin: 0; padding: 10px clamp(18px, 4vw, 52px) 20px; }
@media (prefers-reduced-motion: reduce) { .home-search input { transition: none; } }
.home-category-label { display: block; margin: 0 0 5px; color: var(--gold-dark, #8a6b20); font: 600 .69rem/1.2 Arial, sans-serif; letter-spacing: .08em; text-transform: uppercase; }
.home-path-card .home-category-label { margin-bottom: 6px; }
.branch-member-count, .resource-member-count { display: block; color: var(--muted); font: 400 .75rem/1.35 Arial, sans-serif; }
.branch-member-count { margin-top: 3px !important; }
.branch-members-content { padding-top: 12px; }
.branch-member-filter { display: block; margin: 0 0 12px; max-width: 380px; color: var(--muted); font: 400 .78rem/1.35 Arial, sans-serif; }
.branch-member-filter span { display: block; margin-bottom: 4px; }
.branch-member-filter input { box-sizing: border-box; width: 100%; min-height: 40px; padding: 7px 10px; border: 1px solid var(--line); border-radius: 3px; background: white; color: var(--ink); font: 400 .92rem/1.3 Arial, sans-serif; transition: border-color .25s ease, box-shadow .25s ease; }
.branch-member-filter input.branch-member-filter-emphasis { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(173, 137, 48, .16); }
.branch-member-filter input:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.branch-member-list { display: grid; gap: 1px; margin-left: 22px; }
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
@media (prefers-reduced-motion: reduce) { .branch-member-filter input { transition: none; } }
.source-route-status { width: min(420px, calc(100% - 32px)); margin: 26px auto; padding: 12px 14px; color: var(--green-dark); border-left: 3px solid var(--gold); background: var(--panel); font: 500 .9rem/1.4 Arial, sans-serif; }
.source-route-pending main > :not(.source-route-status) { visibility: hidden; }
.viewer.record-open:has(#viewerBranchResourcesLink[href*="?branch="]) { padding-top: 4px; }
@media (max-width: 820px) {
  .presentation-directory-top { grid-template-columns: minmax(0, 1fr); gap: 10px; }
  .presentation-branch-review, .presentation-branch-review[open] { width: 100%; max-width: none; margin: 0 0 6px; }
  .presentation-branch-review-content { position: static; width: auto; border-inline: 0; border-bottom: 0; box-shadow: none; }
}
@media (max-width: 620px) {
  .presentation-branch-candidates { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 12px; }
  .branch-member-record-details { padding-left: 8px; }
  .branch-member-record-details dl div { grid-template-columns: 1fr; gap: 0; }
}
`, "utf8");
  copyResumable(path.join(projectRoot, "BRANCH_REGISTRY.csv"), path.join(destination, "BRANCH_REGISTRY.csv"));
  copyResumable(path.join(projectRoot, "outputs", "branch-registry", "Welsh-LDS-Branch-Registry.xlsx"), path.join(destination, "outputs", "branch-registry", "Welsh-LDS-Branch-Registry.xlsx"));
}

const typedPdfSourceDir = path.join(projectRoot, "resources", "transcriptions");
const typedPdfFiles = fs.readdirSync(typedPdfSourceDir)
  .filter((name) => /Typed Transcripts\.pdf$/i.test(name))
  .sort((a, b) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" }));
for (const fileName of profile === "presentation" ? [] : typedPdfFiles) {
  copyResumable(
    path.join(typedPdfSourceDir, fileName),
    path.join(destination, "resources", "transcriptions", fileName),
  );
}

// Preserve local-only supplemental source PDFs (including post-1920 material)
// without exposing them through the public edition.
const supplementalSourcePdfs = [];
const sourceCdsRoot = path.join(projectRoot, "resources", "source-cds");
for (const sourceEntry of profile === "presentation" ? [] : fs.readdirSync(sourceCdsRoot, { withFileTypes: true })) {
  if (!sourceEntry.isDirectory()) continue;
  const supplementalDir = path.join(sourceCdsRoot, sourceEntry.name, "Supplemental PDFs");
  if (!fs.existsSync(supplementalDir)) continue;
  for (const fileName of fs.readdirSync(supplementalDir).filter((name) => /\.pdf$/i.test(name))) {
    const relative = path.join("resources", "source-cds", sourceEntry.name, "Supplemental PDFs", fileName);
    copyResumable(path.join(supplementalDir, fileName), path.join(destination, relative));
    supplementalSourcePdfs.push(relative.split(path.sep).join("/"));
  }
}

const privateResearchFiles = [
  "welsh-saints-index.local.js",
  "welsh-saints-index.local.json",
  "welsh-saints-detail-cache.local.json",
  "welsh-saints-index-report.local.json",
  "typed-branch-record-index.local.js",
  "typed-branch-record-index.local.json",
  "typed-branch-evidence-candidates.local.json",
  "typed-branch-record-index-report.local.json",
  "people-index.local.js",
  "people-index.local.json",
  "people-index-source.csv",
  "four-zero-collection-branch-reconciliation.json",
  "people-index-report.local.json",
  "wales-indexing-branch-map-source.csv",
  "wales-indexing-branch-map.local.json",
  "wales-indexing-branch-map.local.js",
  "welsh-conference-source-reconciliation.json",
  "welsh-conference-page-classification.csv",
];
const branchWorkflowPrivatePatterns = [
  /^branch-index-config-.+\.json$/i,
  /^people-index-staging-.+-production\.csv$/i,
  /^people-index-.+-review\.csv$/i,
  /^people-index-.+-production-report\.json$/i,
  /^people-index-.+-page-classification\.csv$/i,
];
for (const fileName of fs.readdirSync(privateSourceDir)) {
  if (branchWorkflowPrivatePatterns.some((pattern) => pattern.test(fileName)) && !privateResearchFiles.includes(fileName)) privateResearchFiles.push(fileName);
}
// Branch production configs can retain provenance-only source segments that are
// intentionally absent from the public/local viewer catalog (for example,
// historical minutes). Copy those exact inventoried files into the portable
// edition so preservation does not depend on the development-computer path.
const workflowSourceFiles = [];
for (const fileName of profile === "presentation" ? [] : privateResearchFiles.filter((name) => /^branch-index-config-.+\.json$/i.test(name))) {
  const config = JSON.parse(fs.readFileSync(path.join(privateSourceDir, fileName), "utf8"));
  for (const segment of config.sourceSegments || []) {
    for (const sourceFileName of segment.filenames || []) {
      const relative = path.join(segment.sourceFolder, sourceFileName);
      const source = path.join(projectRoot, relative);
      if (!fs.existsSync(source)) throw new Error(`Missing branch-workflow source file: ${source}`);
      copyResumable(source, path.join(destination, relative));
      workflowSourceFiles.push(relative.split(path.sep).join("/"));
    }
  }
}
for (const fileName of profile === "presentation" ? [] : privateResearchFiles) {
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

const instructions = profile === "presentation" ? `WELSH LDS HISTORICAL RECORDS - REVIEW EDITION

Open START_HERE.html to begin.

This research-review edition includes Welsh branch resources, member search, broader Full search, transcriptions and translations, and source-image viewers. Core archive pages, searches, transcripts, and copied record images work offline.

Links to original records at the Welsh Saints Project require an internet connection. Search results remain available offline.

This is a review edition. Records, classifications, and source relationships continue to be checked and expanded.

Keep the entire folder together when copying it to another drive.
` : `WELSH LDS HISTORICAL RECORDS - PORTABLE EDITION

Start by opening START_HERE.html in a web browser.

This drive works offline. It contains a deduplicated working collection, conference-minute transcriptions, recovered research notes, recovery placeholders, the private full-text Welsh Saints and typed branch-record PDF indexes, the 2022 indexing-image-to-branch map, and clearly separated non-LDS Merthyr Bishop Records.

The private local research index can be opened from About & tools or directly at welsh-saints-research.html. Welsh Saints search uses copied local data and does not require welshsaints.byu.edu; its original-record links still require internet access. Typed branch-record results open the exact generated viewer page and retain a separate link to the copied original PDF; both work offline.

The private old-indexing-image lookup is documented in PRIVATE_BRANCH_IMAGE_MAP.md. It requires Node.js and does not treat a current FamilySearch Image Number as equivalent to the 2022 indexing sequence.

No original source archive was deleted or modified when this edition was built.

Important project documents:
- PROJECT_README.md
- TRANSCRIPTION_INVENTORY.md
- TRANSCRIPTION_STATUS_NOTES.md
- RECOVERY_PLACEHOLDERS.md
- BRANCH_REGISTRY.csv
- Welsh-LDS-Branch-Registry.xlsx

If copying this package to another drive, copy the entire folder so its internal links remain intact.
`;
if (profile === "presentation") {
  fs.writeFileSync(path.join(packageRoot, "START_HERE.html"), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=LDSWelshMembers-Portable/START_HERE.html"><title>Welsh LDS Historical Records</title></head><body><p><a href="LDSWelshMembers-Portable/START_HERE.html">Open Welsh LDS Historical Records</a></p></body></html>', "utf8");
  fs.writeFileSync(path.join(destination, "START_HERE.html"), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=index.html"><title>Welsh LDS Historical Records</title></head><body><p><a href="index.html">Open Welsh LDS Historical Records</a></p></body></html>', "utf8");
} else {
  fs.writeFileSync(path.join(packageRoot, "README_FIRST.txt"), instructions, "utf8");
}

const result = {
  destination: packageRoot,
  profile,
  copiedFiles: copied,
  skippedExistingFiles: skipped,
  copiedBytes,
  catalogItems: portableCatalog.stats.uniqueItems,
  privateResearchFiles: privateResearchFiles.map((name) => path.posix.join("data", "private", name)),
  workflowSourceFiles,
  typedBranchRecordPdfs: typedPdfFiles.map((name) => path.posix.join("resources", "transcriptions", name)),
  supplementalSourcePdfs,
  excludedPrivateFiles,
};
if (profile !== "presentation") fs.writeFileSync(path.join(destination, "PORTABLE_BUILD_REPORT.json"), JSON.stringify(result, null, 2), "utf8");
console.log(JSON.stringify(result, null, 2));
