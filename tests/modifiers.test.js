import assert from "node:assert/strict";
import test from "node:test";
import { endPlayerTurn, getMoveCost, getPowerBonus, playMove } from "../src/engine/index.js";
import { data, makeCombat, makeSturdy, setHand } from "./helpers.js";

const use = (state, pokemonUid, moveIndex, targetUid, payCardUids = []) =>
  playMove(state, { pokemonUid, moveIndex, targetUid, payCardUids });

test("Agilidad baja 1 el cooldown de las técnicas de todo el equipo", () => {
  const state = makeCombat({ party: ["treecko", "tepig"], enemies: [{ speciesId: "patrat" }] });
  const [treecko, tepig] = state.teams.player;
  tepig.cooldowns = [0, 3, 2, 1];
  treecko.cooldowns = [0, 2, 0, 0];
  setHand(state, ["energyBasic"]);
  const result = use(state, "p1", 3, "p1", ["t0"]);
  assert.equal(result.ok, true);
  assert.deepEqual(tepig.cooldowns, [0, 2, 1, 0]);
  assert.deepEqual(treecko.cooldowns.slice(0, 3), [0, 1, 0]);
});

test("Espacio raro: las técnicas cuestan 1 menos durante 5 turnos y luego vuelven", () => {
  const state = makeCombat({ party: ["zorua", "snivy"], enemies: [{ speciesId: "roggenrola" }] });
  makeSturdy(state);
  const [zorua] = state.teams.player;
  const bite = data.moves.bite;
  assert.equal(getMoveCost(state, zorua, bite), 1);

  setHand(state, ["energyBasic", "energyBasic"]);
  assert.equal(use(state, "p1", 3, "p1", ["t0", "t1"]).ok, true); // cuesta 2 y se paga con 2
  assert.equal(getMoveCost(state, zorua, bite), 0);
  assert.equal(state.modifiers.length, 1);

  for (let turn = 2; turn <= 5; turn += 1) {
    endPlayerTurn(state);
    assert.equal(state.turn, turn);
    assert.equal(getMoveCost(state, zorua, bite), 0, `turno ${turn}`);
  }
  endPlayerTurn(state);
  assert.equal(state.turn, 6);
  assert.equal(getMoveCost(state, zorua, bite), 1);
  assert.equal(state.modifiers.length, 0);
});

test("con el costo reducido alcanza con menos cartas", () => {
  const state = makeCombat({ party: ["zorua", "snivy"], enemies: [{ speciesId: "roggenrola" }] });
  makeSturdy(state);
  setHand(state, ["energyBasic", "energyBasic", "energyBasic"]);
  assert.equal(use(state, "p1", 1, "e1").error, "insufficientEnergy"); // bite cuesta 1
  use(state, "p1", 3, "p1", ["t0", "t1"]);
  endPlayerTurn(state);
  setHand(state, []);
  assert.equal(use(state, "p1", 1, "e1").ok, true); // ahora cuesta 0
});

test("Danza espada suma poder físico por 3 turnos y no a los especiales", () => {
  const state = makeCombat({ party: ["charmander", "tepig"], enemies: [{ speciesId: "roggenrola" }] });
  makeSturdy(state);
  setHand(state, ["energyBasic"]);
  use(state, "p1", 3, "p1", ["t0"]);
  const scratch = use(state, "p1", 0, "e1");
  assert.equal(scratch.ok, false); // ya actuó este turno
  const physical = use(state, "p2", 1, "e1"); // Placaje (físico)
  const hit = physical.events.find((event) => event.type === "damage");
  assert.equal(hit.boostPower, 3);
  assert.equal(getPowerBonus(state, state.teams.player[1], data.moves.ember), 0); // Ascuas es especial
});

test("Carga agrega 2 cartas de energía a la mano", () => {
  const state = makeCombat({ party: ["blitzle", "snivy"], enemies: [{ speciesId: "patrat" }] });
  setHand(state, []);
  const result = use(state, "p1", 3, "p1");
  assert.equal(result.ok, true);
  assert.deepEqual(state.deck.hand.map((card) => card.cardId), ["energyBasic", "energyBasic"]);
  assert.equal(new Set(state.deck.hand.map((card) => card.uid)).size, 2);
});

test("pasivas estáticas: Impulso baja costos y Técnico sube el poder de lo gratis", () => {
  const blaziken = makeCombat({ party: ["blaziken"], enemies: [{ speciesId: "patrat" }] });
  assert.equal(getMoveCost(blaziken, blaziken.teams.player[0], data.moves.flareBlitz), 1);
  assert.equal(getMoveCost(blaziken, blaziken.teams.player[0], data.moves.armThrust), 1);

  const charizard = makeCombat({ party: ["charizard"], enemies: [{ speciesId: "patrat" }] });
  const [zard] = charizard.teams.player;
  assert.equal(getPowerBonus(charizard, zard, data.moves.gust), 2);
  assert.equal(getPowerBonus(charizard, zard, data.moves.flamethrower), 0);
});

test("pasivas de inicio de combate: escudo, escudo de equipo y moneda de la suerte", () => {
  const blastoise = makeCombat({ party: ["blastoise"], enemies: [{ speciesId: "patrat" }] });
  assert.equal(blastoise.teams.player[0].shield, 6);

  const torterra = makeCombat({ party: ["torterra", "snivy"], enemies: [{ speciesId: "patrat" }] });
  assert.deepEqual(torterra.teams.player.map((pokemon) => pokemon.shield), [3, 3]);

  const empoleon = makeCombat({ party: ["empoleon"], enemies: [{ speciesId: "patrat" }] });
  assert.equal(empoleon.luckyCoins, 1);
  assert.equal(empoleon.deck.hand.length, 6); // el turno 1 sigue siendo la mano inicial
});

test("pasivas de turno: Reflejos y Aroma sanador", () => {
  const state = makeCombat({ party: ["sceptile", "meganium"], enemies: [{ speciesId: "roggenrola" }] });
  makeSturdy(state);
  const [sceptile, meganium] = state.teams.player;
  sceptile.cooldowns = [2, 2, 2, 2];
  meganium.hp = meganium.maxHp - 10;
  const { events } = endPlayerTurn(state);
  // al inicio del turno 2: tick normal (-1) y Reflejos (-1)
  assert.deepEqual(sceptile.cooldowns, [0, 0, 0, 0]);
  assert.ok(events.some((event) => event.type === "healed" && event.targetId === "p2" && event.amount === 2));
});
