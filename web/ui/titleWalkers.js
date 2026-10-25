// Pantalla de inicio: unos Pokémon al azar (distintos en cada arranque) pasean por el borde inferior.
import { h } from "./dom.js";

const walkerCount = 4;

// Elige especies no legendarias al azar. rng es inyectable para poder probarlo.
export function pickWalkers(data, count = walkerCount, rng = Math.random) {
  const pool = Object.entries(data.species).filter(([, species]) => !species.legendary).map(([id]) => id);
  const picked = [];
  while (picked.length < Math.min(count, pool.length)) {
    const id = pool[Math.floor(rng() * pool.length)];
    if (!picked.includes(id)) picked.push(id);
  }
  return picked;
}

// Los mismos Pokémon se quedan durante toda la sesión de la pantalla; cambian al abrir el juego de nuevo.
let session = null;

export function titleWalkers(ctx) {
  session ??= pickWalkers(ctx.data).map((speciesId, index) => ({
    speciesId,
    duration: 16 + Math.random() * 12,
    delay: -Math.random() * 20,
    lane: index % 2,
    size: 0.85 + Math.random() * 0.3
  }));
  return h("div", { class: "titleWalkers", "aria-hidden": "true" }, session.map((walker) =>
    h("div", { class: `walker lane${walker.lane}`, style: `--dur:${walker.duration.toFixed(1)}s;--delay:${walker.delay.toFixed(1)}s;--size:${walker.size.toFixed(2)}` },
      h("div", { class: "walkerFlip" }, h("div", { class: "walkerHop" }, ctx.sprites.element(walker.speciesId, { facing: "front" })), h("div", { class: "walkerShadow" })))));
}
