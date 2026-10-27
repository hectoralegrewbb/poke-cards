// Recoge todas las claves t("...") del código (estáticamente) y las vuelca en JSON.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const root = process.argv[2];
const dirs = ["web/ui", "src/run", "src/engine", "src/tools", "web"];
const keys = new Set();
const re = /\bt\(\s*("(?:[^"\\\n]|\\.)*")/g;
for (const dir of dirs) {
  for (const name of readdirSync(join(root, dir))) {
    if (!name.endsWith(".js")) continue;
    const src = readFileSync(join(root, dir, name), "utf8");
    for (const m of src.matchAll(re)) keys.add(JSON.parse(m[1]));
  }
}
writeFileSync(process.argv[3], JSON.stringify([...keys].sort(), null, 1));
console.log(keys.size);
