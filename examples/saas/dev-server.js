/**
 * Dev server for the SaaS example.
 * Serves the public directory and handles module resolution.
 */
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_DIR = join(__dirname, "public");
const CORE_DIR = join(__dirname, "../../packages/core");
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = createServer((req, res) => {
  let url = new URL(req.url, `http://localhost:${PORT}`).pathname;

  // Resolve @better-pwa/core imports
  if (url.startsWith("/node_modules/@better-pwa/core/")) {
    const relativePath = url.replace("/node_modules/@better-pwa/core/", "");
    const filePath = join(CORE_DIR, "src", relativePath);
    serveFile(res, filePath);
    return;
  }

  // Default to index.html
  if (url === "/") url = "/index.html";

  const filePath = join(PUBLIC_DIR, url);
  serveFile(res, filePath);
});

function serveFile(res, filePath) {
  const ext = extname(filePath);
  const mime = MIME_TYPES[ext] || "application/octet-stream";

  if (!existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
    return;
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    res.writeHead(200, {
      "Content-Type": mime,
      "Cache-Control": "no-cache",
    });
    res.end(content);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
}

server.listen(PORT, () => {
  console.log(`\n🚀 better-pwa SaaS Example`);
  console.log(`   http://localhost:${PORT}\n`);
  console.log(`   This is a vanilla JS demo — no framework, no build step.`);
  console.log(`   The PWA runtime loads from the local workspace.\n`);
});
