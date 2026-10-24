import assert from "node:assert/strict";
import test from "node:test";
import { applyDamage, playUtility, isAlive } from "../src/engine/index.js";
import { chooseNode, createRun, deckStatus, finishCombat, leaveCenter, moveCardToDeck, addCardToCollection } from "../src/run/index.js";
import { pokeCenterStep } from "../src/run/mapGenerator.js";
import { data, makeCombat, setHand } from "./helpers.js";

test("Revivir levanta a un debilitado durante el combate y no actúa ese turno", () => {
  const state = makeCombat({ party: ["snivy", "tepig", "oshawott"], enemies: [{ speciesId: "patrat" }, { speciesId: "lillipup" }] });
  const fallen = state.teams.player[1];
  fallen.hp = 0; fallen.fainted = true;
  setHand(state, ["revive"]);
  const uid = state.deck.hand[0].uid;
  assert.equal(playUtility(state, { cardUid: uid, targetUid: state.teams.player[0].uid }).ok, false); // no sirve con aliados en pie
  assert.equal(playUtility(state, { cardUid: uid, targetUid: fallen.uid }).ok, true);
  assert.ok(isAlive(fallen));
  assert.equal(fallen.hp, Math.ceil(fallen.maxHp / 2));
  assert.equal(fallen.actionsLeft, 0);
});

test("Baya Zidra: un golpe letal deja 1 PS y se consume", () => {
  const state = makeCombat();
  const target = state.teams.player[0];
  setHand(state, ["sitrusBerry"]);
  assert.equal(playUtility(state, { cardUid: state.deck.hand[0].uid, targetUid: target.uid }).ok, true);
  assert.equal(target.berryGuard, true);
  const first = applyDamage(target, 999);
  assert.equal(first.saved, true);
  assert.equal(target.hp, 1);
  assert.equal(target.fainted, false);
  const second = applyDamage(target, 999);
  assert.equal(second.saved, false);
  assert.equal(target.fainted, true);
});

test("Buscador lleva una carta elegida de la pila de robo a la mano", () => {
  const state = makeCombat();
  setHand(state, ["finder"]);
  const wanted = state.deck.drawPile.find((card) => card.cardId === "wildcard") ?? state.deck.drawPile[0];
  const before = state.deck.drawPile.length;
  assert.equal(playUtility(state, { cardUid: state.deck.hand[0].uid, targetUid: null, searchCardUid: "nope" }).ok, false);
  assert.equal(playUtility(state, { cardUid: state.deck.hand[0].uid, targetUid: null, searchCardUid: wanted.uid }).ok, true);
  assert.ok(state.deck.hand.some((card) => card.uid === wanted.uid));
  assert.equal(state.deck.drawPile.length, before - 1);
});

test("el mazo activo admite como máximo 2 Buscadores", () => {
  const run = createRun({ data, seed: 5 });
  run.deckCardIds.splice(0, 3, "finder", "finder", "finder");
  assert.equal(deckStatus(run).valid, false);
  run.deckCardIds.pop();
  run.chestCardIds.push("finder");
  assert.equal(moveCardToDeck(run, "finder").error, "copyLimit");
  assert.equal(addCardToCollection(run, "finder").to, "chest");
});

test("Centro Pokémon: 1 por ruta, en el evento 3 o 4, cura y revive a todos", async () => {
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const run = createRun({ data, seed, mode: "regional", regionId: "kanto" });
    const step = pokeCenterStep(run);
    assert.ok(step === 2 || step === 3);
    let seen = 0;
    for (let guard = 0; guard < 8 && run.stageIndex === 0; guard += 1) {
      const index = run.options.findIndex((node) => node.type === "pokeCenter");
      if (index !== -1) {
        seen += 1;
        assert.equal(run.step, step);
        run.party[0].hp = 1;
        run.party[0].status = "poison";
        chooseNode(run, index);
        assert.equal(run.phase, "center");
        assert.equal(run.party[0].hp, run.party[0].maxHp);
        assert.equal(run.party[0].status, null);
        leaveCenter(run);
        assert.equal(run.phase, "map");
      }
      // avanza el paso sin combatir
      run.step += 1;
      run.options = (await import("../src/run/mapGenerator.js")).generateOptions(run);
    }
    assert.equal(seen, 1, `semilla ${seed}`);
  }
});
