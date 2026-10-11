import { createServer } from "node:http";
import process from "node:process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAuthHandler } from "./server/auth.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const production = process.env.NODE_ENV === "production" || process.argv.includes("--production");
if (production) process.env.NODE_ENV = "production";
if (process.env.VERCEL && !process.env.SYNERA_DATA_DIR) {
  process.env.SYNERA_DATA_DIR = "/tmp/synera";
}
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";
const auth = createAuthHandler();
const vite = production ? null : await (await import("vite")).createServer({
  configFile: path.join(root, "vite.config.js"),
  server: { middlewareMode: true },
  appType: "spa",
});

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

async function serveProductionFile(request, response) {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const dist = path.join(root, "dist");
  const requestedPath = path.resolve(dist, `.${pathname}`);
  if (requestedPath !== dist && !requestedPath.startsWith(`${dist}${path.sep}`)) {
    response.writeHead(403).end();
    return;
  }
  let filePath = requestedPath === dist ? path.join(dist, "index.html") : requestedPath;
  try {
    const contents = await readFile(filePath);
    response.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream" });
    response.end(contents);
  } catch {
    if (path.extname(pathname)) {
      response.writeHead(404).end();
      return;
    }
    filePath = path.join(dist, "index.html");
    response.writeHead(200, { "Content-Type": contentTypes[".html"] });
    response.end(await readFile(filePath));
  }
}

const server = createServer(async (request, response) => {
  if (new URL(request.url, "http://localhost").pathname.startsWith("/api/")) {
    await auth.handler(request, response);
    return;
  }
  if (vite) {
    vite.middlewares(request, response, (error) => {
      if (error) {
        response.writeHead(500).end("Internal server error");
      }
    });
    return;
  }
  await serveProductionFile(request, response);
});

server.listen(port, host, () => {
  console.log(`Synera ${production ? "server" : "dev server"} running at http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    server.close();
    auth.close();
    if (vite) await vite.close();
  });
}