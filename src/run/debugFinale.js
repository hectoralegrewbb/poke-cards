// Atajo de prueba (?finale en la URL): arma una partida de Poké World lista para el final.
// Nunca se guarda en el almacenamiento local. Modos: "" (cumple el secreto), "normal" (no lo cumple), "gardevoir".
import { chooseAmelieEnding, createRun } from "./index.js";
import { addToRoster, newPokemon } from "./runState.js";
import { t } from "../shared/i18n.js";

const testTeam = ["charizard", "blastoise", "venusaur", "garchomp", "lucario", "tyranitar"];

export function createFinaleRun({ data, mode = "" }) {
  const run = createRun({ data, seed: 777, mode: "global", difficulty: "trainer", starterIds: [testTeam[0]] });
  for (const speciesId of testTeam.slice(1)) if (data.species[speciesId]) addToRoster(run, newPokemon(run, speciesId));
  run.badges = Array.from({ length: 8 }, (_, index) => t("Medalla {index}", { index: index + 1 }));
  run.stageIndex = run.campaign.stages.length;
  run.step = run.campaign.league.eliteFour.length + 1;
  run.node = { type: "champion" };
  run.legendaryPeak = mode === "normal" ? 3 : 0;
  run.phase = "amelieIntro";
  run.options = [];
  if (mode === "gardevoir") {
    run.phase = "amelieIntro";
    chooseAmelieEnding(run, "escape");
    run.combat.result = "victory";
    run.node = { type: "amelie" };
  }
  return run;
}
