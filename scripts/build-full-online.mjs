import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const output = path.resolve(process.argv[2] || path.join(root, "full"));
const betaBuilder = path.join(root, "scripts", "build-research-beta.mjs");

if (output === path.join(root, "full") && !process.argv.includes("--approved")) {
  throw new Error([
    "The deployed /full/ edition is frozen.",
    "Build and test outputs/local-development first.",
    "After explicit publication approval, use:",
    "  node scripts/publish-approved-local-development.mjs --approved",
  ].join("\n"));
}

const build = spawnSync(process.execPath, [betaBuilder, output], {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
if (build.status !== 0) {
  process.stderr.write(build.stderr || build.stdout);
  process.exit(build.status || 1);
}

const mainIcons = new Map([
  ["favicon-beta.svg", "favicon.svg"],
  ["favicon-beta-32.png", "favicon-32.png"],
  ["apple-touch-icon-beta.png", "apple-touch-icon.png"],
]);
for (const file of fs.readdirSync(output).filter((name) => name.endsWith(".html"))) {
  const target = path.join(output, file);
  let html = fs.readFileSync(target, "utf8")
    .replaceAll("Research beta — records, classifications, and source relationships continue to be reviewed and expanded.", "Full online edition — records, classifications, and source relationships continue to be reviewed and expanded.")
    .replace("window.WELSH_RESEARCH_BETA=true;", "window.WELSH_RESEARCH_BETA=true;window.WELSH_FULL_ONLINE=true;");
  for (const [betaIcon, mainIcon] of mainIcons) html = html.replaceAll(betaIcon, mainIcon);
  if (!/<meta name="robots" content="noindex,nofollow,noarchive">/i.test(html)) throw new Error(`Missing robots meta in ${file}`);
  fs.writeFileSync(target, html, "utf8");
}

const catalogPath = path.join(output, "data", "catalog.public.js");
const catalogContext = { window: {} };
vm.runInNewContext(fs.readFileSync(catalogPath, "utf8"), catalogContext);
const catalog = catalogContext.window.WELSH_RECORD_CATALOG;
delete catalog.researchBeta;
catalog.fullOnline = true;
fs.writeFileSync(catalogPath, `window.WELSH_RECORD_CATALOG = ${JSON.stringify(catalog)};\n`, "utf8");

const betaReportPath = path.join(output, "RESEARCH_BETA_BUILD_REPORT.json");
const report = JSON.parse(fs.readFileSync(betaReportPath, "utf8"));
report.edition = "unlisted-full-online";
report.output = path.relative(root, output).replaceAll("\\", "/");
report.noIndex = true;
report.researchBetaPreserved = true;
fs.writeFileSync(path.join(output, "FULL_ONLINE_BUILD_REPORT.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
fs.rmSync(betaReportPath);
fs.rmSync(path.join(output, "README-RESEARCH-BETA.txt"), { force: true });
fs.writeFileSync(path.join(output, "README-FULL-ONLINE.txt"), [
  "LDS Welsh Membership Records — Full Online Edition",
  "",
  "This unlisted research edition provides the complete search and navigation experience.",
  "Large source images are loaded from the project's Archive.org holding when available.",
  "The edition is marked noindex/nofollow while it remains under review.",
  "",
].join("\n"), "utf8");

console.log(JSON.stringify({
  output,
  edition: report.edition,
  canonicalBranches: report.branchRoutes.canonicalBranches,
  memberRecords: report.memberSearch.records,
  fullSearchRecords: report.fullSearch.counts.allRecords,
  onlineViewerRecords: report.memberSearch.viewerAvailability.onlineViewerAvailable,
  localPortableOnlyRecords: report.memberSearch.viewerAvailability.localPortableOnly,
  noIndex: report.noIndex,
}, null, 2));
