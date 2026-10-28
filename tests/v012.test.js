import assert from "node:assert/strict";
import test from "node:test";
import { coverageTypes, createRun, learnableMoves } from "../src/run/index.js";
import { loadGameData } from "../src/node/loadGameData.js";

const data = loadGameData();
const pokemonOf = (speciesId) => ({ speciesId, moves: data.species[speciesId].moves.slice(0, 4) });

test("tutor: Typhlosion puede aprender un ataque eléctrico (cobertura) pero no cualquier cosa", () => {
  const moves = learnableMoves(data, pokemonOf("typhlosion"));
  const types = new Set(moves.map((id) => data.moves[id].type));
  assert.ok(types.has("electric"), "falta cobertura eléctrica");
  assert.ok(moves.includes("thunderbolt"));
  assert.ok(!moves.includes("charge"), "los movimientos de apoyo de otros tipos no son de cobertura");
  assert.ok(!types.has("flying"));
});

test("tutor: toda especie tiene cobertura de al menos 3 tipos ofensivos distintos", () => {
  for (const [id, species] of Object.entries(data.species)) {
    const coverage = coverageTypes(data, id);
    assert.ok(coverage.length >= 1 && coverage.length <= data.balance.tutor.coverageCap, `${id}: cobertura ${coverage}`);
    assert.ok(coverage.every((type) => !species.types.includes(type)));
    const attackTypes = new Set(learnableMoves(data, pokemonOf(id)).filter((moveId) => data.moves[moveId].power > 0).map((moveId) => data.moves[moveId].type));
    assert.ok(attackTypes.size >= 3, `${id}: solo ${[...attackTypes]}`);
  }
});

test("historia: toda línea con requires apunta a una línea de presentación existente", () => {
  const ids = new Set(data.story.lines.map((line) => line.id));
  const gated = data.story.lines.filter((line) => line.requires);
  assert.ok(gated.length > 20, "debería haber muchas líneas condicionadas a la presentación");
  for (const line of gated) assert.ok(ids.has(line.requires), `${line.id} requiere ${line.requires}, que no existe`);
  for (const line of gated) assert.notEqual(line.requires, line.id);
});

test("idioma: detectLanguage usa la preferencia guardada y, si no, el idioma del navegador", async () => {
  const { detectLanguage, saveLanguage, languageStorageKey } = await import("../src/shared/i18n.js");
  const store = new Map();
  const storage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  assert.equal(detectLanguage(storage, "es-AR"), "es");
  assert.equal(detectLanguage(storage, "en-US"), "en");
  assert.equal(detectLanguage(storage, "zh-CN"), "en");
  assert.ok(saveLanguage("es", storage));
  assert.equal(store.get(languageStorageKey), "es");
  assert.equal(detectLanguage(storage, "en-US"), "es");
  assert.ok(!saveLanguage("fr", storage));
});

test("cartas: si una carta declara sprite `art`, el PNG existe y mide 18×30 px (marco incluido)", async () => {
  const { readFileSync, existsSync } = await import("node:fs");
  for (const [id, card] of Object.entries(data.cards)) {
    if (!card.art) continue; // sin sprite se usa el diseño de texto con icono pixelado
    const file = new URL(`../assets/cards/${card.art}`, import.meta.url);
    assert.ok(existsSync(file), `${id}: falta ${card.art}`);
    const png = readFileSync(file);
    assert.equal(png.readUInt32BE(16), 18, `${id}: el ancho debe ser 18`);
    assert.equal(png.readUInt32BE(20), 30, `${id}: el alto debe ser 30`);
  }
  assert.equal(data.story.expressions.length, 24);
});
