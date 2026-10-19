import assert from "node:assert/strict";
import test from "node:test";
import { endPlayerTurn, getValidTargets, pickTarget } from "../src/engine/index.js";
import { data, makeCombat, makeSturdy } from "./helpers.js";

function context(state, candidates, moveId) {
  return { candidates, actor: state.teams.enemy[0], move: data.moves[moveId], state };
}

test("lowestHp elige al de menos vida", () => {
  const state = makeCombat({ party: ["snivy", "tepig", "oshawott"] });
  state.teams.player[0].hp = 9;
  state.teams.player[1].hp = 3;
  state.teams.player[2].hp = 12;
  const target = pickTarget("lowestHp", context(state, state.teams.player, "tackle"));
  assert.equal(target.uid, "p2");
});

test("highestThreat elige al de mayor ataque", () => {
  const state = makeCombat({ party: ["snivy", "emboar", "oshawott"] });
  const target = pickTarget("highestThreat", context(state, state.teams.player, "tackle"));
  assert.equal(target.uid, "p2");
});

test("typeAdvantage elige al que más debilita el tipo del movimiento", () => {
  const state = makeCombat({ party: ["oshawott", "snivy"] });
  const target = pickTarget("typeAdvantage", context(state, state.teams.player, "ember"));
  assert.equal(target.uid, "p2"); // fuego vs planta x2, vs agua x0.5
});

test("una estrategia desconocida lanza error", () => {
  const state = makeCombat();
  assert.throws(() => pickTarget("inventada", context(state, state.teams.player, "tackle")), /desconocida/);
});

test("el enemigo respeta sus cooldowns al planear", () => {
  const state = makeCombat({ party: ["serperior", "samurott"], enemies: [{ speciesId: "roggenrola" }] });
  makeSturdy(state);
  const enemy = state.teams.enemy[0];

  assert.equal(enemy.intent.moveId, "rockSlide"); // el de mayor poder disponible
  endPlayerTurn(state);
  assert.notEqual(enemy.intent.moveId, "rockSlide"); // en cooldown
  endPlayerTurn(state);
  assert.equal(enemy.intent.moveId, "rockSlide"); // volvió a estar disponible
});

test("si el objetivo anunciado cae, el enemigo reelige uno válido", () => {
  const state = makeCombat({ party: ["serperior", "samurott"], enemies: [{ speciesId: "roggenrola" }] });
  makeSturdy(state);
  const enemy = state.teams.enemy[0];
  const announced = state.teams.player.find((pokemon) => pokemon.uid === enemy.intent.targetId);
  announced.hp = 0;
  announced.fainted = true;

  const { events } = endPlayerTurn(state);
  const used = events.find((event) => event.type === "moveUsed" && event.actorId === enemy.uid);
  assert.ok(used);
  assert.notEqual(used.targetId, announced.uid);
});

test("getValidTargets: movimientos de soporte apuntan a uno mismo o aliados", () => {
  const state = makeCombat({ enemies: [{ speciesId: "patrat" }, { speciesId: "pidove" }] });
  const [patrat, pidove] = state.teams.enemy;
  assert.deepEqual(getValidTargets(state, patrat, data.moves.harden), [patrat]);
  assert.deepEqual(
    getValidTargets(state, patrat, { ...data.moves.harden, targetSide: "ally" }).map((pokemon) => pokemon.uid),
    [patrat.uid, pidove.uid]
  );
});
