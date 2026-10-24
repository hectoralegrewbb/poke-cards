import { discardFromHand, findInHand } from "./deck.js";
import { checkCombatEnd, emit } from "./combatState.js";
import { applyEffects } from "./effects.js";
import { getMoveCost } from "./modifiers.js";
import { executeMove } from "./moveExecution.js";
import { isAlive } from "./pokemon.js";
import { getValidTargets } from "./targeting.js";

// Acciones del jugador. Nunca lanzan: devuelven { ok: true, events } o { ok: false, error }.

const fail = (error) => ({ ok: false, error });
const sum = (values) => values.reduce((total, value) => total + value, 0);
const isPlayerTurn = (state) => state.phase === "player" && !state.result;

function findLivingAlly(state, uid) {
  return state.teams.player.find((pokemon) => pokemon.uid === uid && isAlive(pokemon)) ?? null;
}

// Un Pokémon actúa una vez por turno. Las cartas en payCardUids pagan el costo;
// las de boostCardUids suman poder al ataque (boostMultiplier x attackBoostPerCard cada una).
export function playMove(state, { pokemonUid, moveIndex, targetUid, payCardUids = [], boostCardUids = [] }) {
  if (!isPlayerTurn(state)) return fail("notPlayerTurn");

  const actor = state.teams.player.find((pokemon) => pokemon.uid === pokemonUid);
  if (!actor) return fail("unknownPokemon");
  if (!isAlive(actor)) return fail("pokemonFainted");
  if (actor.actionsLeft <= 0) return fail("noActionsLeft");

  const moveId = actor.moves[moveIndex];
  if (!moveId) return fail("invalidMoveIndex");
  if (actor.cooldowns[moveIndex] > 0) return fail("moveOnCooldown");

  const { cards: cardDefs, moves, balance } = state.data;
  const move = moves[moveId];
  const target = getValidTargets(state, actor, move).find((pokemon) => pokemon.uid === targetUid);
  if (!target) return fail("invalidTarget");

  const handCards = findInHand(state.deck, [...payCardUids, ...boostCardUids]);
  if (!handCards) return fail("cardsNotInHand");
  const payCards = handCards.slice(0, payCardUids.length);
  const boostCards = handCards.slice(payCardUids.length);

  if (!payCards.every((card) => cardDefs[card.cardId].playModes.includes("pay"))) return fail("cardNotAllowed");
  if (!boostCards.every((card) => cardDefs[card.cardId].playModes.includes("boostAttack"))) {
    return fail("cardNotAllowed");
  }
  if (boostCards.length > balance.combat.maxBoostCardsPerAttack) return fail("tooManyBoostCards");
  if (boostCards.length > 0 && move.power <= 0) return fail("boostNotApplicable");
  if (sum(payCards.map((card) => cardDefs[card.cardId].energyValue)) < getMoveCost(state, actor, move)) {
    return fail("insufficientEnergy");
  }

  const startIndex = state.log.length;
  discardFromHand(state.deck, [...payCardUids, ...boostCardUids]);
  actor.actionsLeft -= 1;
  const boostPower =
    sum(boostCards.map((card) => cardDefs[card.cardId].boostMultiplier)) * balance.combat.attackBoostPerCard;

  executeMove(state, actor, moveIndex, target, { boostPower });
  checkCombatEnd(state);
  return { ok: true, events: state.log.slice(startIndex) };
}

// Cartas de energía como defensa: suman escudo a un aliado hasta el inicio del próximo turno propio.
// No consume la acción del Pokémon, solo las cartas.
export function playShield(state, { targetUid, cardUids }) {
  if (!isPlayerTurn(state)) return fail("notPlayerTurn");
  const target = findLivingAlly(state, targetUid);
  if (!target) return fail("invalidTarget");
  if (cardUids.length === 0) return fail("cardsNotInHand");

  const cards = findInHand(state.deck, cardUids);
  if (!cards) return fail("cardsNotInHand");
  const { cards: cardDefs, balance } = state.data;
  if (!cards.every((card) => cardDefs[card.cardId].playModes.includes("boostDefense"))) {
    return fail("cardNotAllowed");
  }

  const startIndex = state.log.length;
  const amount =
    sum(cards.map((card) => cardDefs[card.cardId].boostMultiplier)) * balance.combat.defenseBoostPerCard;
  discardFromHand(state.deck, cardUids);
  target.shield += amount;
  emit(state, { type: "shieldGained", targetId: target.uid, amount, source: "cards" });
  return { ok: true, events: state.log.slice(startIndex) };
}

