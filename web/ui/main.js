// Arranque: carga los JSON, crea la corrida y dibuja la pantalla según run.phase.
import { createRun, difficultyPresets, gameModes, finishCombat, restoreRun, serializeRun } from "../../src/run/index.js";
import { renderCombat } from "./combatView.js";
import { animateBars, playEffects } from "./effects.js";
import { icon } from "./pixelIcons.js";
import { sfx } from "./sfx.js";
import { h } from "./dom.js";
import { typeColors, typeNames } from "./labels.js";
import { renderMap } from "./mapView.js";
import { renderReward } from "./rewardView.js";
import { renderRoster } from "./rosterPanel.js";
import { renderCamp, renderShop } from "./siteViews.js";
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
const ctx = { data: null, run: null, sprites: null, savedRun: null, fx: [], lastEvents: [], toast: "", rerender, notify, onCombatFinished };
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
      h("button", { class: "btn", onClick: () => { ctx.starterPick = null; rerender(); } }, "◀ VOLVER"),
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

function titleScreen() {
  const seedInput = h("input", {
    type: "number", placeholder: "SEMILLA (OPCIONAL)", value: setup.seed,
    "aria-label": "Semilla de la partida", onInput: (event) => { setup.seed = event.target.value; }
  });
  const milestones = [
    ["01", "ARMÁ TU EQUIPO", "Elegí un inicial y capturá hasta 6 Pokémon."],
    ["02", "CONSTRUÍ TU MAZO", "Ganás cartas, energía, recursos y experiencia."],
    ["03", "CONQUISTÁ LA LIGA", "Superá 8 gimnasios, Alto Mando y campeón."]
  ];
  return h("section", { class: "title" },
    h("div", { class: "eyebrow" }, "ROGUELIKE TÁCTICO · CARTAS + COMBATE POR TURNOS"),
    h("div", { class: "logo" }, h("span", {}, "POKÉCARDS"), h("span", { class: "logo2" }, "DUNGEON")),
    h("div", { class: "logoIcons" }, icon("bolt", { scale: 4 }), icon("star", { scale: 4 }), icon("heart", { scale: 4 }), icon("shield", { scale: 4 }), icon("cards", { scale: 4 })),
    h("p", { class: "heroLead" }, "Una corrida. Un equipo que crece. Cada decisión cuenta."),
    h("div", { class: "goalGrid" }, milestones.map(([number, heading, text]) => h("div", { class: "goalCard" },
      h("span", { class: "goalNumber" }, number), h("strong", {}, heading), h("p", {}, text)))),
    h("div", { class: "setupWindow" },
      h("h2", {}, "ELEGÍ EL MODO DE AVENTURA"),
      h("div", { class: "gameModeOptions", role: "group", "aria-label": "Modo de campaña" },
        Object.entries(gameModes).map(([id, def]) => h("button", {
          class: `gameModeButton ${setup.mode === id ? "active" : ""}`,
          "aria-pressed": setup.mode === id,
          onClick: () => { setup.mode = id; sfx.play("select"); rerender(); }
        }, h("strong", {}, def.label), h("small", {}, def.description)))),
      setup.mode === "regional" ? h("div", { class: "regionChoice" },
        h("strong", {}, "REGIÓN DE LA CAMPAÑA"),
        h("div", { class: "regionTabs" },
          [["random", "SORPRESA"], ...Object.entries(ctx.data.campaigns.regions).map(([id, def]) => [id, def.name.toUpperCase()])]
            .map(([id, label]) => h("button", {
              class: `btn mini ${setup.regionId === id ? "on" : ""}`,
              "aria-pressed": setup.regionId === id,
              onClick: () => { setup.regionId = id; sfx.play("select"); rerender(); }
            }, label)))) : h("p", { class: "modeHint" }, "Los 8 gimnasios pueden ser de regiones diferentes. La semilla fija el sorteo."),
      h("h2", {}, "ELEGÍ LA DIFICULTAD"),
      h("div", { class: "difficultyOptions", role: "group", "aria-label": "Nivel de dificultad" },
        Object.entries(difficultyPresets).map(([id, preset]) => h("button", {
          class: `difficultyButton ${setup.difficulty === id ? "active" : ""}`, "aria-pressed": setup.difficulty === id,
          onClick: () => { setup.difficulty = id; sfx.play("select"); rerender(); }
        }, h("strong", {}, preset.label), h("small", {}, preset.description)))),
      h("label", { class: "seedLabel" }, "SEMILLA PARA REPETIR UNA CORRIDA", seedInput)),
    ctx.savedRun ? h("button", { class: "btn big continueButton", onClick: continueRun }, "CONTINUAR PARTIDA GUARDADA ▶") : null,
    ctx.savedRun && setup.confirmStart ? h("div", { class: "overwriteWarning" },
      h("strong", {}, "HAY UNA PARTIDA GUARDADA"),
      h("p", {}, "Empezar otra corrida reemplazará el progreso actual al elegir tu inicial."),
      h("div", { class: "starterButtons" },
        h("button", { class: "btn", onClick: () => { setup.confirmStart = false; rerender(); } }, "CANCELAR"),
        h("button", { class: "btn danger", onClick: () => { setup.confirmStart = false; openStarterPick(); } }, "SÍ, NUEVA PARTIDA"))) : null,
    h("button", { class: "btn primary big startButton", onClick: () => {
      if (ctx.savedRun) { setup.confirmStart = true; return rerender(); }
      openStarterPick();
    } }, "EMPEZAR AVENTURA ▶"),
    h("small", { class: "muted" }, "Fan game privado sin fines de lucro · sprites Gen 5 de Black/White."));
}

