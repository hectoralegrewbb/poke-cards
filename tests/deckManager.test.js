import assert from "node:assert/strict";
import test from "node:test";
import { addCardToCollection, chooseNode, createRun, deckStatus, isDeckPlayable, moveCardToChest, moveCardToDeck, restoreRun, serializeRun } from "../src/run/index.js";
import { data } from "./helpers.js";

const newRun = () => createRun({ data, seed: 4 });

test("mover cartas entre mazo y cofre respeta el máximo", () => {
  const run = newRun();
  const { max } = deckStatus(run);
  run.deckCardIds.push(...Array(max - run.deckCardIds.length).fill("energyBasic"));
  run.chestCardIds.push("wildcard");
  assert.equal(moveCardToDeck(run, "wildcard").error, "deckFull");
  assert.equal(moveCardToChest(run, "energyBasic").ok, true);
  assert.equal(moveCardToDeck(run, "wildcard").ok, true);
  assert.equal(run.deckCardIds.length, max);
  assert.equal(moveCardToChest(run, "noExiste").error, "cardNotInDeck");
  assert.equal(moveCardToDeck(run, "noExiste").error, "cardNotInChest");
});

test("el cofre acepta todo: addCardToCollection desborda al cofre", () => {
  const run = newRun();
  const { max } = deckStatus(run);
  run.deckCardIds.push(...Array(max - run.deckCardIds.length).fill("energyBasic"));
  assert.equal(addCardToCollection(run, "wildcard").to, "chest");
  assert.equal(run.chestCardIds.length, 1);
});

test("un mazo por debajo del mínimo bloquea elegir nodo (deckInvalid)", () => {
  const run = newRun();
  const { min } = deckStatus(run);
  while (run.deckCardIds.length >= min) moveCardToChest(run, run.deckCardIds[0]);
  assert.equal(isDeckPlayable(run), false);
  assert.equal(chooseNode(run, 0).error, "deckInvalid");
  while (run.deckCardIds.length < min) moveCardToDeck(run, run.chestCardIds[0]);
  assert.equal(chooseNode(run, 0).ok, true);
});

test("no se edita el mazo en combate", () => {
  const run = newRun();
  chooseNode(run, 0);
  assert.equal(moveCardToChest(run, run.deckCardIds[0]).error, "notDuringCombat");
});

test("guardados viejos sin chestCardIds cargan con cofre vacío; el cofre persiste", () => {
  const run = newRun();
  run.chestCardIds.push("wildcard");
  const again = restoreRun(data, serializeRun(run));
  assert.deepEqual(again.chestCardIds, ["wildcard"]);
  const raw = JSON.parse(serializeRun(run));
  delete raw.run.chestCardIds;
  assert.deepEqual(restoreRun(data, raw).chestCardIds, []);
});
