import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const output = path.resolve(process.argv[2] || path.join(root, "outputs/local-development"));
const builder = path.join(root, "scripts/build-research-beta.mjs");

if (output === path.join(root, "full") || output === path.join(root, "research-beta")) {
  throw new Error("Local development builds may not target /full/ or /research-beta/.");
}

const build = spawnSync(process.execPath, [builder, output], {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
if (build.status !== 0) {
  process.stderr.write(build.stderr || build.stdout);
  process.exit(build.status || 1);
}

for (const file of fs.readdirSync(output).filter((name) => name.endsWith(".html"))) {
  const target = path.join(output, file);
  let html = fs.readFileSync(target, "utf8");
  html = html
    .replace("window.WELSH_RESEARCH_BETA=true;", "window.WELSH_RESEARCH_BETA=true;window.WELSH_LOCAL_DEVELOPMENT=true;")
    .replace(/(<p class="research-beta-note">)[\s\S]*?(<\/p>)/, "$1Development build — not published.$2");
  fs.writeFileSync(target, html, "utf8");
}

const reportPath = path.join(output, "RESEARCH_BETA_BUILD_REPORT.json");
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
report.edition = "local-development";
report.output = path.relative(root, output).replaceAll("\\", "/");
report.publishAutomatically = false;
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(output, "LOCAL_DEVELOPMENT_BUILD_REPORT.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
fs.rmSync(path.join(output, "README-RESEARCH-BETA.txt"), { force: true });
fs.writeFileSync(path.join(output, "README-LOCAL-DEVELOPMENT.txt"), [
  "LDS Welsh Membership Records — Local Development",
  "",
  "This folder is generated for local testing only and is not published automatically.",
  "Build: node scripts/build-local-development.mjs",
  "Test:  node scripts/test-local-development.mjs",
  "",
].join("\n"), "utf8");

console.log(JSON.stringify({
  output,
  edition: report.edition,
  canonicalBranches: report.branchRoutes.canonicalBranches,
  memberRecords: report.memberSearch.records,
  fullSearchRecords: report.fullSearch.counts.allRecords,
  welshSaintsRecords: report.welshSaints.records,
  publishAutomatically: false,
}, null, 2));
