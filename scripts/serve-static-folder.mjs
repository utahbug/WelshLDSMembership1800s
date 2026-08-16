import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const port = Number(process.argv[3] || 4180);
const types = new Map([
  [".html", "text/html; charset=utf-8"], [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"], [".mjs", "text/javascript; charset=utf-8"], [".json", "application/json; charset=utf-8"],
  [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"], [".png", "image/png"],
  [".svg", "image/svg+xml"], [".webmanifest", "application/manifest+json"],
]);

http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "START-HERE.html";
  const candidate = path.resolve(root, relative);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  const file = fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()
    ? path.join(candidate, "index.html") : candidate;
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": types.get(path.extname(file).toLowerCase()) || "application/octet-stream",
    "Content-Length": fs.statSync(file).size,
    "Cache-Control": "no-store",
  });
  fs.createReadStream(file).pipe(response);
}).listen(port, "127.0.0.1", () => console.log(`Serving ${root} at http://127.0.0.1:${port}/`));
