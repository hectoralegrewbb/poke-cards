// Presupuesto de amenaza por medalla: compartido por rutas, rivales y equipos temáticos.
// Evolución + estadísticas importan más que los PS aislados.
const stageCaps = Object.freeze([
  { tier: 0, score: 54 }, // antes de la 1.ª medalla
  { tier: 0, score: 58 }, // antes de la 2.ª medalla
  { tier: 1, score: 64 }, // antes de la 3.ª medalla
  { tier: 1, score: 69 },
  { tier: 1, score: 75 },
  { tier: 2, score: 82 },
  { tier: 2, score: 89 },
  { tier: 2, score: 110 }
]);

export function speciesThreat(species) {
  const { hp, atk, def: defense, spa, spd } = species.stats;
  return hp + atk + defense + spa + spd;
}

// Calcula el número de etapas evolutivas previas a partir de las referencias del catálogo.
// Usa un Set para evitar bucles en datos externos de importación.
export function createEvolutionTiers(species) {
  const parents = new Map();
  for (const [id, entry] of Object.entries(species)) {
    for (const evolution of entry.evolutions ?? []) {
      if (species[evolution.to]) parents.set(evolution.to, id);
    }
  }
  const memo = new Map();
  function tier(id, visited = new Set()) {
    if (memo.has(id)) return memo.get(id);
    if (visited.has(id)) return 0;
    visited.add(id);
    const parent = parents.get(id);
    const value = parent ? Math.min(2, tier(parent, visited) + 1) : 0;
    visited.delete(id);
    memo.set(id, value);
    return value;
  }
  return (id) => tier(id);
}

export function isWildEligible(data, speciesId, stageIndex, tiers = createEvolutionTiers(data.species)) {
  const species = data.species[speciesId];
  if (!species || species.legendary) return false;
  const cap = stageCaps[Math.max(0, Math.min(stageCaps.length - 1, stageIndex))];
  return tiers(speciesId) <= cap.tier && speciesThreat(species) <= cap.score;
}

export function eligiblePool(data, candidates, stageIndex) {
  const tiers = createEvolutionTiers(data.species);
  return candidates.filter((id) => isWildEligible(data, id, stageIndex, tiers));
}
