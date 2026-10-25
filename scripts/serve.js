// Servidor estático local (sin dependencias). Uso: npm start  ->  http://localhost:8080/web/
// Las rutas se procesan por segmentos con "/" (la URL), así funciona igual en Windows, Mac y Linux.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT ?? 8080);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".css": "text/css; charset=utf-8", ".gif": "image/gif", ".png": "image/png" };
const allowedRoots = new Set(["web", "src", "data", "assets"]);

function resolveFile(urlPath) {
  const segments = decodeURIComponent(urlPath).split("/").filter(Boolean);
  if (segments.some((segment) => segment === ".." || segment === "." || segment.includes("\\"))) return null;
  if (!allowedRoots.has(segments[0])) return null;
  if (urlPath.endsWith("/") || segments.length === 1) segments.push("index.html");
  return join(root, ...segments);
}

createServer((request, response) => {
  const { pathname } = new URL(request.url, "http://localhost");
  if (pathname === "/" || pathname === "/web") {
    response.writeHead(302, { Location: "/web/" }).end();
    return;
  }
  let file = null;
  try {
    file = resolveFile(pathname);
  } catch {
    file = null;
  }
  if (!file || !existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end(`No encontrado: ${pathname}`);
    return;
  }
  response.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(response);
}).listen(port, () => console.log(`Pokémon Dream en http://localhost:${port}/web/`));
