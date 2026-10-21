import assert from "node:assert/strict";
import test from "node:test";
import { endPlayerTurn, getMoveCost, getPowerBonus, playUtility, validateGameData } from "../src/engine/index.js";
import { assignTypePassives, typePassives } from "../scripts/typePassives.js";
import { data, makeCombat, setHand } from "./helpers.js";

const play = (state, cardIndex, targetUid = null) => playUtility(state, { cardUid: `t${cardIndex}`, targetUid });

test("el catálogo completo (649 especies, cartas y pasivas nuevas) valida", () => {
  assert.deepEqual(validateGameData(data), []);
  assert.equal(Object.keys(data.species).length, 649);
});

test("Recarga agrega 2 energías a la mano", () => {
  const state = makeCombat();
  setHand(state, ["recharge"]);
  const result = play(state, 0);
  assert.equal(result.ok, true);
  assert.equal(state.deck.hand.filter((card) => card.cardId === "energyBasic").length, 2);
});

test("Concentración suma poder y Prisa baja costos, solo por este turno", () => {
  const state = makeCombat({ enemies: [{ speciesId: "gigalith" }] });
  const actor = state.teams.player[0];
  const costly = Object.values(data.moves).find((move) => move.cost >= 1 && move.power > 0);
  setHand(state, ["focus", "haste"]);
  const baseCost = getMoveCost(state, actor, costly);
  assert.equal(play(state, 0).ok, true);
  assert.equal(play(state, 1).ok, true);
  assert.equal(getPowerBonus(state, actor, costly), 3);
  assert.equal(getMoveCost(state, actor, costly), baseCost - 1);
  endPlayerTurn(state);
  endPlayerTurn(state);
  assert.equal(getPowerBonus(state, actor, costly), 0);
  assert.equal(getMoveCost(state, actor, costly), baseCost);
});

test("Remedio cura el estado y recupera PS; sin estado solo cura", () => {
  const state = makeCombat({ enemies: [{ speciesId: "gigalith" }] });
  const ally = state.teams.player[0];
  ally.status = "poison";
  ally.hp = ally.maxHp - 10;
  setHand(state, ["remedy"]);
  const result = play(state, 0, ally.uid);
  assert.equal(result.ok, true);
  assert.equal(ally.status, null);
  assert.equal(ally.hp, ally.maxHp - 4);
  assert.ok(result.events.some((event) => event.type === "statusCured"));
});

test("las pasivas de inicio de combate emiten un evento visible", () => {
  const state = makeCombat({ party: ["blastoise"], enemies: [{ speciesId: "gigalith" }] });
  assert.ok(state.log.some((event) => event.type === "passiveTriggered" && event.name === "Torrente"));
  assert.equal(state.teams.player[0].shield, 6);
});

test("assignTypePassives: solo finales no legendarias, idempotente y sin pisar las curadas", () => {
  const once = assignTypePassives(data.species);
  const twice = assignTypePassives(once);
  assert.deepEqual(once, twice);
  for (const [id, entry] of Object.entries(once)) {
    if (entry.evolutions?.length || entry.legendary) {
      assert.equal(entry.passive, data.species[id].passive, `${id} no debe ganar pasiva`);
    }
    if (data.species[id].passive) assert.deepEqual(entry.passive, data.species[id].passive, `${id} conserva su pasiva curada`);
  }
  assert.ok(Object.keys(typePassives).length >= 17);
});

test("todo tipo del catálogo tiene su pasiva temática", () => {
  const used = new Set(Object.values(data.species).flatMap((entry) => entry.types));
  for (const type of used) assert.ok(typePassives[type], `falta pasiva para ${type}`);
});
