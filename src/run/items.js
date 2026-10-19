// Uso de ítems fuera de combate. Cada efecto es un handler registrable (abierto a extensión).
import { evolve, findEvolution, isAlive } from "../engine/index.js";
import { emitRun, findInRoster, removeItem } from "./runState.js";
import { evolvePokemonByExp } from "./rewards.js";

const itemEffects = new Map();

export function registerItemEffect(effect, handler) {
  itemEffects.set(effect, handler);
}

// Cada handler devuelve { ok, event } o { ok: false, error } y NO consume el ítem si falla.
registerItemEffect("heal", (run, item, pokemon) => {
  if (!isAlive(pokemon) || pokemon.hp >= pokemon.maxHp) return { ok: false, error: "noEffect" };
  pokemon.hp = Math.min(pokemon.maxHp, pokemon.hp + item.amount);
  return { ok: true, event: { type: "healed", uid: pokemon.uid } };
});

registerItemEffect("revive", (run, item, pokemon) => {
  if (isAlive(pokemon)) return { ok: false, error: "noEffect" };
  pokemon.fainted = false;
  pokemon.hp = Math.max(1, Math.round(pokemon.maxHp * item.hpFraction));
  return { ok: true, event: { type: "revived", uid: pokemon.uid } };
});

registerItemEffect("cure", (run, item, pokemon) => {
  if (!pokemon.status || (item.status && item.status !== pokemon.status)) return { ok: false, error: "noEffect" };
  const status = pokemon.status;
  pokemon.status = null;
  return { ok: true, event: { type: "statusCured", uid: pokemon.uid, status } };
});

registerItemEffect("restore", (run, item, pokemon) => {
  if (!isAlive(pokemon) || (pokemon.hp >= pokemon.maxHp && !pokemon.status)) return { ok: false, error: "noEffect" };
  const healed = Math.min(pokemon.maxHp - pokemon.hp, item.amount);
  pokemon.hp += healed;
  const status = pokemon.status;
  pokemon.status = null;
  return { ok: true, event: { type: "restored", uid: pokemon.uid, amount: healed, status } };
});

registerItemEffect("exp", (run, item, pokemon) => {
  if (!isAlive(pokemon)) return { ok: false, error: "noEffect" };
  pokemon.exp += item.amount;
  return { ok: true, event: { type: "expGained", uid: pokemon.uid, amount: item.amount } };
});

registerItemEffect("evolve", (run, item, pokemon, itemId) => {
  const evolution = findEvolution(pokemon, run.data, { itemId });
  if (!evolution) return { ok: false, error: "noEffect" };
  const from = pokemon.speciesId;
  evolve(pokemon, evolution, run.data);
  return { ok: true, event: { type: "evolved", uid: pokemon.uid, from, to: pokemon.speciesId } };
});

export function useItem(run, itemId, pokemonUid) {
  if (run.phase === "combat" || run.phase === "ended") return { ok: false, error: "cannotUseNow" };
  const item = run.data.items[itemId];
  if (!item) return { ok: false, error: "unknownItem" };
  if ((run.inventory[itemId] ?? 0) <= 0) return { ok: false, error: "noItem" };
  const pokemon = findInRoster(run, pokemonUid);
  if (!pokemon) return { ok: false, error: "unknownPokemon" };
  const handler = itemEffects.get(item.effect);
  if (!handler) return { ok: false, error: "unknownEffect" };

  const result = handler(run, item, pokemon, itemId);
  if (!result.ok) return result;
  removeItem(run, itemId);
  const events = [emitRun(run, { ...result.event, itemId })];
  if (item.effect === "exp") events.push(...evolvePokemonByExp(run, pokemon));
  return { ok: true, events };
}
