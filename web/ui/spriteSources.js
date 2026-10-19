// Índice nacional de las especies jugables (todas hasta Teselia).
// Se mantiene separado del motor: la fuente de arte puede cambiar sin modificar las reglas.
import { nationalDex } from "../../src/shared/nationalDex.js";
export { nationalDex };

const spriteRoot = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white";

export function remoteSpriteUrl(speciesId, facing = "front", animated = true) {
  const dex = nationalDex[speciesId];
  if (!dex) return null;
  const backPath = facing === "back" ? "/back" : "";
  return `${spriteRoot}${animated ? "/animated" : ""}${backPath}/${dex}.${animated ? "gif" : "png"}`;
}

export function spriteCandidates(speciesId, { facing = "front", basePath = "../assets/sprites", preferLocal = false } = {}) {
  const facings = facing === "back" ? ["back", "front"] : ["front"];
  const remote = facings.flatMap((side) => [remoteSpriteUrl(speciesId, side, true), remoteSpriteUrl(speciesId, side, false)]).filter(Boolean);
  const local = facings.flatMap((side) => ["gif", "png"].map((ext) => `${basePath}/${side}/${speciesId}.${ext}`));
  return preferLocal ? [...local, ...remote] : [...remote, ...local];
}
