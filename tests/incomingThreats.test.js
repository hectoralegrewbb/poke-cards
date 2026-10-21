import assert from "node:assert/strict";
import test from "node:test";
import { getIncomingThreats } from "../src/engine/index.js";
import { makeCombat } from "./helpers.js";

test("getIncomingThreats: un ataque simple marca un aliado; uno de área marca a todos", () => {
  const state = makeCombat({ enemies: [{ speciesId: "patrat" }] });
  const [enemy] = state.teams.enemy;
  const target = state.teams.player[0];

  enemy.intent = { moveId: "tackle", targetId: target.uid };
  const single = getIncomingThreats(state);
  assert.deepEqual([...single.keys()], [target.uid]);

  enemy.intent = { moveId: "surf", targetId: target.uid };
  const area = getIncomingThreats(state);
  assert.equal(area.size, state.teams.player.length);
  for (const entry of area.values()) assert.ok(entry.damage > 0 && entry.hits === 1);
});
