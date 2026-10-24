// Arranque: carga los JSON, crea la corrida y dibuja la pantalla según run.phase.
import { createRun, difficultyPresets, gameModes, finishCombat, restoreRun, serializeRun } from "../../src/run/index.js";
import { renderCombat } from "./combatView.js";
import { animateBars, playEffects } from "./effects.js";
import { icon } from "./pixelIcons.js";
import { sfx } from "./sfx.js";
import { h } from "./dom.js";
import { typeColors, typeNames } from "./labels.js";
import { renderMap } from "./mapView.js";
import { audioButton, audioPanel } from "./audioView.js";
import { music } from "./music.js";
import { renderDeckEditor } from "./deckView.js";
import { renderReward } from "./rewardView.js";
import { renderRoster } from "./rosterPanel.js";
import { adventureScreen, faqScreen, setupScreen, titleScreen } from "./titleScreens.js";
import { runLoadingScreen } from "./loadingScreen.js";
import { renderCamp, renderCenter, renderShop } from "./siteViews.js";
import { createAnimatedSpriteProvider } from "./spriteProvider.js";

const dataFiles = ["balance", "cards", "moves", "species", "typeChart", "enemyProfiles", "startingDeck", "encounters", "items", "region", "campaigns"];

async function loadData() {
  const entries = await Promise.all(dataFiles.map(async (name) => {
    const response = await fetch(`../data/${name}.json`);
    if (!response.ok) throw new Error(`No se pudo cargar data/${name}.json`);
    return [name, await response.json()];
  }));
  return Object.fromEntries(entries);
}

const root = document.getElementById("app");
const setup = { seed: "", difficulty: "trainer", mode: "regional", regionId: "random", confirmStart: false };
const saveKey = "pokecards-dungeon-v2";
const ctx = { screen: "title", data: null, run: null, sprites: null, savedRun: null, fx: [], lastEvents: [], toast: "", rerender, notify, onCombatFinished };
if (location.search.includes("debug")) window.__ctx = ctx;

function readSave() {
  try { return localStorage.getItem(saveKey); } catch { return null; }
}

function persistRun(run) {
  try {
    if (run.phase === "ended") {
      localStorage.removeItem(saveKey);
      ctx.savedRun = null;
    } else {
      ctx.savedRun = serializeRun(run);
      localStorage.setItem(saveKey, ctx.savedRun);
    }
  } catch (error) { console.warn("No se pudo guardar la corrida:", error); }
}

function continueRun() {
  try {
    ctx.run = restoreRun(ctx.data, ctx.savedRun);
    ctx.starterPick = null;
    sfx.play("start");
    rerender();
  } catch (error) {
    try { localStorage.removeItem(saveKey); } catch { /* almacenamiento bloqueado */ }
    ctx.savedRun = null;
    ctx.toast = "El guardado estaba dañado o era incompatible.";
    rerender();
  }
}

function notify(message) {
  ctx.toast = message;
  setTimeout(() => { if (ctx.toast === message) { ctx.toast = ""; rerender(); } }, 2500);
}

function onCombatFinished() {
  const result = finishCombat(ctx.run);
  ctx.lastEvents = result.events ?? [];
  const failed = ctx.lastEvents.find((event) => event.type === "eventFailed");
  if (failed) notify(failed.nodeType === "legendary" ? "El legendario huyó. Tu equipo quedó como estaba." : "Perdiste el enfrentamiento, pero tu equipo quedó como estaba.");
  rerender();
}

function startRun(seed, starterId, difficulty, mode, regionId) {
  ctx.run = createRun({ data: ctx.data, seed, starterIds: [starterId], difficulty, mode, regionId });
  ctx.starterPick = null;
  ctx.lastEvents = [];
  rerender();
}

// Elegir UN inicial de cualquier región; el resto del equipo se captura durante el camino.
function starterScreen() {
  const pick = ctx.starterPick;
  const choices = ctx.data.region.start.starterChoices;
  const group = choices[pick.region];
  const chip = (type) => h("span", { class: "chip", style: `background:${typeColors[type]}` }, typeNames[type]);
  const card = (speciesId) => {
    const species = ctx.data.species[speciesId];
    return h("button", { class: `starterCard ${pick.speciesId === speciesId ? "picked" : ""}`, onClick: () => { sfx.play("select"); pick.speciesId = speciesId; rerender(); } },
      h("div", { class: "spriteBox" }, h("div", { class: "platform" }), ctx.sprites.element(speciesId, { facing: "front" })),
      h("div", { class: "pname" }, species.name),
      h("div", { class: "types" }, species.types.map(chip)),
      h("div", { class: "starterStats" }, `PS ${species.stats.hp} · ATQ ${species.stats.atk} · ESP ${species.stats.spa}`),
      h("ul", { class: "starterMoves" }, species.moves.map((id) => h("li", {}, h("i", { style: `background:${typeColors[ctx.data.moves[id].type]}` }), ctx.data.moves[id].name))));
  };
  return h("section", { class: "window starter" },
    h("h2", {}, "ELEGÍ TU INICIAL"),
    h("p", { class: "muted" }, `Modo ${gameModes[pick.mode].label} · Dificultad ${difficultyPresets[pick.difficulty].label} · Elegí tu inicial. Los demás se capturan.`),
    h("div", { class: "regionTabs" }, choices.map((entry, index) =>
      h("button", { class: `btn mini ${index === pick.region ? "on" : ""}`, onClick: () => { sfx.play("select"); pick.region = index; rerender(); } }, entry.region.toUpperCase()))),
    h("div", { class: "starterRow" }, group.species.map(card)),
    h("div", { class: "starterButtons" },
      h("button", { class: "btn", onClick: () => { ctx.starterPick = null; ctx.screen = "setup"; rerender(); } }, "◀ VOLVER"),
      h("button", { class: "btn primary", disabled: !pick.speciesId, onClick: () => { sfx.play("start"); startRun(pick.seed, pick.speciesId, pick.difficulty, pick.mode, pick.regionId); } },
        pick.speciesId ? `¡VAMOS, ${ctx.data.species[pick.speciesId].name.toUpperCase()}! ▶` : "ELEGÍ UNO")));
}

