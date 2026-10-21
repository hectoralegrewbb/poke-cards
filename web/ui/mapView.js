import { chooseNode } from "../../src/run/index.js";
import { difficultyPresets } from "../../src/run/difficulty.js";
import { h } from "./dom.js";
import { nodeLabels } from "./labels.js";
import { icon } from "./pixelIcons.js";
import { sfx } from "./sfx.js";

const nodeIcons = { combat: "sword", wild: "leaf", elite: "skull", camp: "tent", shop: "coin", gym: "medal", eliteFour: "crown", champion: "crown", legendary: "star", rival: "sword", villain: "skull" };
const nodeMeta = {
  combat: { risk: "RIESGO MEDIO", reward: "Oro + carta" },
  wild: { risk: "RIESGO BAJO", reward: "Oportunidad de captura" },
  elite: { risk: "RIESGO ALTO", reward: "Oro + ítem" },
  camp: { risk: "SIN COMBATE", reward: "Curar / revivir / entrenar" },
  shop: { risk: "SIN COMBATE", reward: "Comprar mejoras" },
  gym: { risk: "JEFE", reward: "Medalla + recompensa" },
  eliteFour: { risk: "JEFE DE LIGA", reward: "Sin descanso entre combates" },
  champion: { risk: "BATALLA FINAL", reward: "Victoria de la corrida" },
  legendary: { risk: "ENCUENTRO ÚNICO · SIN PENA", reward: "Captura garantizada al vencer. Si perdés, huye y no perdés nada" },
  rival: { risk: "RIVAL · SIN PENA", reward: "Recompensa al ganar; si perdés, no perdés nada" },
  villain: { risk: "HISTORIA · SIN PENA", reward: "Oro, cartas e ítems al ganar; si perdés, no perdés nada" }
};

export function nodeIcon(type, scale = 4) {
  return icon(nodeIcons[type] ?? "star", { scale });
}

function routeStrip(ctx) {
  const { run, data } = ctx;
  const inGyms = run.stageIndex < run.campaign.stages.length;
  const total = inGyms ? run.campaign.stepPools.length + 1 : run.campaign.league.eliteFour.length + 2;
  return h("div", { class: "route", role: "img", "aria-label": `Paso ${run.step + 1} de ${total}` }, Array.from({ length: total }, (_, index) => {
    const last = index === total - 1;
    const state = index < run.step ? "done" : index === run.step ? "now" : "todo";
    return h("span", { class: `routeNode ${state} ${last ? "boss" : ""}` }, last ? icon(inGyms ? "medal" : "crown", { scale: 2 }) : "");
  }));
}

export function renderMap(ctx) {
  const { run, data } = ctx;
  const inGyms = run.stageIndex < run.campaign.stages.length;
  const title = inGyms ? run.campaign.stages[run.stageIndex].name :
    `LIGA ${run.campaign.name.toUpperCase()} · ${run.step > 0 ?
      (run.step <= run.campaign.league.eliteFour.length ? (run.campaign.league.eliteFour[run.step - 1].leader ?? "ALTO MANDO") : (run.campaign.league.champion.leader ?? "CAMPEÓN")) : "PREPARACIÓN"}`;
  const mode = difficultyPresets[run.difficulty ?? "trainer"].label;
  const status = inGyms
    ? `GIMNASIO ${run.stageIndex + 1} DE 8 · PASO ${run.step + 1} DE ${run.campaign.stepPools.length + 1}`
    : `DESAFÍO FINAL · PASO ${run.step + 1} DE ${run.campaign.league.eliteFour.length + 2}`;

  return h("section", { class: "window map" },
    h("div", { class: "sectionTop" }, h("span", { class: "eyebrow" }, status), h("span", { class: "modeTag" }, `${run.campaign.mode === "global" ? "GLOBAL" : "REGIONAL"} · ${run.campaign.name.toUpperCase()} · ${mode}`)),
    h("h2", {}, title.toUpperCase()),
    run.options[0]?.type === "legendary" ? h("div", { class: "legendaryBanner" },
      h("strong", {}, "¡ENCUENTRO LEGENDARIO!"),
      h("p", {}, `Conseguiste ${run.badges.length} medallas. Te espera ${data.species[run.options[0].speciesId].name}. Si ganás, podrás capturarlo.`)) : null,
    routeStrip(ctx),
    h("div", { class: "mapMission" },
      h("strong", {}, inGyms ? "MISIÓN: GANÁ LA MEDALLA" : "MISIÓN: CONVERTITE EN CAMPEÓN"),
      h("p", {}, inGyms
        ? "Elegí una ruta para preparar al equipo. Capturá aliados, cuidá tus PS y llegá al gimnasio."
        : "Ya tenés las ocho medallas. Administrá tus recursos: la Liga no ofrece descanso entre rivales.")),
    h("h3", {}, "ELEGÍ EL SIGUIENTE DESTINO"),
    h("div", { class: "options" }, run.options.map((node, index) => {
      const label = nodeLabels[node.type];
      const meta = nodeMeta[node.type];
      const stage = run.campaign.stages[Math.min(run.stageIndex, 7)];
      const customTitle = node.type === "gym" ? `GIMNASIO · ${stage.leader ?? "LÍDER"}` :
        node.type === "eliteFour" ? `ALTO MANDO · ${run.campaign.league.eliteFour[node.index].leader ?? `MIEMBRO ${node.index + 1}`}` :
        node.type === "champion" ? `CAMPEÓN · ${run.campaign.league.champion.leader ?? "CAMPEÓN"}` :
        node.type === "legendary" ? `LEGENDARIO · ${data.species[node.speciesId].name}` :
        node.type === "villain" ? stage.regionId && data.campaigns.regions[stage.regionId] ? (stage.regionId === "kanto" || stage.regionId === "johto" ? "JESSIE Y JAMES · TEAM ROCKET" : data.campaigns.regions[stage.regionId].villain) : run.campaign.villain :
        label.title;
      return h("button", {
        class: `option ${node.type}`, onClick: () => {
          const result = chooseNode(run, index);
          if (!result.ok) return ctx.notify("No se pudo entrar en este destino.");
          sfx.play("start"); ctx.rerender();
        }
      },
        h("span", { class: "optionRisk" }, meta.risk),
        h("span", { class: "optionIcon" }, nodeIcon(node.type)),
        h("strong", {}, customTitle.toUpperCase()),
        h("span", { class: "optionText" }, node.type === "gym" ? `${stage.gym.enemies.length} rivales · ${(stage.specialty ?? "MIXTO").toUpperCase()} · ${label.text.split(". ").slice(1).join(". ")}` : label.text),
        h("span", { class: "optionReward" }, `◆ ${meta.reward}`));
    })),
    h("p", { class: "routeAdvice" }, run.options.length === 1
      ? "ENFRENTAMIENTO OBLIGATORIO · Antes de entrar, revisá tus PS, estados e ítems en el panel de equipo."
      : "CONSEJO · Las zonas salvajes favorecen nuevas capturas. Tiendas y campamentos permiten preparar un equipo variado."));
}
