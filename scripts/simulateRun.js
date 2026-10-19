// Uso: node scripts/simulateRun.js [corridas]
// Juega corridas completas con el bot y resume hasta dónde llega: sirve para ajustar data/region.json.
import { createRun } from "../src/run/index.js";
import { loadGameData } from "../src/node/loadGameData.js";
import { playFullRun } from "../src/tools/runBot.js";

const data = loadGameData();
const runs = Number(process.argv[2] ?? 200);
const deathsByStage = {};
let victories = 0;
let badgesTotal = 0;

for (let seed = 1; seed <= runs; seed += 1) {
  const starters = data.region.start.starterChoices.flatMap((group) => group.species);
  const run = playFullRun(createRun({ data, seed, starterIds: [starters[seed % starters.length]] }));
  badgesTotal += run.badges.length;
  if (run.result === "victory") victories += 1;
  else {
    const label = run.stageIndex < data.region.stages.length ? `gym${run.stageIndex + 1}` : `liga${run.step}`;
    deathsByStage[label] = (deathsByStage[label] ?? 0) + 1;
  }
}

console.log(`${runs} corridas con el bot | campeón ${((victories / runs) * 100).toFixed(0)}% | medallas promedio ${(badgesTotal / runs).toFixed(1)}`);
console.log("Derrotas por etapa:", deathsByStage);
