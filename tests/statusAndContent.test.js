import assert from "node:assert/strict";
import test from "node:test";
import { calculateDamage, createCombat, endPlayerTurn, executeMove, findEvolution, inflictStatus, tickStatusForSide } from "../src/engine/index.js";
import { createRun, useItem } from "../src/run/index.js";
import { restoreRun, serializeRun } from "../src/run/saveGame.js";
import { data, makeCombat, makeParty, makeSturdy } from "./helpers.js";

function setupAttack(speciesId, moveId, enemies) {
  const state = makeCombat({ party: [speciesId], enemies });
  const actor = state.teams.player[0];
  return { state, actor, moveIndex: actor.moves.indexOf(moveId) };
}

test("Surf impacta en todos los rivales, registra cada golpe y no daña aliados", () => {
  const { state, actor, moveIndex } = setupAttack("samurott", "surf", [
    { speciesId: "patrat", row: "front" },
    { speciesId: "roggenrola", row: "front" },
    { speciesId: "pidove", row: "back" }
  ]);
  const before = actor.hp;
  executeMove(state, actor, moveIndex, state.teams.enemy[0]);
  const damage = state.log.filter((event) => event.type === "damage");
  assert.equal(damage.length, 3);
  assert.ok(state.teams.enemy.every((pokemon) => pokemon.hp < pokemon.maxHp));
  assert.equal(actor.hp, before);
  assert.equal(state.log.find((event) => event.type === "moveUsed").targetIds.length, 3);
});

test("Terremoto respeta inmunidad a Tierra aunque el golpe sea grupal", () => {
  const { state, actor, moveIndex } = setupAttack("swampert", "earthquake", [
    { speciesId: "patrat" }, { speciesId: "pidove" }, { speciesId: "roggenrola" }
  ]);
  executeMove(state, actor, moveIndex, state.teams.enemy[0]);
  const damage = state.log.filter((event) => event.type === "damage");
  assert.equal(damage.length, 3);
  assert.equal(damage[1].typeMultiplier, 0);
  assert.equal(state.teams.enemy[1].hp, state.teams.enemy[1].maxHp);
  assert.ok(state.teams.enemy[0].hp < state.teams.enemy[0].maxHp);
});

test("Avalancha afecta una fila, no a un enemigo de la retaguardia", () => {
  const { state, actor, moveIndex } = setupAttack("boldore", "rockSlide", [
    { speciesId: "patrat", row: "front" }, { speciesId: "pidove", row: "front" }, { speciesId: "minccino", row: "back" }
  ]);
  executeMove(state, actor, moveIndex, state.teams.enemy[0]);
  assert.deepEqual(state.log.filter((event) => event.type === "damage").map((event) => event.targetId), ["e1", "e2"]);
  assert.equal(state.teams.enemy[2].hp, state.teams.enemy[2].maxHp);
});

test("Veneno es persistente, causa daño por turno y los tipos resistentes son inmunes", () => {
  const state = makeCombat({ party: ["snivy"], enemies: [{ speciesId: "ferroseed" }] });
  const player = state.teams.player[0];
  const steel = state.teams.enemy[0];
  assert.equal(inflictStatus(state, steel, "poison"), false);
  assert.equal(inflictStatus(state, player, "poison"), true);
  assert.equal(inflictStatus(state, player, "burn"), false); // un estado mayor
  const hpBefore = player.hp;
  tickStatusForSide(state, "player");
  assert.ok(player.hp < hpBefore);
  assert.equal(player.status, "poison");
});

test("Quemadura reduce daño físico, y Fuego es inmune a quemarse", () => {
  const state = makeCombat({ party: ["sandile"], enemies: [{ speciesId: "tepig" }] });
  const attacker = state.teams.player[0];
  const target = state.teams.enemy[0];
  const move = data.moves.bite;
  const input = { attacker, defender: target, move, isCrit: false, balance: data.balance, typeChart: data.typeChart };
  const original = calculateDamage(input).damage;
  assert.equal(inflictStatus(state, target, "burn"), false);
  assert.equal(inflictStatus(state, attacker, "burn"), true);
  assert.ok(calculateDamage(input).damage < original);
});

test("Retroceso cancela una acción enemiga y se consume una sola vez", () => {
  const state = makeCombat({ party: ["blastoise"], enemies: [{ speciesId: "patrat" }] });
  makeSturdy(state);
  const enemy = state.teams.enemy[0];
  assert.equal(inflictStatus(state, enemy, "flinch"), true);
  const result = endPlayerTurn(state);
  assert.ok(result.events.some((event) => event.type === "flinched" && event.targetId === enemy.uid));
  assert.ok(!result.events.some((event) => event.type === "moveUsed" && event.actorId === enemy.uid));
  assert.equal(enemy.staggered, false);
  const second = endPlayerTurn(state);
  assert.ok(second.events.some((event) => event.type === "moveUsed" && event.actorId === enemy.uid));
});

