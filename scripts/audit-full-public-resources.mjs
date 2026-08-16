import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const projectRoot = path.resolve(import.meta.dirname, "..");
const candidateRoot = path.resolve(process.argv[2] || path.join(projectRoot, "build/full-approved-staging"));
const outputPath = path.resolve(process.argv[3] || path.join(projectRoot, "build/full-public-resource-audit.json"));
const inventoryPath = path.join(projectRoot, "tmp/archive-remote-paths-ldswelshmembership.txt");
const repeats = 3;
const safariHeaders = {
  Range: "bytes=0-65535",
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
  Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  Referer: "https://utahbug.github.io/WelshLDSMembership1800s/full/",
};

function loadCatalog(file) {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(file, "utf8"), context);
  return context.window.WELSH_RECORD_CATALOG;
}

function sampleRecords(collection) {
  const images = collection.images.filter((record) => record.type === "image");
  if (!images.length) return [];
  return [...new Map([images[0], images[Math.floor((images.length - 1) / 2)], images.at(-1)].map((record) => [record.archiveRelativePath, record])).values()];
}

function publicUrl(collection, record) {
  const encodedPath = record.archiveRelativePath.split("/").map(encodeURIComponent).join("/");
  return `${collection.publicStorage.baseUrl}${encodedPath}`;
}

async function probe(url) {
  const started = Date.now();
  try {
    const response = await fetch(url, { headers: safariHeaders, redirect: "follow", signal: AbortSignal.timeout(30000) });
    const responseStarted = Date.now();
    const bytes = new Uint8Array(await response.arrayBuffer());
    return {
      ok: response.ok && /^image\//i.test(response.headers.get("content-type") || "") && bytes.length > 0,
      status: response.status,
      contentType: response.headers.get("content-type") || "",
      bytes: bytes.length,
      finalUrl: response.url,
      timeToFirstByteMs: responseStarted - started,
      totalMs: Date.now() - started,
      contentLength: response.headers.get("content-length") || "",
      cacheControl: response.headers.get("cache-control") || "",
      accessControlAllowOrigin: response.headers.get("access-control-allow-origin") || "",
      acceptRanges: response.headers.get("accept-ranges") || "",
    };
  } catch (error) {
    return { ok: false, status: 0, contentType: "", bytes: 0, finalUrl: "", totalMs: Date.now() - started, error: error.message };
  }
}

if (!fs.existsSync(path.join(candidateRoot, "data/catalog.public.js"))) throw new Error(`Candidate catalog not found: ${candidateRoot}`);
if (!fs.existsSync(inventoryPath)) throw new Error(`Archive inventory not found: ${inventoryPath}`);

const localCatalog = loadCatalog(path.join(projectRoot, "outputs/local-development/data/catalog.public.js"));
const candidateCatalog = loadCatalog(path.join(candidateRoot, "data/catalog.public.js"));
const inventory = new Set(fs.readFileSync(inventoryPath, "utf8").split(/\r?\n/).filter(Boolean));
const localById = new Map(localCatalog.collections.map((collection) => [collection.id, collection]));
const candidateById = new Map(candidateCatalog.collections.map((collection) => [collection.id, collection]));
const catalogDifferences = [];
for (const id of new Set([...localById.keys(), ...candidateById.keys()])) {
  const local = localById.get(id);
  const candidate = candidateById.get(id);
  const comparable = (collection) => collection && ({
    id: collection.id,
    name: collection.name,
    availability: collection.availability,
    publicStorage: collection.publicStorage,
    images: collection.images.map((record) => ({ name: record.name, archiveRelativePath: record.archiveRelativePath })),
  });
  if (JSON.stringify(comparable(local)) !== JSON.stringify(comparable(candidate))) catalogDifferences.push({ id, local: comparable(local), candidate: comparable(candidate) });
}

const collections = candidateCatalog.collections.filter((collection) => collection.availability?.online && collection.publicStorage?.provider === "internet-archive");
const rows = collections.map((collection) => {
  const images = collection.images.filter((record) => record.type === "image");
  const missingInventory = images.filter((record) => !record.archiveRelativePath || !inventory.has(record.archiveRelativePath));
  return {
    id: collection.id,
    name: collection.name,
    images: images.length,
    inventoryMatches: images.length - missingInventory.length,
    missingInventory: missingInventory.map((record) => record.archiveRelativePath || record.name),
    samples: sampleRecords(collection).map((record) => ({ position: images.indexOf(record) + 1, filename: record.name, archiveRelativePath: record.archiveRelativePath, url: publicUrl(collection, record) })),
  };
});

const pending = rows.flatMap((collection) => collection.samples.flatMap((sample) => {
  sample.probes = [];
  return Array.from({ length: repeats }, (_, repeat) => ({ collection, sample, repeat: repeat + 1 }));
}));
let cursor = 0;
async function worker() {
  while (cursor < pending.length) {
    const item = pending[cursor++];
    item.sample.probes[item.repeat - 1] = await probe(item.sample.url);
  }
}
await Promise.all(Array.from({ length: 8 }, worker));

const report = {
  generatedAt: new Date().toISOString(),
  candidateRoot,
  catalogComparison: {
    localCollections: localCatalog.collections.length,
    candidateCollections: candidateCatalog.collections.length,
    differences: catalogDifferences.length,
    items: catalogDifferences,
  },
  archive: {
    collections: rows.length,
    images: rows.reduce((sum, row) => sum + row.images, 0),
    inventoryMatches: rows.reduce((sum, row) => sum + row.inventoryMatches, 0),
    missingInventory: rows.reduce((sum, row) => sum + row.missingInventory.length, 0),
    samplePositions: rows.reduce((sum, row) => sum + row.samples.length, 0),
    repeats,
    requests: pending.length,
    requestPasses: pending.filter(({ sample, repeat }) => sample.probes[repeat - 1].ok).length,
    requestFailures: pending.filter(({ sample, repeat }) => !sample.probes[repeat - 1].ok).length,
  },
  collections: rows,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ outputPath, catalogComparison: report.catalogComparison, archive: report.archive }, null, 2));
if (report.catalogComparison.differences || report.archive.missingInventory || report.archive.requestFailures) process.exitCode = 1;
