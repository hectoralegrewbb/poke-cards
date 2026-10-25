// Arranque: carga los JSON, crea la corrida y dibuja la pantalla según run.phase.
import { consumeStoryLine, createRun, markStoryRead, readingTimeMs, difficultyPresets, gameModes, finishCombat, restoreRun, serializeRun } from "../../src/run/index.js";
import { renderCombat } from "./combatView.js";
import { animateBars, playEffects } from "./effects.js";
import { icon } from "./pixelIcons.js";
import { sfx } from "./sfx.js";
import { h } from "./dom.js";
import { typeColors, typeNames } from "./labels.js";
import { renderMap } from "./mapView.js";
import { audioButton, audioPanel, resumeFlagKey } from "./audioView.js";
import { music } from "./music.js";
import { renderDeckEditor } from "./deckView.js";
import { renderReward } from "./rewardView.js";
import { renderRoster } from "./rosterPanel.js";
import { adventureScreen, faqScreen, setupScreen, titleScreen } from "./titleScreens.js";
import { runLoadingScreen } from "./loadingScreen.js";
import { renderCamp, renderCenter, renderShop } from "./siteViews.js";
import { amelieFace, loadAmelieAssets } from "./amelieArt.js";
import { amelieScene, gardevoirScene, scenePortrait, starterOffer } from "./storyView.js";
import { heldModal } from "./heldView.js";
import { typedText, typingDurationMs } from "./typewriter.js";
import { callLog, callPanel, storyBell } from "./callView.js";
import { createFinaleRun } from "../../src/run/debugFinale.js";
import { createAnimatedSpriteProvider } from "./spriteProvider.js";
import { activeDictionary, getLanguage, localizeData, t } from "../../src/shared/i18n.js";

const dataFiles = ["balance", "cards", "moves", "species", "typeChart", "enemyProfiles", "startingDeck", "encounters", "items", "heldItems", "region", "campaigns", "story"];

async function loadData() {
  const entries = await Promise.all(dataFiles.map(async (name) => {
    const response = await fetch(`../data/${name}.json`);
    if (!response.ok) throw new Error(t("No se pudo cargar data/{name}.json", { name }));
    return [name, await response.json()];
  }));
  const data = Object.fromEntries(entries);
  return getLanguage() === "es" ? data : localizeData(data, activeDictionary());
}

const root = document.getElementById("app");
const setup = { seed: "", difficulty: "trainer", mode: "regional", regionId: "random", confirmStart: false };
const saveKey = "pokecards-dungeon-v2";
const ctx = { call: null, logOpen: false, finalStep: 0, screen: "title", data: null, run: null, sprites: null, savedRun: null, fx: [], lastEvents: [], toast: "", rerender, notify, onCombatFinished };
if (location.search.includes("debug")) window.__ctx = ctx;

function readSave() {
  try { return localStorage.getItem(saveKey); } catch { return null; }
}

function persistRun(run) {
  if (ctx.noSave) return; // partida de prueba (?finale): no toca tu guardado
  try {
    if (run.phase === "ended") {
      localStorage.removeItem(saveKey);
      ctx.savedRun = null;
    } else {
      ctx.savedRun = serializeRun(run);
      localStorage.setItem(saveKey, ctx.savedRun);
    }
  } catch (error) { console.warn(t("No se pudo guardar la corrida:"), error); }
}

