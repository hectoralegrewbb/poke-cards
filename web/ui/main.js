// Arranque: fija el idioma ANTES de cargar la interfaz (varios módulos traducen textos al importarse).
import { detectLanguage, setLanguage } from "../../src/shared/i18n.js";

const code = detectLanguage(localStorage, navigator.language);
document.documentElement.lang = code;
if (code !== "es") {
  const { default: dictionary } = await import("../../src/shared/en.js");
  setLanguage(code, dictionary);
}
await import("./app.js");
