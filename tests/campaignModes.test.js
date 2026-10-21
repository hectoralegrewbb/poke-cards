import assert from "node:assert/strict";
import test from "node:test";
import { calculateMoveDamage, validateGameData } from "../src/engine/index.js";
import { buildEncounter } from "../src/run/encounterBuilder.js";
import { chooseNode, createRun, decideCapture, finishCombat, pickCard, restoreRun, serializeRun, swapPartyBox } from "../src/run/index.js";
import { nationalDex, remoteSpriteUrl } from "../web/ui/spriteSources.js";
import { data, makeCombat } from "./helpers.js";

function winCurrentCombat(run) {
  run.combat.teams.enemy.forEach((enemy) => { enemy.hp = 0; enemy.fainted = true; });
  run.combat.result = "victory";
  assert.equal(finishCombat(run).ok, true);
  const offer = run.pending?.capture;
  if (offer) decideCapture(run, true);
  if (run.pending?.cardChoices) pickCard(run, null);
  return offer;
}

test("catálogo jugable y Pokédex nacional sin referencias rotas", () => {
  assert.deepEqual(validateGameData(data), []);
  assert.ok(Object.keys(data.species).length >= 229);
  assert.equal(Object.keys(nationalDex).length, Object.keys(data.species).length);
  for (const [id, species] of Object.entries(data.species)) {
    assert.ok(nationalDex[id] >= 1 && nationalDex[id] <= 649, `dex de ${id}`);
    assert.ok(remoteSpriteUrl(id).endsWith(`/${nationalDex[id]}.gif`));
    if (species.legendary) assert.ok(data.campaigns.regions);
  }
});

test("regional: Kanto, Johto, Hoenn, Sinnoh y Teselia siguen sus 8 gimnasios y Liga", () => {
  for (const [regionId, region] of Object.entries(data.campaigns.regions)) {
    const run = createRun({ data, mode: "regional", regionId, seed: 42 });
    assert.equal(run.campaign.name, region.name);
    assert.deepEqual(run.campaign.stages.map((stage) => stage.leader), region.gyms.map((gym) => gym.leader));
    assert.deepEqual(run.campaign.league.eliteFour.map((member) => member.leader), region.eliteFour.map((member) => member.leader));
    assert.equal(run.campaign.league.champion.leader, region.champion.leader);
    assert.equal(run.campaign.stages.length, 8);
    for (let index = 0; index < 8; index += 1) {
      assert.equal(run.campaign.stages[index].gym.enemies.length, index === 0 ? 2 : index < 4 ? 3 : 4);
      assert.equal(run.campaign.stages[index].gym.enemies.at(-1).speciesId, region.gyms[index].ace);
      assert.ok(run.campaign.stages[index].wildPool.every((id) => !data.species[id].legendary));
    }
  }
});

test("global: incluye las cinco regiones, gimnasios mixtos y reproducibilidad por semilla", () => {
  for (const seed of [1, 4, 17, 55]) {
    const first = createRun({ data, mode: "global", seed });
    const second = createRun({ data, mode: "global", seed });
    assert.equal(first.campaign.regionId, null);
    assert.deepEqual(first.campaign, second.campaign);
    assert.equal(new Set(first.campaign.stages.map((stage) => stage.regionId)).size, 5);
    assert.equal(first.campaign.league.eliteFour.length, 4);
    assert.equal(first.campaign.legendaries.length, 2);
  }
});

test("región sorpresa usa una de las cinco campañas en orden, sin híbridos", () => {
  const run = createRun({ data, mode: "regional", regionId: "random", seed: 97 });
  const selected = data.campaigns.regions[run.campaign.regionId];
  assert.ok(selected);
  assert.deepEqual(run.campaign.stages.map((stage) => stage.leader), selected.gyms.map((gym) => gym.leader));
});

