// Pantallas previas a la corrida: inicio, tipo de aventura, ajustes del modo y FAQ.
import { difficultyPresets } from "../../src/run/index.js";
import { languageRow } from "./audioView.js";
import { h } from "./dom.js";
import { faqSections } from "./faqContent.js";
import { icon } from "./pixelIcons.js";
import { sfx } from "./sfx.js";
import { titleWalkers } from "./titleWalkers.js";
import { t } from "../../src/shared/i18n.js";

// Tipos de aventura: cada uno corresponde a un modo de campaña del motor.
export const adventureTypes = [
  { id: "regional", label: t("REGIÓN"), description: t("Una región y sus 8 líderes en orden, Alto Mando y campeón de esa Liga.") },
  { id: "global", label: t("POKÉ WORLD"), description: t("Gimnasios de las 5 regiones mezclados, Liga Mundial y encuentros cruzados.") }
];

const logo = () => h("div", { class: "logo" }, h("span", {}, t("POKÉMON")), h("span", { class: "logo2" }, t("DREAM")));

// app: { ctx, setup, go(screen), openStarterPick, continueRun, rerender }
export function titleScreen(app) {
  const { ctx } = app;
  return h("section", { class: "title mainMenu" },
    h("div", { class: "eyebrow" }, t("ROGUELIKE TÁCTICO · CARTAS + COMBATE POR TURNOS")),
    logo(),
    h("div", { class: "logoIcons" }, icon("bolt", { scale: 4 }), icon("star", { scale: 4 }), icon("heart", { scale: 4 }), icon("shield", { scale: 4 }), icon("cards", { scale: 4 })),
    h("p", { class: "heroLead" }, t("Una corrida. Un equipo que crece. Cada decisión cuenta.")),
    h("div", { class: "menuButtons" },
      ctx.savedRun ? h("button", { class: "btn big continueButton", onClick: app.continueRun }, t("CONTINUAR ▶")) : null,
      h("button", { class: "btn primary big startButton", onClick: () => { sfx.play("start"); app.go("adventure"); } }, t("INICIAR ▶")),
      h("button", { class: "btn big", onClick: () => { sfx.play("select"); ctx.audioOpen = true; app.rerender(); } }, t("OPCIONES")),
      h("button", { class: "btn big", onClick: () => { sfx.play("select"); app.go("faq"); } }, t("FAQ"))),
    languageRow(),
    h("small", { class: "muted" }, t("Fan game privado sin fines de lucro · sprites Gen 5 de Black/White.")),
    titleWalkers(ctx));
}

export function adventureScreen(app) {
  return h("section", { class: "title adventureMenu" },
    h("h2", {}, t("ELEGÍ TU AVENTURA")),
    h("div", { class: "adventureCards" }, adventureTypes.map((type) =>
      h("button", { class: "adventureCard", onClick: () => { app.setup.mode = type.id; sfx.play("start"); app.go("setup"); } },
        h("strong", {}, type.label), h("small", {}, type.description)))),
    h("button", { class: "btn", onClick: () => { sfx.play("deny"); app.go("title"); } }, t("◀ VOLVER")));
}

export function setupScreen(app) {
  const { ctx, setup } = app;
  const type = adventureTypes.find((entry) => entry.id === setup.mode) ?? adventureTypes[0];
  const seedInput = h("input", {
    type: "number", placeholder: t("SEMILLA (OPCIONAL)"), value: setup.seed,
    "aria-label": t("Semilla de la partida"), onInput: (event) => { setup.seed = event.target.value; }
  });
  const regionChoice = type.id === "regional"
    ? h("div", { class: "regionChoice" },
        h("strong", {}, t("REGIÓN DE LA CAMPAÑA")),
        h("div", { class: "regionTabs" },
          [["random", t("SORPRESA")], ...Object.entries(ctx.data.campaigns.regions).map(([id, def]) => [id, def.name.toUpperCase()])]
            .map(([id, label]) => h("button", {
              class: `btn mini ${setup.regionId === id ? "on" : ""}`, "aria-pressed": setup.regionId === id,
              onClick: () => { setup.regionId = id; sfx.play("select"); app.rerender(); }
            }, label))))
    : h("p", { class: "modeHint" }, t("Los 8 gimnasios pueden ser de regiones diferentes. La semilla fija el sorteo."));

  return h("section", { class: "title setupMenu" },
    h("div", { class: "eyebrow" }, t("AVENTURA · {label}", { label: type.label })),
    h("div", { class: "setupWindow" },
      h("h2", {}, type.label),
      h("p", { class: "modeHint" }, type.description),
      regionChoice,
      h("h2", {}, t("ELEGÍ LA DIFICULTAD")),
      h("div", { class: "difficultyOptions", role: "group", "aria-label": t("Nivel de dificultad") },
        Object.entries(difficultyPresets).map(([id, preset]) => h("button", {
          class: `difficultyButton ${setup.difficulty === id ? "active" : ""}`, "aria-pressed": setup.difficulty === id,
          onClick: () => { setup.difficulty = id; sfx.play("select"); app.rerender(); }
        }, h("strong", {}, preset.label), h("small", {}, preset.description)))),
      h("label", { class: "seedLabel" }, t("SEMILLA PARA REPETIR UNA CORRIDA"), seedInput)),
    ctx.savedRun && setup.confirmStart ? h("div", { class: "overwriteWarning" },
      h("strong", {}, t("HAY UNA PARTIDA GUARDADA")),
      h("p", {}, t("Empezar otra corrida reemplazará el progreso actual al elegir tu inicial.")),
      h("div", { class: "starterButtons" },
        h("button", { class: "btn", onClick: () => { setup.confirmStart = false; app.rerender(); } }, t("CANCELAR")),
        h("button", { class: "btn danger", onClick: () => { setup.confirmStart = false; app.openStarterPick(); } }, t("SÍ, NUEVA PARTIDA")))) : null,
    h("div", { class: "starterButtons" },
      h("button", { class: "btn", onClick: () => { sfx.play("deny"); setup.confirmStart = false; app.go("adventure"); } }, t("◀ VOLVER")),
      h("button", { class: "btn primary big startButton", onClick: () => {
        if (ctx.savedRun) { setup.confirmStart = true; return app.rerender(); }
        app.openStarterPick();
      } }, t("ELEGIR INICIAL"))));
}

export function faqScreen(app) {
  return h("section", { class: "title faqScreen" },
    h("h2", {}, t("FAQ")),
    h("div", { class: "faqList" }, faqSections.map((section, index) =>
      h("details", { class: "faqItem", open: index === 0 },
        h("summary", {}, section.title),
        section.body.map((paragraph) => h("p", {}, paragraph))))),
    h("button", { class: "btn", onClick: () => { sfx.play("deny"); app.go("title"); } }, t("◀ VOLVER")));
}
