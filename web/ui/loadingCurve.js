// Curva de la barra de carga: acelera hasta el 90 % y el tramo final avanza despacio hasta completar el tiempo.
export const loadingDurationMs = 6500;
const fastShare = 0.4; // fracción del tiempo total que dura el tramo rápido (hasta el 90 %)

// elapsed y total en ms → progreso 0..100.
export function loadingProgress(elapsed, total = loadingDurationMs) {
  if (elapsed <= 0) return 0;
  if (elapsed >= total) return 100;
  const fastEnd = total * fastShare;
  if (elapsed < fastEnd) {
    const t = elapsed / fastEnd;
    return 90 * t * t; // cuadrática: arranca lento y gana velocidad
  }
  return 90 + 10 * ((elapsed - fastEnd) / (total - fastEnd)); // lineal y lento
}
