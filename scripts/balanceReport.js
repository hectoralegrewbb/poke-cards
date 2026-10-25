// Uso: node scripts/balanceReport.js [corridas] [explorer|trainer|expert] [regional|global] [región|random]
// Reporte de balance con el bot "razonable": tasa de victoria por combate y por etapa.
// Es una referencia relativa (dónde se endurece el juego), no una medida de dificultad humana.
import { createRun } from "../src/run/index.js";
import { loadGameData } from "../src/node/loadGameData.js";
import { playSmartRun } from "../src/tools/smartRunBot.js";

const data = loadGameData();
const runs = Number(process.argv[2] ?? 200);
const difficulty = process.argv[3] ?? "trainer";
const mode = process.argv[4] ?? "regional";
const starters = data.region.start.starterChoices.flatMap((group) => group.species);

const stageStats = {};
const leagueStats = {};
const kindStats = {};
let victories = 0;
let badgesTotal = 0;
const deaths = {};

function bucket(map, key) { return (map[key] ??= { fights: 0, wins: 0, hpLeft: 0, turns: 0 }); }

for (let seed = 1; seed <= runs; seed += 1) {
  const run = createRun({ data, seed, difficulty, mode, regionId: mode === "regional" ? (process.argv[5] ?? "random") : undefined, starterIds: [starters[seed % starters.length]] });
  playSmartRun(run, {
    qualifySecret: process.env.SECRET === "1",
    onFight(fight) {
      const inGyms = fight.kind !== "eliteFour" && fight.kind !== "champion";
      const label = fight.node === "gym" ? `gimnasio ${fight.stage + 1}` : `rutas ${fight.stage + 1}`;
      const entry = bucket(inGyms ? stageStats : leagueStats, inGyms ? label : fight.kind);
      const kind = bucket(kindStats, fight.node);
      for (const target of [entry, kind]) {
        target.fights += 1;
        target.wins += fight.result === "victory" ? 1 : 0;
        target.hpLeft += fight.hpLeft / fight.hpMax;
        target.turns += fight.turns;
      }
    }
  });
  badgesTotal += run.badges.length;
  if (run.result === "victory") victories += 1;
  else {
    const label = run.stageIndex < run.campaign.stages.length ? `gym${run.stageIndex + 1}` : `liga${run.step}`;
    deaths[label] = (deaths[label] ?? 0) + 1;
  }
}

const row = (name, s) =>
  `${name.padEnd(12)} combates ${String(s.fights).padStart(5)} | victorias ${((s.wins / s.fights) * 100).toFixed(0).padStart(3)}% | PS restantes ${((s.hpLeft / s.fights) * 100).toFixed(0).padStart(3)}% | turnos ${(s.turns / s.fights).toFixed(1)}`;

console.log(`${runs} corridas · ${mode} · ${difficulty} · bot razonable`);
console.log(`campeón ${((victories / runs) * 100).toFixed(0)}% · medallas promedio ${(badgesTotal / runs).toFixed(2)}`);
console.log("\nPor etapa (rutas y gimnasio por separado):");
Object.keys(stageStats).sort((a, b) => a.split(" ")[1] - b.split(" ")[1] || a.localeCompare(b)).forEach((key) => console.log("  " + row(key, stageStats[key])));
console.log("\nLiga:");
Object.keys(leagueStats).forEach((key) => console.log("  " + row(key, leagueStats[key])));
console.log("\nPor tipo de nodo:");
Object.keys(kindStats).forEach((key) => console.log("  " + row(key, kindStats[key])));
console.log("\nDerrotas por etapa:", deaths);
