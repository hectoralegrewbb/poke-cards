import assert from "node:assert/strict";
import test from "node:test";
import { applyDamage, calculateDamage, createRng, flipCritCoins, getTypeMultiplier } from "../src/engine/index.js";
import { data } from "./helpers.js";

const combat = data.balance.combat;
const fighter = (types) => ({ types, stats: { atk: 10, def: 10, spa: 10, spd: 10 } });
const fireMove = { type: "fire", category: "special", power: 10 };

function damage(attacker, defender, move, extra = {}) {
  return calculateDamage({
    attacker,
    defender,
    move,
    isCrit: false,
    balance: data.balance,
    typeChart: data.typeChart,
    ...extra
  });
}

test("tabla de tipos de Gen 5", () => {
  const chart = data.typeChart;
  assert.equal(getTypeMultiplier(chart, "fire", ["grass"]), 2);
  assert.equal(getTypeMultiplier(chart, "fire", ["grass", "steel"]), 4);
  assert.equal(getTypeMultiplier(chart, "fire", ["water", "rock"]), 0.25);
  assert.equal(getTypeMultiplier(chart, "ground", ["flying"]), 0);
  assert.equal(getTypeMultiplier(chart, "normal", ["ghost"]), 0);
  assert.equal(getTypeMultiplier(chart, "ghost", ["steel"]), 0.5);
  assert.equal(getTypeMultiplier(chart, "dark", ["steel"]), 0.5);
});

test("daño: STAB, efectividad, crítico y refuerzo de cartas", () => {
  const neutral = damage(fighter(["normal"]), fighter(["normal"]), fireMove).damage;
  assert.equal(neutral, 10);
  assert.equal(damage(fighter(["fire"]), fighter(["normal"]), fireMove).damage, Math.round(10 * combat.stabMultiplier));
  assert.equal(damage(fighter(["fire"]), fighter(["grass"]), fireMove).damage, Math.round(10 * combat.stabMultiplier * 2));
  assert.equal(
    damage(fighter(["fire"]), fighter(["grass"]), fireMove, { isCrit: true }).damage,
    Math.round(10 * combat.stabMultiplier * 2 * combat.critMultiplier)
  );
  assert.equal(damage(fighter(["normal"]), fighter(["normal"]), fireMove, { boostPower: 3 }).damage, 13);
});

test("daño: inmunidad da 0 y la relación de stats está acotada", () => {
  const groundMove = { type: "ground", category: "physical", power: 10 };
  assert.equal(damage(fighter(["normal"]), fighter(["flying"]), groundMove).damage, 0);

  const strong = { types: ["normal"], stats: { atk: 40, def: 10, spa: 10, spd: 10 } };
  const physicalNormal = { type: "normal", category: "physical", power: 10 };
  const expected = Math.round(10 * combat.statRatioMax * combat.stabMultiplier); // el atacante es Normal: hay STAB
  assert.equal(damage(strong, fighter(["normal"]), physicalNormal).damage, expected);
});

test("applyDamage: el escudo absorbe primero y marca fainted", () => {
  const target = { hp: 10, shield: 5, fainted: false };
  assert.deepEqual(applyDamage(target, 8), { absorbed: 5, hpLost: 3, fainted: false });
  assert.equal(target.hp, 7);
  assert.equal(target.shield, 0);

  const result = applyDamage(target, 50);
  assert.equal(result.hpLost, 7);
  assert.equal(result.fainted, true);
  assert.equal(target.hp, 0);
});

test("crítico con 4 monedas ocurre ~6,25% de las veces", () => {
  const rng = createRng(123);
  const trials = 16000;
  let crits = 0;
  for (let i = 0; i < trials; i += 1) {
    if (flipCritCoins(rng, 4).isCrit) crits += 1;
  }
  const rate = crits / trials;
  assert.ok(rate > 0.045 && rate < 0.08, `rate=${rate}`);
});

test("las monedas de la suerte reducen las monedas de crítico (mínimo 1)", () => {
  assert.equal(flipCritCoins(createRng(1), 4, 2).luckyCoinsUsed, 2);
  assert.equal(flipCritCoins(createRng(1), 4, 10).luckyCoinsUsed, 3);
  assert.equal(flipCritCoins(createRng(1), 1, 5).luckyCoinsUsed, 0);
});
