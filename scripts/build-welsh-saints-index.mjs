import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const outputDir = path.join(root, "data", "private");
const detailCachePath = path.join(outputDir, "welsh-saints-detail-cache.local.json");
const baseUrl = "https://welshsaints.byu.edu/";
const delayMs = 175;
const detailConcurrency = Math.max(1, Number(process.env.WELSH_SAINTS_CONCURRENCY) || 4);
const cookies = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function decode(value = "") {
  return value.replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}
function text(value = "") { return decode(value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim(); }
function elementById(html, id) {
  const opening = new RegExp(`<([a-z][\\w:-]*)\\b[^>]*\\bid=["']${id}["'][^>]*>`, "i").exec(html);
  if (!opening) return "";
  const tagName = opening[1];
  const start = opening.index;
  const tokenPattern = new RegExp(`<\\/?${tagName}\\b[^>]*>`, "gi");
  tokenPattern.lastIndex = start;
  let depth = 0;
  for (const token of html.slice(start).matchAll(tokenPattern)) {
    if (!token[0].startsWith("</")) depth += 1;
    else if (--depth === 0) return html.slice(start, start + token.index + token[0].length);
  }
  return html.slice(start);
}
function publicDetailText(html) {
  const publicContent = elementById(html, "content");
  if (!publicContent) return "";
  return text(publicContent
    .replace(/<a\b[^>]*href=["'][^"']*\/Manage\/[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, " ")
    .replace(/<a\b[^>]*href=["'][^"']*\/Account\/[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, " "));
}
function attrs(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((match) => [match[1].toLowerCase(), decode(match[2] ?? match[3] ?? "")]));
}
function hiddenFields(html) {
  const fields = new URLSearchParams();
  for (const match of html.matchAll(/<input\b[^>]*>/gi)) {
    const a = attrs(match[0]);
    if (a.type === "hidden" && a.name) fields.set(a.name, a.value || "");
  }
  return fields;
}
async function request(url, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const suppliedHeaders = options.headers || {};
      const cookie = [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
      const response = await fetch(url, { ...options, signal: options.signal || AbortSignal.timeout(30000), redirect: "follow", headers: { "User-Agent": "LDSWelshMembers private research indexer; contact via project repository", ...(cookie ? { Cookie: cookie } : {}), ...suppliedHeaders } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const setCookies = response.headers.getSetCookie?.() || (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")] : []);
      for (const item of setCookies) { const pair = item.split(";", 1)[0]; const split = pair.indexOf("="); if (split > 0) cookies.set(pair.slice(0, split), pair.slice(split + 1)); }
      const body = await response.text();
      await sleep(delayMs);
      return body;
    } catch (error) {
      lastError = error;
      await sleep(attempt * 750);
    }
  }
  throw lastError;
}
function rowsFrom(html, type, linkPattern, category = "") {
  const records = [];
  for (const match of html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)) {
    const row = match[0];
    const link = row.match(linkPattern);
    if (!link) continue;
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => text(cell[1])).filter(Boolean);
    const linkText = text(link[2] || "");
    const summary = text(row);
    const sourceId = Number(link[1]);
    const relativeUrl = link[3] || link[0].match(/href=["']([^"']+)/i)?.[1] || "";
    records.push({ type, sourceId, title: linkText || cells[0] || `${type} ${sourceId}`, summary, cells, category: category || undefined, url: new URL(relativeUrl, baseUrl).href });
  }
  return [...new Map(records.map((record) => [`${record.type}:${record.sourceId}`, record])).values()];
}
async function listing({ type, relativeUrl, linkName, category = "" }) {
  const url = new URL(relativeUrl, baseUrl).href;
  let html = await request(url);
  const select = html.match(/<select\b[^>]*name=["']([^"']*listsize)["'][^>]*>/i);
  if (select) {
    const form = hiddenFields(html);
    form.set(select[1], "250");
    const searchName = attrs(html.match(/<input\b[^>]*value=["']Search["'][^>]*>/i)?.[0] || "").name;
    if (searchName) form.set(searchName, "Search");
    html = await request(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString() });
  }
  const escaped = linkName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<a\\b[^>]*href=["']((${escaped}\\.aspx\\?id=(\\d+)))["'][^>]*>([\\s\\S]*?)<\\/a>`, "i");
  const rowPattern = new RegExp(`<a\\b[^>]*href=["'](${escaped}\\.aspx\\?id=(\\d+))["'][^>]*>([\\s\\S]*?)<\\/a>`, "i");
  const parse = (page) => {
    const rows = [];
    for (const tr of page.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)) {
      const found = tr[0].match(rowPattern);
      if (!found) continue;
      const cells = [...tr[0].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => text(cell[1])).filter(Boolean);
      const sourceId = Number(found[2]);
      rows.push({ type, sourceId, title: text(found[3]) || cells[0] || `${type} ${sourceId}`, summary: text(tr[0]), cells, category: category || undefined, url: new URL(found[1], baseUrl).href });
    }
    return [...new Map(rows.map((record) => [record.sourceId, record])).values()];
  };
  const records = [];
  const seen = new Set();
  for (let page = 1; page <= 1000; page += 1) {
    const pageRecords = parse(html).filter((record) => !seen.has(record.sourceId));
    pageRecords.forEach((record) => { seen.add(record.sourceId); records.push(record); });
    if (pageRecords.length < 250) break;
    const target = decode(html.match(/__doPostBack\(&#39;([^&]+GridView\d*)&#39;,&#39;Page\$2&#39;\)/i)?.[1] || "ctl00$MainContent$GridView1");
    const form = hiddenFields(html);
    form.set("__EVENTTARGET", target);
    form.set("__EVENTARGUMENT", `Page$${page + 1}`);
    if (select) form.set(select[1], "250");
    html = await request(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString() });
  }
  return records;
}

const existingIndexPath = path.join(outputDir, "welsh-saints-index.local.json");
const useExistingCatalog = process.argv.includes("--details-from-existing") && fs.existsSync(existingIndexPath);
const existingRecords = useExistingCatalog ? JSON.parse(fs.readFileSync(existingIndexPath, "utf8")).records : [];
const listingFields = ({ detailText, detailIndexed, matchedBranches, ...record }) => record;
const immigrants = useExistingCatalog ? existingRecords.filter((record) => record.type === "immigrant").map(listingFields) : await listing({ type: "immigrant", relativeUrl: "Immigrants_Listing.aspx", linkName: "Immigrant_View" });
const voyages = useExistingCatalog ? existingRecords.filter((record) => record.type === "voyage").map(listingFields) : await listing({ type: "voyage", relativeUrl: "Voyages.aspx", linkName: "Voyage_View" });
const resourceGroups = ["All Resources", "Biographies", "General Resources", "Missionary Work", "Personal Writings", "Photos", "Q/A"];
const resourceMap = new Map(useExistingCatalog ? existingRecords.filter((record) => record.type === "resource").map((record) => [record.sourceId, listingFields(record)]) : []);
if (!useExistingCatalog) {
  for (const group of resourceGroups) {
    const found = await listing({ type: "resource", relativeUrl: `Resource_Listing_new.aspx?group=${encodeURIComponent(group)}`, linkName: "Resource_Info", category: group });
    for (const record of found) {
      const prior = resourceMap.get(record.sourceId);
      if (!prior) resourceMap.set(record.sourceId, { ...record, categories: group === "All Resources" ? [] : [group] });
      else if (group !== "All Resources" && !prior.categories.includes(group)) prior.categories.push(group);
    }
  }
}
const resources = [...resourceMap.values()];
fs.mkdirSync(outputDir, { recursive: true });
let detailCache = {};
if (fs.existsSync(detailCachePath)) {
  try { detailCache = JSON.parse(fs.readFileSync(detailCachePath, "utf8")); } catch { detailCache = {}; }
}
const listingRecords = [...immigrants, ...voyages, ...resources];
let detailCompleted = 0;
let detailFetched = 0;
let detailFailed = 0;
let nextDetail = 0;
async function detailWorker() {
  while (nextDetail < listingRecords.length) {
    const record = listingRecords[nextDetail++];
    const key = `${record.type}:${record.sourceId}`;
    const cached = detailCache[key];
    if (cached?.url === record.url && cached?.indexed && typeof cached.text === "string") {
      detailCompleted += 1;
      continue;
    }
    try {
      const html = await request(record.url);
      const detailText = publicDetailText(html);
      if (!detailText) throw new Error("Public #content region was empty or unavailable");
      detailCache[key] = { url: record.url, indexed: true, fetchedAt: new Date().toISOString(), text: detailText };
      detailFetched += 1;
    } catch (error) {
      detailCache[key] = { url: record.url, indexed: false, fetchedAt: new Date().toISOString(), error: String(error?.message || error) };
      detailFailed += 1;
    }
    detailCompleted += 1;
    if (detailCompleted % 100 === 0) {
      fs.writeFileSync(detailCachePath, JSON.stringify(detailCache), "utf8");
      console.log(`Indexed detail pages ${detailCompleted}/${listingRecords.length} (${detailFetched} fetched, ${detailFailed} failed)`);
    }
  }
}
await Promise.all(Array.from({ length: detailConcurrency }, () => detailWorker()));
fs.writeFileSync(detailCachePath, JSON.stringify(detailCache), "utf8");
const registryPath = path.join(root, "data", "branch-registry.json");
const registry = fs.existsSync(registryPath) ? JSON.parse(fs.readFileSync(registryPath, "utf8")).registry : [];
const branchTerms = registry.flatMap((branch) => [branch.canonicalName, ...String(branch.variants || "").split(";")].map((name) => name.trim()).filter((name) => name.length >= 4).map((term) => ({ term, branch: branch.canonicalName })));
const records = listingRecords.map((record) => {
  const detail = detailCache[`${record.type}:${record.sourceId}`];
  const detailText = detail?.indexed ? detail.text : "";
  const haystack = `${record.summary} ${detailText}`.toLocaleLowerCase("en");
  const matchedBranches = [...new Set(branchTerms.filter(({ term }) => haystack.includes(term.toLocaleLowerCase("en"))).map(({ branch }) => branch))];
  return { ...record, detailText, detailIndexed: Boolean(detail?.indexed), matchedBranches };
});
const detailStats = Object.fromEntries(["immigrant", "voyage", "resource"].map((type) => {
  const subset = records.filter((record) => record.type === type);
  return [type, { total: subset.length, indexed: subset.filter((record) => record.detailIndexed).length, failed: subset.filter((record) => !record.detailIndexed).length }];
}));
const index = {
  privateLocalIndex: true,
  generatedAt: new Date().toISOString(),
  source: { name: "The Welsh Saints Project", baseUrl, listingUrls: ["Immigrants_Listing.aspx", "Voyages.aspx", "Resource_Listing_new.aspx"] },
  scopeNote: "Indexes public listing metadata and substantive text displayed on each public detail page. Administrative/non-public material and linked documents are not copied.",
  counts: { immigrants: immigrants.length, voyages: voyages.length, resources: resources.length, total: records.length, detailPagesIndexed: records.filter((record) => record.detailIndexed).length, detailPagesFailed: records.filter((record) => !record.detailIndexed).length },
  detailStats,
  records,
};
fs.writeFileSync(path.join(outputDir, "welsh-saints-index.local.json"), JSON.stringify(index, null, 2), "utf8");
fs.writeFileSync(path.join(outputDir, "welsh-saints-index.local.js"), `window.WELSH_SAINTS_PRIVATE_INDEX = ${JSON.stringify(index)};\n`, "utf8");
fs.writeFileSync(path.join(outputDir, "welsh-saints-index-report.local.json"), JSON.stringify({ generatedAt: index.generatedAt, counts: index.counts, detailStats, failures: records.filter((record) => !record.detailIndexed).map(({ type, sourceId, title, url }) => ({ type, sourceId, title, url, error: detailCache[`${type}:${sourceId}`]?.error || "Not indexed" })) }, null, 2), "utf8");
console.log(JSON.stringify({ outputDir, detailConcurrency, fetchedThisRun: detailFetched, ...index.counts, detailStats }, null, 2));
