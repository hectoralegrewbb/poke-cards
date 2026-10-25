import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import en from "../src/shared/en.js";
import { loadGameData } from "../src/node/loadGameData.js";
import { localizeData, setLanguage, t } from "../src/shared/i18n.js";

const root = new URL("..", import.meta.url).pathname;
const hasSpanish = (text) => /[áéíóúñ¿¡]/.test(text.replace(/Pokémon|POKÉMON|Poké/g, ""));
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort().join(",");

// Todas las claves t("...") que aparecen en el código.
function codeKeys() {
  const keys = new Set();
  for (const dir of ["web/ui", "src/run", "src/engine", "src/tools"]) {
    for (const name of readdirSync(join(root, dir))) {
      if (!name.endsWith(".js")) continue;
      const source = readFileSync(join(root, dir, name), "utf8");
      for (const match of source.matchAll(/\bt\(\s*("(?:[^"\\\n]|\\.)*")/g)) keys.add(JSON.parse(match[1]));
    }
  }
  return [...keys];
}

test("i18n: todo texto t() del código tiene traducción al inglés", () => {
  const missing = codeKeys().filter((key) => !(key in en));
  assert.deepEqual(missing, []);
});

test("i18n: las traducciones conservan los {parámetros} del texto original", () => {
  for (const [es, english] of Object.entries(en)) assert.equal(placeholders(english), placeholders(es), `${es} → ${english}`);
});

test("i18n: las traducciones no contienen restos de español", () => {
  const spanish = /[áéíóúñ¿¡]|\b(el|la|los|las|tu|tus|de|del|para|con|una|un|que|por)\b/;
  const allowed = new Set(["Pokémon", "POKÉMON", "Poké", "Pokédex", "POKÉ WORLD", "Crit", "Pokémon Center", "POKÉMON CENTER"]);
  for (const [es, english] of Object.entries(en)) {
    const cleaned = english.replace(/Pokémon|POKÉMON|Poké|POKÉ|Pokédex|Pokéball/g, "").replace(/[“”"']/g, "");
    if (allowed.has(english)) continue;
    assert.doesNotMatch(cleaned, spanish, `${es} → ${english}`);
  }
});

test("i18n: los datos del juego (movimientos, cartas, objetos, habilidades, líderes) están traducidos", () => {
  const data = loadGameData();
  const need = [];
  const check = (text) => { if (typeof text === "string" && !(text in en)) need.push(text); };
  for (const move of Object.values(data.moves)) check(move.name);
  for (const card of Object.values(data.cards)) check(card.name);
  for (const item of Object.values(data.items)) { check(item.name); check(item.description); }
  for (const item of Object.values(data.heldItems)) { check(item.name); check(item.description); }
  for (const species of Object.values(data.species)) {
    const passive = species.passive ?? species.ability;
    if (passive) { check(passive.name); check(passive.description); }
  }
  for (const region of Object.values(data.campaigns.regions)) {
    for (const gym of region.gyms) { check(gym.leader); check(gym.badge); }
    for (const member of region.eliteFour) check(member.leader);
    check(region.champion.leader);
    check(region.villain);
  }
  for (const stage of data.region.stages) { check(stage.name); check(stage.badge); }
  assert.deepEqual([...new Set(need)], []);
});

test("i18n: la historia en inglés traduce cada variante y no cambia la cantidad de variantes", () => {
  const data = loadGameData();
  const english = localizeData(data, en);
  assert.equal(english.story.lines.length, data.story.lines.length);
  data.story.lines.forEach((line, index) => {
    const translated = english.story.lines[index];
    assert.equal(translated.variants.length, line.variants.length);
    for (const text of translated.variants) assert.ok(!hasSpanish(text), `${line.id}: ${text}`);
  });
  assert.ok(english.story.gardevoir.intro.every((step) => !hasSpanish(step.text)));
  assert.ok(english.story.final.intro.every((step) => step.variants.every((text) => !hasSpanish(text))));
  for (const ending of Object.values(english.story.final.endings)) assert.ok(ending.lines.every((text) => !hasSpanish(text)), ending.title);
});

test("i18n: t() sustituye parámetros y cambia de idioma", () => {
  setLanguage("es");
  assert.equal(t("Tenés {gold} de oro.", { gold: 5 }), "Tenés 5 de oro.");
  setLanguage("en", en);
  assert.equal(t("Tenés {gold} de oro.", { gold: 5 }), "You have 5 gold.");
  assert.equal(t("texto sin traducir"), "texto sin traducir");
  setLanguage("es");
});

test("i18n: los datos localizados siguen siendo válidos y conservan los ids", () => {
  const data = loadGameData();
  const english = localizeData(data, en);
  assert.deepEqual(Object.keys(english.moves), Object.keys(data.moves));
  assert.equal(english.moves.flamethrower.name, "Flamethrower");
  assert.equal(english.story.speakers.leader.name, "LEADER");
});