function continueRun() {
  try {
    ctx.run = restoreRun(ctx.data, ctx.savedRun);
    ctx.call = null; ctx.logOpen = false;
    ctx.starterPick = null;
    sfx.play("start");
    rerender();
  } catch (error) {
    try { localStorage.removeItem(saveKey); } catch { /* almacenamiento bloqueado */ }
    ctx.savedRun = null;
    ctx.toast = t("El guardado estaba dañado o era incompatible.");
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
  if (failed) notify(failed.nodeType === "legendary" ? t("El legendario huyó. Tu equipo quedó como estaba.") : t("Perdiste el enfrentamiento, pero tu equipo quedó como estaba."));
  rerender();
}

function startRun(seed, starterId, difficulty, mode, regionId, loop = 0) {
  ctx.run = createRun({ data: ctx.data, seed, starterIds: [starterId], difficulty, mode, regionId, loop });
  ctx.starterPick = null;
  ctx.call = null; ctx.logOpen = false;
  ctx.finalStep = 0;
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
      h("div", { class: "starterStats" }, t("PS {hp} · ATQ {atk} · ESP {spa}", { hp: species.stats.hp, atk: species.stats.atk, spa: species.stats.spa })),
      h("ul", { class: "starterMoves" }, species.moves.map((id) => h("li", {}, h("i", { style: `background:${typeColors[ctx.data.moves[id].type]}` }), ctx.data.moves[id].name))));
  };
  return h("section", { class: "window starter" },
    h("h2", {}, t("ELEGÍ TU INICIAL")),
    pick.mode === "global" && ctx.data.story ? starterOffer(ctx.data.story) : null,
    h("p", { class: "muted" }, t("Modo {label} · Dificultad {label2} · Elegí tu inicial. Los demás se capturan.", { label: gameModes[pick.mode].label, label2: difficultyPresets[pick.difficulty].label })),
    h("div", { class: "regionTabs" }, choices.map((entry, index) =>
      h("button", { class: `btn mini ${index === pick.region ? "on" : ""}`, onClick: () => { sfx.play("select"); pick.region = index; rerender(); } }, entry.region.toUpperCase()))),
    h("div", { class: "starterRow" }, group.species.map(card)),
    h("div", { class: "starterButtons" },
      h("button", { class: "btn", onClick: () => { ctx.starterPick = null; ctx.screen = "setup"; rerender(); } }, t("◀ VOLVER")),
      h("button", { class: "btn primary", disabled: !pick.speciesId, onClick: () => { sfx.play("start"); startRun(pick.seed, pick.speciesId, pick.difficulty, pick.mode, pick.regionId, pick.loop); } },
        pick.speciesId ? t("¡VAMOS, {name}! ▶", { name: ctx.data.species[pick.speciesId].name.toUpperCase() }) : t("ELEGÍ UNO"))));
}

