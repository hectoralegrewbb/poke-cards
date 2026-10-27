import { createRequire } from "node:module";
const require = createRequire("/opt/npm-tools/node_modules/");
const { chromium } = require("playwright");
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const errs = [];
const p = await b.newPage({ viewport: { width: 390, height: 800 } });
p.on("pageerror", (e) => errs.push("pageerror " + e.message));
await p.addInitScript(() => { try { if (!localStorage.getItem("pokemon-dream.lang")) localStorage.setItem("pokemon-dream.lang", "en"); localStorage.setItem("pokecards.textSpeed", "instant"); } catch {} });
const spanish = /[¿¡ñáéíóú]|\b(el|la|los|las|de|del|que|con|para|tu|tus|una|un|por|se|no|es|y|en|al|más|pero|como|ya|si|te|lo|mi|su)\b/i;
const found = new Map();
async function scan(label) {
  const text = await p.evaluate(() => document.body.innerText);
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const l of lines) {
    const noPoke = l.replace(/Pokémon|Poké/gi, "");
    if (spanish.test(noPoke) && !/^[A-Z0-9 .·\-+x%/:()]+$/.test(l) || /[¿¡ñáíóú]/.test(noPoke)) found.set(l, label);
  }
}
await p.goto("http://localhost:8080/web/?debug&fastload"); await p.waitForSelector(".title");
await scan("title");
await p.click("text=OPTIONS"); await scan("options"); await p.click("text=CLOSE").catch(()=>{});
await p.click("text=FAQ"); await scan("faq"); await p.click("text=BACK").catch(()=>{});
await p.click(".startButton"); await scan("adventure");
await p.click(".adventureCard >> nth=1"); await scan("setup");
await p.click(".startButton"); await p.waitForSelector(".starterCard"); await scan("starter");
await p.click(".starterCard >> nth=1"); await p.click(".starterButtons .primary");
await p.waitForTimeout(500); await scan("firstcall");
await p.evaluate(() => document.querySelector(".callPanel .btn")?.click());
await scan("map");
// recorrer fases
for (const phase of ["camp", "center", "shop"]) {
  await p.evaluate(async (ph) => { const c = window.__ctx; const m = await import("/src/run/index.js"); m.grantStarPieces(c.run, 9); c.run.phase = ph; c.rerender(); }, phase).catch(()=>{});
  await p.waitForTimeout(200); await scan(phase);
}
await p.evaluate(async () => { const c = window.__ctx; const m = await import("/src/run/index.js"); c.run.phase = "map"; c.rerender(); m.chooseNode(c.run, 0); c.rerender(); });
await p.waitForTimeout(400); await scan("combat");
for (const l of ["finale=gardevoir", "finale=amelie", "finale"]) {
  await p.goto("http://localhost:8080/web/?debug&fastload&" + l).catch(()=>{}); await p.waitForTimeout(800);
  for (let i = 0; i < 12; i++) { await scan(l); await p.evaluate(() => [...document.querySelectorAll("button")].find((x) => /NEXT|▶/.test(x.textContent))?.click()); await p.waitForTimeout(150); }
}
console.log([...found].map(([l, w]) => `[${w}] ${l}`).join("\n"));
console.log("errors", errs);
await b.close();
