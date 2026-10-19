import { buildDeckList, createCombat, createPokemon } from "../src/engine/index.js";
import { loadGameData } from "../src/node/loadGameData.js";

export const data = loadGameData();

export function makeParty(speciesIds, rows = []) {
  return speciesIds.map((speciesId, index) =>
    createPokemon({ uid: `p${index + 1}`, speciesId, side: "player", row: rows[index] ?? "front" }, data)
  );
}

export function makeCombat({
  party = ["snivy", "tepig", "oshawott"],
  enemies = [{ speciesId: "patrat" }],
  kind = "normal",
  seed = 7,
  rows
} = {}) {
  return createCombat({
    data,
    party: makeParty(party, rows),
    enemies,
    deckCardIds: buildDeckList(data.startingDeck),
    seed,
    kind
  });
}

// Reemplaza la mano por cartas conocidas: uids t0, t1, ...
export function setHand(state, cardIds) {
  state.deck.hand = cardIds.map((cardId, index) => ({ uid: `t${index}`, cardId }));
}

// Vida enorme para tests de varios turnos sin que nadie muera por azar.
export function makeSturdy(state) {
  for (const pokemon of [...state.teams.player, ...state.teams.enemy]) {
    pokemon.maxHp = 9999;
    pokemon.hp = 9999;
  }
}
