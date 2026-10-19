// Estado de la corrida y operaciones básicas sobre party, caja, inventario y mazo. Sin reglas de nodos.
import { createPokemon } from "../engine/index.js";

export function emitRun(run, event) {
  const full = { ...event };
  run.log.push(full);
  return full;
}

export function newPokemon(run, speciesId, row) {
  const uid = `r${run.nextUid}`;
  run.nextUid += 1;
  return createPokemon({ uid, speciesId, side: "player", row: row ?? (run.party.length < 3 ? "front" : "back") }, run.data);
}

// Entra a la party si hay lugar; si no, va a la caja. Devuelve dónde quedó.
export function addToRoster(run, pokemon) {
  const legendaryActive = run.party.some((member) => run.data.species[member.speciesId]?.legendary);
  if (run.party.length < run.data.balance.party.maxSize && !(run.data.species[pokemon.speciesId]?.legendary && legendaryActive)) {
    run.party.push(pokemon);
    return "party";
  }
  run.box.push(pokemon);
  return "box";
}

export function findInRoster(run, uid) {
  return [...run.party, ...run.box].find((pokemon) => pokemon.uid === uid) ?? null;
}

export function addItem(run, itemId, amount = 1) {
  run.inventory[itemId] = (run.inventory[itemId] ?? 0) + amount;
}

export function removeItem(run, itemId) {
  if ((run.inventory[itemId] ?? 0) <= 0) return false;
  run.inventory[itemId] -= 1;
  if (run.inventory[itemId] === 0) delete run.inventory[itemId];
  return true;
}

// Con el mazo lleno (balance.deck.maxSize) hay que descartar una carta para sumar otra.
export function addCardToDeck(run, cardId, removeCardId = null) {
  if (!run.data.cards[cardId]) return { ok: false, error: "unknownCard" };
  const full = run.deckCardIds.length >= run.data.balance.deck.maxSize;
  if (full) {
    const index = removeCardId === null ? -1 : run.deckCardIds.indexOf(removeCardId);
    if (index === -1) return { ok: false, error: "deckFull" };
    run.deckCardIds.splice(index, 1);
  }
  run.deckCardIds.push(cardId);
  return { ok: true };
}

export function setRow(run, uid, row) {
  const pokemon = run.party.find((member) => member.uid === uid);
  if (!pokemon) return { ok: false, error: "unknownPokemon" };
  if (!["front", "back"].includes(row)) return { ok: false, error: "invalidRow" };
  pokemon.row = row;
  return { ok: true };
}

export function swapPartyBox(run, partyUid, boxUid) {
  const partyIndex = run.party.findIndex((member) => member.uid === partyUid);
  const boxIndex = run.box.findIndex((member) => member.uid === boxUid);
  if (partyIndex === -1 || boxIndex === -1) return { ok: false, error: "unknownPokemon" };
  if (run.data.species[run.box[boxIndex].speciesId]?.legendary &&
      run.party.some((member, index) => index !== partyIndex && run.data.species[member.speciesId]?.legendary)) {
    return { ok: false, error: "legendaryLimit" };
  }
  [run.party[partyIndex], run.box[boxIndex]] = [run.box[boxIndex], run.party[partyIndex]];
  return { ok: true };
}
