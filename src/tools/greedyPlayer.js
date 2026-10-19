// Jugador automático ingenuo, solo para simulaciones y tests: ataca con lo mejor que pueda pagar.
import { endPlayerTurn, getLiving, getMoveCost, getMoveTargets, getTypeMultiplier, getValidTargets, playMove } from "../engine/index.js";

function pickPayCardUids(state, cost) {
  if (cost === 0) return [];
  const { cards } = state.data;
  const payable = state.deck.hand
    .filter((card) => cards[card.cardId].playModes.includes("pay"))
    .sort(
      (a, b) =>
        cards[a.cardId].energyValue - cards[b.cardId].energyValue ||
        cards[a.cardId].boostMultiplier - cards[b.cardId].boostMultiplier
    );

  const chosen = [];
  let energy = 0;
  for (const card of payable) {
    if (energy >= cost) break;
    chosen.push(card.uid);
    energy += cards[card.cardId].energyValue;
  }
  return energy >= cost ? chosen : null;
}

function listOptions(state, pokemon) {
  const { moves, typeChart } = state.data;
  const options = [];
  pokemon.moves.forEach((moveId, moveIndex) => {
    const move = moves[moveId];
    if (move.power <= 0 || pokemon.cooldowns[moveIndex] > 0) return;
    for (const target of getValidTargets(state, pokemon, move)) {
      const typeMultiplier = getTypeMultiplier(typeChart, move.type, target.types);
      const hits = getMoveTargets(state, pokemon, move, target);
      const score = hits.reduce((total, defender) => total + move.power * getTypeMultiplier(typeChart, move.type, defender.types) * (hits.length > 1 ? move.spreadMultiplier ?? 0.72 : 1), 0);
      options.push({ moveIndex, move, target, score: score - target.hp / 100 });
    }
  });
  return options.sort((a, b) => b.score - a.score);
}

export function playGreedyTurn(state) {
  let progressed = true;
  while (progressed && state.phase === "player") {
    progressed = false;
    for (const pokemon of getLiving(state, "player")) {
      if (pokemon.actionsLeft <= 0) continue;
      for (const option of listOptions(state, pokemon)) {
        const payCardUids = pickPayCardUids(state, getMoveCost(state, pokemon, option.move));
        if (!payCardUids) continue;
        const result = playMove(state, {
          pokemonUid: pokemon.uid,
          moveIndex: option.moveIndex,
          targetUid: option.target.uid,
          payCardUids
        });
        if (result.ok) progressed = true;
        break;
      }
      if (state.phase !== "player") return;
    }
  }
  if (state.phase === "player") endPlayerTurn(state);
}
