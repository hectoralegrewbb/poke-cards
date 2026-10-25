import assert from "node:assert/strict";
import test from "node:test";
import { endPlayerTurn, playMove, playShield, playUtility } from "../src/engine/index.js";
import { data, makeCombat, makeSturdy, setHand } from "./helpers.js";

const attack = (overrides) => ({ pokemonUid: "p1", moveIndex: 0, targetUid: "e1", ...overrides });

test("el combate arranca con mano inicial, turno 1 e intenciones enemigas", () => {
  const state = makeCombat({ enemies: [{ speciesId: "patrat" }, { speciesId: "pidove", row: "back" }] });
  assert.equal(state.turn, 1);
  assert.equal(state.phase, "player");
  assert.equal(state.deck.hand.length, data.balance.hand.initialSize);
  for (const enemy of state.teams.enemy) {
    assert.ok(enemy.intent, `${enemy.uid} sin intención`);
    assert.ok(state.teams.player.some((pokemon) => pokemon.uid === enemy.intent.targetId));
  }
});

test("un movimiento de costo 0 no usa cartas, consume la acción y fija el cooldown", () => {
  const state = makeCombat({ party: ["snivy", "tepig"], enemies: [{ speciesId: "gigalith" }] });
  makeSturdy(state);
  const handBefore = state.deck.hand.length;

  const result = playMove(state, attack());
  assert.equal(result.ok, true);
  assert.ok(result.events.some((event) => event.type === "damage"));

  const snivy = state.teams.player[0];
  assert.equal(snivy.actionsLeft, 0);
  assert.equal(snivy.cooldowns[0], data.moves.vineWhip.cooldown + 1);
  assert.equal(state.deck.hand.length, handBefore);
  assert.deepEqual(playMove(state, attack()), { ok: false, error: "noActionsLeft" });
});

test("el costo se paga con cartas de la mano y van al descarte", () => {
  const state = makeCombat({ party: ["snivy"], enemies: [{ speciesId: "gigalith" }] });
  makeSturdy(state);
  setHand(state, ["energyBasic", "energyBasic"]);

  assert.deepEqual(playMove(state, attack({ moveIndex: 1 })), { ok: false, error: "insufficientEnergy" });
  const result = playMove(state, attack({ moveIndex: 1, payCardUids: ["t0"] }));
  assert.equal(result.ok, true);
  assert.equal(state.deck.hand.length, 1);
  assert.ok(state.deck.discardPile.some((card) => card.uid === "t0"));
});

test("costo 2: una energía básica no alcanza, el comodín paga cualquier técnica por sí solo", () => {
  const state = makeCombat({ party: ["serperior"], enemies: [{ speciesId: "gigalith" }] });
  makeSturdy(state);
  setHand(state, ["energyBasic", "wildcard"]);

  const leafStorm = attack({ moveIndex: 2 });
  assert.deepEqual(playMove(state, { ...leafStorm, payCardUids: ["t0"] }), { ok: false, error: "insufficientEnergy" });
  assert.equal(playMove(state, { ...leafStorm, payCardUids: ["t1"] }).ok, true);
});

test("valida cartas: ajenas, repetidas y de tipo incorrecto", () => {
  const state = makeCombat({ party: ["snivy"], enemies: [{ speciesId: "gigalith" }] });
  makeSturdy(state);
  setHand(state, ["energyBasic", "insight"]);

  assert.equal(playMove(state, attack({ moveIndex: 1, payCardUids: ["zzz"] })).error, "cardsNotInHand");
  assert.equal(playMove(state, attack({ moveIndex: 1, payCardUids: ["t0", "t0"] })).error, "cardsNotInHand");
  assert.equal(playMove(state, attack({ moveIndex: 1, payCardUids: ["t1"] })).error, "cardNotAllowed");
  assert.equal(playUtility(state, { cardUid: "t0" }).error, "cardNotAllowed");
});

test("cooldown: bloquea el movimiento y baja 1 al inicio de cada turno propio", () => {
  const state = makeCombat({ party: ["snivy"], enemies: [{ speciesId: "gigalith" }] });
  makeSturdy(state);
  setHand(state, ["energyBasic"]);
  const razorLeaf = attack({ moveIndex: 1, payCardUids: ["t0"] });

  assert.equal(playMove(state, razorLeaf).ok, true);
  assert.equal(state.teams.player[0].cooldowns[1], data.moves.razorLeaf.cooldown + 1);

  endPlayerTurn(state);
  assert.equal(state.turn, 2);
  assert.equal(state.teams.player[0].cooldowns[1], data.moves.razorLeaf.cooldown);
  setHand(state, ["energyBasic"]);
  assert.equal(playMove(state, razorLeaf).error, "moveOnCooldown");

  endPlayerTurn(state);
  assert.equal(state.teams.player[0].cooldowns[1], 0);
  setHand(state, ["energyBasic"]);
  assert.equal(playMove(state, razorLeaf).ok, true);
});

