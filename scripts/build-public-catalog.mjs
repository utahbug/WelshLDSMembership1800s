import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const input = path.join(root, "data", "catalog.local.js");
const output = path.join(root, "data", "catalog.public.js");
if (!fs.existsSync(input)) throw new Error("Run build-catalog.mjs before building the public metadata catalog.");
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(input, "utf8"), context);
const local = context.window.WELSH_RECORD_CATALOG;
const publicCatalog = {
  edition: "public",
  generatedAt: local.generatedAt,
  title: local.title,
  sources: local.sources,
  stats: local.stats,
  collections: local.collections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    aliases: collection.aliases || [],
    category: collection.category,
    sources: collection.sources || [],
    availability: { local: true, portable: true, online: Boolean(collection.publicStorage) },
    publicStorage: collection.publicStorage || null,
    images: collection.images.map((item) => ({ name: item.name, extension: item.extension, type: item.type, source: item.source, url: "", serveUrl: "" })),
  })),
};
fs.writeFileSync(output, `window.WELSH_RECORD_CATALOG = ${JSON.stringify(publicCatalog)};\n`, "utf8");
console.log(`Wrote metadata for ${publicCatalog.collections.length} collections to ${output}`);
