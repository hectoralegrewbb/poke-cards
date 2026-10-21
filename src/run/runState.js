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
  if (run.party.length < run.data.balance.party.maxSize) {
    run.party.push(pokemon);
    return "party";
  }
  run.box.push(pokemon);
  return "box";
}

// Eventos opcionales (rival, grupo villano, legendario): si el jugador pierde, el equipo vuelve a como estaba.
const optionalEventTypes = new Set(["rival", "villain", "legendary"]);
export const isOptionalEvent = (node) => optionalEventTypes.has(node?.type);

export function snapshotParty(run) {
  return run.party.map(({ uid, hp, fainted, status }) => ({ uid, hp, fainted, status }));
}

export function restoreParty(run, snapshot) {
  if (!snapshot) {
    // Guardados anteriores a v0.8 no tienen copia: todos vuelven en pie con la mitad de sus PS.
    for (const pokemon of run.party) Object.assign(pokemon, { hp: Math.max(pokemon.hp, Math.ceil(pokemon.maxHp / 2)), fainted: false, shield: 0, intent: null, staggered: false });
    return;
  }
  for (const saved of snapshot) {
    const pokemon = run.party.find((member) => member.uid === saved.uid);
    if (pokemon) Object.assign(pokemon, { hp: saved.hp, fainted: saved.fainted, status: saved.status, shield: 0, intent: null, staggered: false });
  }
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
  [run.party[partyIndex], run.box[boxIndex]] = [run.box[boxIndex], run.party[partyIndex]];
  return { ok: true };
}
