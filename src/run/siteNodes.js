// Nodos sin combate: campamento y tienda.
import { isAlive } from "../engine/index.js";
import { addCardToDeck, addItem, emitRun, findInRoster } from "./runState.js";
import { evolvePokemonByExp } from "./rewards.js";

export function openShop(run) {
  const { shop, cardRewards } = run.campaign;
  const items = run.rng.shuffle([...shop.items]).slice(0, shop.itemSlots).map((id) => ({
    kind: "item",
    id,
    price: run.data.items[id].price,
    sold: false
  }));
  const pool = Object.keys(cardRewards);
  const cards = run.rng.shuffle([...pool]).slice(0, shop.cardSlots).map((id) => ({
    kind: "card",
    id,
    price: shop.cardPrices[id],
    sold: false
  }));
  run.shop = { stock: [...items, ...cards] };
}

export function buyFromShop(run, stockIndex, removeCardId = null) {
  if (run.phase !== "shop") return { ok: false, error: "notInShop" };
  const entry = run.shop.stock[stockIndex];
  if (!entry || entry.sold) return { ok: false, error: "invalidStock" };
  if (run.gold < entry.price) return { ok: false, error: "notEnoughGold" };

  if (entry.kind === "card") {
    const added = addCardToDeck(run, entry.id, removeCardId);
    if (!added.ok) return added;
  } else {
    addItem(run, entry.id);
  }
  run.gold -= entry.price;
  entry.sold = true;
  return { ok: true, events: [emitRun(run, { type: "purchased", kind: entry.kind, id: entry.id, price: entry.price })] };
}

// action: "rest" (cura a todos), "revive" (uid caído) o "train" (uid vivo). Solo una por campamento.
export function useCamp(run, action, pokemonUid = null) {
  if (run.phase !== "camp") return { ok: false, error: "notInCamp" };
  const { camp } = run.campaign;

  if (action === "rest") {
    for (const pokemon of run.party.filter(isAlive)) {
      pokemon.hp = Math.min(pokemon.maxHp, pokemon.hp + Math.ceil(pokemon.maxHp * camp.restHealFraction));
    }
    return { ok: true, events: [emitRun(run, { type: "campRest" })] };
  }

  const pokemon = pokemonUid ? findInRoster(run, pokemonUid) : null;
  if (!pokemon) return { ok: false, error: "unknownPokemon" };
  if (action === "revive") {
    if (isAlive(pokemon)) return { ok: false, error: "noEffect" };
    pokemon.fainted = false;
    pokemon.hp = Math.max(1, Math.round(pokemon.maxHp * camp.reviveHpFraction));
    return { ok: true, events: [emitRun(run, { type: "revived", uid: pokemon.uid })] };
  }
  if (action === "train") {
    if (!isAlive(pokemon)) return { ok: false, error: "noEffect" };
    pokemon.exp += camp.trainExp;
    const events = [emitRun(run, { type: "expGained", uid: pokemon.uid, amount: camp.trainExp })];
    events.push(...evolvePokemonByExp(run, pokemon));
    return { ok: true, events };
  }
  return { ok: false, error: "unknownCampAction" };
}
