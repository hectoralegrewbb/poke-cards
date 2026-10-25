// Nivel de poder: número derivado de los PS máximos y las cuatro estadísticas de combate.
// Es la misma fórmula para aliados y enemigos (con su escala de dificultad ya aplicada),
// así que sirve para comparar de un vistazo si vas por encima o por debajo del rival.

const hpWeight = 0.6;

export function powerRating({ maxHp, stats }) {
  return maxHp * hpWeight + stats.atk + stats.def + stats.spa + stats.spd;
}

export function levelFromRating(rating) {
  return Math.max(1, Math.round((rating - 20) * 1.1));
}

export function pokemonLevel(pokemon) {
  return levelFromRating(powerRating(pokemon));
}

// Nivel de una especie base multiplicada por la escala { hp, stats } de un encuentro (sin crear la instancia).
export function speciesLevel(data, speciesId, scale = null) {
  const { hp, ...stats } = data.species[speciesId].stats;
  const hpScale = scale?.hp ?? 1;
  const statScale = scale?.stats ?? 1;
  const scaled = Object.fromEntries(Object.entries(stats).map(([key, value]) => [key, Math.max(1, Math.round(value * statScale))]));
  return pokemonLevel({ maxHp: Math.max(1, Math.round(hp * hpScale)), stats: scaled });
}

export function averageLevel(pokemonList) {
  if (pokemonList.length === 0) return 0;
  return Math.round(pokemonList.reduce((total, pokemon) => total + pokemonLevel(pokemon), 0) / pokemonList.length);
}

// Compara el nivel de un rival con el de referencia (tu equipo): "easy" | "even" | "hard" | "deadly".
export function levelTone(level, reference) {
  if (!reference) return "even";
  const ratio = level / reference;
  if (ratio < 0.85) return "easy";
  if (ratio < 1.15) return "even";
  if (ratio < 1.4) return "hard";
  return "deadly";
}
