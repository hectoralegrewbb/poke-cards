import assert from "node:assert/strict";
import test from "node:test";
import { createPokemon, evolve, findEvolution } from "../src/engine/index.js";
import { data } from "./helpers.js";

const make = (speciesId) => createPokemon({ uid: "p1", speciesId, side: "player" }, data);

test("evolución por EXP: umbral, nuevos movimientos y stats", () => {
  const snivy = make("snivy");
  snivy.exp = 54;
  assert.equal(findEvolution(snivy, data), null);

  snivy.exp = 55;
  const evolution = findEvolution(snivy, data, { badges: 2 });
  assert.equal(evolution.to, "servine");

  snivy.hp = 10;
  const previousMaxHp = snivy.maxHp;
  evolve(snivy, evolution, data);
  assert.equal(snivy.speciesId, "servine");
  assert.equal(snivy.name, "Servine");
  assert.equal(snivy.moves.length, 4);
  assert.equal(snivy.cooldowns.length, 4);
  assert.equal(snivy.exp, 0);
  assert.equal(snivy.maxHp, data.species.servine.stats.hp);
  assert.equal(snivy.hp, 10 + (snivy.maxHp - previousMaxHp)); // conserva las heridas
});

test("la evolución cambia el set de movimientos fijo", () => {
  const servine = make("servine");
  servine.exp = 110;
  evolve(servine, findEvolution(servine, data, { badges: 5 }), data);
  assert.deepEqual(servine.moves, data.species.serperior.moves);
  assert.deepEqual(servine.passive, data.species.serperior.passive);
});

test("evolución por ítem: solo con el ítem correcto y nunca por EXP", () => {
  const minccino = make("minccino");
  minccino.exp = 9999;
  assert.equal(findEvolution(minccino, data), null);
  assert.equal(findEvolution(minccino, data, { itemId: "linkCable" }), null);
  assert.equal(findEvolution(minccino, data, { itemId: "shinyStone" }).to, "cinccino");
});

test("un Pokémon debilitado no evoluciona", () => {
  const snivy = make("snivy");
  snivy.exp = 100;
  snivy.hp = 0;
  snivy.fainted = true;
  assert.equal(findEvolution(snivy, data), null);
});
