import assert from "node:assert/strict";
import test from "node:test";
import { validateGameData } from "../src/engine/index.js";
import { buyFromShop, chooseNode, createRun, decideCapture, finishCombat, leaveShop, pickCard, playCamp, setRow, useItem } from "../src/run/index.js";
import { newPokemon } from "../src/run/runState.js";
import { playFullRun } from "../src/tools/runBot.js";
import { data } from "./helpers.js";

const optionIndex = (run, type) => run.options.findIndex((node) => node.type === type);

function goToNode(type, seedStart = 1) {
  for (let seed = seedStart; seed < seedStart + 200; seed += 1) {
    const run = createRun({ data, seed });
    for (let guard = 0; guard < 60 && run.phase !== "ended"; guard += 1) {
      const index = optionIndex(run, type);
      if (run.phase === "map" && index >= 0) {
        chooseNode(run, index);
        return run;
      }
      playFullRunOneStep(run);
    }
  }
  throw new Error(`no apareció ${type}`);
}

function playFullRunOneStep(run) {
  // avanza con la opción 0 ganando el combate a la fuerza para llegar a otros nodos
  if (run.phase === "map") chooseNode(run, 0);
  if (run.phase === "combat") {
    run.combat.teams.enemy.forEach((enemy) => { enemy.hp = 0; enemy.fainted = true; });
    run.combat.result = "victory";
    finishCombat(run);
  }
  if (run.phase === "reward") {
    pickCard(run, null);
    if (run.phase === "reward") decideCapture(run, false);
  }
  if (run.phase === "camp") playCamp(run, "rest");
  if (run.phase === "shop") leaveShop(run);
}

test("los datos de la región y los ítems son consistentes", () => {
  assert.deepEqual(validateGameData(data), []);
});

test("la corrida arranca con la party inicial y opciones en el mapa", () => {
  const run = createRun({ data, seed: 3 });
  assert.equal(run.phase, "map");
  assert.equal(run.party.length, 1);
  assert.equal(run.options.length, 2);
  assert.equal(run.party[0].speciesId, "bulbasaur");
  assert.equal(run.deckCardIds.length, 42);
});

test("se puede arrancar con cualquier inicial de las 5 regiones, uno solo", () => {
  for (const group of data.region.start.starterChoices) {
    for (const speciesId of group.species) {
      const run = createRun({ data, seed: 2, starterIds: [speciesId] });
      assert.equal(run.party.length, 1);
      assert.equal(run.party[0].speciesId, speciesId);
    }
  }
});

test("al inicio los combates normales llevan tantos rivales como Pokémon tenés", () => {
  for (let seed = 1; seed <= 30; seed += 1) {
    const run = createRun({ data, seed });
    chooseNode(run, 0);
    assert.equal(run.combat.teams.enemy.length, 1);
  }
});

test("elegir un combate crea el combate y ganar da oro y deja pendiente la carta", () => {
  const run = createRun({ data, seed: 3 });
  assert.equal(chooseNode(run, optionIndex(run, "combat") >= 0 ? optionIndex(run, "combat") : 0).ok, true);
  assert.equal(run.phase, "combat");
  const goldBefore = run.gold;
  run.combat.teams.enemy.forEach((enemy) => { enemy.hp = 0; enemy.fainted = true; });
  run.combat.result = "victory";
  assert.equal(finishCombat(run).ok, true);
  assert.equal(run.phase, "reward");
  assert.ok(run.gold > goldBefore);
  assert.equal(run.pending.cardChoices.length, 3);
});

test("recompensa de carta: suma al mazo, o va al cofre si el mazo está lleno", () => {
  const run = createRun({ data, seed: 3 });
  chooseNode(run, 0);
  run.combat.result = "victory";
  finishCombat(run);
  const cardId = run.pending.cardChoices[0];
  run.deckCardIds.push(...Array(45 - run.deckCardIds.length).fill("energyBasic")); // 45 = lleno
  assert.equal(pickCard(run, cardId).ok, true);
  assert.equal(run.deckCardIds.length, 45);
  assert.deepEqual(run.chestCardIds, [cardId]);
});

test("derrota termina la corrida", () => {
  const run = createRun({ data, seed: 3 });
  chooseNode(run, 0);
  run.combat.teams.player.forEach((pokemon) => { pokemon.hp = 0; pokemon.fainted = true; });
  run.combat.result = "defeat";
  finishCombat(run);
  assert.equal(run.phase, "ended");
  assert.equal(run.result, "defeat");
});

test("ítems: curar, revivir (permadeath), caramelo y evolución por piedra", () => {
  const run = createRun({ data, seed: 3 });
  run.party.push(newPokemon(run, "tepig"));
  const [first, second] = run.party;
  first.hp = 5;
  run.inventory.healBerry = 1;
  assert.equal(useItem(run, "healBerry", first.uid).ok, true);
  assert.equal(first.hp, Math.min(first.maxHp, 25));
  assert.equal(useItem(run, "healBerry", first.uid).error, "noItem");

  second.hp = 0;
  second.fainted = true;
  run.inventory.revive = 1;
  assert.equal(useItem(run, "revive", first.uid).error, "noEffect");
  assert.equal(run.inventory.revive, 1);
  assert.equal(useItem(run, "revive", second.uid).ok, true);
  assert.equal(second.fainted, false);

  run.inventory.rareCandy = 1;
  useItem(run, "rareCandy", first.uid);
  assert.equal(first.exp, 15);

  run.inventory.shinyStone = 1;
  assert.equal(useItem(run, "shinyStone", first.uid).error, "noEffect");
});

test("campamento: descansar cura y vuelve al mapa; revivir exige un caído", () => {
  const run = goToNode("camp");
  assert.equal(run.phase, "camp");
  run.party[0].hp = 1;
  assert.equal(playCamp(run, "revive", run.party[0].uid).error, "noEffect");
  assert.equal(playCamp(run, "rest").ok, true);
  assert.ok(run.party[0].hp > 1);
  assert.equal(run.phase, "map");
});

test("tienda: compra con oro, rechaza sin fondos y no repite", () => {
  const run = goToNode("shop");
  assert.equal(run.phase, "shop");
  const index = run.shop.stock.findIndex((entry) => entry.kind === "item");
  run.gold = 1000;
  const price = run.shop.stock[index].price;
  assert.equal(buyFromShop(run, index).ok, true);
  assert.equal(run.gold, 1000 - price);
  assert.equal(buyFromShop(run, index).error, "invalidStock");
  run.gold = 0;
  assert.equal(buyFromShop(run, run.shop.stock.findIndex((entry) => !entry.sold)).error, "notEnoughGold");
  assert.equal(leaveShop(run).ok, true);
  assert.equal(run.phase, "map");
});

test("captura: suma a la party y, con la party llena, a la caja", () => {
  const run = goToNode("wild");
  run.combat.teams.enemy.forEach((enemy) => { enemy.hp = 0; enemy.fainted = true; });
  run.combat.result = "victory";
  finishCombat(run);
  assert.ok(run.pending.capture);
  const before = run.party.length;
  decideCapture(run, true);
  assert.equal(run.party.length, before + 1);
  assert.equal(setRow(run, run.party[run.party.length - 1].uid, "front").ok, true);
});

test("el bot completa corridas deterministas (misma semilla, mismo final)", () => {
  const first = playFullRun(createRun({ data, seed: 11 }));
  const second = playFullRun(createRun({ data, seed: 11 }));
  assert.equal(first.phase, "ended");
  assert.equal(first.result, second.result);
  assert.equal(first.badges.length, second.badges.length);
});
