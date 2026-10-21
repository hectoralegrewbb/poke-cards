import assert from "node:assert/strict";
import test from "node:test";
import { validateGameData } from "../src/engine/index.js";
import { ensureOwnTypeMoves } from "../scripts/moveRules.js";
import { data } from "./helpers.js";

test("toda especie tiene un ataque de daño de cada uno de sus tipos", () => {
  for (const [id, species] of Object.entries(data.species)) {
    for (const type of species.types) {
      assert.ok(species.moves.some((moveId) => data.moves[moveId].type === type && data.moves[moveId].power > 0), `${id} sin ataque ${type}`);
    }
  }
});

test("la validación de datos rechaza una especie sin ataque de su tipo", () => {
  const broken = structuredClone(data);
  broken.species.garchomp.moves = ["tackle", "scratch", "quickAttack", "slam"];
  const errors = validateGameData(broken);
  assert.ok(errors.some((message) => message.includes("garchomp") && message.includes("dragon")));
});

test("ensureOwnTypeMoves repara, es idempotente y conserva un ataque libre", () => {
  const damaged = structuredClone(data.species);
  damaged.garchomp.moves = ["tackle", "scratch", "quickAttack", "slam"];
  damaged.pidgeot.moves = ["tackle", "quickAttack", "doubleEdge", "bodySlam"];
  const fixed = ensureOwnTypeMoves(damaged, data.moves);
  assert.deepEqual(ensureOwnTypeMoves(fixed, data.moves), fixed);
  for (const id of ["garchomp", "pidgeot"]) {
    for (const type of fixed[id].types) assert.ok(fixed[id].moves.some((moveId) => data.moves[moveId].type === type && data.moves[moveId].power > 0), `${id} ${type}`);
    assert.ok(fixed[id].moves.some((moveId) => data.moves[moveId].cost === 0 && data.moves[moveId].cooldown === 0 && data.moves[moveId].power > 0));
    assert.equal(fixed[id].moves.length, 4);
    assert.equal(new Set(fixed[id].moves).size, 4);
  }
});
