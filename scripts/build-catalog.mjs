import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const configPath = path.join(root, "sources.local.json");
const outputDir = path.join(root, "data");
const enhancementCachePath = path.join(outputDir, "image-enhancements.local.json");

if (!fs.existsSync(configPath)) {
  throw new Error("Copy sources.example.json to sources.local.json and update the archive paths.");
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
fs.mkdirSync(outputDir, { recursive: true });

const natural = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const imageExtensions = new Set([".jpg", ".jpeg", ".png"]);
const documentExtensions = new Set([".pdf", ".doc", ".docx", ".wpd", ".xls", ".xlsx", ".txt", ".htm", ".html", ".epub"]);

function walk(directory) {
  const results = [];
  const pending = [directory];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(fullPath);
      else if (entry.isFile()) results.push(fullPath);
    }
  }
  return results;
}

function isThumbnail(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  // Original CD interfaces stored tiny navigation copies beside the scans.
  // Common suffixes are "t" and "ta"; neither belongs in the reading order.
  return /(?:\d|_)t(?:a)?$/i.test(base) || /_(?:color2?|colort2|focus)$/i.test(base);
}

function cleanCollectionName(name) {
  return name
    .replace(/^\d+[-_]\s*/, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedCollectionKey(name) {
  return cleanCollectionName(name)
    .toLowerCase()
    .replace(/\b(?:see|possible duplicate|formerly|formelly).*$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sha256(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

const sourceReports = [];
const candidates = [];

for (const source of [...config.sources].sort((a, b) => a.priority - b.priority)) {
  if (!fs.existsSync(source.path)) {
    sourceReports.push({ ...source, available: false, collectionCount: 0, imageCount: 0 });
    continue;
  }

  const directories = fs.readdirSync(source.path, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => natural.compare(a.name, b.name));
  const collectionDirectories = directories.map((directory) => ({ name: directory.name, path: path.join(source.path, directory.name) }));
  if (source.includeRootFiles) collectionDirectories.unshift({ name: "General transcriptions and indexes", path: source.path, rootOnly: true });
  let sourceItemCount = 0;

  for (const directory of collectionDirectories) {
    const discovered = directory.rootOnly
      ? fs.readdirSync(directory.path, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => path.join(directory.path, entry.name))
      : walk(directory.path);
    const files = discovered
      .filter((file) => imageExtensions.has(path.extname(file).toLowerCase()) || documentExtensions.has(path.extname(file).toLowerCase()))
      .filter((file) => !path.basename(file).startsWith("~$"))
      .filter((file) => !imageExtensions.has(path.extname(file).toLowerCase()) || !isThumbnail(file))
      .sort(natural.compare);

    sourceItemCount += files.length;
    for (const file of files) {
      const stat = fs.statSync(file);
      const extension = path.extname(file).toLowerCase();
      candidates.push({
        sourceId: source.id,
        sourceLabel: source.label,
        priority: source.priority,
        category: source.category ?? "Uncategorized",
        collection: cleanCollectionName(directory.name),
        collectionKey: `${source.category ?? "Uncategorized"}:${normalizedCollectionKey(directory.name)}`,
        file,
        relativeSourcePath: path.relative(source.path, file),
        name: path.basename(file),
        size: stat.size,
        type: imageExtensions.has(extension) ? "image" : "document",
        extension,
      });
    }
  }

  sourceReports.push({
    id: source.id,
    label: source.label,
    path: source.path,
    priority: source.priority,
    available: true,
    collectionCount: collectionDirectories.length,
    itemCount: sourceItemCount,
  });
}

const sizeGroups = new Map();
for (const candidate of candidates) {
  const group = sizeGroups.get(candidate.size) ?? [];
  group.push(candidate);
  sizeGroups.set(candidate.size, group);
}

let hashedFiles = 0;
for (const group of sizeGroups.values()) {
  if (group.length < 2) continue;
  for (const candidate of group) {
    candidate.hash = sha256(candidate.file);
    hashedFiles += 1;
  }
}

const exactSeen = new Map();
const retained = [];
const duplicates = [];
for (const candidate of candidates.sort((a, b) => a.priority - b.priority || natural.compare(a.file, b.file))) {
  // Collapse repeated files only within the same named collection. Identical
  // scans can legitimately describe more than one branch or record group;
  // removing them globally made those collections disappear from the catalog.
  const identity = candidate.hash
    ? `${candidate.collectionKey}:${candidate.size}:${candidate.hash}`
    : `unique:${candidate.file}`;
  const original = exactSeen.get(identity);
  if (original) {
    duplicates.push({
      retained: original.file,
      duplicate: candidate.file,
      retainedSource: original.sourceId,
      duplicateSource: candidate.sourceId,
    });
  } else {
    exactSeen.set(identity, candidate);
    retained.push(candidate);
  }
}

const enhancementCache = fs.existsSync(enhancementCachePath)
  ? JSON.parse(fs.readFileSync(enhancementCachePath, "utf8"))
  : {};

function enhancementFromHistogram(histogram, total) {
  const nearBlackShare = histogram.slice(0, 24).reduce((sum, count) => sum + count, 0) / total;
  const weightedHistogram = nearBlackShare >= .3
    ? Array.from(histogram, (count, tone) => count * (tone < 12 ? .02 : tone < 24 ? .08 : tone < 40 ? .3 : 1))
    : histogram;
  const weightedTotal = weightedHistogram.reduce((sum, count) => sum + count, 0);
  const percentile = (fraction) => {
    const threshold = weightedTotal * fraction;
    let seen = 0;
    for (let tone = 0; tone < weightedHistogram.length; tone += 1) {
      seen += weightedHistogram[tone];
      if (seen >= threshold) return tone;
    }
    return 255;
  };
  const low = percentile(.02);
  const high = percentile(.98);
  const midpoint = Math.max(1, (low + high) / 2);
  const contrastCeiling = nearBlackShare >= .3 ? 1.15 : 1.3;
  const contrast = Math.max(.9, Math.min(contrastCeiling, 200 / Math.max(20, high - low)));
  const brightness = Math.max(.8, Math.min(1.3, (135 - 127.5 * (1 - contrast)) / (contrast * midpoint)));
  return {
    low,
    high,
    darkBackgroundAdjusted: nearBlackShare >= .3,
    brightness: Math.round(brightness * 20) / 20,
    contrast: Math.round(contrast * 20) / 20,
  };
}

async function analyzeImage(candidate) {
  const stat = fs.statSync(candidate.file);
  const cached = enhancementCache[candidate.file];
  if (cached?.algorithmVersion === 3 && cached?.size === stat.size && cached?.mtimeMs === stat.mtimeMs) return cached.enhancement;
  const { data } = await sharp(candidate.file)
    .resize({ width: 256, height: 256, fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const histogram = new Uint32Array(256);
  for (const tone of data) histogram[tone] += 1;
  const enhancement = enhancementFromHistogram(histogram, data.length);
  enhancementCache[candidate.file] = { algorithmVersion: 3, size: stat.size, mtimeMs: stat.mtimeMs, enhancement };
  return enhancement;
}

const imagesToAnalyze = retained.filter((candidate) => candidate.type === "image");
let nextEnhancement = 0;
async function enhancementWorker() {
  while (nextEnhancement < imagesToAnalyze.length) {
    const candidate = imagesToAnalyze[nextEnhancement];
    nextEnhancement += 1;
    try {
      candidate.enhancement = await analyzeImage(candidate);
    } catch (error) {
      console.warn(`Could not analyze ${candidate.file}: ${error.message}`);
    }
    if (nextEnhancement % 250 === 0) console.log(`Analyzed ${nextEnhancement} of ${imagesToAnalyze.length} images...`);
  }
}
await Promise.all(Array.from({ length: Math.min(6, imagesToAnalyze.length) }, enhancementWorker));
fs.writeFileSync(enhancementCachePath, JSON.stringify(enhancementCache), "utf8");

const collectionMap = new Map();
for (const image of retained) {
  const key = image.collectionKey || image.collection.toLowerCase();
  let collection = collectionMap.get(key);
  if (!collection) {
    collection = {
      id: `collection-${collectionMap.size + 1}`,
      name: image.collection,
      category: image.category,
      aliases: new Set(),
      sources: new Set(),
      images: [],
    };
    collectionMap.set(key, collection);
  }
  if (collection.name !== image.collection) collection.aliases.add(image.collection);
  collection.sources.add(image.sourceId);
  collection.images.push({
    name: image.name,
    archiveRelativePath: image.sourceId === "original-cds" && image.type === "image"
      ? image.relativeSourcePath.split(path.sep).join("/")
      : null,
    url: pathToFileURL(image.file).href,
    serveUrl: `/archive/${encodeURIComponent(image.sourceId)}/${image.relativeSourcePath.split(path.sep).map(encodeURIComponent).join("/")}`,
    source: image.sourceId,
    type: image.type,
    extension: image.extension,
    enhancement: image.enhancement,
  });
}

const collections = [...collectionMap.values()]
  .map((collection) => ({
    ...collection,
    aliases: [...collection.aliases].sort(natural.compare),
    sources: [...collection.sources],
    availability: { local: true, portable: true, online: false },
    publicStorage: null,
    images: collection.images.sort((a, b) => natural.compare(a.name, b.name)),
  }))
  .filter((collection) => collection.images.length)
  .sort((a, b) => natural.compare(a.name, b.name));

// Expose an independently headed section of a compound volume without copying
// its files. The virtual collection reuses the exact local and Archive paths.
const llanelltydCompound = collections.find((collection) => collection.name === "Llanelltyd,1850-1882,LR1727");
if (llanelltydCompound) {
  const llanelltydImages = llanelltydCompound.images.filter((record) => {
    const match = record.name.match(/_M_(\d{5})\.jpg$/i);
    const sequence = match ? Number(match[1]) : NaN;
    return sequence >= 26 && sequence <= 35;
  });
  if (llanelltydImages.length !== 10) throw new Error(`Expected 10 Llanelltyd section images; found ${llanelltydImages.length}.`);
  collections.push({ id:"virtual-llanelltyd-lr1727", name:"Llanelltyd,1850-1857,LR1727", category:llanelltydCompound.category, aliases:["Llanellyd,1850-1857,LR1727"], sources:[...llanelltydCompound.sources], availability:{local:true,portable:true,online:false}, publicStorage:null, virtualSourceCollection:llanelltydCompound.id, images:llanelltydImages });
  const sectionImages = llanelltydCompound.images.filter((record) => {
    const match = record.name.match(/_M_(\d{5})\.jpg$/i);
    const sequence = match ? Number(match[1]) : NaN;
    return sequence >= 36 && sequence <= 73;
  });
  if (sectionImages.length !== 38) throw new Error(`Expected 38 Cwm Saerbren section images; found ${sectionImages.length}.`);
  collections.push({ id:"virtual-cwm-saerbren-lr1727", name:"Cwm Saerbren,1858-1874,LR1727", category:llanelltydCompound.category, aliases:["Cwmsaerbren,1858-1874,LR1727"], sources:[...llanelltydCompound.sources], availability:{local:true,portable:true,online:false}, publicStorage:null, virtualSourceCollection:llanelltydCompound.id, images:sectionImages });
  collections.sort((a,b)=>natural.compare(a.name,b.name));
}

const nantygloCompound = collections.find((collection) => collection.name === "Nantyglo,1846-1867,LR1747");
if (nantygloCompound) {
  const sectionImages = nantygloCompound.images.filter((record) => {
    const match = record.name.match(/_M_(\d{5})\.jpg$/i);
    const sequence = match ? Number(match[1]) : NaN;
    return sequence >= 78 && sequence <= 161;
  });
  if (sectionImages.length !== 83) throw new Error(`Expected 83 Coalbrookvale section images; found ${sectionImages.length}.`);
  collections.push({ id:"virtual-coalbrookvale-lr1747", name:"Coalbrookvale,1856-1867,LR1747", category:nantygloCompound.category, aliases:["Coal Brook Vale,1856-1867,LR1747","Coal Brock Vale,1856-1867,LR1747","Blaina,1856-1867,LR1747"], sources:[...nantygloCompound.sources], availability:{local:true,portable:true,online:false}, publicStorage:null, virtualSourceCollection:nantygloCompound.id, images:sectionImages });
  collections.sort((a,b)=>natural.compare(a.name,b.name));
}

const catalog = {
  edition: "local",
  generatedAt: new Date().toISOString(),
  title: "LDS Welsh Membership Records, 1800s",
  sources: sourceReports.map(({ path: sourcePath, ...source }) => source),
  stats: {
    scannedItems: candidates.length,
    uniqueItems: retained.length,
    uniqueImages: retained.filter((item) => item.type === "image").length,
    uniqueDocuments: retained.filter((item) => item.type === "document").length,
    exactDuplicates: duplicates.length,
    collections: collections.length,
    hashedFiles,
  },
  collections,
};

fs.writeFileSync(
  path.join(outputDir, "catalog.local.js"),
  `window.WELSH_RECORD_CATALOG = ${JSON.stringify(catalog)};\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(outputDir, "catalog-report.local.json"),
  JSON.stringify({ generatedAt: catalog.generatedAt, sources: sourceReports, stats: catalog.stats, duplicates }, null, 2),
  "utf8",
);

console.log(JSON.stringify(catalog.stats, null, 2));
