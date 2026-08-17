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
  if (!html.includes("window.WELSH_LOCAL_DEVELOPMENT=true;")) throw new Error(`${file}: local-development runtime marker missing`);
  if (!html.includes('<meta name="apple-mobile-web-app-title" content="Welsh DEV">')) throw new Error(`${file}: Welsh DEV Home Screen title missing`);
  if (!html.includes('<script src="masthead-home.js"></script>')) throw new Error(`${file}: shared masthead Home navigation missing`);
  if (html.includes('id="headerSearchButton"') || html.includes('class="footer-project"')) throw new Error(`${file}: masthead search icon or footer Project menu remains`);
  if (/FULL ONLINE ARCHIVE EDITION|LOCAL DEVELOPMENT\s*[—-]\s*NOT PUBLISHED|Research beta/i.test(html)) throw new Error(`${file}: visible environment/build wording remains`);
  for (const [href, label] of [["about.html", "About"], ["research-status.html", "Research Status"]]) {
    if (!html.includes(`<a href="${href}">${label}</a>`)) throw new Error(`${file}: lower project-information link missing: ${label}`);
  }
  const footer = html.match(/<footer[\s\S]*?<\/footer>/i)?.[0] || "";
  if (footer.includes('href="historical-names.html"')) throw new Error(`${file}: Historical Names link remains in the footer`);
  if (footer.includes('href="familysearch-comparison.html"')) throw new Error(`${file}: FamilySearch Comparison link remains in the footer`);
  const topNavigation = [...html.matchAll(/<nav class="(?:research-page-nav|publication-page-nav)"[\s\S]*?<\/nav>/gi)].map((match) => match[0]).join("\n");
  if (/(?:←|&larr;|&#8592;)\s*(?:Home|Ronald D\. Dennis Publications)/i.test(topNavigation)) throw new Error(`${file}: decorative top-navigation arrow remains`);
}
const mastheadHomeRuntime = fs.readFileSync(path.join(output, "masthead-home.js"), "utf8");
const sharedStyles = fs.readFileSync(path.join(output, "styles.css"), "utf8");
if (!sharedStyles.includes('.directory-member-search-link { color: var(--green-dark); font: 500 .8rem/1.25 Arial, sans-serif; text-decoration: none; }') || !sharedStyles.includes('.directory-member-search-link:hover, .directory-member-search-link:focus-visible { text-decoration: underline; text-underline-offset: 3px; }')) throw new Error("Welsh branches navigation links do not share the approved restrained typography");
if (!sharedStyles.includes('.research-status-page .guide-section { margin-bottom: 24px; padding-block: 28px; }')) throw new Error("Research Status page-specific compact card spacing is missing");
if (!sharedStyles.includes('.site-disclaimer > .research-feedback-link { margin: 2px 0 0; }') || !sharedStyles.includes('.site-disclaimer [data-page-feedback] > .research-feedback-link { margin-top: 2px; }') || !sharedStyles.includes('.presentation-footer-feedback > .research-feedback-link { margin-top: 0; }')) throw new Error("Shared footer feedback-link spacing is missing");
if (!sharedStyles.includes('body:has(.search-sticky-nav) .research-index-page { flex: 0 0 auto; min-height: 0; padding-bottom: 116px; }') || !sharedStyles.includes('body:has(.search-sticky-nav) .footer-reference-links a { min-height: 44px; }')) throw new Error("Search-page footer spacing or mobile tap-target treatment is missing");
if (!sharedStyles.includes(".masthead-home-link { flex: 0 0 auto; width: 100%;")) throw new Error("Clickable masthead can still grow inside flex-column search pages");
if (!sharedStyles.includes(".masthead { align-items: center; flex-wrap: wrap; }")) throw new Error("Shared mobile masthead title alignment is not vertically centered");
if (sharedStyles.includes(".masthead { align-items: flex-start; flex-wrap: wrap; }")) throw new Error("Legacy top-aligned mobile masthead override remains");
for (const required of ['setAttribute("role", "link")', 'setAttribute("aria-label", "Home")', '!["Enter", " "].includes(event.key)', 'location.href = "index.html"']) {
  if (!mastheadHomeRuntime.includes(required)) throw new Error(`Shared masthead Home behavior is incomplete: ${required}`);
}
if (!mastheadHomeRuntime.includes('event.target.closest("a, button, input, select, textarea, summary")')) throw new Error("Shared masthead Home runtime does not protect nested controls");
const navigationRuntime = fs.readFileSync(path.join(output, "navigation.js"), "utf8");
if (navigationRuntime.includes('masthead.setAttribute("role", "link")')) throw new Error("Legacy whole-header masthead link remains in navigation.js");
const manifest = JSON.parse(fs.readFileSync(path.join(output, "site.webmanifest"), "utf8"));
if (manifest.short_name !== "Welsh DEV" || !manifest.icons?.every((icon) => /app-icon-beta-/.test(icon.src))) throw new Error("Local-development Home Screen manifest identity invalid");
const localHomeHtml = fs.readFileSync(path.join(output, "index.html"), "utf8");
const possibleBranchProvenance = JSON.parse(fs.readFileSync(path.join(output, "data/possible-branch-provenance.json"), "utf8"));
if (possibleBranchProvenance.candidates.length !== 30) throw new Error(`Expected 30 possible-branch provenance records; found ${possibleBranchProvenance.candidates.length}`);
if (possibleBranchProvenance.candidates.filter((candidate) => candidate.provenanceStatus === "page-level-evidence").length !== 19) throw new Error("Possible-branch page-level provenance count is invalid");
if (possibleBranchProvenance.candidates.filter((candidate) => candidate.provenanceStatus === "recovery-needed").length !== 11) throw new Error("Possible-branch provenance-recovery count is invalid");
if ((localHomeHtml.match(/<details class="candidate-source-evidence">/g) || []).length !== possibleBranchProvenance.candidates.length) throw new Error("Not every possible branch has a Source evidence disclosure");
if (!localHomeHtml.includes('publication-viewer.html?id=zions-trumpet-1853&amp;page=252') || !localHomeHtml.includes("Original provenance still needs recovery")) throw new Error("Possible-branch exact-page links or provenance-recovery labels are missing");
const branchExportRuntime = fs.readFileSync(path.join(output, "branch-export.js"), "utf8");
if (!branchExportRuntime.includes('<summary aria-expanded="false">Export branch data</summary>') || branchExportRuntime.includes('<summary aria-expanded="false">Export</summary>')) throw new Error("Branch export utility label is not current");
if (!branchExportRuntime.includes('aria-label", "Export branch data"') || !branchExportRuntime.includes("branch-export-top-trigger") || !branchExportRuntime.includes("activeTrigger")) throw new Error("Top branch export trigger is missing or does not share the existing export control");
if (!branchExportRuntime.includes('checked>Identified branches</label>') || branchExportRuntime.includes('checked>Canonical branches</label>')) throw new Error("Branch export scope wording is not current");
if (!branchExportRuntime.includes('const positionMenu = () =>') || !branchExportRuntime.includes('window.innerWidth - (margin * 2)')) throw new Error("Branch export menu is not viewport-positioned");
if (!localHomeHtml.includes('data-after-paint-src="data/beta/people-index.beta.js') || !localHomeHtml.includes('data-after-paint-src="home-unified-search.js')) throw new Error("Home search datasets are not deferred until after the first paint");
if (!localHomeHtml.includes('dataset.searchBootstrap = "ready"')) throw new Error("After-paint search bootstrap loader missing");
const peopleSearchHtml = fs.readFileSync(path.join(output, "people-search.html"), "utf8");
if (!peopleSearchHtml.includes('data-after-paint-src="data/beta/people-index.beta.js')) throw new Error("Member Search index is still render-blocking");
const welshSaintsSearchHtml = fs.readFileSync(path.join(output, "welsh-saints-research.html"), "utf8");
if (!welshSaintsSearchHtml.includes('data-after-paint-src="data/beta/welsh-saints-index.beta.js')) throw new Error("Welsh Saints index is still render-blocking");
if (localHomeHtml.includes("<summary>Search in</summary>") || localHomeHtml.includes("home-search-sources > summary")) throw new Error("Home Search in dropdown remains present");
if (!localHomeHtml.includes('<fieldset class="home-search-sources"') || !localHomeHtml.includes('<legend id="homeSearchSourcesLabel" class="visually-hidden">Search sources</legend>')) throw new Error("Visible Home source checkbox group is missing");
for (const [value, label] of [["archive", "Archive resources"], ["members", "Member records"], ["welsh-saints", "Welsh Saints Project"], ["publications", "Publications"]]) {
  if (!localHomeHtml.includes(`value="${value}"`) || !localHomeHtml.includes(`<span>${label}</span>`)) throw new Error(`Home source checkbox is missing: ${label}`);
}
if (!localHomeHtml.includes('<input type="checkbox" value="archive" checked>')) throw new Error("Archive resources is not the default Home search source");
for (const value of ["members", "welsh-saints", "publications"]) {
  if (localHomeHtml.includes(`<input type="checkbox" value="${value}" checked>`)) throw new Error(`Unexpected default Home search source: ${value}`);
}
const branchNamesExplainer = '<details class="welsh-names-explainer directory-welsh-names-explainer"><summary>Welsh names and spelling</summary>';
if (localHomeHtml.includes(branchNamesExplainer)) throw new Error("Welsh branches still includes a separate names-and-spelling disclosure");
if (!localHomeHtml.includes('<nav class="directory-page-nav" aria-label="Branch directory navigation"><a class="directory-home-link" href="index.html">Home</a><a class="directory-member-search-link" href="people-search.html?scope=all-records">Member Search</a></nav>\n      <h2>Welsh branches</h2>')) throw new Error("Welsh branches Home and Full Search links are missing or incorrectly placed");
const welshEndingVariationExplanation = "The endings of Welsh place names may also vary between historical sources. These differences can result from older spelling conventions, grammatical or plural forms, dialect, anglicized spellings, or later standardization. A different ending therefore does not necessarily indicate a different place.";
const historicalNamesHtml = fs.readFileSync(path.join(output, "historical-names.html"), "utf8");
if (!historicalNamesHtml.includes("Welsh place names may appear with different first letters because Welsh grammar can change the opening consonant of a word.") || !historicalNamesHtml.includes(welshEndingVariationExplanation) || !historicalNamesHtml.includes("This site preserves these source forms and links them to the same place when the evidence supports that relationship.")) throw new Error("Historical Names explanation is incomplete");
const historicalNamesStyles = fs.readFileSync(path.join(output, "styles.css"), "utf8");
if (!historicalNamesStyles.includes("--historical-search-inset: 16px") || !historicalNamesStyles.includes(".historical-names-page .guide-intro { --historical-search-inset: 16px; padding-bottom: 22px; }") || !historicalNamesStyles.includes(".historical-names-page #historicalNameCount")) throw new Error("Historical Names page-specific search inset or compact bottom spacing is missing");
if (!localHomeHtml.includes('<a class="home-path-card home-resources-card" href="resources.html">') || !localHomeHtml.includes('<strong>Resources</strong>')) throw new Error("Home Resources card is missing or incorrectly routed");
if (localHomeHtml.includes("home-welsh-saints-card") || localHomeHtml.includes('<strong>Welsh Saints Search</strong>')) throw new Error("The former Welsh Saints Home card remains");
if (!localHomeHtml.includes('<div class="home-secondary-resource-links"><a href="ronald-dennis-publications.html">Ronald D. Dennis Publications</a><a href="welsh-historical-publications.html">Welsh LDS Historical Publications</a></div>')) throw new Error("Home historical-learning links are missing or still duplicate Resources");
const branchUtilities = localHomeHtml.match(/<div class="branch-directory-utilities"[\s\S]*?<\/div>\s*<\/section>/)?.[0] || "";
const expectedBranchUtilityOrder = [
  '<a class="branch-directory-historical-names" href="historical-names.html">Historical Names and Variants</a>',
  '<a href="transcriptions-translations.html">Transcriptions</a>',
  '<div class="branch-export-slot"></div>',
];
if (!branchUtilities || !expectedBranchUtilityOrder.every((item) => branchUtilities.includes(item))) throw new Error("Welsh branches utility links are incomplete");
if (expectedBranchUtilityOrder.some((item, index) => index && branchUtilities.indexOf(item) < branchUtilities.indexOf(expectedBranchUtilityOrder[index - 1]))) throw new Error("Welsh branches utility links are out of order");
if (!localHomeHtml.includes('<div class="presentation-branch-tools"><details class="presentation-branch-review">') || !localHomeHtml.includes('<div class="branch-export-top-slot"></div></div>')) throw new Error("Top branch export slot is not placed beside Possible branches under review");
const resourcesHtml = fs.readFileSync(path.join(output, "resources.html"), "utf8");
for (const url of ["https://www.familysearch.org/", "https://churchhistorylibrary.churchofjesuschrist.org/?lang=eng", "https://www.library.wales/", "https://welshsaints.byu.edu/"]) {
  if (!resourcesHtml.includes(`href="${url}" target="_blank" rel="noopener noreferrer"`)) throw new Error(`Resources external link is missing or unsafe: ${url}`);
}
if (!resourcesHtml.includes('<a href="index.html">Home</a>') || resourcesHtml.includes("← Home")) throw new Error("Resources Home navigation is invalid");
if (!resourcesHtml.includes("Use and reuse") || !resourcesHtml.includes('href="about.html#ai-continuation"')) throw new Error("Resources reuse or AI-guide pointer is missing");
if (!resourcesHtml.includes('<a href="welsh-saints-research.html">Search within the project</a>') || !resourcesHtml.includes('href="https://welshsaints.byu.edu/" target="_blank" rel="noopener noreferrer"') || !resourcesHtml.includes('>Visit the site ')) throw new Error("Resources Welsh Saints internal/external choices are missing");
if (!resourcesHtml.includes('<a class="external-resource-card" href="transcriptions-translations.html">') || !resourcesHtml.includes("Partial Branch and Conference Transcripts")) throw new Error("Renamed partial transcripts resource is missing");
const resourcesHistorical = '<a class="external-resource-card internal-resource-card" href="historical-names.html">';
const resourcesTranscripts = '<a class="external-resource-card" href="transcriptions-translations.html">';
if (!resourcesHtml.includes(resourcesHistorical) || resourcesHtml.indexOf(resourcesHistorical) > resourcesHtml.indexOf(resourcesTranscripts)) throw new Error("Resources Historical Names link is missing or not immediately before Partial Transcripts");
const localAboutHtml = fs.readFileSync(path.join(output, "about.html"), "utf8");
const aboutProjectInformation = localAboutHtml.match(/<h2>Project information<\/h2>[\s\S]*?<\/section>/)?.[0] || "";
const expectedAboutProjectLinks = [
  '<a href="branch-registry.html">Branch coverage matrix</a>',
  '<a href="familysearch-comparison.html">FamilySearch Branch Comparison</a>',
  '<a href="work-remaining.html">Unmatched branches and work remaining</a>',
];
if (!aboutProjectInformation || !expectedAboutProjectLinks.every((link) => aboutProjectInformation.includes(link))) throw new Error("About Project information links are incomplete");
if (expectedAboutProjectLinks.some((link, index) => index && aboutProjectInformation.indexOf(link) < aboutProjectInformation.indexOf(expectedAboutProjectLinks[index - 1]))) throw new Error("About Project information links are out of order");
if (!localAboutHtml.includes("Free to use and improve") || !localAboutHtml.includes('id="ai-continuation"') || !localAboutHtml.includes("AI Continuation Guide — coming later")) throw new Error("About reuse or AI Continuation Guide placeholder is missing");
if (/\bopen source\b/i.test(localAboutHtml) || /href=["'][^"']*ai-continuation-guide/i.test(localAboutHtml)) throw new Error("About claims a formal open-source status or exposes a dead AI-guide link");
if (!localAboutHtml.includes("Future enhancements and unfinished work") || !localAboutHtml.includes("do not yet comprehensively index every paragraph") || !localAboutHtml.includes("original images as the authoritative source")) throw new Error("About historical-text coverage guidance is missing");
if (!localAboutHtml.includes('<a href="work-remaining.html">Unfinished Work</a>') || !localAboutHtml.includes("completing one does not automatically complete the other")) throw new Error("About Unfinished Work relationship or link is missing");
const researchStatusHtml = fs.readFileSync(path.join(output, "research-status.html"), "utf8");
for (const heading of ["Member Search status", "Branch names, spellings, and variants", "FamilySearch comparison", "Untranscribed material and partial transcripts", "Source quality", "Corrections and additions"]) {
  if (!researchStatusHtml.includes(heading)) throw new Error(`Research Status section missing: ${heading}`);
}
if ((researchStatusHtml.match(/<h2>Untranscribed material and partial transcripts<\/h2>/g) || []).length !== 1 || researchStatusHtml.includes("<h2>Transcriptions &amp; Translations</h2>")) throw new Error("Research Status transcript coverage must use one combined section");
if ((researchStatusHtml.match(/<h2>Member Search status<\/h2>/g) || []).length !== 1 || researchStatusHtml.includes("<h2>Possible duplicate member entries</h2>") || researchStatusHtml.includes("<h2>Member Search details</h2>")) throw new Error("Research Status member caveats must use one combined section");
if (!researchStatusHtml.includes('<a href="index.html">Home</a>') || researchStatusHtml.includes("← Home")) throw new Error("Research Status Home navigation is invalid");
if (!researchStatusHtml.includes('<a href="familysearch-comparison.html">FamilySearch Branch Comparison</a>') || !researchStatusHtml.includes('<a href="transcriptions-translations.html">Transcriptions &amp; Translations</a>') || !researchStatusHtml.includes('See also: <a href="work-remaining.html">Unfinished Work</a>')) throw new Error("Research Status internal links are incomplete");
if (!researchStatusHtml.includes("Individual member names and details have not been systematically compared with FamilySearch person records.")) throw new Error("Research Status FamilySearch person-comparison scope clarification is missing");
if (!researchStatusHtml.includes('<a href="people-search.html?scope=all-records">Search page</a>')) throw new Error("Research Status Full Search link is missing or incorrectly routed");
const peopleSearchRuntime = fs.readFileSync(path.join(output, "people-search.js"), "utf8");
if (!peopleSearchRuntime.includes('requestedScope === "all-records"') || !peopleSearchRuntime.includes("requestedScopeControl.checked = true")) throw new Error("Member Search does not honor the Full Search deep-link scope");
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
if (!publicationsHtml.includes('<section class="publication-collection-search" id="publicationCollectionSearch" aria-label="Search publications" hidden>')) throw new Error("Always-visible publication search region missing");
if (publicationsHtml.includes("Search all available publications")) throw new Error("Redundant parent publication-search disclosure remains");
if (!publicationsHtml.includes('<label for="publicationCollectionSearchInput">Search for...</label>') || !publicationsHtml.includes('placeholder="Search names, places, words, or phrases"')) throw new Error("Primary integrated-publication search field is incomplete");
if (!publicationsHtml.includes('<details class="publication-search-parameters" id="publicationCollectionSearchParameters">') || !publicationsHtml.includes('<summary><span>Search parameters</span></summary>')) throw new Error("Collapsed integrated-publication Search parameters disclosure missing");
if (/<details class="publication-search-parameters"[^>]*\sopen(?:\s|>)/.test(publicationsHtml)) throw new Error("Integrated-publication Search parameters must start collapsed");
const localStyles = fs.readFileSync(path.join(output, "styles.css"), "utf8");
if (!localStyles.includes('.workspace:has(#homePanel:not([hidden])) { min-height: 0; }') || !localStyles.includes('.workspace:has(#homePanel:not([hidden])) > .viewer { padding-bottom: 43px; }') || !localStyles.includes('body:has(#homePanel:not([hidden])) .footer-reference-links a { min-height: 44px; }')) throw new Error("Home-specific footer spacing or mobile tap-target override is missing");
if (!localStyles.includes('.branch-directory-utilities .branch-directory-historical-names,\n.branch-directory-utilities .presentation-transcript-link a { min-height: 40px; box-sizing: border-box; display: inline-flex; align-items: center; padding-block: 5px; color: var(--green-dark); font: 500 .84rem/1.3 Arial, sans-serif; }')) throw new Error("Branch utility-row controls do not share typography");
if (!localStyles.includes('.publication-collection-search { max-width: 802px; margin: 7px 0 14px 18px; }')) throw new Error("Publication search block is not aligned with the About disclosure text");
if (!localStyles.includes('.publication-search-parameters > summary { width: fit-content; min-height: 42px; box-sizing: border-box; display: list-item; margin-left: 12px;')) throw new Error("Search parameters does not retain its subtle inset from the search input left edge");
if (/\.publication-search-parameters[^\n]*::after\s*\{[^}]*content:/i.test(localStyles)) throw new Error("Search parameters still uses a custom text arrow instead of the native disclosure marker");
if (!publicationsHtml.includes('<span id="publicationCollectionSearchSourceSummary">All publications</span>')) throw new Error("Publication selector summary wording is not simplified");
const publicationsSelectorRuntime = fs.readFileSync(path.join(output, "ronald-dennis-publications.js"), "utf8");
if (!publicationsSelectorRuntime.includes('addChoice("all", "All publications", true)') || !publicationsSelectorRuntime.includes('collectionSearch.sourceSummary.textContent = "All publications"')) throw new Error("All publications scope wording is incomplete");
if (/addHeading\(|All integrated publications|Publication sets|Individual publications/.test(publicationsSelectorRuntime)) throw new Error("Redundant publication-selector headings remain");
if (!publicationsHtml.includes('aria-label="Search publications"') || !publicationsHtml.includes('>Search publications</button>') || /Searching [^`\n]*integrated publications/.test(publicationsSelectorRuntime)) throw new Error("Visible publication-search wording still uses Integrated publications");
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
if (!onTrialSupplemental || onTrialSupplemental.category !== "major-works" || onTrialSupplemental.showPublicationStatus !== false || onTrialSupplemental.comingSoon !== true || onTrialSupplemental.viewerAvailable || onTrialSupplemental.searchable) throw new Error("On Trial Supplemental visible catalog treatment is invalid");
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
if (!publicationViewerHtml.includes("publication-viewer.js") || !publicationViewerHtml.includes("window.WELSH_LOCAL_DEVELOPMENT=true;")) throw new Error("Publication viewer internal identity/runtime missing");
if (!publicationViewerHtml.includes('<section class="book-search" id="book-search" aria-labelledby="bookSearchHeading">') || !publicationViewerHtml.includes('<label id="bookSearchHeading" for="bookSearchInput">Search this book</label>')) throw new Error("Publication viewer visible Search this book row missing");
if (!publicationViewerHtml.includes('PDF page <input id="pageNumber"') || !publicationViewerHtml.includes('aria-label="PDF page number"')) throw new Error("Publication viewer PDF-sequence page label is not explicit");
if (!publicationViewerHtml.includes('id="bookSearchMatch"') || !publicationViewerHtml.includes('id="bookTextHighlights"')) throw new Error("Publication viewer search-match presentation layers are missing");
const publicationViewerRuntime = fs.readFileSync(path.join(output, "publication-viewer.js"), "utf8");
const publicationViewerStyles = fs.readFileSync(path.join(output, "publication-viewer.css"), "utf8");
if (!publicationViewerRuntime.includes("elements.canvas.clientHeight * .08") || !publicationViewerRuntime.includes('--book-page-turn-hint-top')) throw new Error("Publication viewer page-turn guidance is not positioned from the rendered page height");
if (!publicationViewerStyles.includes(".book-page-turn-hint-previous { justify-items: start;") || !publicationViewerStyles.includes(".book-page-turn-hint-next { justify-items: end;")) throw new Error("Publication viewer page-turn guidance is not aligned to the upper page corners");
if (publicationViewerHtml.includes('<details class="book-search"') || !publicationViewerHtml.includes('id="bookSearchInput" type="search"') || !publicationViewerHtml.includes('<button type="submit">Search</button>')) throw new Error("Publication viewer search is not visible by default with its compact submit control");
for (const required of ['parameters.get("q")', "page.getTextContent()", "pdfjsLib.Util.transform", "book-text-highlight", "showSearchMatchFallback", "PDF page ${match.pageNumber}"]) {
  if (!publicationViewerRuntime.includes(required)) throw new Error(`Publication viewer query highlighting is incomplete: ${required}`);
}
if (!publicationViewerRuntime.includes("bringFirstHighlightIntoView") || !publicationViewerRuntime.includes("lastAutoScrolledMatchKey")) throw new Error("Publication viewer first-match auto-scroll behavior is missing");
if (!publicationViewerStyles.includes(".book-text-highlight {") || !publicationViewerStyles.includes(".book-search-match {")) throw new Error("Publication viewer match-highlight styling is missing");
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
if (!publicationsJs.includes('status.className = "publication-coming-soon"') || !publicationsJs.includes('status.textContent = "(coming soon)"')) throw new Error("Supplemental coming-soon metadata rendering missing");
if (!publicationsHtml.includes("Search parameters") || !publicationsJs.includes("searchIntegratedPublications")) throw new Error("Integrated-publication search UI/runtime missing");
if (!publicationsJs.includes("<span>PDF page ${match.pageNumber}</span>") || !publicationsJs.includes("&q=${encodeURIComponent(query)}")) throw new Error("Collection publication results do not identify PDF pages or carry their query");
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
const transcriptViewerCollections = catalogContext.window.WELSH_RECORD_CATALOG.collections.filter((collection) => collection.viewerRepresentation && collection.sourcePdf);
if (transcriptViewerCollections.length !== 7) throw new Error(`Expected 7 typed transcript viewer collections; found ${transcriptViewerCollections.length}`);
for (const collection of transcriptViewerCollections) {
  const transcriptPdf = path.join(output, "books/transcripts", collection.sourcePdf);
  if (!fs.existsSync(transcriptPdf)) throw new Error(`Packaged transcript PDF missing: ${collection.sourcePdf}`);
}
if (!localAppRuntime.includes("publication-viewer.html?${parameters}") || !publicationViewerJs.includes("function transcriptPublication(parameters)")) throw new Error("Typed transcripts are not routed through the shared publication viewer");
if (!publicationViewerHtml.includes('id="bookReturn"') || !publicationViewerHtml.includes('src="data/catalog.public.js"')) throw new Error("Publication viewer transcript catalog/context support is missing");
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
