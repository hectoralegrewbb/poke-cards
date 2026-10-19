// Efectos visuales y sonoros temporizados sobre el DOM ya renderizado.
import { h } from "./dom.js";
import { sfx } from "./sfx.js";

const particleColors = {
  hit: ["#f4f4f4", "#ffcd75", "#ef7d57"],
  crit: ["#ffcd75", "#f4f4f4", "#b13e53", "#73eff7"],
  heal: ["#a7f070", "#38b764", "#f4f4f4"],
  shield: ["#73eff7", "#41a6f6", "#f4f4f4"],
  card: ["#ffcd75", "#a7f070", "#73eff7"],
  poison: ["#a33ea1", "#9b4fe3", "#f4f4f4"],
  fire: ["#ee8130", "#ffcd75", "#ef7d57"]
};

function burst(element, kind) {
  const colors = particleColors[kind] ?? particleColors.hit;
  const count = kind === "crit" ? 16 : 10;
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const distance = 28 + Math.random() * 34;
    const particle = h("span", { class: "px", style: `--dx:${Math.round(Math.cos(angle) * distance)}px;--dy:${Math.round(Math.sin(angle) * distance)}px;background:${colors[i % colors.length]}` });
    element.append(particle);
    setTimeout(() => particle.remove(), 800);
  }
}

// Efectos por tipo: viaje físico desde el atacante hasta cada blanco real.
function launchProjectiles(root, fx) {
  const field = root.querySelector(".field");
  const actor = root.querySelector(`[data-uid="${fx.fromUid}"] .spriteBox`);
  if (!field || !actor) return;
  const bounds = field.getBoundingClientRect();
  const origin = actor.getBoundingClientRect();
  for (const uid of fx.toUids) {
    const destination = root.querySelector(`[data-uid="${uid}"] .spriteBox`);
    if (!destination) continue;
    const finish = destination.getBoundingClientRect();
    const x = origin.left + origin.width / 2 - bounds.left;
    const y = origin.top + origin.height / 2 - bounds.top;
    const dx = finish.left + finish.width / 2 - bounds.left - x;
    const dy = finish.top + finish.height / 2 - bounds.top - y;
    const projectile = h("span", { class: `attackProjectile type-${fx.attackType}`, style: `left:${x}px;top:${y}px;--travelX:${dx}px;--travelY:${dy}px`, "aria-hidden": "true" });
    field.append(projectile);
    setTimeout(() => projectile.remove(), 570);
  }
}

// fx: { uid?, cardUid?, cls, text?, crit?, burst?, sound?, delay?, shake? }
export function playEffects(root, effects) {
  for (const fx of effects) {
    setTimeout(() => {
      if (fx.sound) sfx.play(fx.sound);
      if (fx.projectile) { launchProjectiles(root, fx); return; }
      const element = fx.uid ? root.querySelector(`[data-uid="${fx.uid}"]`) : fx.cardUid ? root.querySelector(`[data-card="${fx.cardUid}"]`) : null;
      if (fx.shake) root.querySelector(".field")?.classList.add("shake");
      if (!element) return;
      if (fx.cls) {
        element.classList.remove(fx.cls);
        void element.offsetWidth; // reinicia la animación CSS
        element.classList.add(fx.cls);
      }
      if (fx.text) {
        const float = h("span", { class: `float ${fx.floatCls ?? ""} ${fx.crit ? "crit" : ""}` }, fx.text);
        element.append(float);
        setTimeout(() => float.remove(), 1200);
      }
      if (fx.burst) burst(element, fx.burst);
    }, fx.delay ?? 0);
  }
  setTimeout(() => root.querySelector(".field")?.classList.remove("shake"), 900);
}

// Las barras de vida arrancan en el valor anterior y se deslizan al nuevo.
export function animateBars(root) {
  const bars = root.querySelectorAll(".hpFill[data-to]");
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bars.forEach((bar) => {
      bar.style.width = `${bar.dataset.to}%`;
    });
  }));
}
