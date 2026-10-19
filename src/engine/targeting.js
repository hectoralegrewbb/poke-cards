import { getLiving, getOpponentSide } from "./combatState.js";
import { getTypeMultiplier } from "./typeChart.js";

// Estrategias de targeting intercambiables (patrón Strategy). Los perfiles enemigos las combinan por pesos.
const strategies = new Map();

export function registerTargetingStrategy(name, strategy) {
  strategies.set(name, strategy);
}

export function hasTargetingStrategy(name) {
  return strategies.has(name);
}

// context: { candidates, actor, move, state }
export function pickTarget(strategyName, context) {
  const strategy = strategies.get(strategyName);
  if (!strategy) throw new Error(`Estrategia de targeting desconocida: ${strategyName}`);
  return strategy(context);
}

// Objetivos legales para un movimiento. Los movimientos "melee" solo llegan a la fila frontal
// mientras quede alguien vivo en ella. Si todos están en "front" la regla no tiene efecto.
export function getValidTargets(state, actor, move) {
  const targetSide = move.targetSide ?? "enemy";
  if (targetSide === "self") return actor.fainted || actor.hp <= 0 ? [] : [actor];

  const side = targetSide === "ally" ? actor.side : getOpponentSide(actor.side);
  const living = getLiving(state, side);
  if (targetSide === "enemy" && move.range === "melee") {
    const frontRow = living.filter((pokemon) => pokemon.row === "front");
    if (frontRow.length > 0) return frontRow;
  }
  return living;
}

// Mayor puntaje gana; los empates se resuelven con el RNG de la partida.
function pickBest(candidates, score, rng) {
  let best = [];
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const value = score(candidate);
    if (value > bestScore) {
      bestScore = value;
      best = [candidate];
    } else if (value === bestScore) {
      best.push(candidate);
    }
  }
  return rng.pick(best);
}

registerTargetingStrategy("random", ({ candidates, state }) => state.rng.pick(candidates));

registerTargetingStrategy("lowestHp", ({ candidates, state }) =>
  pickBest(candidates, (pokemon) => -pokemon.hp, state.rng)
);

registerTargetingStrategy("highestThreat", ({ candidates, state }) =>
  pickBest(candidates, (pokemon) => Math.max(pokemon.stats.atk, pokemon.stats.spa), state.rng)
);

registerTargetingStrategy("typeAdvantage", ({ candidates, move, state }) =>
  pickBest(
    candidates,
    (pokemon) => getTypeMultiplier(state.data.typeChart, move.type, pokemon.types),
    state.rng
  )
);

// El jugador elige un objetivo principal; el motor expande la selección de forma determinista.
export function getMoveTargets(state, actor, move, primaryTarget) {
  if (move.targetMode === "allEnemies") return getValidTargets(state, actor, move);
  if (move.targetMode === "targetRow") return getValidTargets(state, actor, move).filter((pokemon) => pokemon.row === primaryTarget.row);
  return [primaryTarget];
}
