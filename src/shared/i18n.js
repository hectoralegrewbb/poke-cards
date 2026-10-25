// Idiomas del juego. El español es el idioma base: el texto fuente en español es la clave del diccionario.
// Módulo puro (sin DOM): lo usan la interfaz, la capa de partida y los tests.
export const languages = { es: "Español", en: "English" };
export const defaultLanguage = "es";
export const i18nFiles = ["en.ui", "en.data", "en.story"];
export const languageStorageKey = "pokemon-dream.lang";

let current = defaultLanguage;
let dictionary = {};

export const getLanguage = () => current;
export const activeDictionary = () => dictionary;

// Idioma elegido: preferencia guardada; si no hay, el del navegador (español → es, cualquier otro → en).
export function detectLanguage(storage, browserLanguage = "es") {
  let saved = null;
  try { saved = storage?.getItem(languageStorageKey); } catch { /* sin almacenamiento */ }
  if (isLanguage(saved)) return saved;
  return String(browserLanguage).toLowerCase().startsWith("es") ? "es" : "en";
}

export function saveLanguage(code, storage) {
  if (!isLanguage(code)) return false;
  try { storage?.setItem(languageStorageKey, code); return true; } catch { return false; }
}
export const isLanguage = (code) => Object.hasOwn(languages, code);

// El diccionario del idioma activo (para el español no hace falta: el texto fuente ya está en español).
export function setLanguage(code, dict = {}) {
  current = isLanguage(code) ? code : defaultLanguage;
  dictionary = current === defaultLanguage ? {} : dict;
  return current;
}

const fill = (text, params) => (params ? text.replace(/\{(\w+)\}/g, (match, key) => (params[key] ?? match)) : text);

// t("Texto en español {valor}", { valor }) → texto en el idioma activo con los parámetros ya aplicados.
export function t(text, params) {
  return fill(current === defaultLanguage ? text : (dictionary[text] ?? text), params);
}

// Traduce una cadena suelta con un diccionario concreto (sin tocar el idioma activo).
export const translateWith = (dict, text) => dict[text] ?? text;

// Copia profunda de los datos del juego con todas las cadenas que figuran en el diccionario ya traducidas.
export function localizeData(data, dict) {
  const walk = (value) => {
    if (typeof value === "string") return dict[value] ?? value;
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, walk(inner)]));
    return value;
  };
  return walk(data);
}

// Une varios diccionarios (ui + datos + historia) en uno solo.
export const mergeDictionaries = (...parts) => Object.assign({}, ...parts);

// Tablas de textos definidas a nivel de módulo (se evalúan antes de elegir idioma): traducen al leer cada valor.
export function translated(source) {
  return new Proxy(source, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      if (typeof value === "string") return t(value);
      return value && typeof value === "object" ? translated(value) : value;
    }
  });
}
