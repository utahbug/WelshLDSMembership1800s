import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const output = path.resolve(process.argv[2] || path.join(root, "outputs/local-development"));
const builder = path.join(root, "scripts/build-research-beta.mjs");

if (output === path.join(root, "full") || output === path.join(root, "research-beta")) {
  throw new Error("Local development builds may not target /full/ or /research-beta/.");
}

const build = spawnSync(process.execPath, [builder, output], {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
if (build.status !== 0) {
  process.stderr.write(build.stderr || build.stdout);
  process.exit(build.status || 1);
}

fs.copyFileSync(path.join(root, "local-development/ronald-dennis-publications.html"), path.join(output, "ronald-dennis-publications.html"));
fs.copyFileSync(path.join(root, "local-development/ronald-dennis-publications.js"), path.join(output, "ronald-dennis-publications.js"));
fs.copyFileSync(path.join(root, "local-development/welsh-historical-publications.html"), path.join(output, "welsh-historical-publications.html"));
fs.copyFileSync(path.join(root, "local-development/welsh-historical-publications.js"), path.join(output, "welsh-historical-publications.js"));
fs.copyFileSync(path.join(root, "local-development/resources.html"), path.join(output, "resources.html"));
fs.copyFileSync(path.join(root, "local-development/publication-viewer.html"), path.join(output, "publication-viewer.html"));
fs.copyFileSync(path.join(root, "local-development/publication-viewer.css"), path.join(output, "publication-viewer.css"));
fs.copyFileSync(path.join(root, "local-development/publication-viewer.js"), path.join(output, "publication-viewer.js"));
fs.copyFileSync(path.join(root, "local-development/local-catalog-overrides.js"), path.join(output, "local-catalog-overrides.js"));
fs.copyFileSync(path.join(root, "local-development/home-unified-search.js"), path.join(output, "home-unified-search.js"));
fs.copyFileSync(path.join(root, "local-development/hymnal-discovery-extension.js"), path.join(output, "hymnal-discovery-extension.js"));
fs.copyFileSync(path.join(root, "local-development/person-historical-material.js"), path.join(output, "person-historical-material.js"));
fs.copyFileSync(path.join(root, "branch-export.js"), path.join(output, "branch-export.js"));

// Package exactly the original-CD files referenced by the generated catalog.
// Hard links keep Local Development complete without duplicating several GB on
// the same drive. Pontlanfraith remains a separately approved local copy below.
const catalogContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(output, "data/catalog.public.js"), "utf8"), catalogContext);
const localCatalog = catalogContext.window.WELSH_RECORD_CATALOG;
const originalCdsSource = path.join(root, "resources/source-cds");
const originalCdsOutput = path.join(output, "resources/original-cds");
const pontlanfraithPrefix = "Pontlanfraith,Early-to-1947,Library27560/";
const catalogedOriginalPaths = new Set(localCatalog.collections
  .filter((collection) => collection.sources?.includes("original-cds"))
  .flatMap((collection) => collection.images || [])
  .map((record) => String(record.archiveRelativePath || "").replaceAll("\\", "/"))
  .filter((relative) => relative && !relative.startsWith(pontlanfraithPrefix)));
