import assert from "node:assert/strict";
import test from "node:test";
import { loadingDurationMs, loadingProgress } from "../web/ui/loadingCurve.js";

test("la carga dura entre 6 y 7 segundos", () => {
  assert.ok(loadingDurationMs >= 6000 && loadingDurationMs <= 7000);
});

test("la barra acelera hasta el 90 % y luego avanza despacio hasta completar el tiempo", () => {
  const total = loadingDurationMs;
  assert.equal(loadingProgress(0), 0);
  assert.equal(loadingProgress(total), 100);
  const fastEnd = total * 0.4;
  assert.ok(Math.abs(loadingProgress(fastEnd) - 90) < 0.001);
  // acelera: más avance en el último segundo del tramo rápido que en el primero
  assert.ok(loadingProgress(fastEnd) - loadingProgress(fastEnd - 1000) > loadingProgress(1000) - loadingProgress(0));
  // el tramo final es lento: menos de 10 puntos repartidos en más de la mitad del tiempo
  const slowRate = (100 - 90) / (total - fastEnd);
  const fastRate = (loadingProgress(fastEnd) - loadingProgress(fastEnd - 100)) / 100;
  assert.ok(slowRate < fastRate / 4);
  // monótona
  let previous = -1;
  for (let t = 0; t <= total; t += 50) { const value = loadingProgress(t); assert.ok(value >= previous); previous = value; }
});
