// Ejecutar una vez con Internet: npm run dex:sync
// Consume CSV públicos de PokeAPI y guarda el catálogo completo de forma atómica.
import { writeFile, rename, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importPokedex } from './pokedexSyncCore.js';
import { loadGameData } from '../src/node/loadGameData.js';
import { validateGameData } from '../src/engine/validateData.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const endpoint = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv';
const sources = {
  speciesCsv: 'pokemon_species.csv',
  pokemonCsv: 'pokemon.csv',
  typesCsv: 'pokemon_types.csv',
  statsCsv: 'pokemon_stats.csv'
};
async function fetchCsv(file) {
  const response = await fetch(`${endpoint}/${file}`, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  return response.text();
}
const original = loadGameData();
const csvs = Object.fromEntries(await Promise.all(Object.entries(sources).map(async ([key, name]) => [key, await fetchCsv(name)])));
const { species, nationalDex, added } = importPokedex(csvs, original);
const errors = validateGameData({ ...original, species });
if (errors.length) throw new Error(`Importación inválida:\n${errors.slice(0, 15).join('\n')}`);
const expectedIds = new Set(Object.values(nationalDex));
if (expectedIds.size !== 649 || Object.keys(species).length !== 649) throw new Error('La Pokédex no tiene exactamente 649 especies');
const jsIndex = `// Índice nacional generado por npm run dex:sync (PokeAPI, especies 1-649).\nexport const nationalDex = Object.freeze(${JSON.stringify(nationalDex, null, 2)});\n`;
const outputs = [
  [join(root, 'data', 'species.json'), JSON.stringify(species, null, 2) + '\n'],
  [join(root, 'src', 'shared', 'nationalDex.js'), jsIndex]
];
// Las dos salidas se generan y verifican en archivos temporales antes de sustituirlas.
const temps = outputs.map(([filename]) => `${filename}.tmp`);
try {
  await Promise.all(outputs.map(([, value], index) => writeFile(temps[index], value)));
  for (let index = 0; index < outputs.length; index += 1) await rename(temps[index], outputs[index][0]);
} finally {
  await Promise.all(temps.map((filename) => unlink(filename).catch(() => {})));
}
console.log(`Pokédex lista: 649 especies, ${added} nuevas. Sprites de Black/White por número nacional.`);
