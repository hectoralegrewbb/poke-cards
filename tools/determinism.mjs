const root = process.argv[2];
const { createRun } = await import(root + "/src/run/index.js");
const { loadGameData } = await import(root + "/src/node/loadGameData.js");
const { playFullRun } = await import(root + "/src/tools/runBot.js");
const data = loadGameData();
let bad = 0;
for (let seed = 1; seed <= 80; seed++) {
  const a = playFullRun(createRun({ data, seed }));
  const b = playFullRun(createRun({ data, seed }));
  const sa = JSON.stringify([a.result, a.badges.length, a.gold, a.stageIndex, a.step]);
  const sb = JSON.stringify([b.result, b.badges.length, b.gold, b.stageIndex, b.step]);
  if (sa !== sb) { bad++; if (bad < 4) console.log("seed", seed, sa, sb); }
}
console.log(root.split("/").slice(-1)[0], "no deterministas:", bad, "de 80");
