const root = process.argv[2];
const run_ = await import(root + "/src/run/index.js");
const { loadGameData } = await import(root + "/src/node/loadGameData.js");
const { playSmartRun } = await import(root + "/src/tools/smartRunBot.js");
const { isAlive } = await import(root + "/src/engine/index.js");
const data = loadGameData();
const starters = data.region.start.starterChoices.flatMap(g => g.species);
let problems = 0, checked = 0;
function invariants(run, tag) {
  const bad = [];
  for (const p of [...run.party, ...run.box]) {
    if (p.hp > p.maxHp || p.hp < 0) bad.push(`hp fuera de rango ${p.name} ${p.hp}/${p.maxHp}`);
    if (p.fainted && p.hp !== 0 && p.hp !== undefined && p.hp > 0) bad.push(`fainted con hp ${p.name}`);
    if (!p.fainted && p.hp <= 0) bad.push(`hp 0 sin fainted ${p.name}`);
    if (p.exp < 0) bad.push(`exp negativa ${p.name}`);
    if (p.cooldowns.length !== p.moves.length || p.moves.length !== 4) bad.push(`moves/cooldowns ${p.name} ${p.moves.length}/${p.cooldowns.length}`);
  }
  const held = [...run.party, ...run.box].map(p => p.heldItem).filter(Boolean);
  if (new Set(held).size !== held.length) bad.push("objeto equipado en dos Pokémon");
  if (held.some(id => !(run.heldOwned ?? []).includes(id))) bad.push("objeto equipado que no se posee");
  if (new Set(run.heldOwned ?? []).size !== (run.heldOwned ?? []).length) bad.push("objeto repetido en la mochila");
  if ((run.starPieces ?? 0) < 0 || !Number.isInteger(run.starPieces ?? 0)) bad.push("piezas de estrella inválidas");
  for (const p of [...run.party, ...run.box]) if (p.moves.some(m => !data.moves[m])) bad.push("movimiento inexistente " + p.name);
  if (run.party.length > data.balance.party.maxSize) bad.push("party>6");
  if (run.deckCardIds.length > data.balance.deck.maxSize) bad.push("mazo>45 " + run.deckCardIds.length);
  if (run.gold < 0) bad.push("oro<0");
  for (const [k, v] of Object.entries(run.inventory)) if (v <= 0) bad.push("inventario " + k + "=" + v);
  const uids = [...run.party, ...run.box].map(p => p.uid);
  if (new Set(uids).size !== uids.length) bad.push("uid duplicado");
  if (run.combat) {
    const c = run.combat;
    const total = c.deck.drawPile.length + c.deck.hand.length + c.deck.discardPile.length;
    if (c.deck.hand.length > data.balance.hand.maxSize) bad.push("mano>10");
    const ids = [...c.deck.drawPile, ...c.deck.hand, ...c.deck.discardPile].map(x => x.uid);
    if (new Set(ids).size !== ids.length) bad.push("carta duplicada en mazo de combate");
    for (const p of [...c.teams.player, ...c.teams.enemy]) if (p.shield < 0) bad.push("escudo<0");
  }
  checked++;
  if (bad.length) { problems++; console.log("INVARIANTE", tag, bad.join("; ")); }
}
let saveMismatch = 0, crashes = 0;
for (let seed = 1; seed <= 150; seed++) {
  const mode = seed % 2 ? "regional" : "global";
  try {
    const mk = () => run_.createRun({ data, seed, mode, regionId: "random", difficulty: ["explorer","trainer","expert"][seed % 3], starterIds: [starters[seed % starters.length]] });
    const a = mk();
    const cut = 5 + (seed * 7) % 120;
    playSmartRun(a, { maxSteps: cut });
    invariants(a, `seed${seed}@${cut}`);
    if (a.phase === "ended") continue; // las corridas terminadas no se guardan
    // round-trip de guardado
    const snap = run_.serializeRun(a);
    const b = run_.restoreRun(data, snap);
    // continuar ambos y comparar
    playSmartRun(a, { maxSteps: 300 });
    playSmartRun(b, { maxSteps: 300 });
    invariants(a, `seed${seed}-fin`);
    const sa = JSON.stringify([a.result, a.badges, a.gold, a.party.map(p => [p.speciesId, p.hp, p.exp]), a.deckCardIds]);
    const sb = JSON.stringify([b.result, b.badges, b.gold, b.party.map(p => [p.speciesId, p.hp, p.exp]), b.deckCardIds]);
    if (sa !== sb) { saveMismatch++; if (saveMismatch <= 5) console.log("GUARDADO DIVERGE seed", seed, "cut", cut, "fase", JSON.parse(snap).run.phase); }
  } catch (e) { crashes++; console.log("CRASH seed", seed, e.stack.split("\n").slice(0, 4).join(" | ")); }
}
console.log({ checked, problems, saveMismatch, crashes });
