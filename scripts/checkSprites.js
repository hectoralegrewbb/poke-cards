// Lista recursos offline ausentes sin descargarlos. Uso: npm run sprites
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { nationalDex, remoteSpriteUrl } from "../web/ui/spriteSources.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "sprites");
let missing = 0;
for (const facing of ["front", "back"]) {
  mkdirSync(join(root, facing), { recursive: true });
  for (const speciesId of Object.keys(nationalDex)) {
    if (["gif", "png"].some((ext) => existsSync(join(root, facing, `${speciesId}.${ext}`)))) continue;
    missing += 1;
    console.log(`${facing}/${speciesId}.gif <- ${remoteSpriteUrl(speciesId, facing)}`);
  }
}
console.log(`Faltan ${missing} de ${Object.keys(nationalDex).length * 2} sprites offline. Ejecutá npm run sprites:download para instalarlos.`);
