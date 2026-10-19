// Uso: node scripts/simulate.js [corridas]
// Simula combates con un jugador ingenuo para tener una referencia al ajustar data/balance.json.
import { buildDeckList, createCombat, createPokemon } from "../src/engine/index.js";
import { loadGameData } from "../src/node/loadGameData.js";
import { playGreedyTurn } from "../src/tools/greedyPlayer.js";

const data = loadGameData();
const runs = Number(process.argv[2] ?? 200);
const maxTurns = 60;
const partySpecies = ["servine", "pignite", "dewott", "watchog", "tranquill", "boldore"];

function runOne(encounter, seed) {
  const party = partySpecies.map((speciesId, index) =>
    createPokemon({ uid: `p${index + 1}`, speciesId, side: "player", row: index < 3 ? "front" : "back" }, data)
  );
  const state = createCombat({
    data,
    party,
    enemies: encounter.enemies,
    deckCardIds: buildDeckList(data.startingDeck),
    seed,
    kind: encounter.kind
  });
  while (!state.result && state.turn <= maxTurns) playGreedyTurn(state);
  return { result: state.result ?? "timeout", turns: state.turn };
}

console.log(`Party: ${partySpecies.join(", ")} | ${runs} corridas por encuentro | jugador ingenuo\n`);
for (const [id, encounter] of Object.entries(data.encounters)) {
  const outcomes = Array.from({ length: runs }, (_, seed) => runOne(encounter, seed + 1));
  const wins = outcomes.filter((outcome) => outcome.result === "victory");
  const timeouts = outcomes.filter((outcome) => outcome.result === "timeout").length;
  const averageTurns = outcomes.reduce((total, outcome) => total + outcome.turns, 0) / runs;
  console.log(
    `${id.padEnd(18)} victorias ${((wins.length / runs) * 100).toFixed(0).padStart(3)}%` +
      ` | turnos promedio ${averageTurns.toFixed(1)} | timeouts ${timeouts}`
  );
}
