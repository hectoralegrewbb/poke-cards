import assert from "node:assert/strict";
import test from "node:test";
import { createRng } from "../src/engine/index.js";

test("la misma semilla produce la misma secuencia", () => {
  const a = createRng(42);
  const b = createRng(42);
  const sequenceA = Array.from({ length: 10 }, () => a.next());
  const sequenceB = Array.from({ length: 10 }, () => b.next());
  assert.deepEqual(sequenceA, sequenceB);
  assert.notDeepEqual(sequenceA, Array.from({ length: 10 }, () => createRng(43).next()));
});

test("int respeta los límites e incluye ambos extremos", () => {
  const rng = createRng(1);
  const values = Array.from({ length: 2000 }, () => rng.int(3, 6));
  assert.ok(values.every((value) => value >= 3 && value <= 6));
  assert.deepEqual([...new Set(values)].sort(), [3, 4, 5, 6]);
});

test("shuffle conserva los elementos", () => {
  const rng = createRng(5);
  const shuffled = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual([...shuffled].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);
});

test("weightedPick respeta los pesos", () => {
  const rng = createRng(9);
  const entries = [
    { name: "a", weight: 3 },
    { name: "b", weight: 1 }
  ];
  const picks = Array.from({ length: 20000 }, () => rng.weightedPick(entries).name);
  const shareA = picks.filter((name) => name === "a").length / picks.length;
  assert.ok(shareA > 0.73 && shareA < 0.77, `shareA=${shareA}`);
});
