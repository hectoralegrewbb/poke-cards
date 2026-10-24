import assert from "node:assert/strict";
import test from "node:test";
import { chooseAmelieEnding, createRun, finishCombat, pickStoryLine, markStorySeen, restoreRun, serializeRun, storyActive } from "../src/run/index.js";
import { data } from "./helpers.js";

const globalRun = (mode = "global") => createRun({ data, seed: 7, mode });

test("la historia solo está activa en Poké World", () => {
  assert.equal(storyActive(globalRun("global")), true);
  assert.equal(storyActive(globalRun("regional")), false);
  assert.equal(pickStoryLine(globalRun("regional")), null);
});

test("las líneas de historia se muestran una sola vez y respetan medallas", () => {
  const run = globalRun();
  const first = pickStoryLine(run);
  assert.equal(first.id, "welcome");
  markStorySeen(run, first.id);
  assert.notEqual(pickStoryLine(run)?.id, "welcome");
  run.badges = Array(2).fill("x");
  assert.equal(pickStoryLine(run).id, "hint1");
  run.badges = Array(8).fill("x");
  assert.equal(pickStoryLine(run).id, "turn8");
});

test("storySeen sobrevive al guardado", () => {
  const run = globalRun();
  markStorySeen(run, "welcome");
  assert.deepEqual(restoreRun(data, serializeRun(run)).storySeen, ["welcome"]);
});

function atChampion(run) {
  run.node = { type: "champion" };
  run.phase = "combat";
  run.combat = { result: "victory", teams: { enemy: [] } };
}

test("vencer al campeón abre la escena de Amelie; quedarse termina la corrida", () => {
  const run = globalRun();
  atChampion(run);
  assert.equal(finishCombat(run).ok, true);
  assert.equal(run.phase, "amelieIntro");
  assert.equal(chooseAmelieEnding(run, "stay").ok, true);
  assert.equal(run.phase, "ended");
  assert.equal(run.result, "victory");
  assert.equal(run.ending, "stay");
});

test("escapar lleva a combatir con Amelie y vencerla da el final de escape", () => {
  const run = globalRun();
  atChampion(run);
  finishCombat(run);
  assert.equal(chooseAmelieEnding(run, "escape").ok, true);
  assert.equal(run.phase, "combat");
  assert.equal(run.combat.kind, "amelie");
  assert.equal(run.combat.teams.enemy.length, data.story.boss.enemies.length);
  run.combat.result = "victory";
  finishCombat(run);
  assert.equal(run.phase, "ended");
  assert.equal(run.ending, "escape");
});

test("perder contra Amelie es derrota y en modo regional el campeón termina normal", () => {
  const run = globalRun();
  atChampion(run); finishCombat(run); chooseAmelieEnding(run, "escape");
  run.combat.result = "defeat";
  finishCombat(run);
  assert.equal(run.result, "defeat");
  const regional = globalRun("regional");
  atChampion(regional);
  finishCombat(regional);
  assert.equal(regional.phase, "ended");
  assert.equal(regional.result, "victory");
});
