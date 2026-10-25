// Tutor de movimientos (campamento) y Piezas de estrella: cambiar una técnica por otra que el Pokémon pueda aprender.
// Se paga con Piezas de estrella (1-5 por cambio), sin límite de cambios. No consume la acción del campamento.
import { emitRun, findInRoster } from "./runState.js";

// Familia evolutiva completa de una especie (preevoluciones, ella misma y evoluciones).
function lineageOf(data, speciesId) {
  const family = new Set([speciesId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [id, species] of Object.entries(data.species)) {
      for (const evolution of species.evolutions ?? []) {
        if (family.has(id) !== family.has(evolution.to)) {
          family.add(id);
          family.add(evolution.to);
          grew = true;
        }
      }
    }
  }
  return family;
}
const lineageCache = new WeakMap();

// Movimientos que puede aprender: los de su(s) tipo(s), los de tipo Normal y los de su familia evolutiva.
export function learnableMoves(data, pokemon) {
  const species = data.species[pokemon.speciesId];
  const types = new Set([...species.types, "normal"]);
  const key = pokemon.speciesId;
  if (!lineageCache.has(data.species)) lineageCache.set(data.species, new Map());
  const cache = lineageCache.get(data.species);
  if (!cache.has(key)) cache.set(key, lineageOf(data, key));
  const learnable = new Set();
  for (const [moveId, move] of Object.entries(data.moves)) if (types.has(move.type)) learnable.add(moveId);
  for (const relative of cache.get(key)) for (const moveId of data.species[relative].moves) learnable.add(moveId);
  for (const known of pokemon.moves) learnable.delete(known);
  return [...learnable].sort((a, b) => data.moves[a].cost - data.moves[b].cost || data.moves[a].power - data.moves[b].power || a.localeCompare(b));
}

// 1 pieza base + el costo de energía de la técnica (+1 si es muy potente). Entre 1 y 5.
export function moveChangeCost(data, moveId) {
  const move = data.moves[moveId];
  return Math.min(5, 1 + move.cost + (move.power >= (data.balance.starPieces?.strongPower ?? 11) ? 1 : 0));
}

export function teachMove(run, pokemonUid, slotIndex, moveId) {
  if (run.phase !== "camp") return { ok: false, error: "notInCamp" };
  const pokemon = findInRoster(run, pokemonUid);
  if (!pokemon) return { ok: false, error: "unknownPokemon" };
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= pokemon.moves.length) return { ok: false, error: "invalidMoveIndex" };
  if (!learnableMoves(run.data, pokemon).includes(moveId)) return { ok: false, error: "notLearnable" };
  const cost = moveChangeCost(run.data, moveId);
  if ((run.starPieces ?? 0) < cost) return { ok: false, error: "notEnoughStars" };
  const replaced = pokemon.moves[slotIndex];
  run.starPieces -= cost;
  pokemon.moves[slotIndex] = moveId;
  pokemon.cooldowns[slotIndex] = 0;
  return { ok: true, events: [emitRun(run, { type: "moveTaught", uid: pokemon.uid, slotIndex, moveId, replaced, cost })] };
}

// Piezas de estrella tras ganar: una tirada 1-10 con pesos decrecientes; los jefes tiran varias veces y se quedan con la mejor.
// Las zonas de captura (rutas salvajes) no dan piezas.
export function rollStarPieces(run, nodeType) {
  const rules = run.data.balance.starPieces;
  const rolls = rules?.rolls?.[nodeType] ?? 0;
  if (!rules || rolls <= 0) return 0;
  const entries = rules.weights.map((weight, index) => ({ amount: index + 1, weight }));
  let best = 0;
  for (let index = 0; index < rolls; index += 1) best = Math.max(best, run.rng.weightedPick(entries).amount);
  return best;
}

export function grantStarPieces(run, amount) {
  if (amount <= 0) return [];
  run.starPieces = (run.starPieces ?? 0) + amount;
  return [emitRun(run, { type: "starPiecesGained", amount })];
}
