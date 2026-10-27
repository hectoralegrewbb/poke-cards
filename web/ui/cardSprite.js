// Cartas con sprite propio: 18×30 px con marco, siempre a escala entera (ver web/cardSprites.css).
// Pulsar una carta escribe su nombre arriba; mantenerla pulsada muestra qué hace.
import { h } from "./dom.js";
import { describeCard } from "./labels.js";
import { typedText } from "./typewriter.js";

export const cardSpriteWidth = 18;
export const cardSpriteHeight = 30;
const cardsPath = "../assets/cards/";
const holdMs = 450;
const nameVisibleMs = 1800;

export const hasSprite = (def) => Boolean(def.art);
export const cardImage = (def, className = "cardImg") => h("img", { class: className, src: `${cardsPath}${def.art}`, alt: "", draggable: "false" });

let nameTag = null;
let nameTimer = 0;
let nameSeq = 0;
let tip = null;

// Centra el cartel sobre la carta sin salirse de la pantalla (hay que insertarlo antes para poder medirlo).
function place(node, element) {
  const rect = element.getBoundingClientRect();
  node.style.top = `${Math.round(rect.top)}px`;
  document.body.append(node);
  const half = node.offsetWidth / 2 + 6;
  const center = Math.min(Math.max(rect.left + rect.width / 2, half), window.innerWidth - half);
  node.style.left = `${Math.round(center)}px`;
}

// El nombre se escribe sobre la carta tocada y se retira solo.
export function showCardName(element, def) {
  clearTimeout(nameTimer);
  nameTag?.remove();
  nameSeq += 1;
  nameTag = h("div", { class: "cardNameTag", role: "status" }, typedText(`cardName:${nameSeq}`, def.name));
  place(nameTag, element);
  nameTimer = setTimeout(() => { nameTag?.remove(); nameTag = null; }, nameVisibleMs);
}

function hideTip() {
  tip?.remove();
  tip = null;
}

// Mantener pulsada la carta muestra su efecto; al soltar no se juega la carta.
export function attachCardHold(element, def) {
  let timer = 0;
  let held = false;
  let startX = 0;
  let startY = 0;
  const cancel = () => { clearTimeout(timer); hideTip(); };
  element.addEventListener("pointerdown", (event) => {
    held = false;
    startX = event.clientX;
    startY = event.clientY;
    clearTimeout(timer);
    timer = setTimeout(() => {
      held = true;
      hideTip();
      tip = h("div", { class: "cardTip", role: "status" }, h("strong", {}, def.name), h("span", {}, describeCard(def)));
      place(tip, element);
    }, holdMs);
  });
  element.addEventListener("pointermove", (event) => { if (Math.hypot(event.clientX - startX, event.clientY - startY) > 8) clearTimeout(timer); });
  for (const type of ["pointerup", "pointercancel", "pointerleave"]) element.addEventListener(type, cancel);
  element.addEventListener("contextmenu", (event) => event.preventDefault());
  // Registrado antes que el clic de la carta: si hubo pulsación larga, ese clic no juega la carta.
  element.addEventListener("click", (event) => { if (held) { held = false; event.stopImmediatePropagation(); } }, true);
}
