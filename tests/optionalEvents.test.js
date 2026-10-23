import assert from "node:assert/strict";
import test from "node:test";
import { chooseNode, createRun, finishCombat, restoreRun, serializeRun } from "../src/run/index.js";
import { data } from "./helpers.js";

function runAt(nodeType, badges = 0) {
  const run = createRun({ data, seed: 4 });
  run.badges = Array.from({ length: badges }, (_, index) => `m${index}`);
  run.options = [nodeType === "legendary" ? { type: "legendary", speciesId: run.campaign.legendaries[0] } : { type: nodeType }];
  return run;
}

function loseCombat(run) {
  for (const pokemon of run.party) { pokemon.hp = 0; pokemon.fainted = true; }
  run.combat.result = "defeat";
  return finishCombat(run);
}

for (const type of ["rival", "villain"]) {
  test(`perder contra ${type} no termina la corrida y devuelve el equipo como estaba`, () => {
    const run = runAt(type);
    run.party[0].hp = Math.max(1, run.party[0].maxHp - 3);
    const before = { hp: run.party[0].hp, status: run.party[0].status };
    const gold = run.gold;
    const deck = [...run.deckCardIds];
    chooseNode(run, 0);
    assert.equal(run.phase, "combat");
    const result = loseCombat(run);
    assert.equal(run.phase, "map");
    assert.equal(run.result, null);
    assert.ok(result.events.some((event) => event.type === "eventFailed"));
    assert.equal(run.party[0].hp, before.hp);
    assert.equal(run.party[0].fainted, false);
    assert.equal(run.gold, gold);
    assert.deepEqual(run.deckCardIds, deck);
    assert.equal(run.step, 0, "no consume el paso");
  });
}

test("perder contra el legendario no termina la corrida y el legendario huye", () => {
  const run = runAt("legendary", 3);
  chooseNode(run, 0);
  loseCombat(run);
  assert.equal(run.phase, "map");
  assert.ok(run.completedLegendaryMilestones.includes(3));
  assert.ok(!run.options.some((option) => option.type === "legendary" && option.milestone), "el legendario de hito no se vuelve a ofrecer en bucle");
  assert.equal(run.party.every((pokemon) => pokemon.hp > 0), true);
});

test("perder contra un gimnasio sigue terminando la corrida", () => {
  const run = runAt("gym");
  chooseNode(run, 0);
  loseCombat(run);
  assert.equal(run.phase, "ended");
  assert.equal(run.result, "defeat");
});

test("un guardado a mitad de evento conserva la copia del equipo", () => {
  const run = runAt("rival");
  run.party[0].hp = Math.max(1, run.party[0].maxHp - 2);
  const hp = run.party[0].hp;
  chooseNode(run, 0);
  const restored = restoreRun(data, serializeRun(run));
  loseCombat(restored);
  assert.equal(restored.phase, "map");
  assert.equal(restored.party[0].hp, hp);
});

test("sin copia (guardado viejo) el equipo vuelve en pie con la mitad de PS", () => {
  const run = runAt("villain");
  chooseNode(run, 0);
  run.eventSnapshot = undefined;
  loseCombat(run);
  assert.equal(run.phase, "map");
  assert.ok(run.party.every((pokemon) => pokemon.hp >= Math.ceil(pokemon.maxHp / 2) && !pokemon.fainted));
});

test("legendarios extra: aparecen como ruta opcional, sin reemplazar el paso y sin tope de uso", async () => {
  const { generateOptions } = await import("../src/run/mapGenerator.js");
  const { chooseNode, createRun } = await import("../src/run/index.js");
  const { data } = await import("./helpers.js");
  let offered = null;
  for (let seed = 1; seed <= 60 && !offered; seed += 1) {
    const run = createRun({ data, seed, mode: "global" });
    run.badges.push("a");
    for (let i = 0; i < 40 && !offered; i += 1) {
      const options = generateOptions(run);
      offered = options.find((node) => node.type === "legendary" && node.milestone === false) ? { run, options } : null;
    }
  }
  assert.ok(offered, "debería ofrecerse algún legendario extra");
  const { run, options } = offered;
  assert.equal(options.length, 2);
  run.options = options;
  const stepBefore = run.step;
  const index = options.findIndex((node) => node.type === "legendary");
  assert.equal(chooseNode(run, index).ok, true);
  assert.ok(run.legendariesSeen.includes(options[index].speciesId));
  run.combat.result = "defeat";
  finishCombat(run);
  assert.equal(run.phase, "map");
  assert.equal(run.step, stepBefore); // huir no consume el paso
});

test("la party y la caja aceptan cualquier cantidad de legendarios", async () => {
  const { createRun } = await import("../src/run/index.js");
  const { addToRoster, newPokemon } = await import("../src/run/runState.js");
  const { data } = await import("./helpers.js");
  const run = createRun({ data, seed: 5 });
  const legendaries = Object.keys(data.species).filter((id) => data.species[id].legendary).slice(0, 8);
  for (const id of legendaries) addToRoster(run, newPokemon(run, id));
  const count = [...run.party, ...run.box].filter((pokemon) => data.species[pokemon.speciesId].legendary).length;
  assert.equal(count, 8);
});
