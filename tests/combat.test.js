import assert from "node:assert/strict";
import test from "node:test";
import { buildDeckList, calculatePartyExpReward, createCombat, endPlayerTurn, playMove } from "../src/engine/index.js";
import { playGreedyTurn } from "../src/tools/greedyPlayer.js";
import { data, makeCombat, makeParty, setHand } from "./helpers.js";

const simParty = ["servine", "pignite", "dewott", "watchog", "tranquill", "boldore"];

function playFullCombat(encounterId, seed) {
  const encounter = data.encounters[encounterId];
  const state = createCombat({
    data,
    party: makeParty(simParty, ["front", "front", "front", "back", "back", "back"]),
    enemies: encounter.enemies,
    deckCardIds: buildDeckList(data.startingDeck),
    seed,
    kind: encounter.kind
  });
  while (!state.result && state.turn <= 60) playGreedyTurn(state);
  return state;
}

test("tamaño de encuentro según tipo: normal 1-3, gimnasio 4, liga 5, campeón 6", () => {
  const four = Array.from({ length: 4 }, () => ({ speciesId: "patrat" }));
  const five = Array.from({ length: 5 }, () => ({ speciesId: "patrat" }));
  assert.throws(() => makeCombat({ enemies: four, kind: "normal" }), /admite/);
  assert.doesNotThrow(() => makeCombat({ enemies: four, kind: "gym" }));
  assert.throws(() => makeCombat({ enemies: five, kind: "champion" }), /admite/);
  assert.doesNotThrow(() => makeCombat({ enemies: data.encounters.championExample.enemies, kind: "champion" }));
  assert.throws(() => makeCombat({ kind: "inexistente" }), /desconocido/);
});

test("robo: 6 en el turno 1, luego 1 por turno, más la pasiva de Serperior desde el turno 2", () => {
  const plain = makeCombat({ party: ["samurott"], enemies: [{ speciesId: "roggenrola" }] });
  assert.equal(plain.deck.hand.length, 6);
  endPlayerTurn(plain);
  assert.equal(plain.deck.hand.length, 7);

  const withPassive = makeCombat({ party: ["serperior"], enemies: [{ speciesId: "roggenrola" }] });
  assert.equal(withPassive.deck.hand.length, 6);
  endPlayerTurn(withPassive);
  assert.equal(withPassive.deck.hand.length, 8);
});

test("la pasiva de escudo de Gigalith se activa al inicio del turno 2", () => {
  const state = makeCombat({ party: ["gigalith"], enemies: [{ speciesId: "patrat" }] });
  assert.equal(state.teams.player[0].shield, 0);
  endPlayerTurn(state);
  assert.equal(state.teams.player[0].shield, 4);
});

test("al ganar, solo los Pokémon en pie reciben la EXP y el combate se cierra", () => {
  const state = makeCombat({ party: ["emboar", "serperior"], enemies: [{ speciesId: "patrat" }] });
  const [emboar, serperior] = state.teams.player;
  serperior.hp = 0;
  serperior.fainted = true;
  state.teams.enemy[0].hp = 1;
  setHand(state, ["energyBasic"]);

  const result = playMove(state, { pokemonUid: "p1", moveIndex: 0, targetUid: "e1", payCardUids: ["t0"] });
  assert.equal(result.ok, true);
  assert.equal(state.result, "victory");
  assert.equal(state.phase, "ended");
  assert.equal(emboar.exp, calculatePartyExpReward(state.teams.enemy, data, 1));
  assert.equal(serperior.exp, 0);
  assert.ok(result.events.some((event) => event.type === "expAwarded"));
  assert.equal(playMove(state, { pokemonUid: "p1", moveIndex: 0, targetUid: "e1" }).error, "notPlayerTurn");
  assert.equal(endPlayerTurn(state).error, "notPlayerTurn");
});

test("derrota cuando cae toda la party", () => {
  const state = makeCombat({ party: ["snivy"], enemies: [{ speciesId: "patrat" }] });
  state.teams.player[0].hp = 1;
  const { events } = endPlayerTurn(state);
  assert.equal(state.result, "defeat");
  assert.equal(state.phase, "ended");
  assert.ok(events.some((event) => event.type === "combatEnded" && event.result === "defeat"));
});

test("simulación: misma semilla, misma partida", () => {
  const first = playFullCombat("route1Duo", 5);
  const second = playFullCombat("route1Duo", 5);
  assert.ok(first.result);
  assert.equal(JSON.stringify(first.log), JSON.stringify(second.log));
});

test("simulación: todos los encuentros de ejemplo terminan sin colgarse", () => {
  for (const encounterId of Object.keys(data.encounters)) {
    for (let seed = 1; seed <= 15; seed += 1) {
      const state = playFullCombat(encounterId, seed);
      assert.ok(["victory", "defeat"].includes(state.result), `${encounterId} seed ${seed}: ${state.result}`);
    }
  }
});
