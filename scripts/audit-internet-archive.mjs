import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const localRoot = path.join(root, "resources", "source-cds");
const metadataPath = process.argv[2] || path.join(process.env.TEMP || process.env.TMP || root, "ldswelshmembership-metadata.json");
const outputDir = path.join(root, "outputs", "internet-archive-reconciliation");
const imageExtensions = new Set([".jpg", ".jpeg", ".png"]);

function walk(directory) {
  const files = [];
  const pending = [directory];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(fullPath);
      else if (entry.isFile()) files.push(fullPath);
    }
  }
  return files;
}

function isThumbnail(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  return /(?:\d|_)t(?:a)?$/i.test(base) || /_(?:color2?|focus)$/i.test(base);
}

function normalizedSeparators(value) {
  return String(value).replaceAll("\\", "/");
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [columns.join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

async function checksums(filePath) {
  return await new Promise((resolve, reject) => {
    const md5 = crypto.createHash("md5");
    const sha1 = crypto.createHash("sha1");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => { md5.update(chunk); sha1.update(chunk); });
    stream.on("error", reject);
    stream.on("end", () => resolve({ md5: md5.digest("hex"), sha1: sha1.digest("hex") }));
  });
}

if (!fs.existsSync(localRoot)) throw new Error(`Local source folder not found: ${localRoot}`);
if (!fs.existsSync(metadataPath)) throw new Error(`Archive metadata file not found: ${metadataPath}`);

const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
const remote = metadata.files
  .filter((item) => item.source === "original" && ["JPEG", "PNG"].includes(item.format))
  .map((item, index) => ({
    index,
    path: normalizedSeparators(item.name),
    basename: path.posix.basename(normalizedSeparators(item.name)),
    extension: path.posix.extname(normalizedSeparators(item.name)).toLowerCase(),
    size: Number(item.size),
    md5: String(item.md5 || "").toLowerCase(),
    sha1: String(item.sha1 || "").toLowerCase(),
    branch: normalizedSeparators(item.name).split("/")[0],
    format: item.format,
  }));

const allLocalImagePaths = walk(localRoot)
  .filter((filePath) => imageExtensions.has(path.extname(filePath).toLowerCase()));
const rawLocalByPath = new Map(allLocalImagePaths.map((filePath) => [normalizedSeparators(path.relative(localRoot, filePath)), filePath]));
const localPaths = allLocalImagePaths
  .filter((filePath) => !isThumbnail(filePath))
  .sort((a, b) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" }));

const local = localPaths.map((filePath) => {
  const relativePath = normalizedSeparators(path.relative(localRoot, filePath));
  const stat = fs.statSync(filePath);
  return {
    filePath,
    relativePath,
    basename: path.posix.basename(relativePath),
    extension: path.posix.extname(relativePath).toLowerCase(),
    size: stat.size,
    branch: relativePath.split("/")[0],
  };
});

let hashCursor = 0;
async function hashWorker() {
  while (hashCursor < local.length) {
    const index = hashCursor++;
    Object.assign(local[index], await checksums(local[index].filePath));
    if ((index + 1) % 250 === 0) console.log(`Hashed ${index + 1} of ${local.length} local images`);
  }
}
await Promise.all(Array.from({ length: 4 }, hashWorker));

const remoteByPath = new Map(remote.map((item) => [item.path, item]));
const remoteByLowerPath = new Map();
const remoteByBasename = new Map();
for (const item of remote) {
  const lowerPath = item.path.toLowerCase();
  const lowerPathGroup = remoteByLowerPath.get(lowerPath) || [];
  lowerPathGroup.push(item);
  remoteByLowerPath.set(lowerPath, lowerPathGroup);
  const group = remoteByBasename.get(item.basename) || [];
  group.push(item);
  remoteByBasename.set(item.basename, group);
}

const usedRemote = new Set();
const rows = local.map((item) => {
  const exact = remoteByPath.get(item.relativePath);
  const caseCandidates = remoteByLowerPath.get(item.relativePath.toLowerCase()) || [];
  const nameCandidates = remoteByBasename.get(item.basename) || [];
  let match = exact;
  let status = "missing_remote";
  let note = "No remote file with the same path or basename and checksum.";

  if (exact) {
    usedRemote.add(exact.index);
    const checksumMatch = exact.md5 === item.md5 && (!exact.sha1 || exact.sha1 === item.sha1);
    const sizeMatch = exact.size === item.size;
    status = checksumMatch && sizeMatch ? "exact_path_checksum_match" : "exact_path_checksum_mismatch";
    note = checksumMatch && sizeMatch ? "Exact relative path, size, MD5, and SHA-1 match." : "Exact relative path exists, but size or checksum differs.";
  } else {
    const caseMatch = caseCandidates.find((candidate) => candidate.md5 === item.md5 && candidate.size === item.size);
    const sameNameChecksumMatches = nameCandidates.filter((candidate) => candidate.md5 === item.md5 && candidate.size === item.size);
    if (caseMatch) {
      match = caseMatch;
      usedRemote.add(caseMatch.index);
      status = "case_only_path_checksum_match";
      note = "Path differs only by letter case; size and MD5 match. Not counted as an exact path match.";
    } else if (sameNameChecksumMatches.length === 1) {
      match = sameNameChecksumMatches[0];
      usedRemote.add(match.index);
      status = "same_name_checksum_match_different_path";
      note = "Same basename, size, and MD5 at a different remote path; retained as a non-exact mapping.";
    } else if (sameNameChecksumMatches.length > 1) {
      status = "ambiguous_same_name_checksum_matches";
      note = `${sameNameChecksumMatches.length} remote files share this basename and checksum; branch mapping is ambiguous without paths.`;
    } else if (nameCandidates.length) {
      status = "same_name_checksum_mismatch";
      note = `${nameCandidates.length} remote file(s) share the basename but not the size/MD5.`;
    }
  }

  return {
    local_path: item.relativePath,
    local_branch: item.branch,
    local_basename: item.basename,
    local_extension: item.extension,
    local_size: item.size,
    local_md5: item.md5,
    local_sha1: item.sha1,
    status,
    remote_path: match?.path || "",
    remote_branch: match?.branch || "",
    remote_extension: match?.extension || "",
    remote_size: match?.size ?? "",
    remote_md5: match?.md5 || "",
    remote_sha1: match?.sha1 || "",
    same_basename_remote_count: nameCandidates.length,
    note,
  };
});

const localBasenameGroups = new Map();
for (const item of local) {
  const group = localBasenameGroups.get(item.basename) || [];
  group.push(item);
  localBasenameGroups.set(item.basename, group);
}
const duplicateFilenames = [...localBasenameGroups.entries()]
  .filter(([, items]) => new Set(items.map((item) => item.branch)).size > 1)
  .map(([basename, items]) => ({
    basename,
    local_file_count: items.length,
    branch_count: new Set(items.map((item) => item.branch)).size,
    branches: [...new Set(items.map((item) => item.branch))].join(" | "),
    distinct_md5_count: new Set(items.map((item) => item.md5)).size,
    paths: items.map((item) => item.relativePath).join(" | "),
  }))
  .sort((a, b) => b.branch_count - a.branch_count || a.basename.localeCompare(b.basename));

const branchNames = [...new Set([...local.map((item) => item.branch), ...remote.map((item) => item.branch)])]
  .sort((a, b) => a.localeCompare(b, "en", { numeric: true, sensitivity: "base" }));
const branchRows = branchNames.map((branch) => {
  const localItems = local.filter((item) => item.branch === branch);
  const remoteItems = remote.filter((item) => item.branch === branch);
  const localRows = rows.filter((item) => item.local_branch === branch);
  const exact = localRows.filter((item) => item.status === "exact_path_checksum_match").length;
  const presentByChecksum = localRows.filter((item) => ["exact_path_checksum_match", "case_only_path_checksum_match", "same_name_checksum_match_different_path"].includes(item.status)).length;
  const mismatches = localRows.filter((item) => item.status.includes("mismatch")).length;
  const missing = localRows.filter((item) => item.status === "missing_remote").length;
  const remoteOnly = remoteItems.filter((item) => !usedRemote.has(item.index)).length;
  return {
    branch,
    local_images: localItems.length,
    remote_original_images: remoteItems.length,
    exact_path_checksum_matches: exact,
    present_by_checksum: presentByChecksum,
    checksum_or_size_mismatches: mismatches,
    missing_remote: missing,
    remote_only: remoteOnly,
    status: localItems.length > 0 && presentByChecksum === localItems.length && mismatches === 0 ? "complete" : localItems.length ? "incomplete" : "remote_only_branch",
  };
});

const remoteOnly = remote.filter((item) => !usedRemote.has(item.index)).map((item) => ({
  remote_path: item.path,
  remote_branch: item.branch,
  remote_basename: item.basename,
  remote_extension: item.extension,
  remote_size: item.size,
  remote_md5: item.md5,
  remote_sha1: item.sha1,
  present_elsewhere_on_local_disk: rawLocalByPath.has(item.path),
  local_raw_path: rawLocalByPath.has(item.path) ? item.path : "",
  intended_viewer_exclusion: rawLocalByPath.has(item.path) && isThumbnail(rawLocalByPath.get(item.path)) ? "color/focus or thumbnail helper image" : "",
}));

const statusCounts = Object.fromEntries([...new Set(rows.map((row) => row.status))].sort().map((status) => [status, rows.filter((row) => row.status === status).length]));
const summary = {
  generatedAt: new Date().toISOString(),
  archiveIdentifier: metadata.metadata?.identifier,
  metadataEndpoint: "https://archive.org/metadata/ldswelshmembership",
  downloadRoot: "https://archive.org/download/ldswelshmembership/",
  localRoot: "resources/source-cds",
  rules: {
    localImages: "JPEG/JPG/PNG under resources/source-cds, excluding the viewer's t/ta/color/focus thumbnail suffixes.",
    remoteImages: "Internet Archive metadata entries with source=original and format JPEG or PNG; generated derivatives and __ia_thumb.jpg are excluded.",
    pathNormalization: "Backslashes converted to forward slashes only. Case, spelling, punctuation, and folder names are otherwise preserved.",
    exactMatch: "Same normalized relative path, size, MD5, and SHA-1 (when supplied remotely).",
  },
  totals: {
    localIntendedImages: local.length,
    remoteOriginalImages: remote.length,
    exactPathChecksumMatches: statusCounts.exact_path_checksum_match || 0,
    caseOnlyPathChecksumMatches: statusCounts.case_only_path_checksum_match || 0,
    sameNameChecksumMatchesDifferentPath: statusCounts.same_name_checksum_match_different_path || 0,
    exactPathChecksumMismatches: statusCounts.exact_path_checksum_mismatch || 0,
    sameNameChecksumMismatches: statusCounts.same_name_checksum_mismatch || 0,
    ambiguousSameNameMappings: statusCounts.ambiguous_same_name_checksum_matches || 0,
    localMissingRemote: statusCounts.missing_remote || 0,
    remoteNotInIntendedViewerSet: remoteOnly.length,
    remotePresentLocallyButViewerExcluded: remoteOnly.filter((item) => item.present_elsewhere_on_local_disk).length,
    remoteNotPresentAnywhereLocally: remoteOnly.filter((item) => !item.present_elsewhere_on_local_disk).length,
    localDuplicateBasenamesAcrossBranches: duplicateFilenames.length,
    completeBranchFolders: branchRows.filter((row) => row.status === "complete").length,
    incompleteBranchFolders: branchRows.filter((row) => row.status === "incomplete").length,
  },
  statusCounts,
  examples: rows.slice(0, 5).map((row) => ({ local: row.local_path, remote: row.remote_path, status: row.status })),
  branches: branchRows,
  duplicateFilenames,
  remoteOnly,
  files: rows,
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "reconciliation.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
writeCsv(path.join(outputDir, "files.csv"), rows, Object.keys(rows[0]));
writeCsv(path.join(outputDir, "branches.csv"), branchRows, Object.keys(branchRows[0]));
writeCsv(path.join(outputDir, "duplicate-filenames.csv"), duplicateFilenames, duplicateFilenames.length ? Object.keys(duplicateFilenames[0]) : ["basename"]);
writeCsv(path.join(outputDir, "remote-only.csv"), remoteOnly, remoteOnly.length ? Object.keys(remoteOnly[0]) : ["remote_path"]);

console.log(JSON.stringify(summary.totals, null, 2));
