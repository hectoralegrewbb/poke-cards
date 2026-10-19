// RNG determinista (mulberry32). Misma semilla => misma partida, útil para reproducir bugs.

export function createRng(seed = 1, savedState = null) {
  let state = (savedState ?? seed) >>> 0;

  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function int(minInclusive, maxInclusive) {
    return minInclusive + Math.floor(next() * (maxInclusive - minInclusive + 1));
  }

  function pick(list) {
    if (list.length === 0) throw new Error("rng.pick: lista vacía");
    return list[int(0, list.length - 1)];
  }

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = int(0, i);
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function flip() {
    return next() < 0.5;
  }

  // entries: [{ weight, ...datos }]. Devuelve la entrada elegida.
  function weightedPick(entries) {
    if (entries.length === 0) throw new Error("rng.weightedPick: lista vacía");
    const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = next() * total;
    for (const entry of entries) {
      roll -= entry.weight;
      if (roll < 0) return entry;
    }
    return entries[entries.length - 1];
  }

  return { next, int, pick, shuffle, flip, weightedPick, getState: () => state };
}
