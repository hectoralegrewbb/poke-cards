import assert from "node:assert/strict";
import test from "node:test";
import { buildDeckList, calculateDamage, createCombat, endPlayerTurn, evolve, executeMove, findEvolution, getLiving, levelTone, pokemonLevel, speciesLevel, validateGameData } from "../src/engine/index.js";
import {
  chooseNode, createRun, equipHeldItem, estimateNodeLevel, freeHeldItems, grantHeldItem, grantStarPieces, learnableMoves, moveChangeCost,
  partyLevel, restoreRun, rollHeldDrop, rollStarPieces, serializeRun, teachMove, unequipHeldItem
} from "../src/run/index.js";
import { data, makeParty, setHand } from "./helpers.js";

const globalRun = (seed = 11) => createRun({ data, seed, mode: "global", difficulty: "trainer", starterIds: ["charmander"] });

function combatWith(item, { party = ["snivy", "tepig"], enemies = [{ speciesId: "patrat" }], seed = 7 } = {}) {
  const members = makeParty(party);
  members[0].heldItem = item;
  return createCombat({ data, party: members, enemies, deckCardIds: buildDeckList(data.startingDeck), seed, kind: "normal" });
}

test("los datos de objetos equipables son válidos y hay al menos 20 distintos", () => {
  assert.deepEqual(validateGameData(data), []);
  assert.ok(Object.keys(data.heldItems).length >= 20);
  const names = Object.values(data.heldItems).map((item) => item.name);
  assert.equal(new Set(names).size, names.length);
});

test("Restos cura el 6% de los PS máximos al empezar cada turno (desde el 2)", () => {
  const state = combatWith("leftovers");
  const holder = state.teams.player[0];
  holder.hp = 1;
  state.teams.enemy[0].intent = null;
  state.teams.enemy[0].moves = [];
  endPlayerTurn(state);
  assert.equal(holder.hp, 1 + Math.max(1, Math.round(holder.maxHp * 0.06)));
});

test("Banda Focus salva de un golpe letal con los PS al máximo, una sola vez", () => {
  const state = combatWith("focusSash");
  const holder = state.teams.player[0];
  assert.equal(holder.focusSash, true);
  const boss = state.teams.enemy[0];
  boss.stats.atk = 999;
  boss.stats.spa = 999;
  boss.moves = ["tackle"];
  boss.cooldowns = [0];
  boss.intent = { moveIndex: 0, moveId: "tackle", targetId: holder.uid, damagePreview: 0 };
  executeMove(state, boss, 0, holder, { boostPower: 500 });
  assert.equal(holder.hp, 1);
  assert.equal(holder.focusSash, false);
  assert.ok(state.log.some((event) => event.type === "berrySaved" && event.by === "sash"));
});

test("Vidasfera sube el daño un 30% y Casco Dentado devuelve daño al atacante físico", () => {
  const attacker = makeParty(["snivy"])[0];
  const defender = makeParty(["tepig"])[0];
  const move = data.moves.tackle;
  const base = { attacker, defender, move, isCrit: false, balance: data.balance, typeChart: data.typeChart, heldItems: data.heldItems };
  const plain = calculateDamage(base).damage;
  attacker.heldItem = "lifeOrb";
  const boosted = calculateDamage(base).damage;
  assert.ok(boosted > plain);
  attacker.heldItem = null;
  defender.heldItem = "stoneArmor";
  assert.equal(calculateDamage(base).damage, Math.max(1, plain - 2));
});

test("Casco Dentado: quien golpea con un ataque físico pierde PS", () => {
  const state = combatWith("rockyHelmet", { enemies: [{ speciesId: "rattata" }] });
  const holder = state.teams.player[0];
  const enemy = state.teams.enemy[0];
  enemy.moves = ["tackle"];
  enemy.cooldowns = [0];
  const before = enemy.hp;
  executeMove(state, enemy, 0, holder);
  assert.ok(enemy.hp < before);
  assert.ok(state.log.some((event) => event.type === "recoil" && event.targetId === enemy.uid));
});

test("los objetos no se repiten: se obtienen una vez y los lleva un solo Pokémon", () => {
  const run = globalRun();
  assert.equal(grantHeldItem(run, "leftovers").ok, true);
  assert.equal(grantHeldItem(run, "leftovers").error, "alreadyOwned");
  const [first] = run.party;
  assert.equal(equipHeldItem(run, "leftovers", first.uid).ok, true);
  assert.deepEqual(freeHeldItems(run), []);
  assert.equal(equipHeldItem(run, "nope", first.uid).error, "notOwned");
  assert.equal(unequipHeldItem(run, first.uid).ok, true);
  assert.deepEqual(freeHeldItems(run), ["leftovers"]);
});

