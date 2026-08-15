import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const root = path.resolve(process.argv[2] || path.join(import.meta.dirname, "../outputs/local-development"));
const port = Number(process.env.PORT || 18768);
if (!fs.existsSync(path.join(root, "index.html"))) {
  throw new Error("Local Development has not been built. Run: node scripts/build-local-development.mjs");
}
const privateIpv4 = (address) => /^10\./.test(address)
  || /^192\.168\./.test(address)
  || /^172\.(1[6-9]|2\d|3[01])\./.test(address);
const lanCandidates = Object.entries(os.networkInterfaces()).flatMap(([name, addresses]) =>
  (addresses || [])
    .filter((item) => item.family === "IPv4" && !item.internal && privateIpv4(item.address))
    .map((item) => ({ name, address: item.address })))
  .sort((left, right) => {
    const virtual = (name) => /virtual|vethernet|wsl|docker|vpn|loopback/i.test(name) ? 1 : 0;
    return virtual(left.name) - virtual(right.name) || left.name.localeCompare(right.name);
  });
const types = new Map([
  [".html", "text/html; charset=utf-8"], [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"], [".json", "application/json; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"], [".svg", "image/svg+xml"],
  [".png", "image/png"], [".jpg", "image/jpeg"], [".pdf", "application/pdf"],
  [".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], [".csv", "text/csv; charset=utf-8"],
]);

http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const requested = pathname === "/" ? "/index.html" : pathname;
  const file = path.resolve(root, `.${requested}`);
  if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403); response.end("Forbidden"); return;
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404); response.end("Not found"); return;
  }
  response.writeHead(200, {
    "Content-Type": types.get(path.extname(file).toLowerCase()) || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(file).pipe(response);
}).listen(port, "0.0.0.0", () => {
  console.log(`Local development: http://127.0.0.1:${port}/`);
  if (lanCandidates.length) {
    console.log(`iPhone/iPad on the same Wi-Fi: http://${lanCandidates[0].address}:${port}/`);
    if (lanCandidates.length > 1) console.log(`Other private IPv4 candidates: ${lanCandidates.slice(1).map(({ name, address }) => `${name} http://${address}:${port}/`).join(", ")}`);
  } else {
    console.log("No active private IPv4 address was detected. Connect this computer to Wi-Fi and restart the server.");
  }
  console.log(`Serving: ${root}`);
  console.log("If Windows Firewall asks, allow Node.js on Private networks only.");
});
