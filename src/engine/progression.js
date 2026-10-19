import { applySpecies, isAlive } from "./pokemon.js";

export function calculateExpReward(enemies, data) {
  return enemies.reduce((total, enemy) => total + (data.species[enemy.speciesId].expYield ?? 0), 0);
}

// Reparto grupal con rendimientos decrecientes: un grupo grande no multiplica la EXP total.
export function calculatePartyExpReward(enemies, data, recipients) {
  if (recipients <= 0) return 0;
  const total = calculateExpReward(enemies, data);
  return Math.max(1, Math.round(total * 0.7 / Math.sqrt(recipients)));
}

export function grantExp(pokemon, amount) {
  if (!isAlive(pokemon)) return 0;
  pokemon.exp += amount;
  return amount;
}

// Sin itemId: busca evolución por EXP. Con itemId: busca evolución por ese ítem.
export function findEvolution(pokemon, data, { itemId = null, badges = 0 } = {}) {
  if (!isAlive(pokemon)) return null;
  const evolutions = data.species[pokemon.speciesId].evolutions ?? [];
  const match = evolutions.find((evolution) => {
    if (itemId !== null) return evolution.method === "item" && evolution.itemId === itemId;
    return evolution.method === "exp" && pokemon.exp >= evolution.expRequired && badges >= (evolution.minBadges ?? 0);
  });
  return match ?? null;
}

// Reemplaza especie, stats y los 4 movimientos. Conserva las heridas: solo suma la vida ganada.
export function evolve(pokemon, evolution, data) {
  const previousMaxHp = pokemon.maxHp;
  applySpecies(pokemon, evolution.to, data);
  const hpGained = Math.max(0, pokemon.maxHp - previousMaxHp);
  pokemon.hp = Math.min(pokemon.maxHp, pokemon.hp + hpGained);
  pokemon.exp = Math.max(0, pokemon.exp - (evolution.expRequired ?? 0));
  return pokemon;
}
