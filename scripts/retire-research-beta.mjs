import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const beta = path.join(root, "research-beta");
const pages = fs.readdirSync(beta).filter((name) => name.endsWith(".html"));

for (const page of pages) {
  const destination = `../full/${page === "index.html" ? "" : page}`;
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta http-equiv="refresh" content="0; url=${destination}">
  <title>Research Beta moved</title>
  <script>location.replace(new URL(${JSON.stringify(destination)} + location.search + location.hash, location.href));<\/script>
</head>
<body>
  <main>
    <h1>Research Beta has moved</h1>
    <p>The active edition is now <a href="${destination}">LDS Welsh Membership Records — Full Online</a>.</p>
  </main>
</body>
</html>
`;
  fs.writeFileSync(path.join(beta, page), html, "utf8");
}
console.log(JSON.stringify({ retiredPages: pages.length, destination: "/full/" }, null, 2));
