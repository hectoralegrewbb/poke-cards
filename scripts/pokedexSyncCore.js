import { assignTypePassives } from './typePassives.js';

// Importador puro de datos de PokeAPI: sin IO y sin efectos colaterales.
// Normaliza las primeras 649 especies al sistema simplificado de cartas.
const typeById = Object.freeze({
  1: 'normal', 2: 'fighting', 3: 'flying', 4: 'poison', 5: 'ground',
  6: 'rock', 7: 'bug', 8: 'ghost', 9: 'steel', 10: 'fire', 11: 'water',
  12: 'grass', 13: 'electric', 14: 'psychic', 15: 'ice', 16: 'dragon',
  17: 'dark', 18: 'fairy'
});
const statIds = Object.freeze({ 1: 'hp', 2: 'atk', 3: 'def', 4: 'spa', 5: 'spd' });

export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(field); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [keys, ...entries] = rows;
  return entries.map((values) => Object.fromEntries(keys.map((key, index) => [key, values[index] ?? ''])));
}

export function toSpeciesId(identifier) {
  return identifier.replace(/-([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

function displayName(identifier) {
  return identifier.split('-').map((part) => part.slice(0, 1).toUpperCase() + part.slice(1)).join('-')
    .replace('Mr-Mime', 'Mr. Mime').replace('Mime-Jr', 'Mime Jr.')
    .replace('Nidoran-F', 'Nidoran ♀').replace('Nidoran-M', 'Nidoran ♂');
}

function statsFor(rows) {
  const original = Object.fromEntries(rows.map((row) => [statIds[Number(row.stat_id)], Number(row.base_stat)]));
  if (!original.hp || !original.atk || !original.def || !original.spa || !original.spd) throw new Error('Estadísticas incompletas');
  return {
    hp: Math.max(15, Math.min(49, Math.round(original.hp * 0.3 + 4))),
    atk: Math.max(3, Math.min(20, Math.round(original.atk / 10 + 2))),
    def: Math.max(3, Math.min(20, Math.round(original.def / 10 + 2))),
    spa: Math.max(3, Math.min(20, Math.round(original.spa / 10 + 2))),
    spd: Math.max(3, Math.min(20, Math.round(original.spd / 10 + 2)))
  };
}

// En Gen V todavía no existía el tipo Hada. Se reconstruyen los cambios posteriores.
const oldFairyNormals = new Set(['togepi', 'togetic', 'togekiss', 'snubbull', 'granbull', 'clefairy', 'clefable', 'igglybuff', 'jigglypuff', 'wigglytuff', 'azurill', 'mime-jr']);
function genFiveTypes(identifier, rows) {
  const types = rows.sort((a, b) => Number(a.slot) - Number(b.slot)).map((row) => typeById[Number(row.type_id)]);
  if (types.some((type) => !type)) throw new Error(`Tipo inválido en ${identifier}`);
  const result = types.filter((type) => type !== 'fairy');
  if (types.includes('fairy') && (oldFairyNormals.has(identifier) || result.length === 0)) result.push('normal');
  if (identifier === 'marill' || identifier === 'azumarill') return ['water'];
  if (identifier === 'mawile') return ['steel'];
  if (identifier === 'ralts' || identifier === 'kirlia' || identifier === 'gardevoir') return ['psychic'];
  if (identifier === 'cottonee' || identifier === 'whimsicott') return ['grass'];
  return [...new Set(result)].slice(0, 2);
}

// Techo de costo según la fuerza de la especie: un Magikarp no lanza Hidrobomba y un legendario sí.
function maxCostFor(threat) {
  return threat >= 85 ? 3 : threat >= 55 ? 2 : 1;
}

// Elección determinista con variedad: la misma especie siempre recibe el mismo kit,
// pero dos especies del mismo tipo no comparten por defecto los mismos ataques.
function pickVaried(candidates, seed, salt) {
  if (candidates.length === 0) return null;
  return candidates[(seed * 31 + salt * 17) % candidates.length][0];
}

export function moveSet(types, moves, { threat = 60, seed = 0 } = {}) {
  const ceiling = maxCostFor(threat);
  const all = Object.entries(moves).filter(([, move]) => move.power > 0 && move.targetSide !== 'self' && move.cost <= ceiling);
  const same = all.filter(([, move]) => types.includes(move.type));
  const tier = (collection, cost) => collection.filter(([, move]) => move.cost === cost);
  const selected = [];
  const add = (id) => { if (id && !selected.includes(id)) selected.push(id); };
  const free = same.filter(([, move]) => move.cost === 0 && move.cooldown === 0);
  add(pickVaried(free, seed, 1) ?? 'tackle');
  add(pickVaried(tier(same, 1).filter(([id]) => !selected.includes(id)), seed, 2));
  if (ceiling >= 2) add(pickVaried(tier(same, 2).filter(([id]) => !selected.includes(id)), seed, 3));
  if (ceiling >= 3) add(pickVaried(tier(same, 3).filter(([id]) => !selected.includes(id)), seed, 4));
  // Cobertura: un golpe de costo 1 de otro tipo para no depender solo del STAB.
  add(pickVaried(tier(all, 1).filter(([id, move]) => !selected.includes(id) && !types.includes(move.type)), seed, 5));
  for (const source of [same, all]) {
    for (const [id] of source) {
      if (selected.length >= 4) break;
      add(id);
    }
  }
  if (selected.length < 4) throw new Error('Catálogo de ataques insuficiente');
  return selected.slice(0, 4);
}

export function importPokedex({ speciesCsv, pokemonCsv, typesCsv, statsCsv }, { species, moves }) {
  const speciesRows = parseCsv(speciesCsv).filter((row) => Number(row.id) <= 649);
  const pokemonRows = parseCsv(pokemonCsv);
  const typeRows = parseCsv(typesCsv);
  const statRows = parseCsv(statsCsv);
  const pokemonBySpecies = new Map(pokemonRows.filter((row) => row.is_default === '1').map((row) => [Number(row.species_id), row]));
  const typeByPokemon = Map.groupBy
    ? Map.groupBy(typeRows, (row) => Number(row.pokemon_id))
    : groupRows(typeRows, 'pokemon_id');
  const statByPokemon = Map.groupBy
    ? Map.groupBy(statRows, (row) => Number(row.pokemon_id))
    : groupRows(statRows, 'pokemon_id');
  const ids = new Map(speciesRows.map((row) => [Number(row.id), toSpeciesId(row.identifier)]));
  if (speciesRows.length !== 649 || ids.size !== 649) throw new Error(`Fuente incompleta: ${speciesRows.length}/649 especies`);
  const result = structuredClone(species);
  const index = {};
  const missingIds = [];
  for (const row of speciesRows) {
    const id = Number(row.id);
    const speciesId = ids.get(id);
    index[speciesId] = id;
    if (result[speciesId]) continue; // Nunca se sobrescriben los 229 Pokémon curados.
    const pokemon = pokemonBySpecies.get(id);
    if (!pokemon) throw new Error(`Falta Pokémon base para ${id}`);
    const pokemonId = Number(pokemon.id);
    const types = genFiveTypes(row.identifier, typeByPokemon.get(pokemonId) ?? []);
    if (types.length === 0) throw new Error(`Faltan tipos de ${speciesId}`);
    const stats = statsFor(statByPokemon.get(pokemonId) ?? []);
    const legendary = row.is_legendary === '1' || row.is_mythical === '1';
    const parentId = Number(row.evolves_from_species_id || 0);
    const isFinalOrStageTwo = speciesRows.some((candidate) => Number(candidate.evolves_from_species_id) === id);
    result[speciesId] = {
      name: displayName(row.identifier),
      types, expYield: legendary ? 19 : parentId ? 11 : isFinalOrStageTwo ? 7 : 9,
      stats, moves: moveSet(types, moves, { threat: Object.values(stats).reduce((sum, value) => sum + value, 0), seed: id }),
      ...(legendary ? { legendary: true } : {})
    };
    missingIds.push(id);
  }
  for (const row of speciesRows) {
    const previous = ids.get(Number(row.evolves_from_species_id));
    const next = ids.get(Number(row.id));
    if (!previous || !next) continue;
    const current = result[previous];
    const path = current.evolutions ?? [];
    if (path.some((evolution) => evolution.to === next)) continue;
    // Diseño adaptado al roguelike: sin requisitos ocultos de amistad, intercambio o piedras.
    // Evoluciones potentes esperan más medallas para respetar la curva de una corrida.
    const target = result[next];
    const threat = Object.values(target.stats).reduce((sum, value) => sum + value, 0);
    const minBadges = threat > 87 ? 5 : threat > 74 ? 4 : 1;
    current.evolutions = [...path, { to: next, method: 'exp', expRequired: minBadges >= 4 ? 105 : 55, minBadges }];
  }
  return { species: assignTypePassives(result), nationalDex: index, added: missingIds.length };
}

function groupRows(rows, key) {
  const groups = new Map();
  for (const row of rows) {
    const id = Number(row[key]);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(row);
  }
  return groups;
}
