import assert from "node:assert/strict";
import test from "node:test";
import { validateGameData } from "../src/engine/index.js";
import { data } from "./helpers.js";

test("los JSON de /data son consistentes entre sí", () => {
  assert.deepEqual(validateGameData(data), []);
});

test("validateGameData detecta referencias rotas", () => {
  const broken = structuredClone(data);
  broken.species.snivy.moves[0] = "noExiste";
  broken.species.snivy.evolutions[0].to = "fantasma";
  broken.enemyProfiles.default.targeting[0].strategy = "inventada";
  broken.encounters.route1Duo.enemies.push(...broken.encounters.route1Duo.enemies);

  const errors = validateGameData(broken);
  assert.ok(errors.some((message) => message.includes("noExiste")));
  assert.ok(errors.some((message) => message.includes("fantasma")));
  assert.ok(errors.some((message) => message.includes("inventada")));
  assert.ok(errors.some((message) => message.includes("route1Duo")));
});
