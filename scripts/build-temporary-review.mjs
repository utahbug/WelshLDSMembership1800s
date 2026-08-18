import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "build/full-approved-staging");
const target = path.join(root, "review");

if (!process.argv.includes("--approved")) {
  throw new Error("Temporary review publication is blocked. Re-run with --approved after explicit user approval.");
}
if (!fs.existsSync(path.join(source, "FULL_ONLINE_BUILD_REPORT.json"))) {
  throw new Error("Missing validated public-safe staging candidate.");
}

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });

const reviewStyle = `<style>
.temporary-review-label{position:fixed;right:10px;bottom:10px;z-index:1000;padding:4px 7px;border:1px solid rgba(255,255,255,.38);border-radius:3px;background:rgba(22,60,49,.88);color:#fff;font:600 10px/1.2 Arial,sans-serif;letter-spacing:.08em;pointer-events:none}
</style>`;
for (const name of fs.readdirSync(target).filter((entry) => entry.endsWith(".html"))) {
  const file = path.join(target, name);
  let html = fs.readFileSync(file, "utf8");
  if (!/<meta name="robots" content="noindex,nofollow,noarchive">/i.test(html)) {
    throw new Error(`Missing noindex/nofollow/noarchive in ${name}`);
  }
  html = html
    .replace("window.WELSH_RESEARCH_BETA=true;window.WELSH_FULL_ONLINE=true;", "window.WELSH_RESEARCH_BETA=true;window.WELSH_FULL_ONLINE=true;window.WELSH_TEMPORARY_REVIEW=true;")
    .replace("</head>", `${reviewStyle}</head>`)
    .replace("</body>", '<div class="temporary-review-label" role="note">TEMPORARY REVIEW</div></body>');
  fs.writeFileSync(file, html, "utf8");
}

const fullReportFile = path.join(target, "FULL_ONLINE_BUILD_REPORT.json");
const report = JSON.parse(fs.readFileSync(fullReportFile, "utf8"));
report.edition = "temporary-online-review";
report.output = "review";
report.noIndex = true;
report.temporary = true;
fs.writeFileSync(path.join(target, "TEMPORARY_REVIEW_BUILD_REPORT.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
fs.rmSync(fullReportFile);
fs.rmSync(path.join(target, "README-FULL-ONLINE.txt"), { force: true });
fs.writeFileSync(path.join(target, "README-TEMPORARY-REVIEW.txt"), [
  "LDS Welsh Membership Records — Temporary Review",
  "",
  "This temporary, unlisted review edition was built from tested Local Development output.",
  "It is marked noindex, nofollow, and noarchive and contains no data/private material.",
  "It must not be treated as the Full Online Archive Edition.",
  "",
].join("\n"), "utf8");

const manifestFile = path.join(target, "site.webmanifest");
const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
manifest.name = "LDS Welsh Membership Records — Temporary Review";
manifest.description = "Temporary review edition of LDS Welsh Membership Records.";
fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const files = fs.readdirSync(target, { recursive: true }).map(String).map((name) => name.replaceAll("\\", "/"));
const forbiddenFiles = files.filter((name) => name.startsWith("data/private/") || /(?:^|\/)private(?:\/|$)/i.test(name) || /\.local\.(?:js|json|csv)$/i.test(name));
if (forbiddenFiles.length) throw new Error(`Private files entered review output: ${forbiddenFiles.join(", ")}`);

console.log(JSON.stringify({
  target,
  edition: report.edition,
  canonicalBranches: report.branchRoutes.canonicalBranches,
  memberRecords: report.memberSearch.records,
  fullSearchRecords: report.fullSearch.counts.allRecords,
  welshSaints: report.welshSaints,
  noIndex: report.noIndex,
  files: files.length,
  privateFiles: forbiddenFiles.length,
}, null, 2));