function openStarterPick() {
  sfx.play("start");
  const selectedRegion = Object.keys(ctx.data.campaigns.regions).indexOf(setup.regionId);
  ctx.starterPick = {
    seed: Number(setup.seed) || Date.now() % 2147483646,
    region: Math.max(0, selectedRegion), speciesId: null, difficulty: setup.difficulty,
    mode: setup.mode, regionId: setup.regionId, loop: ctx.pendingLoop ?? 0
  };
  ctx.pendingLoop = 0;
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

// Los textos de un final se escriben uno tras otro.
function endingLines(run, lines) {
  let delay = 0;
  return lines.map((line, index) => {
    const node = typedText(`ending:${run.seed}:${run.loop ?? 0}:${index}`, line, { class: "endingLine" }, delay);
    delay += typingDurationMs(line) + 500;
    return node;
  });
}

function endScreen() {
  const { run } = ctx;
  const won = run.result === "victory";
  const ending = run.ending ? ctx.data.story?.final.endings[run.ending] : null;
  const summary = h("p", {}, icon("medal", { scale: 3 }), t(" Medallas: {badges}/8 · {campaign} · {mode} · {difficulty} · Semilla {seed}", { badges: run.badges.length, campaign: run.campaign.name, mode: gameModes[run.mode]?.label ?? t("CLÁSICO"), difficulty: difficultyPresets[run.difficulty ?? "trainer"].label, seed: run.seed }));
  const back = h("button", { class: "btn primary", onClick: () => { ctx.run = null; ctx.call = null; ctx.logOpen = false; ctx.screen = "title"; rerender(); } }, t("VOLVER AL INICIO"));
  if (ending) {
    const portraits = { escape: () => amelieFace("cry", 190), stay: () => scenePortrait(ctx, "sprite:froslass"), true: () => h("div", { class: "endingPair" }, scenePortrait(ctx, "sprite:gardevoir"), scenePortrait(ctx, "sprite:froslass")) };
    const restart = run.ending === "stay"
      ? h("button", { class: "btn primary", onClick: () => {
          setup.mode = "global"; setup.difficulty = run.difficulty; setup.seed = String(run.seed);
          ctx.pendingLoop = (run.loop ?? 0) + 1;
          ctx.run = null; ctx.call = null; ctx.logOpen = false; ctx.screen = "title";
          openStarterPick();
        } }, ctx.data.story.restart.button)
      : null;
    return h("section", { class: `window title endingScreen ending-${run.ending}` },
      portraits[run.ending]?.(),
      h("h2", { class: run.ending === "stay" ? "lose" : "win" }, ending.title),
      endingLines(run, ending.lines),
      summary, restart, back);
  }
  return h("section", { class: "window title" }, h("h2", { class: won ? "win" : "lose" }, won ? t("¡CAMPEÓN DE LA LIGA!") : t("FIN DE LA CORRIDA")), summary, back);
}

function screenFor(run) {
  switch (run.phase) {
    case "combat": return renderCombat(ctx);
    case "reward": return renderReward(ctx);
    case "camp": return renderCamp(ctx);
    case "center": return renderCenter(ctx);
    case "shop": return renderShop(ctx);
    case "amelieIntro": return amelieScene(ctx);
    case "gardevoirIntro": return gardevoirScene(ctx);
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

function closeLog() {
  if (ctx.run) markStoryRead(ctx.run);
  ctx.logOpen = false;
  rerender();
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
  if (run.phase === "amelieIntro" || run.phase === "gardevoirIntro") return "boss";
  if (run.phase !== "combat") return "map";
  const bossKinds = ["gym", "eliteFour", "champion", "amelie", "gardevoir"];
  const bossNodes = ["legendary", "rival", "villain"];
  return bossKinds.includes(run.combat?.kind) || bossNodes.includes(run.node?.type) ? "boss" : "combat";
}

const storyPhases = ["map", "combat", "reward", "center", "camp", "shop"];

// Cierra la llamada. answered=true: el jugador la atendió (queda leída); si se corta sola queda sin leer en la campanita.
function closeCall(answered) {
  const call = ctx.call;
  if (!call) return;
  if (answered && ctx.run) markStoryRead(ctx.run, call.line.seq);
  ctx.call = null;
  rerender();
}

// Elige (una sola vez por partida) el diálogo que corresponde al momento actual y lo muestra como llamada.
// Si el jugador cambió de pantalla (p. ej. entró a combatir), la llamada vieja se corta y espera en la campanita.
function refreshStoryLine(run) {
  if (ctx.call && ctx.call.phase !== run.phase) ctx.call = null;
  if (ctx.call || !storyPhases.includes(run.phase)) return;
  const line = consumeStoryLine(run);
  if (!line) return;
  const ms = readingTimeMs(line.text, typingDurationMs(line.text));
  ctx.call = { line, phase: run.phase, shownAt: Date.now(), ms, fresh: true };
  setTimeout(() => { if (ctx.call?.line === line) closeCall(false); }, ms);
}

function rerender() {
  const run = ctx.run;
  if (!run) {
    root.replaceChildren(...[menuScreen(),
      ctx.toast ? h("div", { class: "toast", role: "status" }, ctx.toast) : null, soundButton(), audioLayer()].filter(Boolean));
    music.setScene("title");
    return;
  }
  refreshStoryLine(run);
  persistRun(run);
  const inCombat = ["combat", "ended", "amelieIntro", "gardevoirIntro"].includes(run.phase);
  const children = [
    h("div", { class: inCombat ? "layout single" : "layout" }, screenFor(run), inCombat ? null : renderRoster(ctx)),
    ctx.deckOpen && !inCombat && run.phase !== "ended" ? renderDeckEditor(ctx) : null,
    ctx.toast ? h("div", { class: "toast", role: "status", "aria-live": "polite" }, ctx.toast) : null,
    heldModal(ctx),
    callPanel(ctx, { onAnswer: () => closeCall(true) }),
    callLog(ctx, closeLog),
    storyBell(ctx),
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
  await loadAmelieAssets();
  // Tras cambiar de idioma la página se recarga: se retoma la corrida que estaba en curso.
  let resume = false;
  try { resume = sessionStorage.getItem(resumeFlagKey) === "1"; sessionStorage.removeItem(resumeFlagKey); } catch { /* nada que retomar */ }
  if (resume && ctx.savedRun) ctx.resumeAfterBoot = true;
  const finale = new URLSearchParams(location.search).get("finale");
  if (finale !== null) {
    ctx.noSave = true;
    ctx.run = createFinaleRun({ data: ctx.data, mode: finale });
    // Con "gardevoir" se salta a la escena del final secreto: se resuelve como si ya hubieras vencido a Amelie.
    if (finale === "gardevoir") finishCombat(ctx.run);
  }
}

try {
  await runLoadingScreen(root, boot(), { durationMs: location.search.includes("fastload") ? 250 : undefined });
  if (ctx.resumeAfterBoot) continueRun(); else rerender();
} catch (error) {
  root.replaceChildren(h("pre", { class: "error" }, `${error.message}\n${t('Abrí el juego con "npm start" (servidor local), no con doble clic.')}`));
}
