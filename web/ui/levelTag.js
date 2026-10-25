// Etiqueta "Nv. N" con color según la comparación contra un nivel de referencia (tu equipo).
import { levelTone } from "../../src/engine/index.js";
import { h } from "./dom.js";

const toneHint = { easy: "Más débil que tu equipo", even: "Parejo con tu equipo", hard: "Más fuerte que tu equipo", deadly: "Mucho más fuerte que tu equipo" };

export function levelTag(level, reference = 0, { approx = false } = {}) {
  const tone = reference ? levelTone(level, reference) : "plain";
  return h("span", { class: `lvTag lv-${tone}`, title: reference ? `${toneHint[tone]} (tu equipo: Nv. ${reference})` : "Nivel de poder" }, `${approx ? "≈" : ""}Nv.${level}`);
}
