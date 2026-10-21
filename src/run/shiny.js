// Variocolor: probabilidad fija por encuentro salvaje, sin tocar el RNG de la corrida
// (así activar o ajustar los shinys no cambia mapas, rivales ni recompensas de una semilla).
export const shinyChance = 1 / 64;

// Hash FNV-1a de la clave → número uniforme en [0, 1).
function unitHash(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 2246822507);
  hash ^= hash >>> 13;
  return (hash >>> 0) / 4294967296;
}

export function rollShiny(seed, ...keys) {
  return unitHash(`shiny:${seed}:${keys.join(":")}`) < shinyChance;
}
