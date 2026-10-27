import { createRequire } from "node:module";
const require = createRequire("/opt/npm-tools/node_modules/");
const { chromium } = require("playwright");
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const errs=[];
for (const [name, vp] of [["desk",{width:1100,height:1000}],["mob",{width:390,height:800}]]) {
  const p = await b.newPage({ viewport: vp }); p.on("pageerror",(e)=>errs.push(e.message)); p.on("requestfailed",(r)=>errs.push("fail "+r.url()));
  await p.addInitScript(()=>{localStorage.setItem("pokemon-dream.lang","es");localStorage.setItem("pokecards.textSpeed","instant");});
  await p.goto("http://localhost:8080/web/?debug&fastload"); await p.waitForSelector(".title");
  await p.click(".startButton"); await p.click(".adventureCard >> nth=1"); await p.click(".startButton");
  await p.waitForSelector(".starterCard"); await p.click(".starterCard >> nth=1"); await p.click(".starterButtons .primary");
  await p.waitForTimeout(400); await p.evaluate(() => document.querySelector(".callPanel .btn")?.click());
  await p.evaluate(async () => { const c = window.__ctx; const m = await import("/src/run/index.js"); m.chooseNode(c.run, 0); c.rerender(); });
  await p.waitForSelector(".card.sprite"); await p.waitForTimeout(600);
  await p.screenshot({ path: `/tmp/combat-${name}.png` });
  const box = await p.locator(".card.sprite >> nth=0").boundingBox(); console.log(name, box);
  // click (nombre) y mantener (descripción)
  await p.mouse.move(box.x+box.width/2, box.y+box.height/2); await p.mouse.down(); await p.waitForTimeout(700);
  console.log("tip", await p.locator(".cardTip").count()); await p.screenshot({ path: `/tmp/tip-${name}.png` }); await p.mouse.up();
  await p.waitForTimeout(150); console.log("after hold card count", await p.evaluate(()=>window.__ctx.run.combat.deck.hand.length));
  await p.locator(".card.sprite >> nth=1").click({force:true}).catch(()=>{}); await p.waitForTimeout(250);
  console.log("name tag", await p.locator(".cardNameTag").count(), await p.locator(".cardNameTag").textContent().catch(()=>null));
  await p.screenshot({ path: `/tmp/name-${name}.png` });
  // recompensa
  await p.evaluate(async () => { const c = window.__ctx; c.run.phase="reward"; c.run.pending = c.run.pending ?? {}; c.rerender(); });
  await p.close();
}
console.log(errs); await b.close();
