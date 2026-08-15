import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const output = path.resolve(process.argv[2] || path.join(root, "outputs/local-development"));
const validator = path.join(root, "scripts/test-research-beta.mjs");

const test = spawnSync(process.execPath, [validator, output], {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
if (test.status !== 0) {
  process.stderr.write(test.stderr || test.stdout);
  process.exit(test.status || 1);
}

const htmlFiles = fs.readdirSync(output).filter((name) => name.endsWith(".html"));
for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(output, file), "utf8");
  if (!html.includes("Development build — not published.")) throw new Error(`${file}: local-development identity missing`);
  if (!html.includes("window.WELSH_LOCAL_DEVELOPMENT=true;")) throw new Error(`${file}: local-development runtime marker missing`);
}
const report = JSON.parse(fs.readFileSync(path.join(output, "LOCAL_DEVELOPMENT_BUILD_REPORT.json"), "utf8"));
if (report.edition !== "local-development" || report.publishAutomatically !== false) throw new Error("Local-development report marker invalid");
console.log(test.stdout.trim());
console.log(JSON.stringify({ output, identityPages: htmlFiles.length, publishAutomatically: false }, null, 2));
