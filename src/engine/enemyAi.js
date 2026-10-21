import { calculateMoveDamage } from "./damage.js";
import { emit } from "./combatState.js";
import { executeMove } from "./moveExecution.js";
import { getMoveTargets, getValidTargets, pickTarget } from "./targeting.js";
import { consumeFlinch, consumeParalysis } from "./status.js";

export const movePolicies = Object.freeze(["strongestFirst", "random"]);

function getProfile(state, enemy) {
  return state.data.enemyProfiles[enemy.profileId] ?? state.data.enemyProfiles.default;
}

function listUsableMoves(state, enemy) {
  return enemy.moves
    .map((moveId, moveIndex) => ({ moveId, moveIndex, move: state.data.moves[moveId] }))
    .filter(
      ({ moveIndex, move }) =>
        enemy.cooldowns[moveIndex] === 0 &&
        (enemy.maxMoveCost === undefined || move.cost <= enemy.maxMoveCost) &&
        getValidTargets(state, enemy, move).length > 0
    );
}

// strongestFirst: el de mayor poder disponible (los de soporte solo salen cuando no hay ataque libre).
function chooseMove(policy, usableMoves, rng) {
  if (policy === "random") return rng.pick(usableMoves);
  const strongestPower = Math.max(...usableMoves.map(({ move }) => move.power));
  return rng.pick(usableMoves.filter(({ move }) => move.power === strongestPower));
}

export function chooseTarget(state, enemy, move) {
  const candidates = getValidTargets(state, enemy, move);
  if ((move.targetSide ?? "enemy") !== "enemy") {
    return pickTarget("lowestHp", { candidates, actor: enemy, move, state });
  }
  const { strategy } = state.rng.weightedPick(getProfile(state, enemy).targeting);
  return pickTarget(strategy, { candidates, actor: enemy, move, state });
}

// Intención visible: se planea al inicio de la ronda y el jugador la ve antes de actuar.
export function planEnemyIntent(state, enemy) {
  const usable = listUsableMoves(state, enemy);
  if (usable.length === 0) {
    enemy.intent = null;
    return null;
  }

  const { moveId, moveIndex, move } = chooseMove(getProfile(state, enemy).movePolicy, usable, state.rng);
  const target = chooseTarget(state, enemy, move);
  const damagePreview =
    move.power > 0
      ? calculateMoveDamage({
          attacker: enemy,
          defender: target,
          move,
          isCrit: false,
          balance: state.data.balance,
          typeChart: state.data.typeChart,
          targetCount: getMoveTargets(state, enemy, move, target).length
        }).damage
      : 0;

  enemy.intent = { moveIndex, moveId, targetId: target.uid, damagePreview };
  emit(state, { type: "intentPlanned", actorId: enemy.uid, ...enemy.intent });
  return enemy.intent;
}

// Daño anunciado sobre cada aliado: suma las intenciones enemigas, expandiendo las de área y de fila.
// Devuelve Map uid -> { damage, hits }. Lo usan la interfaz (marca de amenaza) y los bots.
export function getIncomingThreats(state) {
  const threats = new Map();
  for (const enemy of state.teams.enemy) {
    const intent = enemy.intent;
    if (!intent || enemy.fainted || enemy.hp <= 0) continue;
    const move = state.data.moves[intent.moveId];
    if (move.power <= 0 || (move.targetSide ?? "enemy") !== "enemy") continue;
    const primary = state.teams.player.find((pokemon) => pokemon.uid === intent.targetId);
    if (!primary) continue;
    const targets = getMoveTargets(state, enemy, move, primary);
    for (const defender of targets) {
      const { damage } = calculateMoveDamage({
        attacker: enemy, defender, move, isCrit: false, balance: state.data.balance,
        typeChart: state.data.typeChart, targetCount: targets.length
      });
      const entry = threats.get(defender.uid) ?? { damage: 0, hits: 0 };
      entry.damage += damage;
      entry.hits += 1;
      threats.set(defender.uid, entry);
    }
  }
  return threats;
}

// Si el objetivo anunciado ya no es válido (cayó), se vuelve a elegir con el mismo perfil.
export function resolveEnemyIntent(state, enemy) {
  const intent = enemy.intent;
  enemy.intent = null;
  if (consumeFlinch(state, enemy) || consumeParalysis(state, enemy)) return;
  if (!intent) {
    emit(state, { type: "enemySkipped", actorId: enemy.uid });
    return;
  }

  const move = state.data.moves[intent.moveId];
  const candidates = getValidTargets(state, enemy, move);
  if (candidates.length === 0) return;

  const target =
    candidates.find((candidate) => candidate.uid === intent.targetId) ?? chooseTarget(state, enemy, move);
  executeMove(state, enemy, intent.moveIndex, target);
}
