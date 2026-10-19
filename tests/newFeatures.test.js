import assert from "node:assert/strict";
import test from "node:test";
import { endPlayerTurn } from "../src/engine/index.js";
import { getDifficulty } from "../src/run/difficulty.js";
import { buildEncounter } from "../src/run/encounterBuilder.js";
import { createRun, chooseNode } from "../src/run/index.js";
import { restoreRun, serializeRun } from "../src/run/saveGame.js";
import { nationalDex, remoteSpriteUrl, spriteCandidates } from "../web/ui/spriteSources.js";
import { data } from "./helpers.js";

test("cada especie del juego tiene un sprite GIF de Black/White identificable", () => {
  const speciesIds = Object.keys(data.species);
  assert.equal(speciesIds.length, Object.keys(nationalDex).length);
  for (const id of speciesIds) {
    assert.ok(Number.isInteger(nationalDex[id]) && nationalDex[id] <= 649, id);
    assert.match(remoteSpriteUrl(id, "front"), /\/animated\/\d+\.gif$/);
    assert.match(remoteSpriteUrl(id, "back"), /\/animated\/back\/\d+\.gif$/);
    const sources = spriteCandidates(id, { facing: "back" });
    assert.ok(sources[0].includes("/animated/back/"));
    assert.ok(sources.some((source) => source.endsWith(`/front/${id}.gif`)));
  }
});

test("el pack local tiene prioridad cuando se instaló offline", () => {
  assert.equal(spriteCandidates("snivy", { preferLocal: true })[0], "../assets/sprites/front/snivy.gif");
  assert.equal(spriteCandidates("snivy")[0], remoteSpriteUrl("snivy"));
  assert.equal(remoteSpriteUrl("falso"), null);
});

test("dificultad modifica recursos iniciales sin alterar el modo normal", () => {
  const normal = createRun({ data, seed: 19 });
  const easy = createRun({ data, seed: 19, difficulty: "explorer" });
  const hard = createRun({ data, seed: 19, difficulty: "expert" });
  assert.equal(normal.gold, data.region.start.gold);
  assert.equal(normal.inventory.healBerry, data.region.start.items.healBerry);
  assert.equal(easy.gold, normal.gold + 30);
  assert.equal(easy.inventory.healBerry, normal.inventory.healBerry + 2);
  assert.equal(hard.gold, normal.gold - 10);
  assert.throws(() => getDifficulty("unknown"), /Dificultad desconocida/);
});

test("dificultad multiplica rivales normales y también los gimnasios", () => {
  for (const type of ["wild", "gym"]) {
    const normal = buildEncounter(createRun({ data, seed: 11 }), { type });
    const easy = buildEncounter(createRun({ data, seed: 11, difficulty: "explorer" }), { type });
    const hard = buildEncounter(createRun({ data, seed: 11, difficulty: "expert" }), { type });
    assert.ok(easy.enemies[0].scale.hp < normal.enemies[0].scale.hp);
    assert.ok(hard.enemies[0].scale.hp > normal.enemies[0].scale.hp);
    assert.ok(easy.enemies[0].scale.stats < normal.enemies[0].scale.stats);
    assert.ok(hard.enemies[0].scale.stats > normal.enemies[0].scale.stats);
  }
});

test("guardar y restaurar en mapa preserva progreso, opciones y estado del RNG", () => {
  const run = createRun({ data, seed: 1234, difficulty: "expert" });
  const restored = restoreRun(data, serializeRun(run));
  assert.equal(restored.difficulty, "expert");
  assert.deepEqual(restored.options, run.options);
  assert.deepEqual(restored.party, run.party);
  assert.equal(restored.rng.next(), run.rng.next());
});

test("guardar y restaurar en combate mantiene la misma party y las dos RNG", () => {
  const run = createRun({ data, seed: 3849 });
  assert.equal(chooseNode(run, 0).ok, true);
  assert.equal(run.phase, "combat");
  const restored = restoreRun(data, serializeRun(run));
  assert.equal(restored.combat.teams.player[0], restored.party[0]);
  assert.equal(restored.combat.deck.hand.length, run.combat.deck.hand.length);
  assert.equal(restored.combat.rng.next(), run.combat.rng.next());
  assert.equal(restored.rng.next(), run.rng.next());
  assert.equal(endPlayerTurn(restored.combat).ok, true);
});

test("rechaza guardados incompatibles o incompletos", () => {
  assert.throws(() => restoreRun(data, "{}"), /incompatible/);
  assert.throws(() => restoreRun(data, { version: 1, run: { phase: "combat", seed: 3 } }), /inválido/);
});
