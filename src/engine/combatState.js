import { drawCards } from "./deck.js";
import { expMultiplier } from "./heldItems.js";
import { isAlive } from "./pokemon.js";
import { calculatePartyExpReward, grantExp } from "./progression.js";

export function getOpponentSide(side) {
  return side === "player" ? "enemy" : "player";
}

export function getTeam(state, side) {
  return state.teams[side];
}

export function getLiving(state, side) {
  return state.teams[side].filter(isAlive);
}

export function findPokemon(state, uid) {
  return [...state.teams.player, ...state.teams.enemy].find((pokemon) => pokemon.uid === uid) ?? null;
}

// Todo lo que pasa en combate queda en state.log para que la vista lo anime.
export function emit(state, event) {
  state.log.push({ turn: state.turn, ...event });
}

export function drawForPlayer(state, count) {
  const drawn = drawCards(state.deck, count, state.rng, state.data.balance.hand.maxSize);
  emit(state, { type: "cardsDrawn", count: drawn.length, cardUids: drawn.map((card) => card.uid) });
  return drawn;
}

// Cierra el combate si un bando quedó sin Pokémon. Reparte EXP una sola vez al ganar.
export function checkCombatEnd(state) {
  if (state.result) return state.result;

  if (getLiving(state, "enemy").length === 0) {
    state.result = "victory";
  } else if (getLiving(state, "player").length === 0) {
    state.result = "defeat";
  }
  if (!state.result) return null;

  state.phase = "ended";
  if (state.result === "victory") {
    const living = getLiving(state, "player");
    const amount = calculatePartyExpReward(getTeam(state, "enemy"), state.data, living.length);
    const recipients = living.filter((pokemon) => grantExp(pokemon, Math.round(amount * expMultiplier(state.data.heldItems, pokemon))) > 0);
    emit(state, { type: "expAwarded", amount, recipients: recipients.map((pokemon) => pokemon.uid) });
  }
  emit(state, { type: "combatEnded", result: state.result });
  return state.result;
}
