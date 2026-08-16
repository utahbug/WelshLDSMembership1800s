import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const output = path.resolve(process.argv[2] || path.join(root, "outputs/local-development"));
const validator = path.join(root, "scripts/test-research-beta.mjs");

const test = spawnSync(process.execPath, [validator, output], {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
if (test.status !== 0) {
  process.stderr.write(test.stderr || test.stdout);
  process.exit(test.status || 1);
}

const htmlFiles = fs.readdirSync(output).filter((name) => name.endsWith(".html"));
for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(output, file), "utf8");
  if (!html.includes("LOCAL DEVELOPMENT — NOT PUBLISHED")) throw new Error(`${file}: local-development identity missing`);
  if (!html.includes("window.WELSH_LOCAL_DEVELOPMENT=true;")) throw new Error(`${file}: local-development runtime marker missing`);
  if (!html.includes('<meta name="apple-mobile-web-app-title" content="Welsh DEV">')) throw new Error(`${file}: Welsh DEV Home Screen title missing`);
  const topNavigation = [...html.matchAll(/<nav class="(?:research-page-nav|publication-page-nav)"[\s\S]*?<\/nav>/gi)].map((match) => match[0]).join("\n");
  if (/(?:←|&larr;|&#8592;)\s*(?:Home|Ronald D\. Dennis Publications)/i.test(topNavigation)) throw new Error(`${file}: decorative top-navigation arrow remains`);
}
const manifest = JSON.parse(fs.readFileSync(path.join(output, "site.webmanifest"), "utf8"));
if (manifest.short_name !== "Welsh DEV" || !manifest.icons?.every((icon) => /app-icon-beta-/.test(icon.src))) throw new Error("Local-development Home Screen manifest identity invalid");
const localHomeHtml = fs.readFileSync(path.join(output, "index.html"), "utf8");
const branchNamesExplainer = '<details class="welsh-names-explainer directory-welsh-names-explainer"><summary>Welsh names and spelling</summary>';
if (!localHomeHtml.includes(branchNamesExplainer) || /<details class="welsh-names-explainer directory-welsh-names-explainer"[^>]*\sopen(?:\s|>)/.test(localHomeHtml)) throw new Error("Welsh branches names-and-spelling disclosure is missing or not initially collapsed");
if (!localHomeHtml.includes("Welsh place names may appear with different first letters because Welsh grammar can change the opening consonant of a word.") || !localHomeHtml.includes("This site preserves these source forms and links them to the same place when the evidence supports that relationship.")) throw new Error("Welsh branches names-and-spelling explanation is incomplete");
if (!localHomeHtml.includes('<a class="home-path-card home-welsh-saints-card" href="welsh-saints-research.html" data-local-feature hidden>') || !localHomeHtml.includes('Search people, places, dates, voyages, and historical material from the Welsh Saints Project website.</small></a>')) throw new Error("Home Welsh Saints card is not a single link with the approved description");
if (/home-welsh-saints-card[\s\S]*?Welsh Saints Project website<\/a>[\s\S]*?<\/a>/.test(localHomeHtml) || localHomeHtml.includes("home-external-source-link")) throw new Error("Home Welsh Saints card contains a nested or external source link");
if (!localHomeHtml.includes('<strong>Welsh Saints Search</strong>') || !localHomeHtml.includes('<span class="home-category-label">Welsh Saints Project</span>')) throw new Error("Established Welsh Saints Home title/category label changed");
if (!localHomeHtml.includes('<div class="home-secondary-resource-links"><a href="ronald-dennis-publications.html">Ronald D. Dennis Publications</a><a href="welsh-historical-publications.html">Welsh LDS Historical Publications</a><a href="resources.html">Resources</a></div>')) throw new Error("Home secondary research links are missing or incorrectly routed");
const resourcesHtml = fs.readFileSync(path.join(output, "resources.html"), "utf8");
for (const url of ["https://www.familysearch.org/", "https://churchhistorylibrary.churchofjesuschrist.org/?lang=eng", "https://www.library.wales/", "https://welshsaints.byu.edu/"]) {
  if (!resourcesHtml.includes(`href="${url}" target="_blank" rel="noopener noreferrer"`)) throw new Error(`Resources external link is missing or unsafe: ${url}`);
}
if (!resourcesHtml.includes('<a href="index.html">Home</a>') || resourcesHtml.includes("← Home")) throw new Error("Resources Home navigation is invalid");
if (!resourcesHtml.includes("Use and reuse") || !resourcesHtml.includes('href="about.html#ai-continuation"')) throw new Error("Resources reuse or AI-guide pointer is missing");
const localAboutHtml = fs.readFileSync(path.join(output, "about.html"), "utf8");
if (!localAboutHtml.includes("Free to use and improve") || !localAboutHtml.includes('id="ai-continuation"') || !localAboutHtml.includes("AI Continuation Guide — coming later")) throw new Error("About reuse or AI Continuation Guide placeholder is missing");
if (/\bopen source\b/i.test(localAboutHtml) || /href=["'][^"']*ai-continuation-guide/i.test(localAboutHtml)) throw new Error("About claims a formal open-source status or exposes a dead AI-guide link");
const historicalPublicationsHtml = fs.readFileSync(path.join(output, "welsh-historical-publications.html"), "utf8");
if (!historicalPublicationsHtml.includes("Welsh LDS Historical Publications") || !historicalPublicationsHtml.includes('id="historicalPublicationCatalog"') || !historicalPublicationsHtml.includes("welsh-historical-publications.js")) throw new Error("Welsh LDS Historical Publications page is invalid");
if (!fs.existsSync(path.join(output, "welsh-historical-publications.js"))) throw new Error("Welsh historical-publications runtime missing");
const publicationsPath = path.join(output, "ronald-dennis-publications.html");
if (!fs.existsSync(publicationsPath)) throw new Error("Ronald D. Dennis Publications page missing");
const publicationsHtml = fs.readFileSync(publicationsPath, "utf8");
const publicationCatalog = JSON.parse(fs.readFileSync(path.join(output, "data/publications.json"), "utf8"));
const publicationEntries = publicationCatalog.publications.length;
if (publicationEntries !== 28) throw new Error(`Visible publication count invalid: ${publicationEntries}`);
const historicalCategory = publicationCatalog.categories.find((item) => item.id === "historical-publications");
const welshBookOfMormon = publicationCatalog.publications.find((item) => item.id === "welsh-book-of-mormon-historical");
if (historicalCategory?.label !== "Welsh LDS Historical Publications") throw new Error("Welsh historical-publication category label is missing");
if (!welshBookOfMormon || !welshBookOfMormon.viewerAvailable || welshBookOfMormon.searchable || welshBookOfMormon.localAvailability !== "viewable-local-development" || welshBookOfMormon.pageCount !== 499) throw new Error("Welsh Book of Mormon viewable, non-searchable catalog state is invalid");
for (const required of ["person-historical-material.js", "data/person-publication-links.json"]) {
  if (!fs.existsSync(path.join(output, required))) throw new Error(`Person/publication relationship asset missing: ${required}`);
}
const personPublicationLinks = JSON.parse(fs.readFileSync(path.join(output, "data/person-publication-links.json"), "utf8"));
const davidRobertsLink = personPublicationLinks.relationships?.find((item) => item.id === "david-roberts-ffestiniog-hymnal-dr");
if (!davidRobertsLink || davidRobertsLink.personMatch?.branch !== "Ffestiniog" || davidRobertsLink.pageNumber !== 265 || !/does not by itself establish authorship/i.test(davidRobertsLink.evidenceNote)) throw new Error("David Roberts historical-material relationship is invalid");
if (!publicationsHtml.includes('id="publicationCatalog"') || !publicationsHtml.includes("ronald-dennis-publications.js")) throw new Error("Structured publication catalog runtime missing");
if (!publicationsHtml.includes('<details class="publication-collection-search" id="publicationCollectionSearch" hidden>') || !publicationsHtml.includes('<summary id="publicationCollectionSearchHeading">Search all integrated publications</summary>')) throw new Error("Collapsed integrated-publication search disclosure missing");
if (/<details class="publication-collection-search"[^>]*\sopen(?:\s|>)/.test(publicationsHtml)) throw new Error("Integrated-publication search must start collapsed");
if (!publicationsHtml.includes('id="publicationCollectionScope" class="publication-collection-scope" hidden')) throw new Error("Integrated-publication scope text must remain non-visible");
if (!publicationsHtml.includes('<details class="publication-about"><summary>About these publications</summary>')) throw new Error("Publications About disclosure missing");
if (/<details class="publication-about"[^>]*\sopen(?:\s|>)/.test(publicationsHtml)) throw new Error("Publications About disclosure must start collapsed");
const publicationsPageNav = publicationsHtml.match(/<nav class="publication-page-nav"[\s\S]*?<\/nav>/)?.[0] || "";
if (!publicationsPageNav.includes('href="index.html">Home</a>')) throw new Error("Publications quiet Home navigation missing");
if (publicationsPageNav.includes("people-search.html") || publicationsPageNav.includes("transcriptions-translations.html")) throw new Error("Publications top navigation contains an extra link");
const zionsTrumpetIds = ["zions-trumpet-1849", "zions-trumpet-1850", "zions-trumpet-1851", "zions-trumpet-1852", "zions-trumpet-1853", "zions-trumpet-1854", "zions-trumpet-1855", "zions-trumpet-1856-1857"];
for (const required of ["ronald-dennis-publications.js", "publication-viewer.html", "publication-viewer.css", "publication-viewer.js", "hymnal-discovery-extension.js", "data/publications.json", "data/publication-search/call-of-zion.json", "data/publication-search/welsh-hymnal-1852.json", "data/publication-search/welsh-hymnal-1852-page-map.json", "data/publication-search/welsh-mormon-writings.json", "data/publication-search/indefatigable-veteran.json", "data/publication-search/prophet-of-the-jubilee.json", "data/publication-search/steamboat-for-an-eldership.json", "data/publication-search/on-trial-welsh-press.json", ...zionsTrumpetIds.map((id) => `data/publication-search/${id}.json`), "books/call-of-zion.pdf", "books/1852-welsh-hymnal-cleaned.pdf", "books/welsh-mormon-writings.pdf", "books/indefatigable-veteran.pdf", "books/defending-the-faith.pdf", "books/prophet-of-the-jubilee.pdf", "books/steamboat-for-an-eldership.pdf", "books/on-trial-welsh-press.pdf", ...zionsTrumpetIds.map((id) => `books/${id}.pdf`), "assets/pdfjs/pdf.mjs", "assets/pdfjs/pdf.worker.mjs"]) {
  if (!fs.existsSync(path.join(output, required))) throw new Error(`Publication viewer asset missing: ${required}`);
}
const callOfZion = publicationCatalog.publications.find((item) => item.id === "call-of-zion");
const callOfZionSearch = JSON.parse(fs.readFileSync(path.join(output, "data/publication-search/call-of-zion.json"), "utf8"));
if (callOfZionSearch.publicationId !== "call-of-zion" || callOfZionSearch.pageCount !== 256 || callOfZionSearch.pages.length !== 256) throw new Error("Call of Zion page search index is invalid");
if (!callOfZionSearch.pages.some((page) => page.text.includes("Buena Vista"))) throw new Error("Call of Zion search index lacks expected embedded text");
for (const id of ["call-of-zion", "welsh-mormon-writings", "indefatigable-veteran", "defending-the-faith", "steamboat-for-an-eldership", "on-trial-welsh-press", "llyfr-mormon-translation", "capt-dan-jones-video"]) {
  const publication = publicationCatalog.publications.find((item) => item.id === id);
  if (!publication?.displayTitle || !publication?.displaySubtitle || publication.title !== `${publication.displayTitle}: ${publication.displaySubtitle}`) throw new Error(`${id}: explicit title/subtitle metadata is invalid`);
}
const welshWritings = publicationCatalog.publications.find((item) => item.id === "welsh-mormon-writings");
const welshWritingsSearch = JSON.parse(fs.readFileSync(path.join(output, "data/publication-search/welsh-mormon-writings.json"), "utf8"));
if (!welshWritings?.viewerAvailable || !welshWritings?.searchable || welshWritingsSearch.publicationId !== "welsh-mormon-writings" || welshWritingsSearch.pageCount !== 271 || welshWritingsSearch.pages.length !== 271) throw new Error("Welsh Mormon Writings prototype/index is invalid");
const abelEvans = publicationCatalog.publications.find((item) => item.id === "indefatigable-veteran");
const abelEvansSearch = JSON.parse(fs.readFileSync(path.join(output, "data/publication-search/indefatigable-veteran.json"), "utf8"));
if (!abelEvans?.viewerAvailable || !abelEvans?.searchable || abelEvans.pageCount !== 362 || abelEvansSearch.publicationId !== "indefatigable-veteran" || abelEvansSearch.pageCount !== 362 || abelEvansSearch.pages.length !== 362) throw new Error("Indefatigable Veteran prototype/index is invalid");
const defendingTheFaith = publicationCatalog.publications.find((item) => item.id === "defending-the-faith");
if (!defendingTheFaith?.viewerAvailable || defendingTheFaith?.searchable || defendingTheFaith.pageCount !== 1130 || defendingTheFaith.searchableTextSource) throw new Error("Defending the Faith viewable-only configuration is invalid");
const prophetOfTheJubilee = publicationCatalog.publications.find((item) => item.id === "prophet-of-the-jubilee");
const prophetOfTheJubileeSearch = JSON.parse(fs.readFileSync(path.join(output, "data/publication-search/prophet-of-the-jubilee.json"), "utf8"));
if (!prophetOfTheJubilee?.viewerAvailable || !prophetOfTheJubilee?.searchable || prophetOfTheJubilee.pageCount !== 708 || prophetOfTheJubileeSearch.publicationId !== "prophet-of-the-jubilee" || prophetOfTheJubileeSearch.pageCount !== 708 || prophetOfTheJubileeSearch.pages.length !== 708) throw new Error("Prophet of the Jubilee prototype/index is invalid");
const steamboat = publicationCatalog.publications.find((item) => item.id === "steamboat-for-an-eldership");
const steamboatSearch = JSON.parse(fs.readFileSync(path.join(output, "data/publication-search/steamboat-for-an-eldership.json"), "utf8"));
if (!steamboat?.viewerAvailable || !steamboat?.searchable || steamboat.pageCount !== 190 || steamboatSearch.publicationId !== "steamboat-for-an-eldership" || steamboatSearch.pageCount !== 190 || steamboatSearch.pages.length !== 190) throw new Error("A Steamboat for an Eldership prototype/index is invalid");
const onTrial = publicationCatalog.publications.find((item) => item.id === "on-trial-welsh-press");
const onTrialSupplemental = publicationCatalog.publications.find((item) => item.id === "on-trial-supplemental");
const welshNewspapers = publicationCatalog.publications.find((item) => item.id === "welsh-newspapers");
const welshPeriodicals = publicationCatalog.publications.find((item) => item.id === "welsh-periodicals");
const onTrialSearch = JSON.parse(fs.readFileSync(path.join(output, "data/publication-search/on-trial-welsh-press.json"), "utf8"));
if (!onTrial?.viewerAvailable || !onTrial?.searchable || onTrial.publicationStatus !== "final published version" || onTrialSearch.publicationId !== "on-trial-welsh-press" || onTrialSearch.pageCount !== 944 || onTrialSearch.pages.length !== 944) throw new Error("On Trial in the Welsh Press prototype/index is invalid");
if (publicationCatalog.publications.some((item) => item.id === "opposition-gospel-message-wales-prepublication" || item.title === "Opposition to the Gospel Message in Wales")) throw new Error("Opposition prepublication title remains exposed in the visible catalog");
if (!onTrialSupplemental || onTrialSupplemental.category !== "major-works" || onTrialSupplemental.showPublicationStatus !== false || onTrialSupplemental.viewerAvailable || onTrialSupplemental.searchable) throw new Error("On Trial Supplemental visible catalog treatment is invalid");
if (welshNewspapers?.parentPublicationId !== "on-trial-supplemental" || welshPeriodicals?.parentPublicationId !== "on-trial-supplemental" || welshNewspapers.viewerAvailable || welshNewspapers.searchable || welshPeriodicals.viewerAvailable || welshPeriodicals.searchable) throw new Error("On Trial Supplemental subwork relationships are invalid");
for (const id of zionsTrumpetIds) {
  const publication = publicationCatalog.publications.find((item) => item.id === id);
  const index = JSON.parse(fs.readFileSync(path.join(output, `data/publication-search/${id}.json`), "utf8"));
  if (!publication?.viewerAvailable || !publication?.searchable || index.publicationId !== id || index.pageCount !== publication.pageCount || index.pages.length !== publication.pageCount) throw new Error(`${id}: integrated publication/index is invalid`);
}
if (publicationCatalog.publications.filter((item) => item.viewerAvailable && item.searchable).length !== 16) throw new Error("Exactly sixteen publications must be integrated/searchable");
if (!publicationCatalog.collectionSearch?.enabled || publicationCatalog.collectionSearch?.integratedPublicationIds?.length !== 16 || !publicationCatalog.collectionSearch.integratedPublicationIds.includes("indefatigable-veteran") || publicationCatalog.collectionSearch.integratedPublicationIds.includes("defending-the-faith") || !publicationCatalog.collectionSearch.integratedPublicationIds.includes("prophet-of-the-jubilee") || !publicationCatalog.collectionSearch.integratedPublicationIds.includes("steamboat-for-an-eldership") || !publicationCatalog.collectionSearch.integratedPublicationIds.includes("welsh-hymnal-1852") || !publicationCatalog.collectionSearch.integratedPublicationIds.includes("llyfr-mormon-translation")) throw new Error("Integrated-publication collection search configuration is invalid");
if (publicationCatalog.collectionSearch.integratedPublicationIds.includes("opposition-gospel-message-wales-prepublication")) throw new Error("Opposition prepublication title remains in integrated publication search");
if (publicationCatalog.collectionSearch.scopeNote !== "Search currently covers 16 integrated publications.") throw new Error("Integrated-publication scope note is missing or inaccurate");
const zionsTrumpetSet = publicationCatalog.collectionSearch.publicationSets?.find((item) => item.id === "zions-trumpet");
if (!zionsTrumpetSet || zionsTrumpetSet.label !== "Zion’s Trumpet" || zionsTrumpetSet.publicationIds.length !== 8 || !zionsTrumpetSet.publicationIds.every((id) => zionsTrumpetIds.includes(id))) throw new Error("Zion’s Trumpet publication search set is invalid");

for (const file of fs.readdirSync(output, { recursive: true }).filter((name) => typeof name === "string" && /\.(?:html|js|json|css|txt)$/i.test(name) && !name.includes("assets\\pdfjs"))) {
  const content = fs.readFileSync(path.join(output, file), "utf8");
  if (content.includes(":codex-file-citation") || /C:\\Users\\/i.test(content) || content.includes('purpose="source"')) throw new Error(`${file}: internal citation/path syntax leaked into Local Development`);
}
if (!callOfZion || callOfZion.pageCount !== 256 || callOfZion.author !== "Ronald D. Dennis" || !callOfZion.viewerAvailable || !callOfZion.searchable) throw new Error("Call of Zion viewer configuration invalid");
const publicationViewerHtml = fs.readFileSync(path.join(output, "publication-viewer.html"), "utf8");
if (!publicationViewerHtml.includes("LOCAL DEVELOPMENT — NOT PUBLISHED") || !publicationViewerHtml.includes("publication-viewer.js")) throw new Error("Publication viewer identity/runtime missing");
if (!publicationViewerHtml.includes('<details class="book-search" id="book-search">') || !publicationViewerHtml.includes('<summary id="bookSearchHeading">Search this book</summary>')) throw new Error("Publication viewer Search this book disclosure missing");
for (const [id, label] of [["previousPage", "Previous page"], ["nextPage", "Next page"], ["fitPage", "Fit page"], ["fitWidth", "Fit width"], ["printBook", "Print"]]) {
  const controlPattern = new RegExp(`id="${id}"[^>]*aria-label="${label}"[^>]*title="${label}"`);
  if (!controlPattern.test(publicationViewerHtml)) throw new Error(`Publication viewer icon control is missing accessible naming: ${label}`);
}
if (!publicationViewerHtml.includes('class="book-control-icon-mobile"') || !publicationViewerHtml.includes('class="book-icon-control"') || !publicationViewerHtml.includes('class="book-print book-icon-control"')) throw new Error("Publication viewer compact icons missing");
if (!publicationViewerHtml.includes('id="sidePrevious"') || !publicationViewerHtml.includes('id="sideNext"')) throw new Error("Publication viewer side navigation missing");
if (/(?:←|&larr;|&#8592;)\s*Ronald D\. Dennis Publications/i.test(publicationViewerHtml)) throw new Error("Publication viewer return link still has a decorative arrow");
const localAppRuntime = fs.readFileSync(path.join(output, "app.js"), "utf8");
if (localAppRuntime.includes('`← ${currentBranchName} Branch Resources`')) throw new Error("Source viewer branch-resource return still has a decorative arrow");
if (!localHomeHtml.includes('id="previousImage">&larr; Previous</button>') || !localHomeHtml.includes('id="nextImage">Next &rarr;</button>')) throw new Error("Functional source-viewer Previous/Next controls were altered");
const publicationViewerJs = fs.readFileSync(path.join(output, "publication-viewer.js"), "utf8");
const publicationsJs = fs.readFileSync(path.join(output, "ronald-dennis-publications.js"), "utf8");
if (!publicationsHtml.includes("Search all integrated publications") || !publicationsJs.includes("searchIntegratedPublications")) throw new Error("Integrated-publication search UI/runtime missing");
if (!publicationsHtml.includes('id="publicationCollectionSearchSource"') || !publicationsHtml.includes('id="publicationCollectionSearchSelectAll"') || !publicationsHtml.includes('id="publicationCollectionSearchClear"') || !publicationsJs.includes("selectedIntegratedPublicationIds") || !publicationsJs.includes("selectedPublicationScopes")) throw new Error("Integrated-publication multi-select source filter missing");
if (!publicationsHtml.includes('id="publicationCollectionSearchToggle"') || !publicationsJs.includes("toggleIntegratedSearchResults")) throw new Error("Integrated-publication result disclosure missing");
if (!publicationViewerJs.includes('parameters.get("page")')) throw new Error("Publication viewer exact-page routing missing");
for (const behavior of ["SWIPE_MINIMUM_PX", "pageNeedsHorizontalPanning", "touchstart", "ArrowLeft", "ArrowRight", "beginDesktopPageClick", "endDesktopPageClick", "prefers-reduced-motion: reduce", "book-page-turn-forward", "book-page-turn-backward"]) {
  if (!publicationViewerJs.includes(behavior)) throw new Error(`Publication viewer interaction missing: ${behavior}`);
}
const transcriptCollections = JSON.parse(fs.readFileSync(path.join(output, "RESEARCH_BETA_BUILD_REPORT.json"), "utf8")).transcriptViewers || [];
const transcriptImageRoot = path.join(output, "resources/typed-viewer-pages");
const transcriptImages = fs.existsSync(transcriptImageRoot)
  ? fs.readdirSync(transcriptImageRoot, { recursive: true }).filter((name) => typeof name === "string" && /\.jpe?g$/i.test(name))
  : [];
if (transcriptImages.length !== 777) throw new Error(`Local Development transcript image count invalid: ${transcriptImages.length}`);
const localOverrides = fs.readFileSync(path.join(output, "local-catalog-overrides.js"), "utf8");
if (!localOverrides.includes("resources/typed-viewer-pages/") || !localOverrides.includes('online: true')) throw new Error("Local transcript runtime mappings are missing");
if (!localOverrides.includes('catalog.edition = "local-development"') || !localOverrides.includes("resources/original-cds/")) throw new Error("Local original-CD runtime mappings are missing");
const catalogContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(output, "data/catalog.public.js"), "utf8"), catalogContext);
const expectedLocalImages = new Set(catalogContext.window.WELSH_RECORD_CATALOG.collections
  .filter((collection) => collection.sources?.includes("original-cds"))
  .flatMap((collection) => collection.images || [])
  .map((record) => String(record.archiveRelativePath || "").replaceAll("\\", "/"))
  .filter(Boolean));
const missingLocalImages = [...expectedLocalImages].filter((relative) => !fs.existsSync(path.join(output, "resources/original-cds", ...relative.split("/"))));
if (missingLocalImages.length) throw new Error(`Local Development is missing ${missingLocalImages.length} cataloged original-CD images; first: ${missingLocalImages[0]}`);
const supplemental = publicationCatalog.publications.find((publication) => publication.id === "on-trial-supplemental");
if (!supplemental || supplemental.publicationStatus !== "unpublished manuscript" || supplemental.publicUrl || supplemental.localDocument || supplemental.searchable) throw new Error("Supplemental manuscript availability is invalid");
const welshSaintsRuntime = fs.readFileSync(path.join(output, "welsh-saints-research.js"), "utf8");
if (!welshSaintsRuntime.includes('results.addEventListener("click"') || !welshSaintsRuntime.includes("data-person-detail-source-id")) throw new Error("Welsh Saints delegated person-detail activation is missing");
if (!welshSaintsRuntime.includes("Open original Welsh Saints record")) throw new Error("Welsh Saints external-source action is not explicit");
for (const [file, label] of [["index.html", "Home"], ["transcriptions-translations.html", "Transcriptions & Translations"]]) {
  const html = fs.readFileSync(path.join(output, file), "utf8");
  if (!html.includes('href="ronald-dennis-publications.html"')) throw new Error(`${label}: Ronald D. Dennis Publications link missing`);
}
const report = JSON.parse(fs.readFileSync(path.join(output, "LOCAL_DEVELOPMENT_BUILD_REPORT.json"), "utf8"));
if (report.edition !== "local-development" || report.publishAutomatically !== false) throw new Error("Local-development report marker invalid");
console.log(test.stdout.trim());
console.log(JSON.stringify({ output, identityPages: htmlFiles.length, publicationEntries, localOriginalCdImages: expectedLocalImages.size, publishAutomatically: false }, null, 2));
