(function () {
  "use strict";
  const catalog = window.WELSH_RECORD_CATALOG;
  if (!catalog || window.WELSH_FULL_ONLINE !== true) return;
  catalog.collections
    .filter((item) => item.viewerRepresentation && item.sources?.includes("typed-viewer-pages"))
    .forEach((item) => {
      item.availability = { ...(item.availability || {}), local: true, online: true };
      item.publicStorage = { provider: "full-online" };
      item.images.forEach((record) => {
        const relativeUrl = `resources/typed-viewer-pages/${encodeURIComponent(item.name)}/${encodeURIComponent(record.name)}`;
        record.url = relativeUrl;
        record.serveUrl = relativeUrl;
      });
    });
})();
