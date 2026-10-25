// Texto "escrito a mano": las letras aparecen una a una, con velocidad ajustable (o instantáneo).
// La interfaz se redibuja entera en cada cambio, así que el avance se calcula con una marca de inicio
// guardada por clave y no se reinicia al redibujar. Un clic sobre el texto lo completa.
import { t } from "../../src/shared/i18n.js";
import { h } from "./dom.js";

export const textSpeeds = [
  { id: "slow", label: t("LENTA"), msPerChar: 55 },
  { id: "normal", label: t("NORMAL"), msPerChar: 28 },
  { id: "fast", label: t("RÁPIDA"), msPerChar: 12 },
  { id: "instant", label: t("INSTANTÁNEA"), msPerChar: 0 }
];
export const defaultTextSpeed = "normal";
const storageKey = "pokecards.textSpeed";
const maxTracked = 200;

let currentSpeed = defaultTextSpeed;
try { const saved = localStorage.getItem(storageKey); if (textSpeeds.some((speed) => speed.id === saved)) currentSpeed = saved; } catch { /* sin almacenamiento */ }

export const getTextSpeed = () => currentSpeed;
export const msPerChar = () => textSpeeds.find((speed) => speed.id === currentSpeed)?.msPerChar ?? 0;

export function setTextSpeed(id) {
  if (!textSpeeds.some((speed) => speed.id === id)) return;
  currentSpeed = id;
  try { localStorage.setItem(storageKey, id); } catch { /* solo vale para esta sesión */ }
}

// Tiempo que tarda en escribirse un texto con la velocidad actual.
export const typingDurationMs = (text) => text.length * msPerChar();

const started = new Map(); // clave → instante en que empezó a escribirse

function startedAt(key) {
  if (!started.has(key)) {
    started.set(key, performance.now());
    if (started.size > maxTracked) started.delete(started.keys().next().value);
  }
  return started.get(key);
}

// Párrafo que se va escribiendo. La parte pendiente queda invisible para que la caja no cambie de tamaño.
export function typedText(key, text, attrs = {}, delayMs = 0) {
  const done = h("span", { class: "typed" });
  const rest = h("span", { class: "typedRest", "aria-hidden": "true" });
  const node = h("p", { ...attrs, "aria-label": text }, done, rest);
  const speed = msPerChar();
  let shown = -1;
  const paint = () => {
    const count = speed <= 0 ? text.length : Math.max(0, Math.min(text.length, Math.floor((performance.now() - startedAt(key) - delayMs) / speed)));
    if (count !== shown) {
      shown = count;
      done.textContent = text.slice(0, count);
      rest.textContent = text.slice(count);
    }
    return count >= text.length;
  };
  if (paint()) return node;
  node.classList.add("typing");
  node.title = t(t("Tocá para completar el texto"));
  node.addEventListener("click", () => { started.set(key, -Infinity); paint(); node.classList.remove("typing"); });
  let attached = false;
  const tick = () => {
    if (node.isConnected) attached = true;
    else if (attached) return; // se redibujó: el nodo nuevo continúa solo
    if (paint()) { node.classList.remove("typing"); return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return node;
}

// Para los botones "SIGUIENTE": si el texto sigue escribiéndose, el primer toque lo completa.
export function isTyping(key, text) {
  const speed = msPerChar();
  if (speed <= 0 || !started.has(key)) return false;
  return performance.now() - started.get(key) < text.length * speed;
}

export function finishTyping(key) {
  if (started.has(key)) started.set(key, -Infinity);
}
