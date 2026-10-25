// Estimación del nivel enemigo de cada destino del mapa. Arma el encuentro con una COPIA del RNG de la corrida,
// así que no altera la partida y coincide con el combate real si entras sin hacer nada que consuma azar antes.
import { averageLevel, createRng, isAlive, speciesLevel } from "../engine/index.js";
import { buildEncounter } from "./encounterBuilder.js";

const noCombat = new Set(["camp", "shop", "pokeCenter"]);

export function partyLevel(run) {
  return averageLevel(run.party.filter(isAlive));
}

export function estimateNodeLevel(run, node) {
  if (!node || noCombat.has(node.type)) return null;
  const probe = { ...run, rng: createRng(run.seed, run.rng.getState()) };
  const { enemies } = buildEncounter(probe, node);
  const levels = enemies.map((enemy) => speciesLevel(run.data, enemy.speciesId, enemy.scale));
  const average = Math.round(levels.reduce((total, level) => total + level, 0) / levels.length);
  return { average, highest: Math.max(...levels), count: levels.length };
}
