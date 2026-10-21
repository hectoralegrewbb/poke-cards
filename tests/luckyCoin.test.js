import assert from "node:assert/strict";
import test from "node:test";
import { createRng, flipCritCoins } from "../src/engine/index.js";

const critRate = (coins, lucky, runs = 20000) => {
  const rng = createRng(99);
  let crits = 0;
  for (let i = 0; i < runs; i += 1) if (flipCritCoins(rng, coins, lucky).isCrit) crits += 1;
  return crits / runs;
};

test("la moneda de la suerte sube la chance de crítico (3 monedas: 12,5% → 25%)", () => {
  const base = critRate(3, 0);
  const lucky = critRate(3, 1);
  assert.ok(Math.abs(base - 0.125) < 0.02, `base ${base}`);
  assert.ok(Math.abs(lucky - 0.25) < 0.02, `lucky ${lucky}`);
  assert.equal(flipCritCoins(createRng(1), 3, 5).luckyCoinsUsed, 2); // nunca baja de 1 moneda
});
