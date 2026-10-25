// Objetos equipables en la corrida: cada uno existe una sola vez (no se repite) y lo lleva un solo Pokémon.
// run.heldOwned = ids conseguidos; pokemon.heldItem = el que lleva puesto. Se equipan fuera de combate.
import { emitRun, findInRoster } from "./runState.js";

export const heldItemsOwned = (run) => (run.heldOwned ??= []);

export function holderOf(run, itemId) {
  return [...run.party, ...run.box].find((pokemon) => pokemon.heldItem === itemId) ?? null;
}

export const freeHeldItems = (run) => heldItemsOwned(run).filter((itemId) => !holderOf(run, itemId));

// Nivel máximo de objeto que puede aparecer según las medallas (los más fuertes llegan tarde).
export function heldTierCap(run) {
  const caps = run.data.balance.heldDrops?.tierByBadges ?? [0, 3, 6];
  return 1 + caps.filter((badges, index) => index > 0 && run.badges.length >= badges).length;
}

export function grantHeldItem(run, itemId) {
  if (!run.data.heldItems?.[itemId]) return { ok: false, error: "unknownItem" };
  if (heldItemsOwned(run).includes(itemId)) return { ok: false, error: "alreadyOwned" };
  run.heldOwned.push(itemId);
  return { ok: true, events: [emitRun(run, { type: "heldItemGained", itemId })] };
}

// Elige un objeto que aún no tengas y que el avance permita. Consume RNG de la corrida solo si hay tirada.
export function rollHeldDrop(run, nodeType) {
  const rules = run.data.balance.heldDrops;
  const chance = rules?.chance?.[nodeType] ?? 0;
  if (chance <= 0 || run.rng.next() >= chance) return null;
  const cap = heldTierCap(run);
  const owned = heldItemsOwned(run);
  const pool = Object.entries(run.data.heldItems)
    .filter(([id, def]) => def.tier <= cap && !owned.includes(id))
    .map(([id, def]) => ({ id, weight: rules.tierWeight?.[String(def.tier)] ?? 1 }));
  return pool.length ? run.rng.weightedPick(pool).id : null;
}

export function pickShopHeldItems(run, count) {
  const cap = heldTierCap(run) + 1; // la tienda adelanta un nivel
  const owned = heldItemsOwned(run);
  const pool = Object.entries(run.data.heldItems).filter(([id, def]) => def.tier <= cap && !owned.includes(id)).map(([id]) => id);
  return run.rng.shuffle(pool).slice(0, count);
}

export function equipHeldItem(run, itemId, pokemonUid) {
  if (run.phase === "combat" || run.phase === "ended") return { ok: false, error: "notDuringCombat" };
  if (!heldItemsOwned(run).includes(itemId)) return { ok: false, error: "notOwned" };
  const pokemon = findInRoster(run, pokemonUid);
  if (!pokemon) return { ok: false, error: "unknownPokemon" };
  if (pokemon.heldItem === itemId) return { ok: false, error: "noEffect" };
  const previousHolder = holderOf(run, itemId);
  if (previousHolder) previousHolder.heldItem = null;
  pokemon.heldItem = itemId; // lo que llevaba puesto vuelve a la mochila
  return { ok: true, events: [emitRun(run, { type: "heldEquipped", uid: pokemon.uid, itemId })] };
}

export function unequipHeldItem(run, pokemonUid) {
  if (run.phase === "combat" || run.phase === "ended") return { ok: false, error: "notDuringCombat" };
  const pokemon = findInRoster(run, pokemonUid);
  if (!pokemon?.heldItem) return { ok: false, error: "noEffect" };
  const itemId = pokemon.heldItem;
  pokemon.heldItem = null;
  return { ok: true, events: [emitRun(run, { type: "heldUnequipped", uid: pokemon.uid, itemId })] };
}
