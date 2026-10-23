import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

// Garantiza que todo nombre de ícono usado en la UI exista (pixel vectorial o arte flat).
const uiDir = new URL("../web/ui/", import.meta.url);

function declaredNames() {
  const pixel = readFileSync(new URL("pixelIcons.js", uiDir), "utf8");
  const vector = [...pixel.matchAll(/^  ([a-zA-Z]+): \{ main:/gm)].map((match) => match[1]);
  const flatSource = readFileSync(new URL("flatArt.js", uiDir), "utf8");
  const flatBlock = flatSource.slice(flatSource.indexOf("const items = {"), flatSource.indexOf("const gradients"));
  const flat = [...flatBlock.matchAll(/^  ([a-zA-Z]+): \(\) =>/gm)].map((match) => match[1]);
  return new Set([...vector, ...flat]);
}

test("todos los íconos referenciados en la UI están definidos", () => {
  const known = declaredNames();
  const missing = new Set();
  for (const file of readdirSync(uiDir)) {
    if (!file.endsWith(".js")) continue;
    const source = readFileSync(new URL(file, uiDir), "utf8");
    for (const match of source.matchAll(/icon\("([a-zA-Z]+)"/g)) if (!known.has(match[1])) missing.add(`${file}: ${match[1]}`);
  }
  const labels = readFileSync(new URL("labels.js", uiDir), "utf8");
  const block = labels.slice(labels.indexOf("cardEffectIcons"));
  for (const match of block.slice(0, block.indexOf("});")).matchAll(/:\s*"([a-zA-Z]+)"/g)) if (!known.has(match[1])) missing.add(`labels.js: ${match[1]}`);
  assert.deepEqual([...missing], []);
});
