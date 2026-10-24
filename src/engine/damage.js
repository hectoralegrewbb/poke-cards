import { getTypeMultiplier } from "./typeChart.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Crítico = todas las monedas salen cara. Cada moneda de la suerte quita una moneda (mínimo 1).
export function flipCritCoins(rng, coins, luckyCoins = 0) {
  const effectiveCoins = Math.max(1, coins - luckyCoins);
  let heads = 0;
  for (let i = 0; i < effectiveCoins; i += 1) {
    if (rng.flip()) heads += 1;
  }
  return { isCrit: heads === effectiveCoins, luckyCoinsUsed: coins - effectiveCoins };
}

export function calculateDamage({ attacker, defender, move, boostPower = 0, isCrit, balance, typeChart }) {
  const combat = balance.combat;
  const isPhysical = move.category === "physical";
  const attackStat = (isPhysical ? attacker.stats.atk : attacker.stats.spa) * (isPhysical && attacker.status === "burn" ? 0.75 : 1);
  const defenseStat = isPhysical ? defender.stats.def : defender.stats.spd;
  const statRatio = clamp(attackStat / defenseStat, combat.statRatioMin, combat.statRatioMax);
  const typeMultiplier = getTypeMultiplier(typeChart, move.type, defender.types);
  const stab = attacker.types.includes(move.type) ? combat.stabMultiplier : 1;
  const critMultiplier = isCrit ? combat.critMultiplier : 1;

  const raw = (move.power + boostPower) * statRatio * stab * typeMultiplier * critMultiplier;
  const damage = typeMultiplier === 0 ? 0 : Math.max(1, Math.round(raw));
  return { damage, typeMultiplier, isCrit, stab: stab > 1 };
}

// Fuente única de daño real y previsualización: incluye la reducción por área.
export function calculateMoveDamage({ targetCount = 1, ...options }) {
  const base = calculateDamage(options);
  const factor = targetCount > 1 ? (options.move.spreadMultiplier ?? 0.72) : 1;
  const damage = base.damage === 0 ? 0 : Math.max(1, Math.round(base.damage * factor));
  return { ...base, damage, spreadMultiplier: factor, isSpread: targetCount > 1 };
}

// El escudo absorbe primero. Muta al objetivo y marca fainted si llega a 0.
export function applyDamage(target, amount) {
  const absorbed = Math.min(target.shield, amount);
  target.shield -= absorbed;
  let hpLost = Math.min(target.hp, amount - absorbed);
  // Baya Zidra: un golpe letal deja al Pokémon con 1 PS y consume la baya.
  const saved = hpLost > 0 && hpLost >= target.hp && Boolean(target.berryGuard);
  if (saved) {
    hpLost = target.hp - 1;
    target.berryGuard = false;
  }
  target.hp -= hpLost;
  if (target.hp <= 0) {
    target.hp = 0;
    target.fainted = true;
    target.status = null;
    target.staggered = false;
  }
  return { absorbed, hpLost, fainted: target.fainted, saved };
}
