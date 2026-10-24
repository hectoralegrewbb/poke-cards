import assert from "node:assert/strict";
import test from "node:test";
import { choosePayCards, splitCharge } from "../src/engine/index.js";
import { createRun, restoreRun, serializeRun } from "../src/run/index.js";
import { loadGameData } from "../src/node/loadGameData.js";
import { playSmartRun } from "../src/tools/smartRunBot.js";
import { playSmartTurn } from "../src/tools/smartPlayer.js";
import { data, makeCombat } from "./helpers.js";

const card = (uid, cardId) => ({ uid, cardId });
const starters = data.region.start.starterChoices.flatMap((group) => group.species);

test("choosePayCards paga con lo mínimo y guarda las cartas fuertes", () => {
  const hand = [card("a", "wildcard"), card("b", "energyBasic"), card("c", "energyDouble")];
  const { pay, energy } = choosePayCards(data.cards, hand, 1);
  assert.equal(energy >= 1, true);
  assert.deepEqual(pay.map((entry) => entry.uid), ["b"]);
});

test("choosePayCards informa energía insuficiente sin inventar cartas", () => {
  const { pay, energy } = choosePayCards(data.cards, [card("a", "energyBasic")], 5);
  assert.equal(pay.length, 1);
  assert.ok(energy < 5);
});

test("splitCharge no gasta el comodín en pagar si puede reforzar", () => {
  const hand = [card("a", "energyBasic"), card("b", "energyBasic"), card("c", "wildcard")];
  const { pay, boost } = splitCharge(data.cards, hand, { cost: 2, power: 7, maxBoostCards: 3 });
  assert.deepEqual(pay.map((entry) => entry.uid).sort(), ["a", "b"]);
  assert.deepEqual(boost.map((entry) => entry.uid), ["c"]);
});

test("splitCharge no refuerza movimientos sin poder", () => {
  const hand = [card("a", "energyBasic"), card("b", "energyBasic")];
  const { boost } = splitCharge(data.cards, hand, { cost: 1, power: 0, maxBoostCards: 3 });
  assert.equal(boost.length, 0);
});

test("splitCharge: una técnica libre no gasta ni refuerza con cartas cargadas", () => {
  const hand = [card("a", "energyBasic"), card("b", "wildcard")];
  const { pay, boost } = splitCharge(data.cards, hand, { cost: 0, power: 7, maxBoostCards: 3 });
  assert.equal(pay.length, 0);
  assert.equal(boost.length, 0);
});

test("crear una corrida no altera el catálogo: misma semilla, misma campaña", () => {
  const shared = loadGameData();
  const snapshot = JSON.stringify(shared.campaigns);
  const signatures = [];
  for (let repeat = 0; repeat < 3; repeat += 1) {
    const run = createRun({ data: shared, seed: 11, mode: repeat === 1 ? "global" : "regional" });
    if (repeat !== 1) signatures.push(JSON.stringify(run.campaign.legendaries) + JSON.stringify(run.campaign.league));
  }
  assert.equal(JSON.stringify(shared.campaigns), snapshot);
  assert.equal(signatures[0], signatures[1]);
});

test("misma semilla con datos compartidos produce corridas idénticas", () => {
  const shared = loadGameData();
  const outcome = (seed) => {
    const run = createRun({ data: shared, seed, starterIds: [starters[seed % starters.length]] });
    playSmartRun(run);
    return JSON.stringify([run.result, run.badges, run.gold, run.step]);
  };
  for (const seed of [3, 4, 5]) assert.equal(outcome(seed), outcome(seed));
});

test("los gimnasios escalan en tamaño: 2, 3, 3, 3, 4…", () => {
  for (const mode of ["regional", "global"]) {
    const run = createRun({ data, seed: 5, mode });
    run.campaign.stages.forEach((stage, index) => {
      assert.equal(stage.gym.enemies.length, index === 0 ? 2 : index < 4 ? 3 : 4);
    });
  }
});

test("la Liga trae equipos de 5 y el campeón de 6, con as al final", () => {
  for (let seed = 1; seed <= 10; seed += 1) {
    const { league } = createRun({ data, seed, mode: seed % 2 ? "global" : "regional" }).campaign;
    for (const member of league.eliteFour) assert.equal(member.enemies.length, 5);
    assert.equal(league.champion.enemies.length, 6);
    const ids = league.champion.enemies.map((enemy) => enemy.speciesId);
    assert.equal(new Set(ids).size, ids.length, "sin especies repetidas en el campeón");
  }
});

test("el bot razonable termina corridas con invariantes sanos", () => {
  for (let seed = 1; seed <= 8; seed += 1) {
    const run = createRun({ data, seed, starterIds: [starters[seed % starters.length]] });
    playSmartRun(run);
    assert.equal(run.phase, "ended", `seed ${seed} no terminó`);
    assert.ok(["victory", "defeat"].includes(run.result));
    for (const pokemon of run.party) {
      assert.ok(pokemon.hp >= 0 && pokemon.hp <= pokemon.maxHp);
    }
    assert.ok(run.gold >= 0);
    assert.ok(run.deckCardIds.length <= data.balance.deck.maxSize);
  }
});

test("guardar y restaurar a mitad de combate no cambia el desenlace", () => {
  const finish = (state) => {
    for (let guard = 0; guard < 80 && !state.result; guard += 1) playSmartTurn(state);
    return JSON.stringify([state.result, state.turn, state.teams.player.map((pokemon) => pokemon.hp)]);
  };
  for (const seed of [2, 7, 13]) {
    const run = createRun({ data, seed });
    run.phase = "combat";
    run.combat = makeCombat({ seed, enemies: [{ speciesId: "gigalith" }, { speciesId: "pidove", row: "back" }] });
    run.combat.teams.player = run.party;
    // Un turno completo antes de guardar.
    playSmartTurn(run.combat);
    const restored = restoreRun(data, serializeRun(run));
    assert.equal(finish(run.combat), finish(restored.combat), `seed ${seed} divergió tras restaurar`);
  }
});
