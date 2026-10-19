import { applyDamage, calculateMoveDamage, flipCritCoins } from "./damage.js";
import { emit } from "./combatState.js";
import { applyEffects } from "./effects.js";
import { getPowerBonus } from "./modifiers.js";
import { getMoveTargets } from "./targeting.js";
import { getTypeMultiplier } from "./typeChart.js";

// Resuelve un movimiento ya validado: cooldown, daño (con monedas de crítico) y efectos secundarios.
// Lo usan tanto el jugador (actions.js) como los enemigos (enemyAi.js).
export function executeMove(state, actor, moveIndex, target, options = {}) {
  let boostPower = options.boostPower ?? 0;
  const { data, rng } = state;
  const moveId = actor.moves[moveIndex];
  const move = data.moves[moveId];

  // Un solo gasto de energía, una sola tirada de crítico y múltiples impactos si hay área.
  actor.cooldowns[moveIndex] = move.cooldown + 1;
  const targets = getMoveTargets(state, actor, move, target);
  emit(state, { type: "moveUsed", actorId: actor.uid, moveId, targetId: target.uid, targetIds: targets.map((pokemon) => pokemon.uid), boostPower });

  if (move.power > 0) {
    boostPower += getPowerBonus(state, actor, move);
    const isPlayer = actor.side === "player";
    const coins = move.critCoins ?? data.balance.combat.critCoins;
    const crit = flipCritCoins(rng, coins, isPlayer ? state.luckyCoins : 0);
    if (isPlayer) state.luckyCoins -= crit.luckyCoinsUsed;

    for (const defender of targets) {
      if (defender.hp <= 0) continue;
      const result = calculateMoveDamage({ attacker: actor, defender, move, boostPower, isCrit: crit.isCrit, balance: data.balance, typeChart: data.typeChart, targetCount: targets.length });
      const amount = result.damage;
      const applied = applyDamage(defender, amount);
      emit(state, {
        type: "damage", actorId: actor.uid, targetId: defender.uid, moveId, amount,
        absorbed: applied.absorbed, hpLost: applied.hpLost, typeMultiplier: result.typeMultiplier,
        stab: result.stab, boostPower, isCrit: result.isCrit, spread: targets.length > 1
      });
      if (applied.fainted) emit(state, { type: "fainted", pokemonId: defender.uid });
      else if (result.typeMultiplier > 0) applyEffects(state, move.effects, { side: actor.side, source: actor, target: defender });
    }
  } else {
    for (const defender of targets) {
      // Los movimientos de estado ofensivos tampoco atraviesan inmunidades de tipo.
      if (move.targetSide !== "self" && getTypeMultiplier(data.typeChart, move.type, defender.types) === 0) {
        emit(state, { type: "moveImmune", actorId: actor.uid, targetId: defender.uid, moveId });
        continue;
      }
      applyEffects(state, move.effects, { side: actor.side, source: actor, target: defender });
    }
  }
}
