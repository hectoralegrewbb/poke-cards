// Cartas como instancias { uid, cardId }. El mazo vive en { drawPile, hand, discardPile }.

export function buildDeckList(cardCounts) {
  return Object.entries(cardCounts).flatMap(([cardId, count]) =>
    Array.from({ length: count }, () => cardId)
  );
}

export function createDeck(cardIds, rng) {
  const drawPile = cardIds.map((cardId, index) => ({ uid: `c${index}`, cardId }));
  rng.shuffle(drawPile);
  return { drawPile, hand: [], discardPile: [], nextUid: cardIds.length };
}

// Crea una carta nueva (no del mazo inicial) directamente en la mano, respetando el máximo.
export function addCardToHand(deck, cardId, maxHandSize) {
  if (deck.hand.length >= maxHandSize) return null;
  const card = { uid: `c${deck.nextUid}`, cardId };
  deck.nextUid += 1;
  deck.hand.push(card);
  return card;
}

// Roba hasta `count` cartas sin pasar de maxHandSize. Rebaraja el descarte si se acaba el mazo.
export function drawCards(deck, count, rng, maxHandSize) {
  const drawn = [];
  while (drawn.length < count && deck.hand.length < maxHandSize) {
    if (deck.drawPile.length === 0) {
      if (deck.discardPile.length === 0) break;
      deck.drawPile = rng.shuffle(deck.discardPile.splice(0));
    }
    const card = deck.drawPile.pop();
    deck.hand.push(card);
    drawn.push(card);
  }
  return drawn;
}

// Devuelve las cartas en el orden pedido, o null si falta alguna o hay uids repetidos.
export function findInHand(deck, uids) {
  if (new Set(uids).size !== uids.length) return null;
  const cards = uids.map((uid) => deck.hand.find((card) => card.uid === uid));
  return cards.every(Boolean) ? cards : null;
}

export function discardFromHand(deck, uids) {
  const cards = findInHand(deck, uids);
  if (!cards) throw new Error("discardFromHand: cartas fuera de la mano");
  deck.hand = deck.hand.filter((card) => !uids.includes(card.uid));
  deck.discardPile.push(...cards);
}

// El tamaño recomendado (40-45) es una sugerencia: genera warning, no error.
export function validateDeck(cardIds, data) {
  const errors = [];
  const warnings = [];
  const unknown = [...new Set(cardIds.filter((cardId) => !Object.hasOwn(data.cards, cardId)))];
  if (unknown.length > 0) errors.push(`Cartas desconocidas: ${unknown.join(", ")}`);

  const { minSize, maxSize } = data.balance.deck;
  if (cardIds.length < minSize || cardIds.length > maxSize) {
    warnings.push(
      `Mazo de ${cardIds.length} cartas; se recomienda ${minSize}-${maxSize} para mantener estables las probabilidades de robo`
    );
  }
  return { valid: errors.length === 0, errors, warnings };
}
