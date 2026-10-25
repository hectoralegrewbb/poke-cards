// Etiqueta "Nv. N" con color según la comparación contra un nivel de referencia (tu equipo).
import { levelTone } from "../../src/engine/index.js";
import { h } from "./dom.js";
import { t } from "../../src/shared/i18n.js";

const toneHint = { easy: t("Más débil que tu equipo"), even: t("Parejo con tu equipo"), hard: t("Más fuerte que tu equipo"), deadly: t("Mucho más fuerte que tu equipo") };

export function levelTag(level, reference = 0, { approx = false } = {}) {
  const tone = reference ? levelTone(level, reference) : "plain";
  return h("span", { class: `lvTag lv-${tone}`, title: reference ? t("{tone} (tu equipo: Nv. {reference})", { tone: toneHint[tone], reference }) : t("Nivel de poder") }, `${approx ? "≈" : ""}${t("Nv.")}${level}`);
}
