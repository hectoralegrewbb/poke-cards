// Objetos equipables (data/heldItems.json): cada Pokémon lleva uno, único por corrida. Este módulo es puro:
// solo calcula multiplicadores y consulta datos. Los efectos con consecuencias (curar, escudo...) viven en heldTriggers.js.

export function getHeldItem(heldItems, pokemon) {
  return pokemon?.heldItem && heldItems ? heldItems[pokemon.heldItem] ?? null : null;
}

function conditionHolds(when = {}, { holder, move, typeMultiplier, stab, isCrit }) {
  if (when.category && move?.category !== when.category) return false;
  if (when.superEffective && !(typeMultiplier > 1)) return false;
  if (when.stab && !stab) return false;
  if (when.crit && !isCrit) return false;
  if (when.hpBelow !== undefined && !(holder.hp / holder.maxHp < when.hpBelow)) return false;
  if (when.minCost !== undefined && !(move?.cost >= when.minCost)) return false;
  if (when.maxCost !== undefined && !(move?.cost <= when.maxCost)) return false;
  if (when.firstAttack && holder.heldState?.struck) return false;
  return true;
}

function modifiersOf(heldItems, pokemon, kind) {
  return (getHeldItem(heldItems, pokemon)?.modifiers ?? []).filter((modifier) => modifier.kind === kind);
}

function product(modifiers, context) {
  return modifiers.filter((modifier) => conditionHolds(modifier.when, context)).reduce((total, modifier) => total * modifier.mult, 1);
}

// Multiplicador de daño total que aportan los objetos del atacante (lo que inflige) y del defensor (lo que recibe).
export function damageItemMultiplier(heldItems, { attacker, defender, move, typeMultiplier, stab, isCrit }) {
  if (!heldItems) return 1;
  return product(modifiersOf(heldItems, attacker, "damageDealt"), { holder: attacker, move, typeMultiplier, stab, isCrit })
    * product(modifiersOf(heldItems, defender, "damageTaken"), { holder: defender, move, typeMultiplier, stab, isCrit });
}

export function flatDamageReduction(heldItems, defender) {
  return modifiersOf(heldItems, defender, "flatReduction").reduce((total, modifier) => total + modifier.amount, 0);
}

export function critCoinDelta(heldItems, attacker) {
  return modifiersOf(heldItems, attacker, "critCoins").reduce((total, modifier) => total + modifier.amount, 0);
}

export function expMultiplier(heldItems, pokemon) {
  return modifiersOf(heldItems, pokemon, "expMult").reduce((total, modifier) => total * modifier.mult, 1);
}

// Oro: los objetos de toda la party se multiplican.
export function goldMultiplier(heldItems, party) {
  return party.reduce((total, pokemon) => total * modifiersOf(heldItems, pokemon, "goldMult").reduce((sub, modifier) => sub * modifier.mult, 1), 1);
}
