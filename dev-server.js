const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const root = __dirname;
const imagesRoot = path.join(root, "assets", "images");
const manifestPath = path.join(imagesRoot, "media-manifest.json");
const startPort = Number(process.env.PORT || 5500);
const mediaExt = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".mp4"]);
const clients = new Set();
let manifest = null;
let manifestSignature = "";
let scanTimer = null;
// 动态视觉导出的 MP4 往往大于普通图片；仍保留合理上限，避免本地服务一次读取过大的文件。
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

function toWebPath(filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function scanImages(dir = imagesRoot, output = []) {
  if (!fs.existsSync(dir)) return output;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanImages(fullPath, output);
      continue;
    }
    if (!entry.isFile() || !mediaExt.has(path.extname(entry.name).toLowerCase())) continue;
    const stat = fs.statSync(fullPath);
    output.push({
      src: toWebPath(fullPath),
      name: entry.name,
      folder: path.relative(imagesRoot, path.dirname(fullPath)).split(path.sep).filter(Boolean).join("/") || "root",
      size: stat.size,
      mtimeMs: Math.round(stat.mtimeMs),
      version: `${Math.round(stat.mtimeMs)}-${stat.size}`
    });
  }
  return output.sort((a, b) => a.src.localeCompare(b.src, "zh-Hans-CN"));
}

function writeManifest() {
  const files = scanImages();
  const signature = JSON.stringify(files.map(({ src, size, mtimeMs, version }) => ({ src, size, mtimeMs, version })));
  const changed = signature !== manifestSignature;
  manifestSignature = signature;
  manifest = { generatedAt: new Date().toISOString(), root: "assets/images", files };
  fs.mkdirSync(imagesRoot, { recursive: true });
  // Do not rewrite the generated file unless a real image changed: its own write
  // also wakes fs.watch and used to cause an endless rescan/SSE loop.
  if (changed || !fs.existsSync(manifestPath)) fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifest, changed };
}

