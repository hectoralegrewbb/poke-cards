// Regla de diseño: toda especie tiene al menos un ataque de daño de cada uno de sus tipos
// (un Garchomp sin técnicas Dragón no tiene sentido). Función pura e idempotente.
const costCeiling = (threat) => (threat >= 85 ? 3 : threat >= 55 ? 2 : 1);
const isFree = (move) => move.power > 0 && move.cost === 0 && move.cooldown === 0;
const dealsDamageOf = (type) => (move) => move.power > 0 && move.type === type;

// Reemplaza el movimiento menos valioso. Orden: ataques de un tipo que la especie no tiene, repetidos de un
// tipo propio (se conserva al menos uno por tipo), apoyos. Nunca el único ataque libre (la validación lo exige).
function pickSlotToReplace(kit, moves, ownTypes) {
  const freeCount = kit.filter((id) => isFree(moves[id])).length;
  const perType = {};
  for (const id of kit) if (moves[id].power > 0 && ownTypes.has(moves[id].type)) perType[moves[id].type] = (perType[moves[id].type] ?? 0) + 1;
  const candidates = kit
    .map((id, index) => ({ id, index, move: moves[id] }))
    .filter(({ move }) => !(isFree(move) && freeCount === 1));
  const byPower = (a, b) => a.move.power - b.move.power;
  const offType = candidates.filter(({ move }) => move.power > 0 && !ownTypes.has(move.type)).sort(byPower);
  const duplicated = candidates.filter(({ move }) => move.power > 0 && ownTypes.has(move.type) && perType[move.type] > 1).sort(byPower);
  const support = candidates.filter(({ move }) => move.power <= 0);
  return (offType[0] ?? duplicated[0] ?? support[0] ?? null)?.index ?? null;
}

export function ensureOwnTypeMoves(species, moves) {
  const result = structuredClone(species);
  let order = 0;
  for (const entry of Object.values(result)) {
    order += 1;
    const threat = Object.values(entry.stats).reduce((sum, value) => sum + value, 0);
    const ceiling = costCeiling(threat);
    const covered = new Set();
    for (const type of entry.types) {
      if (entry.moves.some((id) => dealsDamageOf(type)(moves[id]))) covered.add(type);
    }
    for (const type of entry.types.filter((candidate) => !covered.has(candidate))) {
      const pool = Object.entries(moves).filter(([id, move]) => dealsDamageOf(type)(move) && !entry.moves.includes(id));
      if (pool.length === 0) continue;
      const affordable = pool.filter(([, move]) => move.cost <= ceiling);
      const source = affordable.length ? affordable : [...pool].sort((a, b) => a[1].cost - b[1].cost).slice(0, 1);
      const [moveId] = source[order % source.length];
      const slot = pickSlotToReplace(entry.moves, moves, new Set(entry.types));
      if (slot === null) continue;
      entry.moves[slot] = moveId;
      covered.add(type);
    }
  }
  return result;
}
