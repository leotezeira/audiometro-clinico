import http from "http";
import { readFile } from "fs/promises";
import { createReadStream, existsSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = parseInt(process.argv[2] || "5500", 10);
const root = process.cwd();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

function safeJoin(rootDir, reqPath) {
  const decoded = decodeURIComponent(reqPath);
  const cleaned = decoded.replace(/\0/g, "").replace(/\\/g, "/");
  const withoutQuery = cleaned.split("?")[0].split("#")[0];
  const rel = withoutQuery.replace(/^\/+/, "");
  const full = path.resolve(rootDir, rel);
  if (!full.startsWith(path.resolve(rootDir) + path.sep) && full !== path.resolve(rootDir)) {
    return null;
  }
  return full;
}

const server = http.createServer(async (req, res) => {
  try {
    const urlPath = req.url === "/" ? "/index.html" : (req.url || "/index.html");
    const filePath = safeJoin(root, urlPath);
    if (!filePath) {
      res.statusCode = 400;
      res.end("Bad request");
      return;
    }

    // Directory -> index.html
    if (existsSync(filePath) && statSync(filePath).isDirectory()) {
      const idx = path.join(filePath, "index.html");
      if (!existsSync(idx)) {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }
      res.setHeader("Content-Type", MIME[".html"]);
      createReadStream(idx).pipe(res);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");

    // Stream for binary-ish files, readFile for text is fine too but stream is simpler.
    if (!existsSync(filePath)) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }
    createReadStream(filePath).pipe(res);
  } catch (e) {
    res.statusCode = 500;
    res.end("Server error");
  }
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Static server running: http://localhost:${port}/ (root: ${root})`);
});