function sendEvent(data) {
  const payload = `event: media-manifest\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach((res) => res.write(payload));
}

function scheduleScan() {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(() => {
    const result = writeManifest();
    if (result.changed) sendEvent(result.manifest);
  }, 160);
}

function onImagesChanged(_eventType, filename) {
  // The server writes the manifest itself; ignore that file's watch event.
  if (path.basename(String(filename || "")) === path.basename(manifestPath)) return;
  scheduleScan();
}

function requestBody(req, maxBytes = MAX_UPLOAD_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("UPLOAD_TOO_LARGE"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseMultipartUpload(body, contentType = "") {
  const matched = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType);
  if (!matched) throw new Error("INVALID_MULTIPART");
  const boundary = Buffer.from(`--${matched[1] || matched[2]}`);
  const fields = {};
  let file = null;
  let cursor = body.indexOf(boundary);
  while (cursor !== -1) {
    const afterBoundary = cursor + boundary.length;
    if (body.slice(afterBoundary, afterBoundary + 2).toString() === "--") break;
    const partStart = body.slice(afterBoundary, afterBoundary + 2).toString() === "\r\n" ? afterBoundary + 2 : afterBoundary;
    const next = body.indexOf(boundary, partStart);
    if (next === -1) break;
    const part = body.slice(partStart, next - 2);
    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd !== -1) {
      const headers = part.slice(0, headerEnd).toString("utf8");
      const data = part.slice(headerEnd + 4);
      const disposition = /content-disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]*)")?/i.exec(headers);
      if (disposition) {
        const [, name, filename] = disposition;
        if (filename !== undefined) file = { name, filename, data };
        else fields[name] = data.toString("utf8");
      }
    }
    cursor = next;
  }
  return { fields, file };
}

function safeUploadFolder(value = "") {
  const folder = String(value).trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!folder || folder === "all" || folder === "root") return "";
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]*(?:\/[a-zA-Z0-9][a-zA-Z0-9._-]*)*$/.test(folder) ? folder : null;
}

function safeUploadName(value = "") {
  const cleaned = String(value).replace(/\\/g, "/");
  const name = path.basename(cleaned);
  return name && name === cleaned.split("/").pop() && !name.startsWith(".") ? name : "";
}

function isLocalRequest(req) {
  const address = req.socket.remoteAddress || "";
  const host = String(req.headers.host || "").split(":")[0].replace(/^\[|\]$/g, "");
  return ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address)
    && ["localhost", "127.0.0.1", "::1", ""].includes(host);
}

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

async function handleMediaUpload(req, res) {
  if (!isLocalRequest(req)) return json(res, 403, { error: "LOCALHOST_ONLY" });
  try {
    if (Number(req.headers["content-length"] || 0) > MAX_UPLOAD_BYTES) {
      console.warn("[media-upload] rejected: UPLOAD_TOO_LARGE");
      return json(res, 413, { error: "UPLOAD_TOO_LARGE" });
    }
    const { fields, file } = parseMultipartUpload(await requestBody(req), req.headers["content-type"] || "");
    const folder = safeUploadFolder(fields.folder);
    const name = safeUploadName(file?.filename || "");
    if (folder === null || !name || !file?.data || !mediaExt.has(path.extname(name).toLowerCase())) {
      console.warn(`[media-upload] rejected: INVALID_MEDIA_UPLOAD (${name || "unnamed"})`);
      return json(res, 400, { error: "INVALID_MEDIA_UPLOAD" });
    }
    const folderPath = path.resolve(imagesRoot, folder || ".");
    const outputPath = path.resolve(folderPath, name);
    if (!folderPath.startsWith(imagesRoot) || !outputPath.startsWith(folderPath + path.sep)) return json(res, 400, { error: "INVALID_PATH" });
    if (fs.existsSync(outputPath) && fields.overwrite !== "1") {
      console.warn(`[media-upload] conflict: ${toWebPath(outputPath)}`);
      return json(res, 409, { conflict: true, name, src: toWebPath(outputPath) });
    }
    fs.mkdirSync(folderPath, { recursive: true });
    fs.writeFileSync(outputPath, file.data);
    const result = writeManifest();
    if (result.changed) sendEvent(result.manifest);
    const saved = result.manifest.files.find((item) => item.src === toWebPath(outputPath));
    console.info(`[media-upload] saved: ${toWebPath(outputPath)} (${file.data.length} bytes)`);
    return json(res, 201, { ok: true, file: saved || { src: toWebPath(outputPath), name } });
  } catch (error) {
    console.error(`[media-upload] failed: ${error.message || "UPLOAD_FAILED"}`);
    return json(res, error.message === "UPLOAD_TOO_LARGE" ? 413 : 400, { error: error.message === "UPLOAD_TOO_LARGE" ? "UPLOAD_TOO_LARGE" : "UPLOAD_FAILED" });
  }
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".mp4": "video/mp4"
  }[ext] || "application/octet-stream";
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let decoded;
  try {
    decoded = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  } catch {
    res.writeHead(400);
    res.end("Invalid path");
    return;
  }
  const imagesPrefix = "/assets/images/";
  const filePath = decoded.startsWith(imagesPrefix)
    ? path.resolve(imagesRoot, `.${decoded.slice("/assets/images".length)}`)
    : path.resolve(root, `.${decoded}`);
  const allowedRoot = decoded.startsWith(imagesPrefix) ? imagesRoot : root;
  if (filePath !== allowedRoot && !filePath.startsWith(`${allowedRoot}${path.sep}`)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, body) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": contentType(filePath),
      "Cache-Control": filePath.startsWith(imagesRoot) ? "no-cache" : "no-store"
    });
    res.end(body);
  });
}

writeManifest();

try {
  fs.watch(imagesRoot, { recursive: true }, onImagesChanged);
} catch {
  fs.watch(imagesRoot, onImagesChanged);
  setInterval(scheduleScan, 2500);
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname === "/__media-upload") {
    handleMediaUpload(req, res);
    return;
  }
  if (req.url === "/__media-events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    });
    res.write("\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }
  if (req.url === "/__media-manifest") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify(manifest || writeManifest().manifest));
    return;
  }
  serveStatic(req, res);
});

function listen(port) {
  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && port < startPort + 20) {
      listen(port + 1);
      return;
    }
    console.error(error);
    process.exit(1);
  });
  server.listen(port, "127.0.0.1", () => {
    server.removeAllListeners("error");
    console.log(`Song Studio local server: http://127.0.0.1:${port}/admin.html`);
    console.log("Watching assets/images and writing assets/images/media-manifest.json");
  });
}

listen(startPort);
