// Botón AUDIO + panel de volumen (general, música, efectos) y silencio.
import { mixer } from "./audioMixer.js";
import { h } from "./dom.js";
import { sfx } from "./sfx.js";
import { getTextSpeed, setTextSpeed, textSpeeds } from "./typewriter.js";
import { getLanguage, languages, saveLanguage, t } from "../../src/shared/i18n.js";

export const resumeFlagKey = "pokemon-dream.resume";

const channels = [["master", t("GENERAL")], ["music", t("MÚSICA")], ["sfx", t("EFECTOS")]];

function slider(key, label) {
  const value = h("span", { class: "audioValue" }, `${Math.round(mixer.get()[key] * 100)}`);
  const input = h("input", {
    type: "range", min: "0", max: "100", step: "5", value: String(Math.round(mixer.get()[key] * 100)), "aria-label": t("Volumen {label}", { label }),
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
  return h("div", { class: "audioRow themeRow" }, h("span", { class: "audioLabel" }, t("ESTILO")), h("div", { class: "row" }, button("modern", t("MODERNO")), button("pixel", t("PIXEL"))), h("span"));
}

// Cambia el idioma: se guarda la preferencia y se recarga (los textos fijos se traducen al cargar); la corrida se retoma sola.
function switchLanguage(code) {
  if (code === getLanguage()) return;
  if (!saveLanguage(code, localStorage)) return;
  try { sessionStorage.setItem(resumeFlagKey, "1"); } catch { /* sin sessionStorage: queda en el menú */ }
  location.reload();
}

export function languageRow() {
  const button = ([code, label]) => h("button", { class: `btn mini ${getLanguage() === code ? "on" : ""}`, lang: code, "aria-pressed": getLanguage() === code, onClick: () => switchLanguage(code) }, label.toUpperCase());
  return h("div", { class: "audioRow themeRow" }, h("span", { class: "audioLabel" }, t("IDIOMA")), h("div", { class: "row" }, Object.entries(languages).map(button)), h("span"));
}

// Velocidad con que se escriben los diálogos.
function textSpeedRow() {
  const button = (speed) => h("button", { class: `btn mini ${getTextSpeed() === speed.id ? "on" : ""}`, onClick: (event) => {
    setTextSpeed(speed.id);
    event.target.parentElement.querySelectorAll(".btn").forEach((node) => node.classList.toggle("on", node === event.target));
  } }, speed.label);
  return h("div", { class: "audioRow themeRow" }, h("span", { class: "audioLabel" }, t("TEXTO")), h("div", { class: "row" }, textSpeeds.map(button)), h("span"));
}

export function audioPanel(onClose) {
  const mute = h("input", { type: "checkbox", checked: mixer.get().muted, onChange: (event) => mixer.set({ muted: event.target.checked }) });
  return h("div", { class: "modalBackdrop", onClick: (event) => { if (event.target === event.currentTarget) onClose(); } },
    h("section", { class: "window audioModal", role: "dialog", "aria-label": t("Audio") },
      h("div", { class: "deckHead" }, h("h2", {}, t("AJUSTES")), h("button", { class: "btn mini", onClick: onClose }, t("CERRAR ✕"))),
      channels.map(([key, label]) => slider(key, label)),
      h("label", { class: "audioRow" }, h("span", { class: "audioLabel" }, t("SILENCIAR TODO")), mute),
      languageRow(),
      themeRow(),
      textSpeedRow(),
      h("small", { class: "muted" }, t("Tus archivos de música van en assets/music (ver assets/music/README.md). Sin archivos suena la música original del juego."))));
}

export function audioButton(onOpen) {
  return h("button", { class: "btn mini sound", title: t("Ajustes"), "aria-label": t("Ajustes de audio y estilo"), onClick: onOpen }, mixer.get().muted ? "⚙ 🔇" : "⚙");
}
