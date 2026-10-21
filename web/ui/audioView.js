// Botón AUDIO + panel de volumen (general, música, efectos) y silencio.
import { mixer } from "./audioMixer.js";
import { h } from "./dom.js";
import { sfx } from "./sfx.js";

const channels = [["master", "GENERAL"], ["music", "MÚSICA"], ["sfx", "EFECTOS"]];

function slider(key, label) {
  const value = h("span", { class: "audioValue" }, `${Math.round(mixer.get()[key] * 100)}`);
  const input = h("input", {
    type: "range", min: "0", max: "100", step: "5", value: String(Math.round(mixer.get()[key] * 100)), "aria-label": `Volumen ${label}`,
    onInput: (event) => {
      mixer.set({ [key]: Number(event.target.value) / 100 });
      value.textContent = event.target.value;
    },
    onChange: () => { if (key === "sfx") sfx.play("select"); }
  });
  return h("label", { class: "audioRow" }, h("span", { class: "audioLabel" }, label), input, value);
}

const themeKey = "pokecards.theme";
function themeRow() {
  const apply = (theme) => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(themeKey, theme); } catch { /* solo vale para esta sesión */ }
  };
  const button = (theme, label) => h("button", { class: `btn mini ${document.documentElement.dataset.theme === theme ? "on" : ""}`, onClick: (event) => {
    apply(theme);
    event.target.parentElement.querySelectorAll(".btn").forEach((node) => node.classList.toggle("on", node === event.target));
  } }, label);
  return h("div", { class: "audioRow themeRow" }, h("span", { class: "audioLabel" }, "ESTILO"), h("div", { class: "row" }, button("modern", "MODERNO"), button("pixel", "PIXEL")), h("span"));
}

export function audioPanel(onClose) {
  const mute = h("input", { type: "checkbox", checked: mixer.get().muted, onChange: (event) => mixer.set({ muted: event.target.checked }) });
  return h("div", { class: "modalBackdrop", onClick: (event) => { if (event.target === event.currentTarget) onClose(); } },
    h("section", { class: "window audioModal", role: "dialog", "aria-label": "Audio" },
      h("div", { class: "deckHead" }, h("h2", {}, "AJUSTES"), h("button", { class: "btn mini", onClick: onClose }, "CERRAR ✕")),
      channels.map(([key, label]) => slider(key, label)),
      h("label", { class: "audioRow" }, h("span", { class: "audioLabel" }, "SILENCIAR TODO"), mute),
      themeRow(),
      h("small", { class: "muted" }, "Tus archivos de música van en assets/music (ver assets/music/README.md). Sin archivos suena la música original del juego.")));
}

export function audioButton(onOpen) {
  return h("button", { class: "btn mini sound", title: "Ajustes", "aria-label": "Ajustes de audio y estilo", onClick: onOpen }, mixer.get().muted ? "⚙ 🔇" : "⚙");
}
