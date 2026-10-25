// Pantalla de carga inicial: dura loadingDurationMs aunque los datos estén listos antes; si tardan más, espera.
import { h } from "./dom.js";
import { loadingDurationMs, loadingProgress } from "./loadingCurve.js";
import { t } from "../../src/shared/i18n.js";

const tips = [
  t("Las técnicas LIBRE no gastan energía ni cartas."),
  t("Los Pokémon de la fila trasera están a salvo de los ataques cuerpo a cuerpo."),
  t("El Centro Pokémon aparece una vez por ruta y cura a todo el equipo."),
  t("La Baya Zidra te salva de un golpe letal."),
  t("Capturá aliados en las zonas salvajes: un equipo variado cubre más tipos.")
];

// ready: promesa de la carga real. Devuelve una promesa que se resuelve con su valor cuando la barra llega al 100 %.
export function runLoadingScreen(root, ready, { durationMs = loadingDurationMs } = {}) {
  const fill = h("i", { class: "loadFill" });
  const percent = h("span", { class: "loadPercent" }, "0%");
  const tip = h("p", { class: "loadTip" }, tips[Math.floor(Math.random() * tips.length)]);
  root.replaceChildren(h("section", { class: "loading", role: "status", "aria-live": "polite" },
    h("div", { class: "logo" }, h("span", {}, t("POKÉMON")), h("span", { class: "logo2" }, t("DREAM"))),
    h("div", { class: "loadBar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100" }, fill),
    h("div", { class: "loadInfo" }, h("span", {}, t("CARGANDO")), percent),
    tip));

  const bar = root.querySelector(".loadBar");
  let loaded;
  let failed = null;
  const dataReady = ready.then((value) => { loaded = value; }, (error) => { failed = error; });
  const start = performance.now();
  let lastTip = start;
  return new Promise((resolve, reject) => {
    function frame(now) {
      const elapsed = now - start;
      const value = loadingProgress(elapsed, durationMs);
      fill.style.width = `${value.toFixed(1)}%`;
      percent.textContent = `${Math.floor(value)}%`;
      bar.setAttribute("aria-valuenow", String(Math.floor(value)));
      if (now - lastTip > 2200) { lastTip = now; tip.textContent = tips[Math.floor(Math.random() * tips.length)]; }
      if (elapsed < durationMs) return requestAnimationFrame(frame);
      dataReady.then(() => (failed ? reject(failed) : resolve(loaded)));
    }
    requestAnimationFrame(frame);
  });
}