test("tercera y sexta medalla activan encuentros legendarios y no saltean el mapa", () => {
  const run = createRun({ data, mode: "regional", regionId: "kanto", seed: 13 });
  for (let stage = 0; stage < 6; stage += 1) {
    // Saltamos nodos de preparación y entramos al gimnasio que corresponde.
    run.step = run.campaign.stepPools.length;
    run.options = [{ type: "gym" }];
    assert.equal(chooseNode(run, 0).ok, true);
    assert.equal(run.phase, "combat");
    winCurrentCombat(run);
    assert.equal(run.badges.length, stage + 1);
    if ([2, 5].includes(stage)) {
      assert.equal(run.options.length, 1);
      assert.equal(run.options[0].type, "legendary");
      const speciesId = run.options[0].speciesId;
      assert.ok(data.species[speciesId].legendary);
      chooseNode(run, 0);
      assert.equal(run.combat.teams.enemy[0].speciesId, speciesId);
      assert.equal(winCurrentCombat(run), speciesId);
      assert.equal(run.step, 0, "no se saltea el primer paso tras la captura");
      assert.equal(run.stageIndex, stage + 1);
      assert.equal(run.completedLegendaryMilestones.length, (stage + 1) / 3);
      assert.ok(!run.options.some((node) => node.type === "legendary"));
    }
  }
  // Sin límite de legendarios: ambos entran a la party (hay lugar) y el canje con la caja siempre es válido.
  assert.equal(run.party.filter((pokemon) => data.species[pokemon.speciesId].legendary).length, 2);
  assert.equal(run.box.length, 0);
});

test("eventos: el rival usa un inicial de ventaja y Team Rocket su equipo temático", () => {
  const run = createRun({ data, mode: "regional", regionId: "kanto", starterIds: ["bulbasaur"], seed: 22 });
  run.stageIndex = 1;
  run.badges = ["Medalla Roca"];
  let team = buildEncounter(run, { type: "rival" }).enemies;
  assert.equal(team.at(-1).speciesId, "charmander");
  run.badges.push("Medalla Cascada", "Medalla Trueno");
  team = buildEncounter(run, { type: "rival" }).enemies;
  assert.equal(team.at(-1).speciesId, "charmeleon");
  run.badges.push("Medalla Arcoíris", "Medalla Alma");
  team = buildEncounter(run, { type: "rival" }).enemies;
  assert.equal(team.at(-1).speciesId, "charizard");
  const rocketTeam = buildEncounter(run, { type: "villain" }).enemies;
  assert.ok(rocketTeam.every((enemy) => ["meowth", "ekans", "koffing", "arbok", "weezing"].includes(enemy.speciesId)));
});

test("guardar y continuar preserva modo, gimnasios, RNG y encuentros legendarios", () => {
  const run = createRun({ data, mode: "global", seed: 88 });
  run.badges = ["x", "y", "z"];
  run.completedLegendaryMilestones = [];
  run.options = [{ type: "legendary", speciesId: run.campaign.legendaries[0] }];
  const restored = restoreRun(data, serializeRun(run));
  assert.equal(restored.mode, "global");
  assert.deepEqual(restored.options, run.options);
  assert.deepEqual(restored.campaign, run.campaign);
  assert.equal(restored.rng.next(), run.rng.next());
  chooseNode(restored, 0);
  assert.equal(restored.combat.teams.enemy.length, 1);
});

test("previsualización de área comparte exactamente fórmula con el impacto real", () => {
  const combat = makeCombat({ party: ["oshawott"], enemies: [
    { speciesId: "roggenrola" }, { speciesId: "geodude" }, { speciesId: "onix" }
  ] });
  const attacker = combat.teams.player[0];
  const target = combat.teams.enemy[0];
  const move = combat.data.moves.surf;
  const base = calculateMoveDamage({ attacker, defender: target, move, isCrit: false, balance: data.balance, typeChart: data.typeChart });
  const group = calculateMoveDamage({ attacker, defender: target, move, isCrit: false, balance: data.balance, typeChart: data.typeChart, targetCount: 3 });
  assert.equal(group.typeMultiplier, 2);
  assert.equal(group.isSpread, true);
  assert.equal(group.damage, Math.max(1, Math.round(base.damage * (move.spreadMultiplier ?? 0.72))));
});
