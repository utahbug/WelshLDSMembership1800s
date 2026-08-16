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
const archiveStorage = {
  provider: "internet-archive",
  identifier: "ldswelshmembership",
  // Archive's public front door intermittently stalls before returning any
  // HTTP response on mobile networks. Use the current workable storage URL
  // returned by Archive for this item, retaining the documented broker routes
  // as bounded public-only fallbacks.
  baseUrl: "https://ia601403.us.archive.org/10/items/ldswelshmembership/",
  fallbackBaseUrls: [
    "https://archive.org/serve/ldswelshmembership/",
    "https://archive.org/download/ldswelshmembership/",
  ],
};
// A local archive-relative path is not proof that the file has been published.
// Keep newly recovered collections offline until their Archive.org upload is
// separately verified, preventing public viewer links from silently returning 404.
const unpublishedArchiveCollections = new Set([
  "Welsh Conference,Record of Members,Early-1892,Library1614",
  "Welsh Conference,Record of Members,1887-1901,Library3114",
  "Welsh Conference,Record of Members,Early-1911,Library3118-partial",
  "Welsh Conference,Incomplete Conference Minutes,1884,LR1001123",
]);
const publicCatalog = {
  edition: "public",
  generatedAt: local.generatedAt,
  title: local.title,
  sources: local.sources,
  stats: local.stats,
  collections: local.collections.map((collection) => {
    // Generated typed-PDF page images are local/portable viewer assets unless
    // their publication is approved separately. The unchanged source PDFs
    // retain their existing public availability.
    const publishedTranscriptions = (collection.sources || []).includes("conference-minutes") && !collection.viewerRepresentation;
    const archivedMembershipImages = !unpublishedArchiveCollections.has(collection.name)
      && collection.images.some((item) => item.type === "image" && item.archiveRelativePath);
    const publicStorage = archivedMembershipImages
      ? archiveStorage
      : publishedTranscriptions
      ? { provider: "github-pages", baseUrl: "resources/transcriptions/" }
      : collection.publicStorage || null;
    return {
      id: collection.id,
      name: collection.name,
      aliases: collection.aliases || [],
      category: collection.category,
      sources: collection.sources || [],
      availability: { local: true, portable: true, online: Boolean(publicStorage) },
      publicStorage,
      sourcePdf: collection.sourcePdf || null,
      sourcePdfRelativePath: collection.sourcePdfRelativePath || null,
      sourcePdfSha256: collection.sourcePdfSha256 || null,
      viewerRepresentation: Boolean(collection.viewerRepresentation),
      renderDpi: collection.renderDpi || null,
      images: collection.images.map((item) => ({
        name: item.name,
        extension: item.extension,
        type: item.type,
        source: item.source,
        enhancement: item.enhancement,
        archiveRelativePath: item.archiveRelativePath || null,
        sourcePdfFilename: item.sourcePdfFilename || null,
        sourcePdfRelativePath: item.sourcePdfRelativePath || null,
        sourcePdfPage: item.sourcePdfPage || null,
        url: "",
        serveUrl: "",
      })),
    };
  }),
};
fs.writeFileSync(output, `window.WELSH_RECORD_CATALOG = ${JSON.stringify(publicCatalog)};\n`, "utf8");
console.log(`Wrote metadata for ${publicCatalog.collections.length} collections to ${output}`);
