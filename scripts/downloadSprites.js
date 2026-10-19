// Descarga opcional para jugar offline: Node 20+, sin dependencias.
// Los gráficos originales de Pokémon pertenecen a sus titulares; no redistribuir sin permiso.
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { nationalDex, remoteSpriteUrl } from "../web/ui/spriteSources.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "sprites");
const speciesIds = Object.keys(nationalDex);
const jobs = speciesIds.flatMap((speciesId) => ["front", "back"].map((facing) => ({ speciesId, facing })));
let cursor = 0;
let downloaded = 0;
const failed = [];

async function downloadSprite({ speciesId, facing }) {
  const folder = join(root, facing);
  const filepath = join(folder, `${speciesId}.gif`);
  await mkdir(folder, { recursive: true });
  try { await access(filepath); return; } catch { /* no existe */ }
  const response = await fetch(remoteSpriteUrl(speciesId, facing), { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.toString("ascii", 0, 3) !== "GIF") throw new Error("El archivo no es GIF");
  await writeFile(filepath, bytes);
  downloaded += 1;
}

async function worker() {
  while (cursor < jobs.length) {
    const job = jobs[cursor++];
    try { await downloadSprite(job); }
    catch (error) { failed.push(`${job.facing}/${job.speciesId}: ${error.message}`); }
  }
}

await Promise.all(Array.from({ length: 5 }, worker));
if (failed.length === 0) {
  await writeFile(join(root, "manifest.json"), JSON.stringify({ source: "PokeAPI B&W Gen V", count: jobs.length }, null, 2));
}
console.log(`${downloaded} descargados, ${jobs.length - downloaded - failed.length} ya presentes, ${failed.length} errores.`);
if (failed.length) console.error(failed.join("\n"));
if (failed.length) process.exitCode = 1;
