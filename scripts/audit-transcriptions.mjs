import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const config = JSON.parse(fs.readFileSync(path.join(root, "sources.local.json"), "utf8"));
const conferenceSource = config.sources.find((source) => source.id === "conference-minutes");
if (!conferenceSource || !fs.existsSync(conferenceSource.path)) {
  throw new Error("The conference-minutes source is not configured or cannot be found.");
}

const officePath = process.env.SOFFICE_PATH || "C:\\Program Files\\LibreOffice\\program\\soffice.exe";
if (!fs.existsSync(officePath)) throw new Error(`LibreOffice was not found at ${officePath}`);

const auditDir = path.join(root, "audit");
const conversionDir = path.join(auditDir, ".conversion");
fs.mkdirSync(conversionDir, { recursive: true });

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else if (entry.isFile() && !entry.name.startsWith("~$")) files.push(fullPath);
  }
  return files;
}

function signatureStatus(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const header = fs.readFileSync(filePath).subarray(0, 8).toString("hex").toLowerCase();
  if ([".doc", ".xls"].includes(extension)) return header.startsWith("d0cf11e0a1b11ae1") ? "valid OLE container" : "unexpected file signature";
  if ([".docx", ".xlsx"].includes(extension)) return header.startsWith("504b") ? "valid ZIP/OOXML container" : "unexpected file signature";
  if (extension === ".wpd") return fs.statSync(filePath).size > 0 ? "non-empty WordPerfect file" : "empty file";
  return fs.statSync(filePath).size > 0 ? "non-empty file" : "empty file";
}

function safeStem(relativePath) {
  return relativePath.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 120) || "document";
}

const supported = new Set([".doc", ".docx", ".wpd", ".xls", ".xlsx"]);
const files = walk(conferenceSource.path)
  .filter((file) => supported.has(path.extname(file).toLowerCase()))
  .sort((a, b) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" }));

const records = [];
for (const filePath of files) {
  const relativePath = path.relative(conferenceSource.path, filePath);
  const extension = path.extname(filePath).toLowerCase();
  const outDir = path.join(conversionDir, safeStem(relativePath));
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const localInput = path.join(outDir, `input${extension}`);
  fs.copyFileSync(filePath, localInput);
  const profileDir = path.join(outDir, "profile");
  fs.mkdirSync(profileDir, { recursive: true });
  const profileUrl = `file:///${profileDir.replaceAll("\\", "/")}`;
  const format = [".xls", ".xlsx"].includes(extension) ? "csv" : "txt:Text";
  const conversion = spawnSync(officePath, ["--headless", `-env:UserInstallation=${profileUrl}`, "--convert-to", format, "--outdir", outDir, localInput], {
    encoding: "utf8",
    timeout: 60000,
    windowsHide: true,
  });
  const outputs = fs.readdirSync(outDir).map((name) => path.join(outDir, name));
  const output = outputs.find((candidate) => fs.statSync(candidate).isFile() && candidate !== localInput);
  const extractedBytes = output ? fs.statSync(output).size : 0;
  const signature = signatureStatus(filePath);
  const status = conversion.status === 0 && extractedBytes > 20
    ? "readable"
    : extractedBytes > 0
      ? "review extraction"
      : "source copy needed";
  records.push({
    relativePath,
    extension,
    bytes: fs.statSync(filePath).size,
    signature,
    status,
    extractedBytes,
    conversionExitCode: conversion.status,
    conversionMessage: `${conversion.stdout ?? ""}\n${conversion.stderr ?? ""}`.trim(),
  });
}

const summary = {
  generatedAt: new Date().toISOString(),
  files: records.length,
  readable: records.filter((record) => record.status === "readable").length,
  reviewExtraction: records.filter((record) => record.status === "review extraction").length,
  sourceCopyNeeded: records.filter((record) => record.status === "source copy needed").length,
  unexpectedSignatures: records.filter((record) => record.signature === "unexpected file signature").length,
};

fs.writeFileSync(path.join(auditDir, "transcription-audit.local.json"), JSON.stringify({ summary, records }, null, 2), "utf8");

const groups = Map.groupBy(records, (record) => path.dirname(record.relativePath) === "." ? "General transcriptions and indexes" : path.dirname(record.relativePath));
const lines = [
  "# Conference-minute transcription inventory",
  "",
  "This inventory records which inherited transcription files can currently be opened and extracted. It does not judge transcription accuracy or completeness.",
  "",
  `- Files audited: ${summary.files}`,
  `- Readable: ${summary.readable}`,
  `- Needs extraction review: ${summary.reviewExtraction}`,
  `- Source copy needed: ${summary.sourceCopyNeeded}`,
  "",
  "## Status meanings",
  "",
  "- **Readable:** LibreOffice extracted non-empty content.",
  "- **Review extraction:** some output was produced, but the conversion result was abnormal.",
  "- **Source copy needed:** no usable content could be extracted; retain the filename as a placeholder and look for another copy or printed original.",
  "",
];

for (const [group, groupRecords] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }))) {
  lines.push(`## ${group}`, "", "| File | Format | Status | Integrity check |", "|---|---:|---|---|");
  for (const record of groupRecords) {
    lines.push(`| ${path.basename(record.relativePath).replaceAll("|", "\\|")} | ${record.extension.slice(1).toUpperCase()} | ${record.status} | ${record.signature} |`);
  }
  lines.push("");
}

fs.writeFileSync(path.join(root, "TRANSCRIPTION_INVENTORY.md"), `${lines.join("\n")}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