test("equipar un objeto en otro Pokémon se lo quita al anterior y no se puede en combate", () => {
  const run = globalRun();
  run.party.push(makeParty(["snivy"])[0]);
  run.party[1].uid = "r99";
  grantHeldItem(run, "oranBerry");
  equipHeldItem(run, "oranBerry", run.party[0].uid);
  equipHeldItem(run, "oranBerry", run.party[1].uid);
  assert.equal(run.party[0].heldItem, null);
  assert.equal(run.party[1].heldItem, "oranBerry");
  run.phase = "combat";
  assert.equal(equipHeldItem(run, "oranBerry", run.party[0].uid).error, "notDuringCombat");
});

test("los objetos caen sin repetir y respetan el nivel permitido por las medallas", () => {
  const run = globalRun(5);
  const dropped = new Set();
  for (let index = 0; index < 60; index += 1) {
    const id = rollHeldDrop(run, "gym");
    assert.ok(id, "el gimnasio siempre da objeto mientras queden");
    assert.equal(data.heldItems[id].tier, 1, "sin medallas solo salen objetos de nivel 1");
    assert.ok(!dropped.has(id));
    dropped.add(id);
    grantHeldItem(run, id);
    if (dropped.size >= Object.values(data.heldItems).filter((item) => item.tier === 1).length) break;
  }
  assert.equal(rollHeldDrop(run, "gym"), null, "agotados los de nivel 1 no sale nada hasta tener más medallas");
  assert.equal(rollHeldDrop(run, "wild"), null);
});

test("los objetos equipados y la mochila sobreviven al guardado", () => {
  const run = globalRun();
  grantHeldItem(run, "luckyEgg");
  equipHeldItem(run, "luckyEgg", run.party[0].uid);
  grantStarPieces(run, 4);
  const restored = restoreRun(data, serializeRun(run));
  assert.deepEqual(restored.heldOwned, ["luckyEgg"]);
  assert.equal(restored.party[0].heldItem, "luckyEgg");
  assert.equal(restored.starPieces, 4);
});

test("Huevo Suerte da +30% de EXP al portador al ganar", () => {
  const state = combatWith("luckyEgg", { party: ["snivy", "tepig"], enemies: [{ speciesId: "patrat" }] });
  const [holder, other] = state.teams.player;
  const enemy = state.teams.enemy[0];
  enemy.hp = 0;
  enemy.fainted = true;
  endPlayerTurn(state);
  assert.equal(state.result, "victory");
  assert.ok(holder.exp > other.exp);
});

test("piezas de estrella: nada en zonas salvajes, entre 1 y 10 en el resto", () => {
  const run = globalRun(3);
  assert.equal(rollStarPieces(run, "wild"), 0);
  for (const type of ["combat", "elite", "rival", "villain", "gym", "eliteFour", "legendary"]) {
    for (let index = 0; index < 40; index += 1) {
      const amount = rollStarPieces(run, type);
      assert.ok(amount >= 1 && amount <= 10, `${type}: ${amount}`);
    }
  }
});

test("tutor: cambia una técnica por otra que pueda aprender, cuesta 1-5 piezas y no es gratis", () => {
  const run = globalRun(9);
  run.phase = "camp";
  const [pokemon] = run.party;
  const options = learnableMoves(data, pokemon);
  assert.ok(options.length >= 6);
  assert.ok(options.every((id) => !pokemon.moves.includes(id)));
  const target = options[0];
  const cost = moveChangeCost(data, target);
  assert.ok(cost >= 1 && cost <= 5);
  assert.equal(teachMove(run, pokemon.uid, 0, target).error, "notEnoughStars");
  grantStarPieces(run, 20);
  assert.equal(teachMove(run, pokemon.uid, 9, target).error, "invalidMoveIndex");
  assert.equal(teachMove(run, pokemon.uid, 0, "no-existe").error, "notLearnable");
  const result = teachMove(run, pokemon.uid, 0, target);
  assert.equal(result.ok, true);
  assert.equal(pokemon.moves[0], target);
  assert.equal(run.starPieces, 20 - cost);
  assert.equal(teachMove(run, pokemon.uid, 1, pokemon.moves[0]).error, "notLearnable", "ya la sabe");
  run.phase = "map";
  assert.equal(teachMove(run, pokemon.uid, 1, options[1]).error, "notInCamp");
});

