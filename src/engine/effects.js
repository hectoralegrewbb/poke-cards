import { drawForPlayer, emit, getLiving } from "./combatState.js";
import { addCardToHand } from "./deck.js";
import { addModifier } from "./modifiers.js";
import { isAlive } from "./pokemon.js";
import { inflictStatus } from "./status.js";

// Registro de efectos reutilizado por movimientos, cartas de utilidad y pasivas (abierto a extensión).
const handlers = new Map();

export function registerEffect(type, handler) {
  handlers.set(type, handler);
}

export function hasEffect(type) {
  return handlers.has(type);
}

function resolveTargets(state, effect, { side, source, target }) {
  switch (effect.target ?? "target") {
    case "self":
      return source ? [source] : [];
    case "allAllies":
      return getLiving(state, side);
    default:
      return target ? [target] : [];
  }
}

// context: { side, source, target }. source/target pueden ser null (p. ej. cartas de utilidad sin objetivo).
export function applyEffects(state, effects, context) {
  for (const effect of effects ?? []) {
    const handler = handlers.get(effect.type);
    if (!handler) throw new Error(`Efecto desconocido: ${effect.type}`);
    handler(state, effect, { ...context, targets: resolveTargets(state, effect, context) });
  }
}

registerEffect("heal", (state, effect, { targets }) => {
  for (const pokemon of targets) {
    if (!isAlive(pokemon)) continue;
    const healed = Math.min(effect.amount, pokemon.maxHp - pokemon.hp);
    pokemon.hp += healed;
    emit(state, { type: "healed", targetId: pokemon.uid, amount: healed });
  }
});

registerEffect("shield", (state, effect, { targets }) => {
  for (const pokemon of targets) {
    if (!isAlive(pokemon)) continue;
    pokemon.shield += effect.amount;
    emit(state, { type: "shieldGained", targetId: pokemon.uid, amount: effect.amount });
  }
});

registerEffect("reduceCooldown", (state, effect, { targets }) => {
  for (const pokemon of targets) {
    if (!isAlive(pokemon)) continue;
    pokemon.cooldowns = pokemon.cooldowns.map((remaining) => Math.max(0, remaining - effect.amount));
    emit(state, { type: "cooldownReduced", targetId: pokemon.uid, amount: effect.amount });
  }
});

// Los enemigos no usan mazo: para ellos este efecto no hace nada.
registerEffect("drawCards", (state, effect, { side }) => {
  if (side !== "player") return;
  drawForPlayer(state, effect.amount);
});

registerEffect("luckyCoin", (state, effect, { side }) => {
  if (side !== "player") return;
  state.luckyCoins += effect.amount;
  emit(state, { type: "luckyCoinGained", amount: effect.amount });
});

// Modificadores temporales del jugador. turns = cuántos turnos dura contando el actual.
function registerModifierEffect(type, kind) {
  registerEffect(type, (state, effect, { side }) => {
    if (side !== "player") return;
    addModifier(state, {
      kind,
      amount: effect.amount,
      turnsLeft: effect.turns,
      label: effect.label ?? type,
      minCost: effect.minCost,
      maxCost: effect.maxCost,
      category: effect.category
    });
  });
}
registerModifierEffect("costModifier", "cost");
registerModifierEffect("powerModifier", "power");

// Crea cartas nuevas en la mano (p. ej. "Carga" da energía). Respeta el máximo de mano.
registerEffect("addCards", (state, effect, { side }) => {
  if (side !== "player") return;
  const added = [];
  for (let i = 0; i < effect.amount; i += 1) {
    const card = addCardToHand(state.deck, effect.cardId, state.data.balance.hand.maxSize);
    if (card) added.push(card);
  }
  emit(state, { type: "cardsDrawn", count: added.length, cardUids: added.map((card) => card.uid), source: "effect" });
});

// Cura el estado mayor (veneno, quemadura, parálisis) de los objetivos que lo tengan.
registerEffect("cureStatus", (state, effect, { targets }) => {
  for (const pokemon of targets) {
    if (!isAlive(pokemon) || !pokemon.status) continue;
    const status = pokemon.status;
    pokemon.status = null;
    emit(state, { type: "statusCured", targetId: pokemon.uid, status });
  }
});

// Probabilidad independiente por objetivo alcanzado; usa el RNG serializable del combate.
registerEffect("status", (state, effect, { targets }) => {
  for (const pokemon of targets) inflictStatus(state, pokemon, effect.status, effect.chance ?? 1);
});

// Revive a un Pokémon debilitado durante el combate con una fracción de sus PS. Actúa desde el próximo turno.
registerEffect("revive", (state, effect, { targets }) => {
  for (const pokemon of targets) {
    if (isAlive(pokemon)) continue;
    pokemon.fainted = false;
    pokemon.hp = Math.min(pokemon.maxHp, Math.max(1, Math.ceil(pokemon.maxHp * (effect.hpFraction ?? 0.5))));
    pokemon.status = null;
    pokemon.shield = 0;
    pokemon.staggered = false;
    pokemon.intent = null;
    pokemon.actionsLeft = 0;
    emit(state, { type: "revivedInCombat", targetId: pokemon.uid, hp: pokemon.hp });
  }
});

// Baya Zidra: el próximo golpe letal de este combate deja al Pokémon con 1 PS.
registerEffect("berryGuard", (state, effect, { targets }) => {
  for (const pokemon of targets) {
    if (!isAlive(pokemon)) continue;
    pokemon.berryGuard = true;
    emit(state, { type: "berryReady", targetId: pokemon.uid });
  }
});

// Buscador: lleva a la mano una carta elegida del mazo (pila de robo). La elección llega en context.choice.cardUid.
registerEffect("searchDeck", (state, effect, { side, choice }) => {
  if (side !== "player") return;
  const index = state.deck.drawPile.findIndex((card) => card.uid === choice?.cardUid);
  if (index === -1) return;
  const [card] = state.deck.drawPile.splice(index, 1);
  state.deck.hand.push(card);
  emit(state, { type: "cardSearched", cardUid: card.uid, cardId: card.cardId });
});