function openStarterPick() {
  sfx.play("start");
  const selectedRegion = Object.keys(ctx.data.campaigns.regions).indexOf(setup.regionId);
  ctx.starterPick = {
    seed: Number(setup.seed) || Date.now() % 2147483646,
    region: Math.max(0, selectedRegion), speciesId: null, difficulty: setup.difficulty,
    mode: setup.mode, regionId: setup.regionId
  };
  rerender();
}

const app = { ctx, setup, rerender, openStarterPick, continueRun, go(screen) { ctx.screen = screen; rerender(); } };

function menuScreen() {
  if (ctx.starterPick) return starterScreen();
  switch (ctx.screen) {
    case "adventure": return adventureScreen(app);
    case "setup": return setupScreen(app);
    case "faq": return faqScreen(app);
    default: return titleScreen(app);
  }
}

function endScreen() {
  const won = ctx.run.result === "victory";
  return h("section", { class: "window title" },
    h("h2", { class: won ? "win" : "lose" }, won ? "¡CAMPEÓN DE LA LIGA!" : "FIN DE LA CORRIDA"),
    h("p", {}, icon("medal", { scale: 3 }), ` Medallas: ${ctx.run.badges.length}/8 · ${ctx.run.campaign.name} · ${gameModes[ctx.run.mode]?.label ?? "CLÁSICO"} · ${difficultyPresets[ctx.run.difficulty ?? "trainer"].label} · Semilla ${ctx.run.seed}`),
    h("button", { class: "btn primary", onClick: () => { ctx.run = null; ctx.screen = "title"; rerender(); } }, "VOLVER AL INICIO"));
}

function screenFor(run) {
  switch (run.phase) {
    case "combat": return renderCombat(ctx);
    case "reward": return renderReward(ctx);
    case "camp": return renderCamp(ctx);
    case "center": return renderCenter(ctx);
    case "shop": return renderShop(ctx);
    case "ended": return endScreen();
    default: return renderMap(ctx);
  }
}

function applyFx() {
  const effects = ctx.fx;
  ctx.fx = [];
  playEffects(root, effects);
  animateBars(root);
}

function soundButton() {
  return audioButton(() => { ctx.audioOpen = true; rerender(); });
}

function audioLayer() {
  return ctx.audioOpen ? audioPanel(() => { ctx.audioOpen = false; rerender(); }) : null;
}

// Escena musical según la fase: los combates de líder/liga/evento usan el tema de jefe.
function sceneFor(run) {
  if (!run) return "title";
  if (run.phase === "ended") return null;
  if (run.phase !== "combat") return "map";
  const bossKinds = ["gym", "eliteFour", "champion"];
  const bossNodes = ["legendary", "rival", "villain"];
  return bossKinds.includes(run.combat?.kind) || bossNodes.includes(run.node?.type) ? "boss" : "combat";
}

function rerender() {
  const run = ctx.run;
  if (!run) {
    root.replaceChildren(...[menuScreen(),
      ctx.toast ? h("div", { class: "toast", role: "status" }, ctx.toast) : null, soundButton(), audioLayer()].filter(Boolean));
    music.setScene("title");
    return;
  }
  persistRun(run);
  const inCombat = run.phase === "combat" || run.phase === "ended";
  const children = [
    h("div", { class: inCombat ? "layout single" : "layout" }, screenFor(run), inCombat ? null : renderRoster(ctx)),
    ctx.deckOpen && !inCombat && run.phase !== "ended" ? renderDeckEditor(ctx) : null,
    ctx.toast ? h("div", { class: "toast", role: "status", "aria-live": "polite" }, ctx.toast) : null,
    soundButton(),
    audioLayer()
  ];
  root.replaceChildren(...children.filter(Boolean));
  music.setScene(sceneFor(run));
  applyFx();
}

async function boot() {
  ctx.data = await loadData();
  // Si se descargaron sprites offline, priorizar el pack local desde el primer frame.
  const localManifest = await fetch("../assets/sprites/manifest.json").then((response) => response.ok).catch(() => false);
  ctx.sprites = createAnimatedSpriteProvider({ data: ctx.data, preferLocal: localManifest || !navigator.onLine });
  ctx.savedRun = readSave();
}

try {
  await runLoadingScreen(root, boot(), { durationMs: location.search.includes("fastload") ? 250 : undefined });
  rerender();
} catch (error) {
  root.replaceChildren(h("pre", { class: "error" }, `${error.message}\nAbrí el juego con "npm start" (servidor local), no con doble clic.`));
}
