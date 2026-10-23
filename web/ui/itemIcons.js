// Arte de ítems: SVG flat propio (ver flatArt.js). Un ítem sin dibujo no muestra ícono y queda solo el texto.
import { flatSvg, hasFlatArt } from "./flatArt.js";

export function itemImage(itemId, size = 24) {
  if (!hasFlatArt(itemId)) return null;
  const svg = flatSvg(itemId, size, "itemIcon");
  return svg;
}