test("melee solo llega a la fila frontal mientras haya alguien en ella", () => {
  const state = makeCombat({
    party: ["snivy", "tepig"],
    enemies: [{ speciesId: "patrat", row: "front" }, { speciesId: "pidove", row: "back" }]
  });
  makeSturdy(state);

  assert.equal(playMove(state, attack({ targetUid: "e2" })).error, "invalidTarget");
  assert.equal(playMove(state, { pokemonUid: "p2", moveIndex: 0, targetUid: "e2" }).ok, true); // ember: rango "any"

  const front = state.teams.enemy[0];
  front.hp = 0;
  front.fainted = true;
  assert.equal(playMove(state, attack({ targetUid: "e2" })).ok, true);
});

test("las cartas de refuerzo suman daño al ataque", () => {
  const damageWith = (boostCount) => {
    const state = makeCombat({ party: ["snivy"], enemies: [{ speciesId: "gigalith" }], seed: 11 });
    makeSturdy(state);
    setHand(state, ["energyBasic", "energyBasic", "energyBasic"]);
    const result = playMove(
      state,
      attack({ moveIndex: 1, payCardUids: ["t0"], boostCardUids: ["t1", "t2"].slice(0, boostCount) })
    );
    assert.equal(result.ok, true);
    return result.events.find((event) => event.type === "damage").amount;
  };
  assert.ok(damageWith(2) > damageWith(0));
});

test("límites de refuerzo: máximo por ataque y solo en movimientos de daño", () => {
  const state = makeCombat({ party: ["snivy"], enemies: [{ speciesId: "gigalith" }] });
  makeSturdy(state);
  setHand(state, ["energyBasic", "energyBasic", "energyBasic", "energyBasic", "energyBasic"]);

  const tooMany = playMove(state, attack({ moveIndex: 1, payCardUids: ["t0"], boostCardUids: ["t1", "t2", "t3", "t4"] }));
  assert.equal(tooMany.error, "tooManyBoostCards");

  const onStatus = playMove(state, { pokemonUid: "p1", moveIndex: 2, targetUid: "p1", payCardUids: ["t0"], boostCardUids: ["t1"] });
  assert.equal(onStatus.error, "boostNotApplicable");
});

test("playShield: el comodín refuerza x2 y el escudo se limpia al inicio del siguiente turno", () => {
  const state = makeCombat({ party: ["snivy"], enemies: [{ speciesId: "gigalith" }] });
  makeSturdy(state);
  setHand(state, ["energyBasic", "wildcard"]);

  const result = playShield(state, { targetUid: "p1", cardUids: ["t0", "t1"] });
  assert.equal(result.ok, true);
  assert.equal(state.teams.player[0].shield, 3 * data.balance.combat.defenseBoostPerCard);

  endPlayerTurn(state);
  assert.equal(state.teams.player[0].shield, 0);
});

test("cartas de utilidad: robar, curar, bajar cooldown y moneda de la suerte", () => {
  const state = makeCombat({ party: ["samurott"], enemies: [{ speciesId: "patrat" }] });
  const samurott = state.teams.player[0];

  setHand(state, ["insight", "energyBasic"]);
  assert.equal(playUtility(state, { cardUid: "t0" }).ok, true);
  assert.equal(state.deck.hand.length, 1 + 2);

  const healAmount = data.cards.potion.effects[0].amount;
  samurott.hp = samurott.maxHp - (healAmount + 2);
  setHand(state, ["potion", "potion"]);
  assert.equal(playUtility(state, { cardUid: "t0" }).error, "invalidTarget");
  assert.equal(playUtility(state, { cardUid: "t0", targetUid: "p1" }).ok, true);
  assert.equal(samurott.hp, samurott.maxHp - 2);

  samurott.cooldowns[1] = 3;
  setHand(state, ["quickStep"]);
  playUtility(state, { cardUid: "t0", targetUid: "p1" });
  assert.equal(samurott.cooldowns[1], 2);

  setHand(state, ["luckyCoin"]);
  playUtility(state, { cardUid: "t0" });
  assert.equal(state.luckyCoins, 1);
});
