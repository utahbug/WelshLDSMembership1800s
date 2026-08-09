import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const outputDir = path.join(root, "data", "private");
const baseUrl = "https://welshsaints.byu.edu/";
const delayMs = 175;
const cookies = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function decode(value = "") {
  return value.replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}
function text(value = "") { return decode(value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim(); }
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
      const response = await fetch(url, { ...options, redirect: "follow", headers: { "User-Agent": "LDSWelshMembers private research indexer; contact via project repository", ...(cookie ? { Cookie: cookie } : {}), ...suppliedHeaders } });
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

const immigrants = await listing({ type: "immigrant", relativeUrl: "Immigrants_Listing.aspx", linkName: "Immigrant_View" });
const voyages = await listing({ type: "voyage", relativeUrl: "Voyages.aspx", linkName: "Voyage_View" });
const resourceGroups = ["All Resources", "Biographies", "General Resources", "Missionary Work", "Personal Writings", "Photos", "Q/A"];
const resourceMap = new Map();
for (const group of resourceGroups) {
  const found = await listing({ type: "resource", relativeUrl: `Resource_Listing_new.aspx?group=${encodeURIComponent(group)}`, linkName: "Resource_Info", category: group });
  for (const record of found) {
    const prior = resourceMap.get(record.sourceId);
    if (!prior) resourceMap.set(record.sourceId, { ...record, categories: group === "All Resources" ? [] : [group] });
    else if (group !== "All Resources" && !prior.categories.includes(group)) prior.categories.push(group);
  }
}
const resources = [...resourceMap.values()];
const registryPath = path.join(root, "data", "branch-registry.json");
const registry = fs.existsSync(registryPath) ? JSON.parse(fs.readFileSync(registryPath, "utf8")).registry : [];
const branchTerms = registry.flatMap((branch) => [branch.canonicalName, ...String(branch.variants || "").split(";")].map((name) => name.trim()).filter((name) => name.length >= 4).map((term) => ({ term, branch: branch.canonicalName })));
const records = [...immigrants, ...voyages, ...resources].map((record) => {
  const haystack = record.summary.toLocaleLowerCase("en");
  const matchedBranches = [...new Set(branchTerms.filter(({ term }) => haystack.includes(term.toLocaleLowerCase("en"))).map(({ branch }) => branch))];
  return { ...record, matchedBranches };
});
const index = {
  privateLocalIndex: true,
  generatedAt: new Date().toISOString(),
  source: { name: "The Welsh Saints Project", baseUrl, listingUrls: ["Immigrants_Listing.aspx", "Voyages.aspx", "Resource_Listing_new.aspx"] },
  scopeNote: "Indexes public listing metadata only. Administrative/non-public pages and source documents are not copied.",
  counts: { immigrants: immigrants.length, voyages: voyages.length, resources: resources.length, total: records.length },
  records,
};
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "welsh-saints-index.local.json"), JSON.stringify(index, null, 2), "utf8");
fs.writeFileSync(path.join(outputDir, "welsh-saints-index.local.js"), `window.WELSH_SAINTS_PRIVATE_INDEX = ${JSON.stringify(index)};\n`, "utf8");
console.log(JSON.stringify({ outputDir, ...index.counts }, null, 2));
