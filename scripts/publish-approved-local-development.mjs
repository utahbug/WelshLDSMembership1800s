import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "outputs/local-development");
const target = path.join(root, "full");
const staging = path.join(root, "build/full-approved-staging");
const stageOnly = process.argv.includes("--stage-only");

if (!process.argv.includes("--approved")) {
  throw new Error("Publication is intentionally blocked. Re-run with --approved only after explicit user approval.");
}
if (!fs.existsSync(path.join(source, "LOCAL_DEVELOPMENT_BUILD_REPORT.json"))) {
  throw new Error("No tested local-development build exists. Run the local build and test commands first.");
}

const validator = spawnSync(process.execPath, [path.join(root, "scripts/test-local-development.mjs"), source], {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
if (validator.status !== 0) {
  process.stderr.write(validator.stderr || validator.stdout);
  process.exit(validator.status || 1);
}

fs.rmSync(staging, { recursive: true, force: true });
fs.cpSync(source, staging, { recursive: true });
// GitHub rejects individual files over 100 MB. Preserve the supplied source
// PDFs outside /full/ and use page-identical web derivatives for oversized
// viewer files. After the first release, the existing /full/ derivative is a
// valid fallback for later promotions.
for (const name of ["prophet-of-the-jubilee.pdf", "on-trial-welsh-press.pdf", "zions-trumpet-1849.pdf"]) {
  const generated = path.join(root, "output/pdf/web", name);
  const existingFull = path.join(target, "books", name);
  const webSource = fs.existsSync(generated) ? generated : existingFull;
  if (!fs.existsSync(webSource) || fs.statSync(webSource).size >= 100_000_000) {
    throw new Error(`A sub-100 MB web derivative is required before publishing: ${name}`);
  }
  fs.copyFileSync(webSource, path.join(staging, "books", name));
}
// Full Online source-image routes use the public catalog's Archive.org
// mappings. Never publish the Local Development original-CD tree; it includes
// reviewer-only holdings such as Pontlanfraith.
fs.rmSync(path.join(staging, "resources/original-cds"), { recursive: true, force: true });
const icons = new Map([
  ["favicon-beta.svg", "favicon.svg"],
  ["favicon-beta-32.png", "favicon-32.png"],
  ["apple-touch-icon-beta.png", "apple-touch-icon.png"],
]);
for (const file of fs.readdirSync(staging).filter((name) => name.endsWith(".html"))) {
  const filePath = path.join(staging, file);
  let html = fs.readFileSync(filePath, "utf8")
    .replace("window.WELSH_RESEARCH_BETA=true;window.WELSH_LOCAL_DEVELOPMENT=true;", "window.WELSH_RESEARCH_BETA=true;window.WELSH_FULL_ONLINE=true;")
    .replace("Development build — not published.", "Full online edition — records, classifications, and source relationships continue to be reviewed and expanded.")
    .replaceAll("LOCAL DEVELOPMENT — NOT PUBLISHED", "FULL ONLINE ARCHIVE EDITION");
  for (const [betaIcon, mainIcon] of icons) html = html.replaceAll(betaIcon, mainIcon);
  fs.writeFileSync(filePath, html, "utf8");
}
const publicationViewerRuntime = path.join(staging, "publication-viewer.js");
fs.writeFileSync(
  publicationViewerRuntime,
  fs.readFileSync(publicationViewerRuntime, "utf8").replaceAll("Local Development reading copy", "Full Online reading copy"),
  "utf8",
);
const feedbackRuntime = path.join(staging, "feedback.js");
fs.writeFileSync(
  feedbackRuntime,
  fs.readFileSync(feedbackRuntime, "utf8").replace(
    'const isLocalHost = ["", "localhost", "127.0.0.1"].includes(location.hostname);',
    "const isLocalHost = false;",
  ),
  "utf8",
);

// Production never ships the Local Development original-CD override. Keep
// only the packaged transcript mapping required by the Full Online edition.
fs.writeFileSync(path.join(staging, "local-catalog-overrides.js"), `(function () {
  "use strict";
  const catalog = window.WELSH_RECORD_CATALOG;
  if (!catalog || window.WELSH_FULL_ONLINE !== true) return;
  catalog.collections
    .filter((item) => item.viewerRepresentation && item.sources?.includes("typed-viewer-pages"))
    .forEach((item) => {
      item.availability = { ...(item.availability || {}), local: true, online: true };
      item.publicStorage = { provider: "full-online" };
      item.images.forEach((record) => {
        const relativeUrl = \`resources/typed-viewer-pages/\${encodeURIComponent(item.name)}/\${encodeURIComponent(record.name)}\`;
        record.url = relativeUrl;
        record.serveUrl = relativeUrl;
      });
    });
})();
`, "utf8");

fs.writeFileSync(path.join(staging, "site.webmanifest"), `${JSON.stringify({
  name: "LDS Welsh Membership Records — Full Online Archive Edition",
  short_name: "Welsh Records",
  description: "Full Online Archive Edition of LDS Welsh Membership Records.",
  start_url: "./",
  scope: "./",
  display: "standalone",
  background_color: "#f4f0e6",
  theme_color: "#163c31",
  icons: [
    { src: "assets/app-icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "assets/app-icon-512.png", sizes: "512x512", type: "image/png" },
  ],
}, null, 2)}\n`, "utf8");
for (const file of fs.readdirSync(staging).filter((name) => name.endsWith(".html"))) {
  const filePath = path.join(staging, file);
  const html = fs.readFileSync(filePath, "utf8").replace(
    '<meta name="apple-mobile-web-app-title" content="Welsh DEV">',
    '<meta name="apple-mobile-web-app-title" content="Welsh Records">',
  );
  fs.writeFileSync(filePath, html, "utf8");
}

const catalogPath = path.join(staging, "data/catalog.public.js");
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(catalogPath, "utf8"), context);
const catalog = context.window.WELSH_RECORD_CATALOG;
delete catalog.researchBeta;
catalog.fullOnline = true;
fs.writeFileSync(catalogPath, `window.WELSH_RECORD_CATALOG = ${JSON.stringify(catalog)};\n`, "utf8");

const report = JSON.parse(fs.readFileSync(path.join(staging, "LOCAL_DEVELOPMENT_BUILD_REPORT.json"), "utf8"));
report.edition = "unlisted-full-online";
report.output = "full";
report.noIndex = true;
report.promotedFromTestedLocalDevelopment = true;
delete report.publishAutomatically;
fs.writeFileSync(path.join(staging, "FULL_ONLINE_BUILD_REPORT.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
for (const file of ["LOCAL_DEVELOPMENT_BUILD_REPORT.json", "RESEARCH_BETA_BUILD_REPORT.json", "README-LOCAL-DEVELOPMENT.txt"]) fs.rmSync(path.join(staging, file), { force: true });
for (const privateName of ["member-data-completeness-report.local.json", "member-data-completeness-review-queue.local.csv"]) {
  if (fs.existsSync(path.join(staging, privateName))) throw new Error(`Private Local Development artifact reached Full Online staging: ${privateName}`);
}
fs.writeFileSync(path.join(staging, "README-FULL-ONLINE.txt"), [
  "LDS Welsh Membership Records — Full Online Edition",
  "",
  "This edition was intentionally promoted from a tested local-development build.",
  "It remains marked noindex/nofollow while under review.",
  "",
].join("\n"), "utf8");

if (stageOnly) {
  console.log(JSON.stringify({ staging, edition: report.edition, promotedFromTestedLocalDevelopment: true, stageOnly: true }, null, 2));
} else {
  // This is the only destructive promotion step and is unreachable without
  // both an approved flag and a passing local-development validation.
  fs.rmSync(target, { recursive: true, force: true });
  fs.renameSync(staging, target);
  console.log(JSON.stringify({ target, edition: report.edition, promotedFromTestedLocalDevelopment: true }, null, 2));
}
