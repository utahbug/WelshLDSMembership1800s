import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || "review");
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const files = walk(root);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const textFiles = files.filter((file) => /\.(?:html|js|mjs|json|css|txt|csv|webmanifest)$/i.test(file));
const failures = [];
const missingLinks = [];
const forbiddenNames = files.filter((file) => /(?:^|[\\/])data[\\/]private[\\/]|\.local\.(?:js|json|csv)$/i.test(file));
const leakPattern = /(?:[A-Z]:[\\/](?:Users|1-FLASH DRIVES)|127\.0\.0\.1|192\.168\.\d+\.\d+|data[\\/]private[\\/])/i;
const textLeaks = [];

for (const file of textFiles) {
  const text = fs.readFileSync(file, "utf8");
  if (leakPattern.test(text)) textLeaks.push(path.relative(root, file));
  if (file.endsWith(".html")) {
    if (!/<meta name="robots" content="noindex,nofollow,noarchive">/i.test(text)) failures.push(`Missing robots directive: ${path.basename(file)}`);
    if (!/WELSH_TEMPORARY_REVIEW=true/.test(text)) failures.push(`Missing review runtime marker: ${path.basename(file)}`);
    if (!/>TEMPORARY REVIEW</.test(text)) failures.push(`Missing visible review identity: ${path.basename(file)}`);
    if (/WELSH_LOCAL_DEVELOPMENT=true/.test(text)) failures.push(`Local runtime marker leaked: ${path.basename(file)}`);
    for (const match of text.matchAll(/(?:href|src)="([^"#?]+)[^"#]*"/g)) {
      const value = match[1];
      if (value.includes("${")) continue;
      if (/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(value)) continue;
      const target = path.resolve(path.dirname(file), decodeURIComponent(value));
      if (!fs.existsSync(target)) missingLinks.push(`${path.relative(root, file)} -> ${value}`);
    }
  }
}

const reportFile = path.join(root, "TEMPORARY_REVIEW_BUILD_REPORT.json");
const report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
if (report.edition !== "temporary-online-review" || report.output !== "review" || report.noIndex !== true) failures.push("Temporary review report identity is incorrect.");
if (forbiddenNames.length) failures.push(`Private filenames: ${forbiddenNames.length}`);
if (textLeaks.length) failures.push(`Private/local path text leaks: ${textLeaks.length}`);
if (missingLinks.length) failures.push(`Broken static links: ${missingLinks.length}`);

const result = {
  root,
  files: files.length,
  htmlPages: htmlFiles.length,
  brokenStaticLinks: missingLinks.length,
  brokenStaticLinkDetails: missingLinks,
  forbiddenPrivateFiles: forbiddenNames.length,
  privateOrLocalPathLeaks: textLeaks.length,
  identityPages: htmlFiles.length - failures.filter((item) => /review (?:runtime marker|identity)/.test(item)).length,
  noIndexPages: htmlFiles.length - failures.filter((item) => item.startsWith("Missing robots")).length,
  canonicalBranches: report.branchRoutes.canonicalBranches,
  memberRecords: report.memberSearch.records,
  fullSearchRecords: report.fullSearch.counts.allRecords,
  welshSaints: report.welshSaints,
  ronDennisPublicationRecords: report.fullSearch.counts.ronDennisPages,
  publicationSources: report.fullSearch.counts.ronDennisSourceRecords,
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
