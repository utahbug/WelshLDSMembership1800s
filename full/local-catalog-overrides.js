(function () {
  "use strict";

  const catalog = window.WELSH_RECORD_CATALOG;
  if (!catalog) return;
  const isLocalDevelopment = window.WELSH_LOCAL_DEVELOPMENT === true;
  const isFullOnline = window.WELSH_FULL_ONLINE === true;

  // Local Development uses the same approved local-image behavior as the
  // reviewer edition. The source catalog is public-safe, so restore the local
  // edition identity and map only cataloged original-CD records to packaged
  // relative paths.
  if (isLocalDevelopment) {
    catalog.edition = "local-development";
    catalog.collections
      .filter((item) => item.sources?.includes("original-cds"))
      .forEach((item) => {
        item.availability = { ...(item.availability || {}), local: true };
        item.publicStorage = null;
        item.images.forEach((record) => {
          if (!record.archiveRelativePath) return;
          const relativeUrl = `resources/original-cds/${record.archiveRelativePath
            .replaceAll("\\", "/")
            .split("/")
            .map((segment) => encodeURIComponent(segment))
            .join("/")}`;
          record.url = relativeUrl;
          record.serveUrl = relativeUrl;
        });
      });

    const collection = catalog?.collections?.find((item) => item.id === "collection-47");
    if (collection) {
      // Local Development may use the approved reviewer copy of this holding.
      // The Full Online edition retains the public-safe unavailable state.
      collection.availability = {
        ...(collection.availability || {}),
        online: true,
      };
      collection.publicStorage = {
        provider: "local-development",
        baseUrl: "resources/original-cds/Pontlanfraith%2CEarly-to-1947%2CLibrary27560/",
      };
    }
  }

  // Both promoted editions package the seven generated transcript viewers.
  // This is separate from original-CD routing and contains no private branch
  // image override.
  if (!isLocalDevelopment && !isFullOnline) return;
  catalog.collections
    .filter((item) => item.viewerRepresentation && item.sources?.includes("typed-viewer-pages"))
    .forEach((item) => {
      item.availability = { ...(item.availability || {}), local: true, online: true };
      item.publicStorage = { provider: isFullOnline ? "full-online" : "local-development" };
      item.images.forEach((record) => {
        const relativeUrl = `resources/typed-viewer-pages/${encodeURIComponent(item.name)}/${encodeURIComponent(record.name)}`;
        record.url = relativeUrl;
        record.serveUrl = relativeUrl;
      });
    });
})();
