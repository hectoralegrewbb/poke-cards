// Carga los JSON de /data (solo Node). El motor recibe el objeto resultante por parámetro,
// así que en el navegador alcanza con armar el mismo objeto con fetch() o imports JSON.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const defaultDirectory = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "data");
const fileNames = [
  "balance",
  "cards",
  "moves",
  "species",
  "typeChart",
  "enemyProfiles",
  "startingDeck",
  "encounters",
  "items",
  "heldItems",
  "region",
  "campaigns",
  "story"
];

export function loadGameData(directory = defaultDirectory) {
  return Object.fromEntries(
    fileNames.map((name) => [name, JSON.parse(readFileSync(join(directory, `${name}.json`), "utf8"))])
  );
}