for (const relative of catalogedOriginalPaths) {
  const source = path.join(originalCdsSource, ...relative.split("/"));
  const destination = path.join(originalCdsOutput, ...relative.split("/"));
  if (!fs.existsSync(source)) throw new Error(`Cataloged Local Development source image is missing: ${relative}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  try { fs.linkSync(source, destination); }
  catch (error) {
    if (error?.code !== "EXDEV") throw error;
    fs.copyFileSync(source, destination);
  }
}

const pontlanfraithSource = path.join(
  root,
  "outputs/presentation-usb-review-20260813/LDSWelshMembers-Portable/resources/original-cds/Pontlanfraith,Early-to-1947,Library27560",
);
const pontlanfraithOutput = path.join(
  output,
  "resources/original-cds/Pontlanfraith,Early-to-1947,Library27560",
);
if (!fs.existsSync(pontlanfraithSource)) {
  throw new Error(`Local Development Pontlanfraith source images were not found: ${pontlanfraithSource}`);
}
fs.mkdirSync(path.dirname(pontlanfraithOutput), { recursive: true });
fs.cpSync(pontlanfraithSource, pontlanfraithOutput, { recursive: true });
const transcriptPagesSource = path.join(root, "resources/transcriptions/viewer-pages");
const transcriptPagesOutput = path.join(output, "resources/typed-viewer-pages");
if (!fs.existsSync(transcriptPagesSource)) {
  throw new Error(`Local Development transcript viewer pages were not found: ${transcriptPagesSource}`);
}
fs.cpSync(transcriptPagesSource, transcriptPagesOutput, { recursive: true });
fs.mkdirSync(path.join(output, "data"), { recursive: true });
fs.copyFileSync(path.join(root, "local-development/data/publications.json"), path.join(output, "data/publications.json"));
fs.copyFileSync(path.join(root, "local-development/data/person-publication-links.json"), path.join(output, "data/person-publication-links.json"));
fs.cpSync(path.join(root, "local-development/data/publication-search"), path.join(output, "data/publication-search"), { recursive: true });
fs.mkdirSync(path.join(output, "books"), { recursive: true });
fs.copyFileSync(path.join(root, "output/pdf/1852-welsh-hymnal-cleaned.pdf"), path.join(output, "books/1852-welsh-hymnal-cleaned.pdf"));
fs.copyFileSync(path.join(root, "output/pdf/1852-welsh-hymnal-page-map.json"), path.join(output, "data/publication-search/welsh-hymnal-1852-page-map.json"));
fs.copyFileSync(path.join(root, "resources/books/ron-dennis/The Call of Zion (First Welsh Mormon Emigration, Volume 2).pdf"), path.join(output, "books/call-of-zion.pdf"));
fs.copyFileSync(path.join(root, "resources/books/ron-dennis/Welsh Mormon Writings (1844-1862).pdf"), path.join(output, "books/welsh-mormon-writings.pdf"));
fs.copyFileSync(path.join(root, "resources/books/ron-dennis/AbleEvans.pdf"), path.join(output, "books/indefatigable-veteran.pdf"));
fs.copyFileSync(path.join(root, "resources/books/ron-dennis/Defending the Faith.pdf"), path.join(output, "books/defending-the-faith.pdf"));
fs.copyFileSync(path.join(root, "resources/books/ron-dennis/Prophet of the Jubilee.pdf"), path.join(output, "books/prophet-of-the-jubilee.pdf"));
fs.copyFileSync(path.join(root, "resources/books/ron-dennis/A Steamboat for an Eldership.pdf"), path.join(output, "books/steamboat-for-an-eldership.pdf"));
fs.copyFileSync(path.join(root, "resources/books/ron-dennis/On Trial in the Welsh Press.pdf"), path.join(output, "books/on-trial-welsh-press.pdf"));
fs.copyFileSync(path.join(root, "resources/books/ron-dennis/Translating the Welsh Book of Mormon.pdf"), path.join(output, "books/translating-welsh-book-of-mormon.pdf"));
fs.copyFileSync(path.join(root, "resources/books/Welsh Book of Mormon.pdf"), path.join(output, "books/welsh-book-of-mormon.pdf"));
for (const [sourceName, outputName] of [
  ["Zions Trumpet (1849).pdf", "zions-trumpet-1849.pdf"],
  ["Zions Trumpet (1850).pdf", "zions-trumpet-1850.pdf"],
  ["Zions Trumpet (1851).pdf", "zions-trumpet-1851.pdf"],
  ["Zions Trumpet (1852).pdf", "zions-trumpet-1852.pdf"],
  ["Zions Trumpet (1853).pdf", "zions-trumpet-1853.pdf"],
  ["Zions Trumpet (1854).pdf", "zions-trumpet-1854.pdf"],
  ["Zions Trumpet (1855).pdf", "zions-trumpet-1855.pdf"],
  ["Zions Trumpet (1856-1857).pdf", "zions-trumpet-1856-1857.pdf"],
]) fs.copyFileSync(path.join(root, "resources/books/ron-dennis", sourceName), path.join(output, "books", outputName));
fs.mkdirSync(path.join(output, "assets/pdfjs"), { recursive: true });
fs.cpSync(path.join(root, "node_modules/pdfjs-dist/build/pdf.mjs"), path.join(output, "assets/pdfjs/pdf.mjs"));
fs.cpSync(path.join(root, "node_modules/pdfjs-dist/build/pdf.worker.mjs"), path.join(output, "assets/pdfjs/pdf.worker.mjs"));
fs.cpSync(path.join(root, "node_modules/pdfjs-dist/standard_fonts"), path.join(output, "assets/pdfjs/standard_fonts"), { recursive: true });


const homePath = path.join(output, "index.html");
let homeHtml = fs.readFileSync(homePath, "utf8");
homeHtml = homeHtml
  .replace('Search 1800s branches, collections, CD numbers, call numbers, dates, and filenames', 'Search 1800s records and resources')
  .replace(
    '<input id="collectionSearch" type="search"',
    '<div class="home-unified-search-row"><input id="collectionSearch" type="search"',
  )
  .replace(
    'aria-describedby="searchHelp"><p class="search-help"',
    'aria-describedby="searchHelp"><details class="home-search-sources"><summary>Search in</summary><div class="home-search-source-choices"><label><input type="checkbox" value="archive" checked><span><strong>Archive resources</strong><small>Branches, collections, CD numbers, call numbers, dates, filenames</small></span></label><label><input type="checkbox" value="members"><span><strong>Member records</strong></span></label><label><input type="checkbox" value="welsh-saints"><span><strong>Welsh Saints Project</strong></span></label><label><input type="checkbox" value="publications"><span><strong>Integrated publications</strong><small>Ronald D. Dennis works and historical publications currently integrated</small></span></label></div></details></div><p class="search-help"',
  );
homeHtml = homeHtml.replace(
  /(<nav class="home-paths"[\s\S]*?<\/nav>)/,
  '$1<section class="home-secondary-resources" aria-labelledby="homeHistoryResourcesTitle"><h3 id="homeHistoryResourcesTitle">Learn about early Welsh LDS history</h3><div class="home-secondary-resource-links"><a href="ronald-dennis-publications.html">Ronald D. Dennis Publications</a><a href="welsh-historical-publications.html">Welsh LDS Historical Publications</a><a href="resources.html">Resources</a></div></section>',
);
homeHtml = homeHtml.replace(
  '<a class="home-path-card" href="welsh-saints-research.html" data-local-feature hidden><span class="home-category-label">Welsh Saints Project</span><strong>Welsh Saints Search</strong><small>Search people, places, dates, voyages, and historical material from the Welsh Saints Project.</small></a>',
  '<a class="home-path-card home-welsh-saints-card" href="welsh-saints-research.html" data-local-feature hidden><span class="home-category-label">Welsh Saints Project</span><strong>Welsh Saints Search</strong><small>Search people, places, dates, voyages, and historical material from the Welsh Saints Project website.</small></a>',
);
homeHtml = homeHtml.replace(
  /(<nav class="branch-grid" id="branchList"[^>]*><\/nav>)\s*<\/section>\s*<div class="presentation-research-links">[\s\S]*?<\/div>\s*<\/div>/,
  `$1
      <div class="branch-directory-utilities" aria-label="Branch directory tools">
        <details class="welsh-names-explainer directory-welsh-names-explainer"><summary>Welsh names and spelling</summary><div><p>Welsh place names may appear with different first letters because Welsh grammar can change the opening consonant of a word. For example, a name beginning with <strong>C</strong> may appear with <strong>G</strong> in some contexts. Historical spelling, anglicized forms, and transcription or OCR differences can also create variants.</p><p>This site preserves these source forms and links them to the same place when the evidence supports that relationship.</p></div></details>
        <div class="branch-export-slot"></div>
        <div class="presentation-transcript-link"><a href="transcriptions-translations.html">Transcriptions &amp; Translations</a></div>
      </div>
    </section>`,
);
homeHtml = homeHtml
  .replace(
    '<div class="view-toolbar" aria-label="Record viewing mode"><strong>View:</strong>',
    '<div class="view-toolbar" aria-label="Record viewing mode"><span class="viewer-mobile-row viewer-mobile-view-modes"><strong>View:</strong>',
  )
  .replace(
    '<button type="button" data-view="facing" class="facing-view-icon" aria-label="Facing pages" title="Facing pages">Facing Pages</button>\n        <button type="button" class="pan-tool"',
    '<button type="button" data-view="facing" class="facing-view-icon" aria-label="Facing pages" title="Facing pages">Facing Pages</button></span>\n        <span class="viewer-mobile-row viewer-mobile-image-tools"><button type="button" class="pan-tool"',
  )
  .replace(
    '<button type="button" id="resetSpread" class="spread-reset" aria-label="Reset spread" title="Reset only the active spread zoom and pan" hidden>Reset spread</button>\n        <span class="active-page-indicator',
    '<button type="button" id="resetSpread" class="spread-reset" aria-label="Reset spread" title="Reset only the active spread zoom and pan" hidden>Reset spread</button></span>\n        <span class="viewer-mobile-row viewer-mobile-navigation"><span class="active-page-indicator',
  )
  .replace(
    '<span class="jump-page-group"><button type="button" class="jump-page" id="jumpFirstPage"',
    '<span class="jump-page-group"><button type="button" class="jump-page" id="jumpFirstPage"',
  )
  .replace(
    '<button type="button" class="jump-page" id="jumpLastPage" aria-label="Bottom of page" hidden title="Bottom of page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg></button></span>\n      </div>',
    '<button type="button" class="jump-page" id="jumpLastPage" aria-label="Bottom of page" hidden title="Bottom of page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg></button></span></span>\n      </div>',
  );
homeHtml = homeHtml.replace(
  '</body>',
  '<script src="people-search-core.js"></script><script>window.ALL_RECORDS_DISCOVERY_BASE="data/discovery/";</script><script src="all-records-discovery.js"></script><script src="hymnal-discovery-extension.js"></script><script src="person-historical-material.js"></script><script src="welsh-saints-person-detail.js"></script><script src="home-unified-search.js"></script><script src="data/branch-export-data.js"></script><script src="branch-export.js"></script></body>',
);
fs.writeFileSync(homePath, homeHtml, "utf8");

const peoplePath = path.join(output, "people-search.html");
let peopleHtml = fs.readFileSync(peoplePath, "utf8");
peopleHtml = peopleHtml.replace(/(<script src="all-records-discovery\.js[^>]*><\/script>)/, '$1<script src="hymnal-discovery-extension.js"></script>');
peopleHtml = peopleHtml.replace('</body>', '<script src="person-historical-material.js"></script></body>');
fs.writeFileSync(peoplePath, peopleHtml, "utf8");

const transcriptsPath = path.join(output, "transcriptions-translations.html");
let transcriptsHtml = fs.readFileSync(transcriptsPath, "utf8");
transcriptsHtml = transcriptsHtml.replace('</header>\n    <section class="transcript-holdings"', '</header>\n    <p class="transcript-publications-link"><a href="ronald-dennis-publications.html">Ronald D. Dennis Publications</a></p>\n    <section class="transcript-holdings"');
fs.writeFileSync(transcriptsPath, transcriptsHtml, "utf8");

function stripDecorativeTopNavigationArrows(html) {
  const stripFromLinks = (fragment) => fragment.replace(
    /(<a\b[^>]*>)(?:←|&larr;|&#8592;)\s*/gi,
    "$1",
  );
  return html
    .replace(/<nav class="(?:research-page-nav|publication-page-nav)"[\s\S]*?<\/nav>/gi, stripFromLinks)
    .replace(/(<a\b[^>]*class="[^"]*\b(?:standalone-home-link|viewer-branch-resources-link|book-return)\b[^"]*"[^>]*>)(?:←|&larr;|&#8592;)\s*/gi, "$1");
}

for (const file of fs.readdirSync(output).filter((name) => name.endsWith(".html"))) {
  const target = path.join(output, file);
  let html = fs.readFileSync(target, "utf8");
  if (file === "index.html") {
    html = html.replace(
      /(<script src="data\/catalog\.public\.js(?:\?[^\"]*)?"><\/script>)/,
      '$1<script src="local-catalog-overrides.js"></script>',
    );
  }
  if (file === "about.html") {
    html = html
      .replace('<a class="standalone-home-link" href="index.html">&larr; Home</a>', '<a class="standalone-home-link" href="index.html">Home</a>')
      .replace(/<nav class="breadcrumb" aria-label="Breadcrumb">[\s\S]*?<\/nav>/, '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="index.html">Home</a> &rsaquo; <span aria-current="page">About</span></nav>')
      .replace("Copyright Â© 2026 Kenneth S. Roberts.", "Copyright &copy; 2026 Kenneth S. Roberts.")
      .replace('</main>', `<section class="guide-section about-reuse-section">
      <h2>Free to use and improve</h2>
      <p>This project is intended for public historical and genealogical research. The application and project-created materials may be copied, adapted, and improved for noncommercial use. Improvements should remain available to other researchers rather than being kept as a private-only resource.</p>
      <p>Third-party books, images, records, photographs, publications, and other externally supplied source materials remain subject to their own rights and permissions.</p>
    </section>
    <section class="guide-section about-ai-continuation" id="ai-continuation">
      <h2>Continue or improve this project with AI</h2>
      <p>The project files are intended to be available to future researchers and developers. An AI Continuation Guide will provide practical instructions for using ChatGPT and Codex to understand the project, make controlled changes, test them, and continue the work.</p>
      <p class="ai-guide-status" role="status">AI Continuation Guide — coming later</p>
    </section>
  </main>`);
  }
  html = html
    .replace("window.WELSH_RESEARCH_BETA=true;", "window.WELSH_RESEARCH_BETA=true;window.WELSH_LOCAL_DEVELOPMENT=true;")
    .replace(/(<p class="research-beta-note">)[\s\S]*?(<\/p>)/, "$1LOCAL DEVELOPMENT — NOT PUBLISHED$2")
    .replace(/styles\.css\?v=[^"]+/g, "styles.css?v=local-dev-20260815-wsdetail")
    .replace(/welsh-saints-research\.js\?v=[^"]+/g, "welsh-saints-research.js?v=local-dev-20260815-full-search-detail")
    .replace("</head>", '<meta name="apple-mobile-web-app-title" content="Welsh DEV">\n</head>');
  html = stripDecorativeTopNavigationArrows(html);
  fs.writeFileSync(target, html, "utf8");
}

const localAppPath = path.join(output, "app.js");
let localApp = fs.readFileSync(localAppPath, "utf8");
localApp = localApp.replace('viewerBranchResourcesLink.textContent = `← ${currentBranchName} Branch Resources`;', 'viewerBranchResourcesLink.textContent = `${currentBranchName} Branch Resources`;');
localApp = localApp.replace('viewerBranchResourcesLink.textContent = currentBranchName ? `\\u2190 ${currentBranchName} Branch Resources` : "\\u2190 All Branches";', 'viewerBranchResourcesLink.textContent = currentBranchName ? `${currentBranchName} Branch Resources` : "All Branches";');
fs.writeFileSync(localAppPath, localApp, "utf8");

const manifestPath = path.join(output, "site.webmanifest");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.name = "Welsh DEV — Local Development";
manifest.short_name = "Welsh DEV";
manifest.description = "Local development build of LDS Welsh Membership Records; not published.";
manifest.icons = [
  { src: "assets/app-icon-beta-192.png", sizes: "192x192", type: "image/png" },
  { src: "assets/app-icon-beta-512.png", sizes: "512x512", type: "image/png" },
];
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

fs.appendFileSync(path.join(output, "styles.css"), `
/* Local Development: Ronald D. Dennis bibliography */
.home-secondary-resources { margin: 24px 0 4px; padding-top: 15px; border-top: 1px solid var(--line); font-family: Arial, sans-serif; }
.home-secondary-resources h3 { margin: 0 0 5px; color: var(--ink); font: 500 .94rem/1.4 Arial, sans-serif; }
.home-secondary-resource-links { margin-left: 20px; }
.home-secondary-resources a, .home-secondary-resources a:visited { display: flex; width: fit-content; align-items: center; min-height: 38px; padding: 4px 0; color: var(--green-dark); font: 500 .9rem/1.4 Arial, sans-serif; text-decoration: none; }
.home-secondary-resources a:hover, .home-secondary-resources a:focus-visible { text-decoration: underline; text-underline-offset: 3px; }
.home-secondary-resources a:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; }
.home-unified-search-row { display: flex; align-items: flex-start; gap: 8px; max-width: 760px; }
.home-unified-search-row > #collectionSearch { flex: 1 1 520px; width: auto; min-width: 0; max-width: none; }
.home-search-sources { position: relative; flex: 0 0 178px; font-family: Arial, sans-serif; }
.home-search-sources > summary { box-sizing: border-box; min-height: 42px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 11px; color: var(--green-dark); border: 1px solid var(--line-strong); border-radius: 4px; background: var(--panel); cursor: pointer; list-style: none; font: 500 .9rem/1.3 Arial, sans-serif; }
.home-search-sources > summary::after { content: "▾"; color: var(--muted); }
.home-search-sources[open] > summary::after { content: "▴"; }
.home-search-sources > summary::-webkit-details-marker { display: none; }
.home-search-sources > summary:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.home-search-source-choices { position: absolute; z-index: 12; top: calc(100% + 5px); right: 0; width: min(340px, calc(100vw - 28px)); padding: 9px 11px; border: 1px solid var(--line); border-radius: 4px; background: var(--panel); box-shadow: 0 10px 24px rgba(25,43,36,.18); }
.home-search-source-choices label { display: flex; align-items: flex-start; gap: 9px; min-height: 42px; padding: 7px 3px; cursor: pointer; }
.home-search-source-choices label + label { border-top: 1px solid var(--line); }
.home-search-source-choices input { flex: 0 0 auto; width: 18px; min-height: 18px; margin: 2px 0 0; accent-color: var(--green); }
.home-search-source-choices span, .home-search-source-choices strong, .home-search-source-choices small { display: block; }
.home-search-source-choices strong { font: 500 .88rem/1.3 Arial, sans-serif; }
.home-search-source-choices small { margin-top: 2px; color: var(--muted); font: 400 .76rem/1.35 Arial, sans-serif; }
.home-unified-result { display: block; width: 100%; box-sizing: border-box; margin: 0; padding: 12px 14px; text-align: left; color: var(--ink); border: 0; border-top: 1px solid var(--line); background: transparent; text-decoration: none; }
.home-unified-result-type { display: block; margin-bottom: 3px; color: var(--gold-dark, #805f1d); font: 600 .7rem/1.3 Arial, sans-serif; letter-spacing: .055em; text-transform: uppercase; }
.home-unified-result strong { display: block; color: var(--green-dark); font: 600 .98rem/1.35 Georgia, serif; }
.home-unified-result p { margin: 4px 0 0; font: 400 .84rem/1.42 Arial, sans-serif; }
.home-unified-result-actions { display: flex; flex-wrap: wrap; gap: 5px 16px; margin-top: 6px; }
.home-unified-result-actions a, .home-unified-result-actions button { min-height: 36px; display: inline-flex; align-items: center; padding: 5px 0; color: var(--green-dark); border: 0; background: transparent; font: 500 .82rem/1.3 Arial, sans-serif; text-decoration: none; cursor: pointer; }
.home-unified-result-actions a:hover, .home-unified-result-actions a:focus-visible, .home-unified-result-actions button:hover, .home-unified-result-actions button:focus-visible { text-decoration: underline; text-underline-offset: 3px; }
.home-unified-result-actions a:focus-visible, .home-unified-result-actions button:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.home-search-result-status { margin: 0 0 8px; color: var(--muted); font: 400 .86rem/1.4 Arial, sans-serif; }
.home-welsh-saints-card { box-sizing: border-box; }
.transcript-publications-link { margin: 12px 0 0; font: 500 .9rem/1.4 Arial, sans-serif; }
.transcript-publications-link a, .publication-link { color: var(--green-dark); text-decoration: none; }
.transcript-publications-link a:hover, .transcript-publications-link a:focus-visible, .publication-link:hover, .publication-link:focus-visible { text-decoration: underline; text-underline-offset: 3px; }
.publication-page { width: min(1120px, calc(100% - 36px)); margin: 0 auto; padding: 18px 0 44px; }
.publication-page-nav { margin-bottom: 18px; }
.publication-page-nav a, .publication-page-nav a:visited { display: inline-flex; align-items: center; min-height: 38px; padding: 5px 2px; color: var(--green-dark); font: 500 .88rem/1.35 Arial, sans-serif; text-decoration: none; }
.publication-page-nav a:hover { text-decoration: underline; text-underline-offset: 3px; }
.publication-page-nav a:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; text-decoration: underline; text-underline-offset: 3px; }
.resources-page { width: min(920px, calc(100% - 36px)); margin: 0 auto; padding: 18px 0 44px; }
.publication-page, .resources-page, .guide-page { margin-left: clamp(18px, 4vw, 52px); margin-right: 0; }
.resources-page-intro { max-width: 68ch; margin-bottom: 18px; }
.resources-page-intro h2 { margin: 3px 0 7px; }
.resources-page-intro p { margin: 0; color: var(--muted); }
.external-resource-list { display: grid; gap: 10px; }
.external-resource-card, .external-resource-card:visited { display: block; min-height: 44px; box-sizing: border-box; padding: 15px 18px; border: 1px solid var(--line); border-left: 3px solid var(--gold); background: var(--panel); color: var(--ink); text-decoration: none; }
.external-resource-card h3 { display: flex; align-items: center; gap: 7px; margin: 0; color: var(--green-dark); font: 600 1.05rem/1.35 Georgia, serif; }
.external-resource-card p { max-width: 72ch; margin: 5px 0 0; line-height: 1.5; }
.external-link-icon { width: 15px; height: 15px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
.external-resource-card:hover { border-color: var(--line-strong); background: color-mix(in srgb, var(--gold) 6%, var(--panel)); }
.external-resource-card:hover h3 { text-decoration: underline; text-underline-offset: 3px; }
.external-resource-card:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; }
.resources-secondary-notices { max-width: 74ch; margin-top: 24px; padding-top: 17px; border-top: 1px solid var(--line); }
.resources-secondary-notices section h3 { margin: 0 0 6px; color: var(--green-dark); font: 500 1.05rem/1.35 Georgia, serif; }
.resources-secondary-notices section p, .resources-ai-pointer { margin: 5px 0 0; color: var(--muted); font: 400 .9rem/1.55 Arial, sans-serif; }
.resources-ai-pointer { margin-top: 14px; }
.resources-ai-pointer a, .resources-ai-pointer a:visited { color: var(--green-dark); font-weight: 600; text-decoration: none; }
.resources-ai-pointer a:hover, .resources-ai-pointer a:focus-visible { text-decoration: underline; text-underline-offset: 3px; }
.resources-ai-pointer a:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; }
.about-reuse-section, .about-ai-continuation { max-width: 78ch; }
.about-reuse-section p, .about-ai-continuation p { max-width: 74ch; }
.ai-guide-status { width: fit-content; margin-top: 10px !important; padding: 5px 9px; border-left: 3px solid var(--gold); background: var(--panel); color: var(--muted); font: 600 .82rem/1.4 Arial, sans-serif !important; }
.publication-page-intro { max-width: 76ch; margin-bottom: 18px; }
.publication-page-intro:has(.publication-about) { margin-bottom: 2px; }
.publication-page-intro h2 { margin: 3px 0 8px; }
.publication-about { margin: 0; }
.publication-about summary { width: fit-content; min-height: 40px; padding: 8px 2px; color: var(--green-dark); cursor: pointer; font: 500 .92rem/1.45 Arial, sans-serif; }
.publication-about summary:hover { text-decoration: underline; text-underline-offset: 3px; }
.publication-about summary:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; }
.publication-about p { max-width: 72ch; margin: 5px 0 3px 18px; }
.publication-group { margin: 0 0 34px; }
.publication-group > h3 { margin: 0 0 12px; padding-bottom: 7px; border-bottom: 1px solid var(--line); color: var(--green-dark); font: 500 1.25rem/1.3 Georgia, serif; }
.publication-list { display: grid; gap: 10px; }
.publication-entry { padding: 15px 18px; border: 1px solid var(--line); border-left: 3px solid var(--gold); background: var(--panel); }
.publication-entry h4 { margin: 0; color: var(--ink); font: 700 1.03rem/1.4 Georgia, serif; }
.publication-main-title { font: inherit; }
.publication-subtitle { display: block; margin: 2px 0 0 16px; color: var(--muted); font: italic 400 .91rem/1.4 Georgia, serif; }
.publication-title-link, .publication-title-link:visited { color: var(--ink); font: inherit; text-decoration: none; }
.publication-title-link:hover, .publication-title-link:focus-visible { color: var(--green-dark); text-decoration: underline; text-underline-offset: 3px; }
.publication-title-link:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; border-radius: 2px; }
.publication-entry p { max-width: 80ch; margin: 6px 0 0; }
.publication-related-subworks { display: grid; gap: 8px; margin: 14px 0 0 24px; padding-left: 14px; border-left: 2px solid var(--line); }
.publication-subentry { padding: 2px 0 8px; color: var(--muted); }
.publication-subentry + .publication-subentry { padding-top: 8px; border-top: 1px solid var(--line); }
.publication-subentry h5 { margin: 0; color: var(--green-dark); font: 600 .94rem/1.4 Georgia, serif; }
.publication-subentry .publication-subtitle { margin-left: 12px; font-size: .86rem; }
.publication-subentry p { margin-top: 3px; font-size: .84rem; }
.publication-meta { color: var(--muted); font: 400 .86rem/1.45 Arial, sans-serif; }
.publication-availability { color: var(--muted); font: 400 .84rem/1.45 Arial, sans-serif; }
.publication-relationship { color: var(--green-dark); font: 400 .86rem/1.45 Arial, sans-serif; }
.publication-relationship a, .publication-relationship a:visited { color: var(--green-dark); text-decoration: none; }
.publication-relationship a:hover, .publication-relationship a:focus-visible { text-decoration: underline; text-underline-offset: 3px; }
.publication-relationship a:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.publication-development-note { color: var(--muted); font: italic 400 .84rem/1.45 Arial, sans-serif; }
.publication-link { display: inline-block; min-height: 32px; padding: 4px 0; font: 400 .9rem/1.5 Arial, sans-serif; }
.publication-actions { display: flex; flex-wrap: wrap; gap: 4px 18px; align-items: center; }
.publication-viewer-link { font-weight: 600; }
.publication-original-link { color: var(--muted); }
.publication-entry-unavailable { border-left-color: var(--line-strong); }
.person-related-historical-material { margin: 13px 0 0; padding-top: 11px; border-top: 1px solid var(--line); }
.person-related-historical-material h3 { margin: 0 0 5px; color: var(--green-dark); font: 600 .9rem/1.35 Georgia, serif; }
.person-related-historical-material p { margin: 4px 0 0; font: 400 .84rem/1.45 Arial, sans-serif; }
.person-related-historical-material .person-related-evidence { color: var(--muted); }
.publication-collection-search { max-width: 820px; margin: 2px 0 14px; }
.publication-collection-search > summary { width: fit-content; min-height: 40px; box-sizing: border-box; padding: 8px 2px; color: var(--green-dark); cursor: pointer; font: 500 .92rem/1.45 Arial, sans-serif; }
.publication-collection-search > summary:hover { text-decoration: underline; text-underline-offset: 3px; }
.publication-collection-search > summary:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; }
.publication-collection-search-body { margin-top: 4px; padding: 13px 16px; border: 1px solid var(--line); border-left: 3px solid var(--gold); background: var(--panel); }
.publication-collection-scope, .publication-collection-search-status { margin: 4px 0 0; color: var(--muted); font: 400 .88rem/1.45 Arial, sans-serif; }
.publication-collection-search-status:empty { display: none; }
.publication-collection-search-status button { display: inline-flex; align-items: center; gap: 7px; min-height: 38px; padding: 5px 2px; border: 0; background: transparent; color: var(--green-dark); font: 600 .88rem/1.4 Arial, sans-serif; text-align: left; cursor: pointer; }
.publication-collection-search-status button[hidden] { display: none; }
.publication-collection-search-status button::after { content: "▸"; color: var(--muted); font-size: .9em; }
.publication-collection-search-status button[aria-expanded="true"]::after { content: "▾"; }
.publication-collection-search-status button:hover { text-decoration: underline; text-underline-offset: 3px; }
.publication-collection-search-status button:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.publication-collection-search-form { margin-top: 6px; }
.publication-collection-search-form label { display: block; margin: 0; color: var(--ink); font: 500 .88rem/1.35 Arial, sans-serif; }
.publication-collection-search-filter { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; margin-bottom: 7px; }
.publication-collection-search-filter-label { color: var(--ink); font: 500 .88rem/1.35 Arial, sans-serif; }
.publication-source-filter { position: relative; width: 44%; max-width: 100%; min-width: 0; }
.publication-source-filter > summary { min-height: 40px; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 9px; border: 1px solid #a99f89; border-radius: 5px; background: #fff; color: var(--ink); cursor: pointer; list-style: none; font: 400 .9rem/1.3 Arial, sans-serif; white-space: nowrap; overflow: hidden; }
.publication-source-filter > summary::-webkit-details-marker { display: none; }
.publication-source-filter > summary::after { content: ""; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid currentColor; flex: none; }
.publication-source-filter[open] > summary::after { transform: rotate(180deg); }
.publication-source-filter > summary span { overflow: hidden; text-overflow: ellipsis; }
.publication-source-filter > summary:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.publication-source-popover { position: absolute; z-index: 30; top: calc(100% + 4px); left: 0; width: min(430px, calc(100vw - 48px)); max-height: min(520px, 70vh); overflow: auto; padding: 10px; border: 1px solid var(--line); border-radius: 6px; background: var(--panel); box-shadow: 0 8px 24px rgba(20, 27, 24, .18); }
.publication-source-actions { display: flex; gap: 8px; position: sticky; top: -10px; z-index: 1; padding: 0 0 8px; background: var(--panel); }
.publication-source-actions button { padding: 5px 9px; border: 1px solid var(--line); border-radius: 4px; background: var(--paper); color: inherit; cursor: pointer; }
.publication-source-actions button:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.publication-source-choices { display: grid; gap: 3px; }
.publication-source-choices h4 { margin: 8px 2px 3px; color: var(--muted); font: 600 .72rem/1.35 Arial, sans-serif; letter-spacing: .045em; text-transform: uppercase; }
.publication-source-choices h4:first-of-type { margin-top: 1px; }
.publication-source-choices label { display: flex; align-items: flex-start; gap: 8px; min-height: 34px; padding: 5px 2px; color: var(--ink); font: 400 .86rem/1.4 Arial, sans-serif; cursor: pointer; }
.publication-source-choices input { flex: none; min-height: 0; margin: 2px 0 0; padding: 0; }
.publication-source-choices span { min-width: 0; overflow-wrap: anywhere; }
.publication-collection-search-row { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.publication-collection-search-row input { width: 44%; max-width: 100%; min-width: 0; min-height: 42px; box-sizing: border-box; padding: 7px 10px; border: 1px solid #a99f89; border-radius: 5px; background: #fff; color: var(--ink); font: 400 1rem/1.3 Arial, sans-serif; cursor: text; }
.publication-collection-search-row input:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.publication-collection-search-results { display: grid; gap: 8px; max-height: 540px; margin: 8px 0 0 22px; overflow: auto; }
.publication-collection-search-results[hidden] { display: none; }
.publication-collection-result, .publication-collection-result:visited { display: grid; gap: 3px; padding: 10px 12px; border-top: 1px solid var(--line); color: var(--ink); text-decoration: none; }
.publication-collection-result strong { color: var(--green-dark); font: 500 .94rem/1.35 Georgia, serif; }
.publication-collection-result span { color: var(--muted); font: 400 .84rem/1.45 Arial, sans-serif; }
.publication-collection-result:hover strong, .publication-collection-result:focus-visible strong { text-decoration: underline; text-underline-offset: 3px; }
.publication-collection-result:focus-visible { outline: 2px solid var(--gold); outline-offset: -2px; }
.publication-thanks { max-width: 78ch; margin: 38px 0 8px; padding-top: 18px; border-top: 1px solid var(--gold); font-style: italic; }
.historical-publication-entry h3 { margin: 0; color: var(--ink); font: 700 1.03rem/1.4 Georgia, serif; }
.historical-publication-information { min-width: 0; }
.historical-publication-information-clickable { margin: -8px -10px 0; padding: 8px 10px 9px; border-radius: 4px; cursor: pointer; transition: background-color 140ms ease, box-shadow 140ms ease; }
.historical-publication-information-clickable:hover { background: color-mix(in srgb, var(--gold) 8%, transparent); }
.historical-publication-information-clickable:hover .publication-main-title { color: var(--green-dark); text-decoration: underline; text-underline-offset: 3px; }
.historical-publication-information-clickable:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; box-shadow: 0 0 0 3px rgba(171, 132, 50, .12); }
.ronald-publication-information { min-width: 0; }
.ronald-publication-information-clickable { margin: -8px -10px 0; padding: 8px 10px 9px; border-radius: 4px; cursor: pointer; transition: background-color 140ms ease, box-shadow 140ms ease; }
.ronald-publication-information-clickable:hover { background: color-mix(in srgb, var(--gold) 8%, transparent); }
.ronald-publication-information-clickable:hover .publication-main-title { color: var(--green-dark); text-decoration: underline; text-underline-offset: 3px; }
.ronald-publication-information-clickable:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; box-shadow: 0 0 0 3px rgba(171, 132, 50, .12); }
@media (prefers-reduced-motion: reduce) { .historical-publication-information-clickable { transition: none; } }
@media (prefers-reduced-motion: reduce) { .ronald-publication-information-clickable { transition: none; } }
@media (max-width: 700px) { .publication-source-filter, .publication-collection-search-row input { width: 100%; } .publication-source-popover { width: min(430px, calc(100vw - 52px)); } .publication-collection-search-results { margin-left: 12px; } }
@media (max-width: 520px) { .home-unified-search-row { flex-wrap: wrap; } .home-unified-search-row > #collectionSearch { flex-basis: 100%; } .home-search-sources { flex: 0 1 178px; } .home-search-source-choices { right: auto; left: 0; } .home-secondary-resource-links { margin-left: 16px; } .publication-page, .resources-page { width: min(100% - 24px, 1120px); padding-top: 12px; } .publication-page-nav { margin-bottom: 10px; gap: 6px 14px; } .publication-page-intro, .resources-page-intro { margin-bottom: 12px; } .publication-page-intro:has(.publication-about) { margin-bottom: 2px; } .publication-page-intro h2 { margin-bottom: 3px; } .publication-about summary, .publication-collection-search > summary { min-height: 44px; padding-block: 8px; } .publication-about p { margin-left: 12px; } .publication-entry, .external-resource-card { padding: 13px 14px; } .publication-subtitle { margin-left: 10px; } .publication-related-subworks { margin-left: 12px; padding-left: 10px; } .publication-link { min-height: 40px; padding-block: 8px; } .publication-collection-search { margin-bottom: 12px; } .publication-collection-search-body { padding: 12px 13px; } }
@media (max-width: 700px) { .publication-page, .resources-page, .guide-page { margin-inline: auto; } }

/* Local Development: compact membership/source viewer on small screens only. */
.viewer-mobile-row { display: contents; }
@media (max-width: 700px) {
  .record-viewer .viewer-sticky-header { margin-bottom: 7px; padding: 5px 6px; }
  .record-viewer .viewer-intro { margin-bottom: 3px; }
  .record-viewer .viewer-branch-resources-link { min-height: 34px; margin-bottom: 2px; padding: 4px 5px; }
  .record-viewer .viewer-heading { align-items: center; flex-direction: row; gap: 5px; margin-bottom: 3px; }
  .record-viewer .viewer-heading > div:first-child { flex: 1 1 auto; min-width: 0; }
  .record-viewer .viewer-heading h2 { font-size: .92rem; line-height: 1.18; }
  .record-viewer #imagePosition { margin-top: 1px; font-size: .69rem; line-height: 1.2; }
  .record-viewer .viewer-actions { flex: 0 0 auto; width: auto; gap: 4px; }
  .record-viewer .viewer-actions button { min-height: 44px; padding: 5px 7px; font-size: .7rem; }
  .record-viewer .view-toolbar { display: grid; grid-template-columns: minmax(0, 1fr); gap: 4px; padding-top: 4px; }
  .record-viewer .viewer-mobile-row { min-width: 0; display: flex; align-items: center; gap: 4px; }
  .record-viewer .viewer-mobile-view-modes > strong { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .record-viewer .viewer-mobile-view-modes > button { flex: 1 1 0; min-width: 0; min-height: 44px; padding: 5px 4px; font-size: .7rem; line-height: 1.15; }
  .record-viewer .viewer-mobile-image-tools { flex-wrap: wrap; }
  .record-viewer .viewer-mobile-image-tools > [hidden] { display: none !important; }
  .record-viewer .viewer-mobile-image-tools > button,
  .record-viewer .viewer-mobile-image-tools > details > summary,
  .record-viewer .viewer-mobile-image-tools > .alignment-tools > button,
  .record-viewer .viewer-mobile-image-tools .facing-controls > button,
  .record-viewer .viewer-mobile-image-tools .facing-controls > details > summary { min-width: 44px; min-height: 44px; box-sizing: border-box; display: inline-grid; place-items: center; padding: 5px 7px; }
  .record-viewer #resetPage { font-size: 0; }
  .record-viewer #resetPage::after { content: "Reset"; font-size: .7rem; }
  .record-viewer .viewer-mobile-navigation { flex-wrap: nowrap; }
  .record-viewer .viewer-mobile-navigation .view-context { flex: 1 1 auto; width: auto; min-width: 0; margin: 0; padding: 0 4px 0 0; text-align: left; border: 0; }
  .record-viewer .viewer-mobile-navigation .view-context strong,
  .record-viewer .viewer-mobile-navigation .view-context small { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .64rem; }
  .record-viewer .viewer-mobile-navigation > button,
  .record-viewer .viewer-mobile-navigation .jump-page { min-width: 44px; min-height: 44px; box-sizing: border-box; margin: 0; padding: 5px 7px; }
  .record-viewer .viewer-mobile-navigation .toolbar-branch-picker { font-size: .68rem; }
  .record-viewer .jump-page-group { gap: 4px; }
  .record-viewer .record-stage { padding: 8px; }
  .record-viewer .continuous-view { margin-inline: -14px; }
  .record-viewer .continuous-view.facing-current { overflow-x: auto; overflow-y: visible; }
}
`, "utf8");

fs.appendFileSync(path.join(output, "styles.css"), `
/* Local Development: clearly visible, non-focusing Home archive-search cue. */
.home-search #collectionSearch.home-search-emphasis {
  border-color: var(--gold);
  box-shadow: 0 0 0 3px rgba(180, 138, 60, .28), 0 0 14px rgba(180, 138, 60, .24);
}
@media (prefers-reduced-motion: reduce) {
  .home-search #collectionSearch { transition: none; }
}

/* Local Development: compact branch-directory utility row. */
.branch-directory-utilities { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 0; margin: 14px 0 8px; font-family: Arial, sans-serif; }
.branch-directory-utilities > * { margin-block: 0; }
.branch-directory-utilities > :not(:first-child) { margin-left: 14px; padding-left: 14px; border-left: 1px solid var(--line); }
.branch-directory-utilities .welsh-names-explainer { max-width: 48rem; }
.branch-directory-utilities .welsh-names-explainer summary,
.branch-directory-utilities .branch-export-control > summary,
.branch-directory-utilities .presentation-transcript-link a { min-height: 40px; box-sizing: border-box; display: inline-flex; align-items: center; padding-block: 5px; }
.branch-directory-utilities .welsh-names-explainer[open] { flex-basis: 100%; margin-bottom: 4px; }
.branch-directory-utilities .welsh-names-explainer[open] + .branch-export-slot { margin-left: 0; padding-left: 0; border-left: 0; }
.branch-directory-utilities .presentation-transcript-link a { color: var(--green-dark); font: 500 .84rem/1.3 Arial, sans-serif; text-decoration: none; }
.branch-directory-utilities .presentation-transcript-link a:hover,
.branch-directory-utilities .presentation-transcript-link a:focus-visible { text-decoration: underline; text-underline-offset: 3px; }
.branch-directory-utilities .presentation-transcript-link a:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; }
.branch-export-slot .branch-export-control { position: relative; font-family: Arial, sans-serif; }
.branch-export-control > summary { min-height: 40px; display: flex; align-items: center; gap: 7px; padding: 5px 2px; color: var(--green-dark); cursor: pointer; list-style: none; font: 500 .84rem/1.3 Arial, sans-serif; }
.branch-export-control > summary::after { content: "▾"; font-size: .72rem; }
.branch-export-control[open] > summary::after { content: "▴"; }
.branch-export-control > summary::-webkit-details-marker { display: none; }
.branch-export-control > summary:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; }
.branch-export-menu { position: absolute; z-index: 24; top: calc(100% + 3px); right: 0; width: min(310px, calc(100vw - 36px)); padding: 10px; border: 1px solid var(--line); border-radius: 5px; background: var(--panel); box-shadow: 0 10px 24px rgba(25,43,36,.18); }
.branch-export-menu fieldset { display: grid; gap: 3px; margin: 0 0 8px; padding: 0 0 8px; border: 0; border-bottom: 1px solid var(--line); }
.branch-export-menu legend { margin-bottom: 3px; color: var(--muted); font: 600 .72rem/1.3 Arial, sans-serif; text-transform: uppercase; letter-spacing: .05em; }
.branch-export-menu label, .branch-export-menu button { min-height: 40px; box-sizing: border-box; }
.branch-export-menu label { display: flex; align-items: center; gap: 8px; cursor: pointer; font: 400 .84rem/1.35 Arial, sans-serif; }
.branch-export-menu button { width: 100%; padding: 7px 8px; color: var(--green-dark); border: 0; background: transparent; text-align: left; cursor: pointer; font: 500 .84rem/1.3 Arial, sans-serif; }
.branch-export-menu button:hover, .branch-export-menu button:focus-visible { background: var(--paper); text-decoration: underline; text-underline-offset: 3px; }
.branch-export-menu button:focus-visible { outline: 2px solid var(--gold); outline-offset: -2px; }
.branch-export-status { display: block; min-height: 1.2em; margin: 4px 8px 0; color: var(--green-dark); font: 600 .76rem/1.2 Arial, sans-serif; }
@media (max-width: 700px) { .branch-directory-utilities { margin-top: 12px; } .branch-directory-utilities > * { flex: 0 1 auto; } .branch-directory-utilities > :not(:first-child) { margin-left: 10px; padding-left: 10px; } .branch-directory-utilities .welsh-names-explainer summary, .branch-directory-utilities .branch-export-control > summary, .branch-directory-utilities .presentation-transcript-link a { min-height: 44px; } .branch-export-menu { right: auto; left: 0; } }
@media (max-width: 430px) { .branch-directory-utilities { gap: 0 12px; } .branch-directory-utilities > * { flex-basis: 100%; } .branch-directory-utilities > :not(:first-child) { margin-left: 0; padding-left: 0; border-left: 0; border-top: 1px solid var(--line); } }
`, "utf8");

const localPolishPath = path.join(output, "beta-presentation-polish.js");
const localPolish = fs.readFileSync(localPolishPath, "utf8")
  .replace('    input.addEventListener("pointerdown", clear, { once: true });\n    input.addEventListener("keydown", clear, { once: true });\n', "")
  .replace("setTimeout(clear, 1000);", "setTimeout(clear, 1150);");
fs.writeFileSync(localPolishPath, localPolish, "utf8");

const branchExportBuild = spawnSync(process.execPath, [path.join(root, "scripts/build-local-branch-exports.mjs"), output], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const branchExportFiles = ["Welsh-LDS-Canonical-Branches.xlsx", "Welsh-LDS-Possible-Branches.xlsx", "Welsh-LDS-Branches-Canonical-and-Possible.xlsx"];
const branchExportComplete = branchExportBuild.stdout?.includes('"canonical":97') && branchExportFiles.every((name) => fs.existsSync(path.join(output, "exports", name)));
if (branchExportBuild.status !== 0 && !branchExportComplete) { process.stderr.write(branchExportBuild.stderr || branchExportBuild.stdout); process.exit(branchExportBuild.status || 1); }

const reportPath = path.join(output, "RESEARCH_BETA_BUILD_REPORT.json");
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
report.edition = "local-development";
report.output = path.relative(root, output).replaceAll("\\", "/");
report.publishAutomatically = false;
report.localOriginalCdFiles = catalogedOriginalPaths.size;
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(output, "LOCAL_DEVELOPMENT_BUILD_REPORT.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
fs.rmSync(path.join(output, "README-RESEARCH-BETA.txt"), { force: true });
fs.writeFileSync(path.join(output, "README-LOCAL-DEVELOPMENT.txt"), [
  "LDS Welsh Membership Records — LOCAL DEVELOPMENT — NOT PUBLISHED",
  "",
  "This folder is generated for local testing only and is not published automatically.",
  "Build: node scripts/build-local-development.mjs",
  "Test:  node scripts/test-local-development.mjs",
  "",
].join("\n"), "utf8");

console.log(JSON.stringify({
  output,
  edition: report.edition,
  canonicalBranches: report.branchRoutes.canonicalBranches,
  memberRecords: report.memberSearch.records,
  fullSearchRecords: report.fullSearch.counts.allRecords,
  welshSaintsRecords: report.welshSaints.records,
  publishAutomatically: false,
}, null, 2));
