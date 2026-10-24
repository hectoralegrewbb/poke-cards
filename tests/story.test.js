import assert from "node:assert/strict";
import test from "node:test";
import { chooseAmelieEnding, consumeStoryLine, createRun, finalScene, finishCombat, pickStoryLine, restoreRun, serializeRun, storyActive } from "../src/run/index.js";
import { data } from "./helpers.js";

const globalRun = (mode = "global") => createRun({ data, seed: 7, mode });

test("la historia solo está activa en Poké World", () => {
  assert.equal(storyActive(globalRun("global")), true);
  assert.equal(storyActive(globalRun("regional")), false);
  assert.equal(pickStoryLine(globalRun("regional")), null);
});

test("las líneas se muestran una sola vez y respetan medallas y separación entre globos", () => {
  const run = globalRun();
  assert.equal(consumeStoryLine(run).id, "welcome");
  assert.equal(consumeStoryLine(run), null); // mismo nodo: sin segundo globo
  run.nodesEntered = 1;
  run.badges = Array(4).fill("x");
  assert.equal(consumeStoryLine(run).id, "hint1");
  assert.equal(pickStoryLine(run), null); // hint1 ya se vio y falta separación
  run.badges = Array(8).fill("x");
  run.nodesEntered = 9;
  assert.equal(consumeStoryLine(run).id, "turn8");
});

test("las variantes dependen de la semilla y no consumen el RNG de la corrida", () => {
  const first = globalRun();
  const rngBefore = first.rng.getState();
  const line = consumeStoryLine(first);
  assert.equal(first.rng.getState(), rngBefore);
  assert.ok(first.data.story.lines.find((entry) => entry.id === line.id).variants.includes(line.text));
  assert.equal(consumeStoryLine(globalRun()).text, line.text);
});

test("Lina aparece en campamentos/tiendas y puede dar regalos de Amelie", () => {
  let gifts = 0;
  for (let seed = 1; seed <= 40; seed += 1) {
    const run = createRun({ data, seed, mode: "global" });
    run.storySeen.push("welcome");
    run.phase = "camp";
    run.nodesEntered = 3;
    const line = consumeStoryLine(run);
    assert.equal(line.speaker, "lina");
    if (line.gift) {
      gifts += 1;
      assert.match(line.gift.label, /\S/);
    }
  }
  assert.ok(gifts > 5 && gifts < 35, `regalos: ${gifts}`);
});

test("el líder comenta la medalla recién ganada con su nombre", () => {
  const run = globalRun();
  run.storySeen.push("welcome");
  run.phase = "reward";
  run.nodesEntered = 5;
  run.badges = ["x"];
  run.storyEvent = { type: "gymWon", leader: "Brock", badge: "Medalla Roca", regionId: "kanto" };
  const line = consumeStoryLine(run);
  assert.equal(line.speaker, "leader");
  assert.equal(line.name, "Brock");
  assert.match(line.text, /Medalla Roca/);
});

test("Aslo habla en los duelos con el rival y las pistas empiezan en la medalla 4", () => {
  const run = globalRun();
  run.storySeen.push("welcome");
  run.storySeen.push("tipCombat", "tipRows");
  run.phase = "combat";
  run.node = { type: "rival" };
  run.nodesEntered = 4;
  assert.equal(consumeStoryLine(run).id, "asloIntro");
  run.nodesEntered = 8;
  run.badges = Array(4).fill("x");
  assert.equal(consumeStoryLine(run).id, "asloHintA");
});

test("todo el texto de la historia está en tuteo (sin voseo)", () => {
  const voseo = /\b(tenés|podés|elegí|sos|quedate|buscá|revisá|mirá|vení|querés|sentís|decime|dejá|fijate|ubicá|acomodá|prepará|curá|capturalo|derrotalo|ganá)\b/i;
  const texts = [
    ...data.story.lines.flatMap((line) => line.variants),
    ...data.story.final.intro.flatMap((step) => step.variants),
    ...Object.values(data.story.final.endings).flatMap((ending) => ending.lines),
    data.story.starter.text
  ];
  for (const text of texts) assert.doesNotMatch(text, voseo, text);
});

test("la escena final elige una variante por paso", () => {
  const scene = finalScene(globalRun());
  assert.equal(scene.intro.length, 4);
  assert.ok(scene.intro.every((step) => typeof step.text === "string" && step.text.length > 0));
});

test("el estado de la historia sobrevive al guardado", () => {
  const run = globalRun();
  consumeStoryLine(run);
  const restored = restoreRun(data, serializeRun(run));
  assert.deepEqual(restored.storySeen, ["welcome"]);
  assert.equal(restored.storyLastAt, 0);
  assert.equal(restored.nodesEntered, 0);
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
