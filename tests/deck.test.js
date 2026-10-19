import assert from "node:assert/strict";
import test from "node:test";
import { buildDeckList, createDeck, createRng, discardFromHand, drawCards, findInHand, validateDeck } from "../src/engine/index.js";
import { data } from "./helpers.js";

test("buildDeckList expande el conteo y el mazo inicial cumple 40-45", () => {
  const list = buildDeckList(data.startingDeck);
  assert.ok(list.length >= data.balance.deck.minSize && list.length <= data.balance.deck.maxSize);
  const report = validateDeck(list, data);
  assert.equal(report.valid, true);
  assert.deepEqual(report.warnings, []);
});

test("validateDeck: tamaño fuera de rango es warning; carta desconocida es error", () => {
  const short = buildDeckList({ energyBasic: 20 });
  assert.equal(validateDeck(short, data).valid, true);
  assert.equal(validateDeck(short, data).warnings.length, 1);
  assert.equal(validateDeck(["noExiste"], data).valid, false);
});

test("drawCards respeta el tamaño máximo de mano", () => {
  const rng = createRng(1);
  const deck = createDeck(buildDeckList(data.startingDeck), rng);
  const drawn = drawCards(deck, 20, rng, 10);
  assert.equal(drawn.length, 10);
  assert.equal(deck.hand.length, 10);
});

test("rebaraja el descarte cuando se acaba el mazo", () => {
  const rng = createRng(3);
  const deck = createDeck(["a", "b", "c"], rng);
  drawCards(deck, 3, rng, 10);
  assert.equal(deck.drawPile.length, 0);

  discardFromHand(deck, deck.hand.map((card) => card.uid));
  assert.equal(deck.hand.length, 0);
  assert.equal(deck.discardPile.length, 3);

  const drawn = drawCards(deck, 2, rng, 10);
  assert.equal(drawn.length, 2);
  assert.equal(deck.discardPile.length, 0);
  assert.equal(deck.drawPile.length, 1);
});

test("findInHand rechaza cartas ajenas o repetidas", () => {
  const rng = createRng(1);
  const deck = createDeck(["a", "b"], rng);
  drawCards(deck, 2, rng, 10);
  const [first] = deck.hand;
  assert.equal(findInHand(deck, [first.uid, first.uid]), null);
  assert.equal(findInHand(deck, ["zzz"]), null);
  assert.equal(findInHand(deck, [first.uid]).length, 1);
});