function endScreen() {
  const won = ctx.run.result === "victory";
  return h("section", { class: "window title" },
    h("h2", { class: won ? "win" : "lose" }, won ? "¡CAMPEÓN DE LA LIGA!" : "FIN DE LA CORRIDA"),
    h("p", {}, icon("medal", { scale: 3 }), ` Medallas: ${ctx.run.badges.length}/8 · ${ctx.run.campaign.name} · ${gameModes[ctx.run.mode]?.label ?? "CLÁSICO"} · ${difficultyPresets[ctx.run.difficulty ?? "trainer"].label} · Semilla ${ctx.run.seed}`),
    h("button", { class: "btn primary", onClick: () => { ctx.run = null; rerender(); } }, "VOLVER AL INICIO"));
}

function screenFor(run) {
  switch (run.phase) {
    case "combat": return renderCombat(ctx);
    case "reward": return renderReward(ctx);
    case "camp": return renderCamp(ctx);
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
  const button = h("button", { class: "btn mini sound", onClick: () => { sfx.toggle(); button.textContent = sfx.isMuted() ? "SND OFF" : "SND ON"; } }, sfx.isMuted() ? "SND OFF" : "SND ON");
  return button;
}

function rerender() {
  const run = ctx.run;
  if (!run) {
    root.replaceChildren(ctx.starterPick ? starterScreen() : titleScreen(),
      ctx.toast ? h("div", { class: "toast", role: "status" }, ctx.toast) : null, soundButton());
    return;
  }
  persistRun(run);
  const inCombat = run.phase === "combat" || run.phase === "ended";
  const children = [
    h("div", { class: inCombat ? "layout single" : "layout" }, screenFor(run), inCombat ? null : renderRoster(ctx)),
    ctx.toast ? h("div", { class: "toast", role: "status", "aria-live": "polite" }, ctx.toast) : null,
    soundButton()
  ];
  root.replaceChildren(...children.filter(Boolean));
  applyFx();
}

try {
  ctx.data = await loadData();
  // Si se descargaron sprites offline, priorizar el pack local desde el primer frame.
  const localManifest = await fetch("../assets/sprites/manifest.json").then((response) => response.ok).catch(() => false);
  ctx.sprites = createAnimatedSpriteProvider({ data: ctx.data, preferLocal: localManifest || !navigator.onLine });
  ctx.savedRun = readSave();
  rerender();
} catch (error) {
  root.replaceChildren(h("pre", { class: "error" }, `${error.message}\nAbrí el juego con "npm start" (servidor local), no con doble clic.`));
}