test("Retroceso enemigo impide la siguiente acción del jugador", () => {
  const state = makeCombat({ party: ["blastoise"], enemies: [{ speciesId: "patrat" }] });
  makeSturdy(state);
  const ally = state.teams.player[0];
  inflictStatus(state, ally, "flinch");
  endPlayerTurn(state);
  assert.equal(ally.actionsLeft, 0);
  assert.equal(ally.staggered, false);
});

test("Evoluciones progresan por EXP y medallas, sin tercer estadio en gimnasio 2", () => {
  const pokemon = makeParty(["snivy"])[0];
  pokemon.exp = 200;
  assert.equal(findEvolution(pokemon, data, { badges: 0 }), null);
  assert.equal(findEvolution(pokemon, data, { badges: 1 }).to, "servine");
  const second = makeParty(["servine"])[0];
  second.exp = 200;
  assert.equal(findEvolution(second, data, { badges: 2 }), null);
  assert.equal(findEvolution(second, data, { badges: 5 }).to, "serperior");
});

test("Antídoto, Antiquemar y Cura total solamente consumen inventario si funcionan", () => {
  const run = createRun({ data, seed: 5 });
  const ally = run.party[0];
  run.inventory.antidote = 2;
  run.inventory.burnHeal = 1;
  run.inventory.fullHeal = 1;
  assert.equal(useItem(run, "antidote", ally.uid).error, "noEffect");
  assert.equal(run.inventory.antidote, 2);
  ally.status = "poison";
  assert.equal(useItem(run, "burnHeal", ally.uid).error, "noEffect");
  assert.equal(useItem(run, "antidote", ally.uid).ok, true);
  assert.equal(ally.status, null);
  ally.status = "burn";
  assert.equal(useItem(run, "fullHeal", ally.uid).ok, true);
  assert.equal(ally.status, null);
});

test("Guardado preserva estados persistentes y compatibilidad estructural", () => {
  const run = createRun({ data, seed: 8 });
  run.party[0].status = "poison";
  const restored = restoreRun(data, serializeRun(run));
  assert.equal(restored.party[0].status, "poison");
});

test("Biomas y catálogo ofrecen contenido adicional sin starters dominantes", () => {
  assert.ok(Object.keys(data.species).length >= 90);
  assert.ok(Object.keys(data.moves).length >= 70);
  assert.ok(Object.keys(data.items).length >= 12);
  assert.ok(!data.region.stages[0].wildPool.includes("charmander"));
  assert.ok(data.region.stages[0].wildPool.includes("joltik"));
});

test("Los movimientos aplican sus estados al conectar, con una tirada controlable", () => {
  for (const { attacker, moveId, victim, expected } of [
    { attacker: "venipede", moveId: "poisonSting", victim: "snivy", expected: "poison" },
    { attacker: "litwick", moveId: "ember", victim: "snivy", expected: "burn" },
    { attacker: "sandile", moveId: "bite", victim: "wartortle", expected: "flinch" }
  ]) {
    const { state, actor, moveIndex } = setupAttack(attacker, moveId, [{ speciesId: victim }]);
    state.rng.next = () => 0; // el proc secundario es determinista durante la prueba
    const enemy = state.teams.enemy[0];
    executeMove(state, actor, moveIndex, enemy);
    assert.ok(state.log.some((event) => event.type === "statusApplied" && event.status === expected), moveId);
  }
});

test("Caramelo raro dispara una evolución en cuanto se cumplen EXP y medallas", () => {
  const run = createRun({ data, seed: 22 });
  const ally = run.party[0];
  ally.exp = 50;
  run.badges.push("Medalla 1");
  run.inventory.rareCandy = 1;
  const result = useItem(run, "rareCandy", ally.uid);
  assert.equal(result.ok, true);
  assert.equal(ally.speciesId, "ivysaur");
  assert.equal(ally.exp, 10); // 50 + 15 - 55
  assert.ok(result.events.some((event) => event.type === "evolved"));
});

test("El mapa no presenta opciones duplicadas en la misma decisión", () => {
  for (let seed = 1; seed <= 30; seed += 1) {
    const run = createRun({ data, seed });
    assert.equal(new Set(run.options.map((option) => option.type)).size, run.options.length);
  }
});