test("las técnicas enseñadas se conservan al evolucionar", () => {
  const [pokemon] = makeParty(["charmander"]);
  pokemon.moves[3] = learnableMoves(data, pokemon)[0];
  const taught = pokemon.moves[3];
  const evolution = data.species.charmander.evolutions.find((entry) => entry.method === "exp");
  evolve(pokemon, evolution, data);
  assert.equal(pokemon.speciesId, evolution.to);
  assert.equal(pokemon.moves[3], taught);
  assert.deepEqual(pokemon.moves.slice(0, 3), data.species[evolution.to].moves.slice(0, 3));
});

test("nivel de poder: crece con las estadísticas y es el mismo cálculo para aliados y enemigos", () => {
  const [weak, strong] = makeParty(["rattata", "mewtwo"]);
  assert.ok(pokemonLevel(strong) > pokemonLevel(weak));
  assert.equal(speciesLevel(data, "mewtwo"), pokemonLevel(strong));
  assert.ok(speciesLevel(data, "mewtwo", { hp: 1.5, stats: 1.3 }) > speciesLevel(data, "mewtwo"));
  assert.equal(levelTone(10, 20), "easy");
  assert.equal(levelTone(20, 20), "even");
  assert.equal(levelTone(25, 20), "hard");
  assert.equal(levelTone(40, 20), "deadly");
});

test("el nivel estimado del destino coincide con el combate real y no altera la corrida", () => {
  const run = globalRun(21);
  const before = run.rng.getState();
  const estimates = run.options.map((node) => estimateNodeLevel(run, node));
  assert.equal(run.rng.getState(), before, "la estimación no consume azar de la corrida");
  const index = run.options.findIndex((node, position) => estimates[position] && !["legendary"].includes(node.type));
  assert.ok(index >= 0);
  chooseNode(run, index);
  const real = run.combat.teams.enemy.map(pokemonLevel);
  const average = Math.round(real.reduce((total, level) => total + level, 0) / real.length);
  assert.equal(estimates[index].average, average);
  assert.ok(partyLevel(run) > 0);
});

test("Baya Aranja cura una sola vez al bajar del 50% de PS", () => {
  const state = combatWith("oranBerry", { enemies: [{ speciesId: "rattata" }] });
  const holder = state.teams.player[0];
  holder.maxHp = 100;
  holder.hp = 100;
  const enemy = state.teams.enemy[0];
  enemy.moves = ["tackle"];
  enemy.cooldowns = [0];
  enemy.stats.atk = 999;
  executeMove(state, enemy, 0, holder, { boostPower: 16 });
  assert.ok(holder.hp > 0, `hp ${holder.hp}`);
  const healedEvents = state.log.filter((event) => event.type === "healed" && event.targetId === holder.uid);
  assert.equal(healedEvents.length, 1);
  assert.equal(holder.heldState.spent, true);
  executeMove(state, enemy, 0, holder, { boostPower: 4 });
  assert.equal(state.log.filter((event) => event.type === "healed" && event.targetId === holder.uid).length, 1, "no cura una segunda vez");
});

test("Concha Campana cura parte del daño que inflige el portador", () => {
  const state = combatWith("shellBell", { enemies: [{ speciesId: "snorlax" }] });
  const holder = state.teams.player[0];
  holder.hp = 1;
  const enemy = state.teams.enemy[0];
  executeMove(state, holder, 0, enemy);
  assert.ok(holder.hp > 1);
});

test("Pañuelo Sabio roba una carta extra al empezar el turno y Garra Rápida acorta los cooldowns", () => {
  const wise = combatWith("wiseCloth");
  wise.teams.enemy[0].moves = [];
  wise.teams.enemy[0].intent = null;
  const before = wise.deck.hand.length;
  endPlayerTurn(wise);
  assert.equal(wise.deck.hand.length, Math.min(data.balance.hand.maxSize, before + data.balance.hand.drawPerTurn + 1));
  const quick = combatWith("quickClaw");
  quick.teams.enemy[0].moves = [];
  quick.teams.enemy[0].intent = null;
  const holder = quick.teams.player[0];
  holder.cooldowns = holder.cooldowns.map(() => 3);
  endPlayerTurn(quick);
  assert.ok(holder.cooldowns.every((value) => value === 1), `cooldowns ${holder.cooldowns}`);
});
