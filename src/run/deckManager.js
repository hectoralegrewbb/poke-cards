// Mazo activo y cofre. Todas las cartas ganadas se guardan; solo el mazo activo (40-45 cartas) se usa en combate.
// run.deckCardIds = mazo activo, run.chestCardIds = cartas guardadas fuera del mazo.

export function deckLimits(run) {
  return run.data.balance.deck;
}

// Cartas con tope de copias en el mazo activo (p. ej. el Buscador: 2). Sin tope = sin límite.
export function copyLimit(run, cardId) {
  return run.data.cards[cardId]?.maxInDeck ?? Infinity;
}

export function overLimitCards(run) {
  const counts = countCards(run.deckCardIds);
  return Object.keys(counts).filter((id) => counts[id] > copyLimit(run, id));
}

export function deckStatus(run) {
  const { minSize, maxSize } = deckLimits(run);
  const size = run.deckCardIds.length;
  const overLimit = overLimitCards(run);
  return { size, min: minSize, max: maxSize, chestSize: run.chestCardIds.length, overLimit, valid: size >= minSize && size <= maxSize && overLimit.length === 0 };
}

export const isDeckPlayable = (run) => deckStatus(run).valid;

// Cuenta copias por carta: { cardId: cantidad }.
export function countCards(cardIds) {
  const counts = {};
  for (const id of cardIds) counts[id] = (counts[id] ?? 0) + 1;
  return counts;
}

function moveOne(from, to, cardId) {
  const index = from.indexOf(cardId);
  if (index === -1) return false;
  from.splice(index, 1);
  to.push(cardId);
  return true;
}

export function moveCardToChest(run, cardId) {
  if (run.phase === "combat") return { ok: false, error: "notDuringCombat" };
  if (!moveOne(run.deckCardIds, run.chestCardIds, cardId)) return { ok: false, error: "cardNotInDeck" };
  return { ok: true };
}

export function moveCardToDeck(run, cardId) {
  if (run.phase === "combat") return { ok: false, error: "notDuringCombat" };
  if (!run.chestCardIds.includes(cardId)) return { ok: false, error: "cardNotInChest" };
  if (run.deckCardIds.length >= deckLimits(run).maxSize) return { ok: false, error: "deckFull" };
  if (run.deckCardIds.filter((id) => id === cardId).length >= copyLimit(run, cardId)) return { ok: false, error: "copyLimit" };
  moveOne(run.chestCardIds, run.deckCardIds, cardId);
  return { ok: true };
}

// Carta nueva (recompensa o compra): entra al mazo si hay lugar y, si no, al cofre. Nunca se pierde.
export function addCardToCollection(run, cardId) {
  if (!run.data.cards[cardId]) return { ok: false, error: "unknownCard" };
  const toDeck = run.deckCardIds.length < deckLimits(run).maxSize
    && run.deckCardIds.filter((id) => id === cardId).length < copyLimit(run, cardId);
  (toDeck ? run.deckCardIds : run.chestCardIds).push(cardId);
  return { ok: true, to: toDeck ? "deck" : "chest" };
}
