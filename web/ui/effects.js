// Efectos visuales y sonoros temporizados sobre el DOM ya renderizado.
// Mejorados: partículas más ricas, proyectiles con estela, impactos más impactantes.
import { h } from "./dom.js";
import { sfx } from "./sfx.js";

const particleColors = {
  hit: ["#f4f4f4", "#ffcd75", "#ef7d57", "#ffaa66"],
  crit: ["#ffcd75", "#f4f4f4", "#b13e53", "#73eff7", "#ffe27a"],
  heal: ["#a7f070", "#38b764", "#f4f4f4", "#d0ffb0"],
  shield: ["#73eff7", "#41a6f6", "#f4f4f4", "#a0e0ff"],
  card: ["#ffcd75", "#a7f070", "#73eff7"],
  poison: ["#a33ea1", "#9b4fe3", "#f4f4f4", "#c080ff"],
  fire: ["#ee8130", "#ffcd75", "#ef7d57", "#ff6b1a"],
  electric: ["#f5cd51", "#fff7a0", "#73eff7"],
  water: ["#5cc8ff", "#2a7de1", "#a0e8ff"]
};

function burst(element, kind) {
  const colors = particleColors[kind] ?? particleColors.hit;
  const count = kind === "crit" ? 22 : kind === "heal" ? 14 : 12;
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
    const distance = 22 + Math.random() * 48;
    const size = 6 + Math.random() * 6;
    const particle = h("span", {
      class: "px",
      style: `--dx:${Math.round(Math.cos(angle) * distance)}px;--dy:${Math.round(Math.sin(angle) * distance)}px;background:${colors[i % colors.length]};width:${size}px;height:${size}px;`
    });
    element.append(particle);
    setTimeout(() => particle.remove(), 900);
  }
  // Extra ring for crit / special
  if (kind === "crit" || kind === "heal") {
    const ring = h("span", { class: `fxImpact fx-${kind === "heal" ? "heal" : "crit"}`, style: "left:50%;top:50%;" });
    element.append(ring);
    setTimeout(() => ring.remove(), 500);
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
    const angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
    const kind = `fx-${fx.attackType || "normal"}`;
    const projectile = h("span", { class: "fxShot", style: `left:${x}px;top:${y}px;--travelX:${dx}px;--travelY:${dy}px`, "aria-hidden": "true" },
      h("i", { class: `fxBody ${kind}`, style: `--fxAngle:${angle}deg` }),
      h("i", { class: "fxTrail" })
    );
    field.append(projectile);
    setTimeout(() => projectile.remove(), 560);
    // Impacto + burst en el blanco
    setTimeout(() => {
      const impact = h("span", { class: `fxImpact ${kind}`, style: `left:${x + dx}px;top:${y + dy}px`, "aria-hidden": "true" });
      field.append(impact);
      // Pequeño burst de partículas en el punto de impacto
      for (let j = 0; j < 8; j++) {
        const a = (Math.PI * 2 * j) / 8 + Math.random() * 0.4;
        const d = 16 + Math.random() * 24;
        const p = h("span", {
          class: "px",
          style: `left:${x + dx}px;top:${y + dy}px;--dx:${Math.round(Math.cos(a)*d)}px;--dy:${Math.round(Math.sin(a)*d)}px;background:${particleColors[fx.attackType] ? particleColors[fx.attackType][j % 3] : "#fff"};`
        });
        field.append(p);
        setTimeout(() => p.remove(), 700);
      }
      setTimeout(() => impact.remove(), 520);
    }, 440);
  }
}

// fx: { uid?, cardUid?, cls, text?, crit?, burst?, sound?, delay?, shake? }
export function playEffects(root, effects) {
  for (const fx of effects) {
    setTimeout(() => {
      if (fx.sound) sfx.play(fx.sound);
      if (fx.projectile) { launchProjectiles(root, fx); return; }
      if (fx.banner) {
        const field = root.querySelector(".field");
        if (field) {
          const banner = h("div", { class: "fxBanner", role: "status" }, fx.banner);
          field.append(banner);
          setTimeout(() => banner.remove(), 1600);
        }
        return;
      }
      const element = fx.uid ? root.querySelector(`[data-uid="${fx.uid}"]`) : fx.cardUid ? root.querySelector(`[data-card="${fx.cardUid}"]`) : null;
      if (fx.shake) {
        const field = root.querySelector(".field");
        if (field) {
          field.classList.add("shake");
          setTimeout(() => field.classList.remove("shake"), 480);
        }
      }
      if (!element) return;
      if (fx.cls) {
        element.classList.remove(fx.cls);
        void element.offsetWidth; // reinicia la animación CSS
        element.classList.add(fx.cls);
      }
      if (fx.text) {
        const float = h("span", { class: `float ${fx.floatCls ?? ""} ${fx.crit ? "crit" : ""}` }, fx.text);
        element.append(float);
        setTimeout(() => float.remove(), 1300);
      }
      if (fx.note) {
        const note = h("span", { class: `float note ${fx.noteCls ?? ""}` }, fx.note);
        element.append(note);
        setTimeout(() => note.remove(), 1400);
      }
      if (fx.burst) burst(element, fx.burst);
    }, fx.delay ?? 0);
  }
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
