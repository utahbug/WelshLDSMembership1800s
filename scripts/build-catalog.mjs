import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const configPath = path.join(root, "sources.local.json");
const outputDir = path.join(root, "data");

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
  return /t$/i.test(base) || /_(?:color2?|focus)$/i.test(base);
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
  const identity = candidate.hash ? `${candidate.category}:${candidate.size}:${candidate.hash}` : `unique:${candidate.file}`;
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
    url: pathToFileURL(image.file).href,
    serveUrl: `/archive/${encodeURIComponent(image.sourceId)}/${image.relativeSourcePath.split(path.sep).map(encodeURIComponent).join("/")}`,
    source: image.sourceId,
    type: image.type,
    extension: image.extension,
  });
}

const collections = [...collectionMap.values()]
  .map((collection) => ({
    ...collection,
    aliases: [...collection.aliases].sort(natural.compare),
    sources: [...collection.sources],
    images: collection.images.sort((a, b) => natural.compare(a.name, b.name)),
  }))
  .filter((collection) => collection.images.length)
  .sort((a, b) => natural.compare(a.name, b.name));

const catalog = {
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
