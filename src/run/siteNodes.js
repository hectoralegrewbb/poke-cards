// Nodos sin combate: campamento y tienda.
import { isAlive } from "../engine/index.js";
import { addCardToCollection } from "./deckManager.js";
import { grantHeldItem, pickShopHeldItems } from "./heldItems.js";
import { addItem, emitRun, findInRoster } from "./runState.js";
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
  const held = pickShopHeldItems(run, run.data.balance.heldDrops?.shopSlots ?? 0).map((id) => ({ kind: "held", id, price: run.data.heldItems[id].price, sold: false }));
  run.shop = { stock: [...items, ...cards, ...held] };
}

export function buyFromShop(run, stockIndex) {
  if (run.phase !== "shop") return { ok: false, error: "notInShop" };
  const entry = run.shop.stock[stockIndex];
  if (!entry || entry.sold) return { ok: false, error: "invalidStock" };
  if (run.gold < entry.price) return { ok: false, error: "notEnoughGold" };

  let placedIn = null;
  if (entry.kind === "held") {
    const granted = grantHeldItem(run, entry.id);
    if (!granted.ok) return granted;
  } else if (entry.kind === "card") {
    const added = addCardToCollection(run, entry.id);
    if (!added.ok) return added;
    placedIn = added.to;
  } else {
    addItem(run, entry.id);
  }
  run.gold -= entry.price;
  entry.sold = true;
  return { ok: true, events: [emitRun(run, { type: "purchased", kind: entry.kind, id: entry.id, price: entry.price, to: placedIn })] };
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

// Centro Pokémon: cura y revive a todo el equipo (party y caja) y quita los estados. Sin costo ni elección.
export function usePokeCenter(run) {
  let healed = 0;
  let revived = 0;
  for (const pokemon of [...run.party, ...run.box]) {
    if (!isAlive(pokemon)) revived += 1;
    else if (pokemon.hp < pokemon.maxHp || pokemon.status) healed += 1;
    Object.assign(pokemon, { hp: pokemon.maxHp, fainted: false, status: null, shield: 0, staggered: false, intent: null });
  }
  return { ok: true, events: [emitRun(run, { type: "centerHealed", healed, revived })] };
}
