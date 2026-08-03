import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const configPath = path.join(root, "sources.local.json");
const catalogPath = path.join(root, "data", "catalog.local.js");
const port = Number(process.env.PORT || 18765);

if (!fs.existsSync(configPath) || !fs.existsSync(catalogPath)) {
  throw new Error("Run node scripts/build-catalog.mjs before starting the viewer.");
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const sources = new Map(config.sources.map((source) => [source.id, path.resolve(source.path)]));
const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"], [".htm", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"], [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"], [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"], [".png", "image/png"], [".gif", "image/gif"],
  [".pdf", "application/pdf"], [".doc", "application/msword"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  [".xls", "application/vnd.ms-excel"], [".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  [".wpd", "application/vnd.wordperfect"], [".epub", "application/epub+zip"],
]);

function safeArchivePath(urlPath) {
  const parts = urlPath.split("/").filter(Boolean).map(decodeURIComponent);
  if (parts[0] !== "archive" || parts.length < 3) return null;
  const sourceRoot = sources.get(parts[1]);
  if (!sourceRoot) return null;
  const candidate = path.resolve(sourceRoot, ...parts.slice(2));
  if (candidate !== sourceRoot && !candidate.startsWith(`${sourceRoot}${path.sep}`)) return null;
  return candidate;
}

function sendFile(response, filePath, cache = false) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("File not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": mimeTypes.get(path.extname(filePath).toLowerCase()) || "application/octet-stream",
    "Content-Length": fs.statSync(filePath).size,
    "Cache-Control": cache ? "private, max-age=3600" : "no-store",
  });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "127.0.0.1"}`);
  const archivePath = safeArchivePath(url.pathname);
  if (archivePath) return sendFile(response, archivePath, true);

  const requested = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  const localPath = path.resolve(root, requested);
  if (localPath !== root && !localPath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }
  sendFile(response, localPath);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Welsh records viewer: http://127.0.0.1:${port}/`);
  console.log("Press Ctrl+C to stop.");
});