// Cartas de utilidad (robar, curar, revivir, buscar en el mazo, bayas, etc.).
// target: "ally" (aliado en pie), "fallenAlly" (aliado debilitado), "drawPile" (searchCardUid de la pila de robo) o ninguno.
export function playUtility(state, { cardUid, targetUid, searchCardUid = null }) {
  if (!isPlayerTurn(state)) return fail("notPlayerTurn");

  const cards = findInHand(state.deck, [cardUid]);
  if (!cards) return fail("cardsNotInHand");
  const [card] = cards;
  const cardDef = state.data.cards[card.cardId];
  if (!cardDef.playModes.includes("utility")) return fail("cardNotAllowed");

  let target = null;
  if (cardDef.target === "ally") {
    target = findLivingAlly(state, targetUid);
    if (!target) return fail("invalidTarget");
  } else if (cardDef.target === "fallenAlly") {
    target = state.teams.player.find((pokemon) => pokemon.uid === targetUid && !isAlive(pokemon)) ?? null;
    if (!target) return fail("invalidTarget");
  } else if (cardDef.target === "drawPile") {
    if (state.deck.drawPile.length === 0) return fail("emptyDrawPile");
    if (!state.deck.drawPile.some((entry) => entry.uid === searchCardUid)) return fail("invalidSearchTarget");
  }

  const startIndex = state.log.length;
  discardFromHand(state.deck, [cardUid]);
  emit(state, { type: "cardPlayed", cardId: card.cardId, targetId: target?.uid ?? null });
  applyEffects(state, cardDef.effects, { side: "player", source: null, target, choice: { cardUid: searchCardUid } });
  return { ok: true, events: state.log.slice(startIndex) };
}

// Elige qué cartas de energía pagan un costo gastando lo menos valioso: primero la que cubre lo que falta
// con el menor desperdicio y el menor refuerzo; así Comodines y cartas de refuerzo alto quedan para potenciar.
// Devuelve { pay, energy }; si las cartas no alcanzan, energy < cost y pay contiene todo lo que podía pagar.
export function choosePayCards(cardDefs, cards, cost) {
  let pool = cards.filter((card) => cardDefs[card.cardId].playModes.includes("pay"));
  const pay = [];
  let energy = 0;
  const byWaste = (a, b) => cardDefs[a.cardId].energyValue - cardDefs[b.cardId].energyValue || cardDefs[a.cardId].boostMultiplier - cardDefs[b.cardId].boostMultiplier;
  while (energy < cost && pool.length > 0) {
    const remaining = cost - energy;
    const pick = pool.filter((card) => cardDefs[card.cardId].energyValue >= remaining).sort(byWaste)[0]
      ?? [...pool].sort((a, b) => cardDefs[b.cardId].energyValue - cardDefs[a.cardId].energyValue || cardDefs[a.cardId].boostMultiplier - cardDefs[b.cardId].boostMultiplier)[0];
    pay.push(pick);
    pool = pool.filter((card) => card !== pick);
    energy += cardDefs[pick.cardId].energyValue;
  }
  return { pay, energy };
}

// Reparte las cartas cargadas en un Pokémon entre "pagan" y "refuerzan" (solo si la técnica daña).
// Una técnica LIBRE (costo 0) no gasta ni refuerza con las cartas cargadas: quedan en la mano.
export function splitCharge(cardDefs, cards, { cost, power, maxBoostCards }) {
  const { pay, energy } = choosePayCards(cardDefs, cards, cost);
  const rest = cards.filter((card) => !pay.includes(card));
  const boost = power > 0 && cost > 0
    ? rest.filter((card) => cardDefs[card.cardId].playModes.includes("boostAttack"))
        .sort((a, b) => cardDefs[b.cardId].boostMultiplier - cardDefs[a.cardId].boostMultiplier)
        .slice(0, maxBoostCards)
    : [];
  return { pay, boost, energy };
}
