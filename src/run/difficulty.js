import { t } from "../shared/i18n.js";
// Presets explícitos: solo cambian la escala enemiga y los recursos de arranque.
// No afectan el mazo, el RNG ni las reglas de cada técnica.
export const difficultyPresets = Object.freeze({
  explorer: Object.freeze({
    label: t("EXPLORADOR"), description: t("Aprendé, capturá y experimentá con menos castigo."),
    enemyHp: 0.82, enemyStats: 0.9, goldBonus: 30, berryBonus: 2
  }),
  trainer: Object.freeze({
    label: t("ENTRENADOR"), description: t("La experiencia roguelike original, con riesgo real."),
    enemyHp: 1, enemyStats: 1, goldBonus: 0, berryBonus: 0
  }),
  expert: Object.freeze({
    label: t("VETERANO"), description: t("Rivales más resistentes, menos recursos de inicio."),
    enemyHp: 1.17, enemyStats: 1.1, goldBonus: -10, berryBonus: 0
  })
});

export function getDifficulty(id = "trainer") {
  const preset = difficultyPresets[id];
  if (!preset) throw new Error(t("Dificultad desconocida: {id}", { id }));
  return preset;
}
