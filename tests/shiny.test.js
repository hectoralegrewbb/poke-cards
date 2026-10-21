import assert from "node:assert/strict";
import test from "node:test";
import { createPokemon } from "../src/engine/index.js";
import { buildEncounter } from "../src/run/encounterBuilder.js";
import { createRun, decideCapture, restoreRun, serializeRun } from "../src/run/index.js";
import { grantVictoryRewards } from "../src/run/rewards.js";
import { rollShiny, shinyChance } from "../src/run/shiny.js";
import { data } from "./helpers.js";

function findShinyEncounter() {
  const run = createRun({ data, seed: 3 });
  const node = { type: "combat" };
  for (let step = 0; step < 4000; step += 1) {
    run.step = step;
    const encounter = buildEncounter(run, node);
    if (encounter.enemies.some((enemy) => enemy.shiny)) return { run, node, encounter };
  }
  throw new Error("no apareció ningún variocolor");
}

test("rollShiny es determinista y respeta la probabilidad base", () => {
  assert.equal(rollShiny(5, 1, 2, 3), rollShiny(5, 1, 2, 3));
  let hits = 0;
  const total = 100000;
  for (let index = 0; index < total; index += 1) if (rollShiny(7, index)) hits += 1;
  const expected = total * shinyChance;
  assert.ok(Math.abs(hits - expected) < expected * 0.15, `${hits} variocolores de ${total}`);
});

test("el variocolor es solo cosmético: createPokemon no cambia estadísticas", () => {
  const normal = createPokemon({ uid: "a", speciesId: "snivy", side: "player" }, data);
  const shiny = createPokemon({ uid: "a", speciesId: "snivy", side: "player", shiny: true }, data);
  assert.equal(shiny.shiny, true);
  assert.equal(normal.shiny, undefined);
  assert.deepEqual({ ...shiny, shiny: undefined }, { ...normal, shiny: undefined });
});

test("los encuentros salvajes pueden traer variocolor y los jefes nunca", () => {
  const { encounter } = findShinyEncounter();
  assert.ok(encounter.enemies.some((enemy) => enemy.shiny));
  const run = createRun({ data, seed: 3 });
  for (const type of ["gym"]) assert.ok(!buildEncounter(run, { type }).enemies.some((enemy) => enemy.shiny));
});

test("un variocolor derrotado siempre se ofrece y se captura conservando la marca (también al guardar)", () => {
  const { run, node, encounter } = findShinyEncounter();
  const shinyEnemy = encounter.enemies.find((enemy) => enemy.shiny);
  run.node = node;
  grantVictoryRewards(run, node, encounter.enemies);
  run.phase = "reward";
  assert.equal(run.pending.capture, shinyEnemy.speciesId);
  assert.equal(run.pending.captureShiny, true);
  decideCapture(run, true);
  const captured = [...run.party, ...run.box].find((pokemon) => pokemon.shiny);
  assert.ok(captured, "el Pokémon capturado debe ser variocolor");
  const restored = restoreRun(data, serializeRun(run));
  assert.equal([...restored.party, ...restored.box].some((pokemon) => pokemon.shiny), true);
});

test("la misma semilla produce los mismos variocolores", () => {
  const signature = () => {
    const run = createRun({ data, seed: 9 });
    const out = [];
    for (let step = 0; step < 300; step += 1) {
      run.step = step;
      out.push(buildEncounter(run, { type: "wild" }).enemies.map((enemy) => Boolean(enemy.shiny)).join());
    }
    return out.join("|");
  };
  assert.equal(signature(), signature());
});
