import assert from "node:assert/strict";
import test from "node:test";
import { logStoryLine, markStoryRead, readingTimeMs, storyLogLimit, unreadStoryCount, chooseAmelieEnding, chooseGardevoirFight, chooseNode, consumeStoryLine, legendaryCount, secretEligible, createRun, finalScene, finishCombat, pickStoryLine, restoreRun, serializeRun, storyActive } from "../src/run/index.js";
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
  run.combat = { phase: "player", turn: 1, result: null };
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
  assert.equal(scene.intro.length, 5);
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

test("escapar lleva a combatir con Amelie y vencerla da el final de escape (sin requisitos del secreto)", () => {
  const run = globalRun();
  run.legendaryPeak = 3; // llevó 3 legendarios a una pelea: no cumple el final secreto
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

function reachAmelieDefeated(run) {
  atChampion(run);
  finishCombat(run);
  chooseAmelieEnding(run, "escape");
  run.combat.result = "victory";
  finishCombat(run);
}

test("final secreto: con pocos legendarios, vencer a Amelie abre a Gardevoir y vencerla da el final verdadero", () => {
  const run = globalRun();
  reachAmelieDefeated(run);
  assert.equal(run.phase, "gardevoirIntro");
  run.party[0].hp = 1;
  assert.equal(chooseGardevoirFight(run).ok, true);
  assert.equal(run.combat.kind, "gardevoir");
  assert.deepEqual(run.combat.teams.enemy.map((enemy) => enemy.speciesId), ["ralts", "kirlia", "gardevoir"]);
  assert.equal(run.party[0].hp, run.party[0].maxHp, "Lina cura al equipo");
  assert.ok(run.combat.teams.player.every((pokemon) => pokemon.shield >= 4), "Lina da escarcha");
  run.combat.result = "victory";
  finishCombat(run);
  assert.equal(run.phase, "ended");
  assert.equal(run.ending, "true");
});

test("perder contra Gardevoir es derrota", () => {
  const run = globalRun();
  reachAmelieDefeated(run);
  chooseGardevoirFight(run);
  run.combat.result = "defeat";
  finishCombat(run);
  assert.equal(run.result, "defeat");
});

test("el final secreto exige ≤2 legendarios por pelea y ≤1 al llegar", () => {
  const run = globalRun();
  assert.equal(secretEligible(run), true);
  run.legendaryPeak = 3;
  assert.equal(secretEligible(run), false);
  run.legendaryPeak = 2;
  assert.equal(secretEligible(run), true);
  const legendaryId = Object.keys(data.species).find((id) => data.species[id].legendary);
  for (let i = 0; i < 2; i += 1) run.party.push({ ...run.party[0], uid: 900 + i, speciesId: legendaryId });
  assert.equal(legendaryCount(run), 2);
  assert.equal(secretEligible(run), false);
  assert.equal(secretEligible(globalRun("regional")), false);
});

test("se registra el máximo de legendarios llevados a las peleas normales", () => {
  const run = globalRun();
  const legendaryId = Object.keys(data.species).find((id) => data.species[id].legendary);
  run.party.push({ ...run.party[0], uid: 950, speciesId: legendaryId });
  run.party.push({ ...run.party[0], uid: 951, speciesId: legendaryId });
  run.party.push({ ...run.party[0], uid: 952, speciesId: legendaryId });
  chooseNode(run, 0);
  assert.equal(run.legendaryPeak, 3);
  assert.equal(secretEligible(run), false);
});

test("el bucle: tras reiniciar, Amelie y Lina lo recuerdan", () => {
  const first = createRun({ data, seed: 7, mode: "global", loop: 1 });
  assert.equal(consumeStoryLine(first).id, "welcomeLoop");
  assert.equal(consumeStoryLine(globalRun()).id, "welcome");
  const saved = restoreRun(data, serializeRun(first));
  assert.equal(saved.loop, 1);
});

test("atajo ?finale: arma el final listo y cumple (o no) el requisito secreto", async () => {
  const { createFinaleRun } = await import("../src/run/debugFinale.js");
  const secret = createFinaleRun({ data });
  assert.equal(secret.phase, "amelieIntro");
  assert.equal(secret.party.length, 6);
  assert.equal(secretEligible(secret), true);
  assert.equal(secretEligible(createFinaleRun({ data, mode: "normal" })), false);
  const jump = createFinaleRun({ data, mode: "gardevoir" });
  finishCombat(jump);
  assert.equal(jump.phase, "gardevoirIntro");
});

test("en combate los diálogos esperan la fase del jugador y no salen con el combate cerrado", () => {
  const run = globalRun();
  run.storySeen.push("welcome");
  run.phase = "combat";
  run.node = { type: "wild" };
  run.combat = { phase: "enemy", turn: 3, result: null };
  assert.equal(pickStoryLine(run), null);
  run.combat = { phase: "player", turn: 3, result: "victory" };
  assert.equal(pickStoryLine(run), null);
  run.combat = { phase: "player", turn: 1, result: null };
  assert.equal(pickStoryLine(run).id, "tipCombat");
});

test("cada diálogo queda en el registro como no leído y se puede marcar como leído", () => {
  const run = globalRun();
  const line = consumeStoryLine(run);
  assert.equal(unreadStoryCount(run), 1);
  assert.equal(run.storyLog[0].id, line.id);
  markStoryRead(run, line.seq);
  assert.equal(unreadStoryCount(run), 0);
  const restored = restoreRun(data, serializeRun(run));
  assert.equal(restored.storyLog.length, 1);
  assert.equal(restored.storyLog[0].read, true);
});

test("el registro tiene tope y descarta primero lo ya leído", () => {
  const run = globalRun();
  for (let index = 0; index < storyLogLimit + 5; index += 1) {
    const entry = logStoryLine(run, { id: `x${index}`, speaker: "amelie", expression: "neutral", name: "A", text: "t" });
    if (index % 2 === 0) markStoryRead(run, entry.seq);
  }
  assert.equal(run.storyLog.length, storyLogLimit);
  assert.ok(readingTimeMs("hola") >= 4500 && readingTimeMs("x".repeat(500)) <= 14000);
});

test("la cara verde (mareo) solo se usa en la línea del mareo y todas las expresiones tienen arte", async () => {
  const sick = data.story.lines.filter((line) => line.expression === "sick").map((line) => line.id);
  assert.deepEqual(sick, ["hint5"]);
  const final = [...data.story.final.intro.map((step) => step.expression), ...data.story.gardevoir.intro.map((step) => step.portrait.replace("amelie:", ""))];
  assert.ok(!final.includes("sick"));
  const { readFileSync, existsSync } = await import("node:fs");
  const manifest = JSON.parse(readFileSync(new URL("../assets/story/manifest.json", import.meta.url), "utf8"));
  for (const expression of data.story.expressions) {
    assert.ok(manifest[expression], `falta ${expression} en el manifiesto`);
    assert.ok(existsSync(new URL(`../assets/story/${manifest[expression]}`, import.meta.url)), `falta el archivo de ${expression}`);
  }
});
