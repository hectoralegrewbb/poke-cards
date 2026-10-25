import { chooseNode, estimateNodeLevel, partyLevel } from "../../src/run/index.js";
import { levelTag } from "./levelTag.js";
import { difficultyPresets } from "../../src/run/difficulty.js";
import { h } from "./dom.js";
import { nodeLabels } from "./labels.js";
import { icon } from "./pixelIcons.js";
import { sfx } from "./sfx.js";
import { t } from "../../src/shared/i18n.js";

const nodeIcons = { combat: "sword", wild: "leaf", elite: "skull", camp: "tent", shop: "coin", gym: "medal", eliteFour: "crown", champion: "crown", legendary: "star", rival: "sword", villain: "skull", pokeCenter: "pokeBall" };
const nodeMeta = {
  combat: { risk: t("RIESGO MEDIO"), reward: t("Oro + carta") },
  wild: { risk: t("RIESGO BAJO"), reward: t("Oportunidad de captura") },
  elite: { risk: t("RIESGO ALTO"), reward: t("Oro + ítem") },
  camp: { risk: t("SIN COMBATE"), reward: t("Curar / revivir / entrenar") },
  pokeCenter: { risk: t("SIN COMBATE · UNA VEZ POR RUTA"), reward: t("Cura y revive a todo el equipo") },
  shop: { risk: t("SIN COMBATE"), reward: t("Comprar mejoras") },
  gym: { risk: t("JEFE"), reward: t("Medalla + recompensa") },
  eliteFour: { risk: t("JEFE DE LIGA"), reward: t("Sin descanso entre combates") },
  champion: { risk: t("BATALLA FINAL"), reward: t("Victoria de la corrida") },
  legendary: { risk: t("ENCUENTRO ÚNICO · SIN PENA"), reward: t("Captura garantizada al vencer. Si perdés, huye y no perdés nada") },
  rival: { risk: t("RIVAL · SIN PENA"), reward: t("Recompensa al ganar; si perdés, no perdés nada") },
  villain: { risk: t("HISTORIA · SIN PENA"), reward: t("Oro, cartas e ítems al ganar; si perdés, no perdés nada") }
};

export function nodeIcon(type, scale = 4) {
  return icon(nodeIcons[type] ?? "star", { scale });
}

function routeStrip(ctx) {
  const { run, data } = ctx;
  const inGyms = run.stageIndex < run.campaign.stages.length;
  const total = inGyms ? run.campaign.stepPools.length + 1 : run.campaign.league.eliteFour.length + 2;
  return h("div", { class: "route", role: "img", "aria-label": t("Paso {step} de {total}", { step: run.step + 1, total }) }, Array.from({ length: total }, (_, index) => {
    const last = index === total - 1;
    const state = index < run.step ? "done" : index === run.step ? "now" : "todo";
    return h("span", { class: `routeNode ${state} ${last ? "boss" : ""}` }, last ? icon(inGyms ? "medal" : "crown", { scale: 2 }) : "");
  }));
}

// "Rival ≈Nv.24 · tu equipo Nv.21": cuánto más fuerte o débil es el destino que tenés delante.
function enemyLevelLine(run, node, reference) {
  const estimate = estimateNodeLevel(run, node);
  if (!estimate) return null;
  return h("span", { class: "optionLevel" }, t("RIVAL "), levelTag(estimate.average, reference, { approx: true }), estimate.count > 1 ? t(" · {count} Pokémon", { count: estimate.count }) : "", t(" · TU EQUIPO Nv.{reference}", { reference }));
}

export function renderMap(ctx) {
  const { run, data } = ctx;
  const inGyms = run.stageIndex < run.campaign.stages.length;
  const title = inGyms ? run.campaign.stages[run.stageIndex].name :
    t("LIGA {league} · {stage}", { league: run.campaign.name.toUpperCase(), stage: run.step > 0 ?
      (run.step <= run.campaign.league.eliteFour.length ? (run.campaign.league.eliteFour[run.step - 1].leader ?? t("ALTO MANDO")) : (run.campaign.league.champion.leader ?? t("CAMPEÓN"))) : t("PREPARACIÓN") });
  const mode = difficultyPresets[run.difficulty ?? "trainer"].label;
  const status = inGyms
    ? t("GIMNASIO {stageIndex} DE 8 · PASO {step} DE {stepPools}", { stageIndex: run.stageIndex + 1, step: run.step + 1, stepPools: run.campaign.stepPools.length + 1 })
    : t("DESAFÍO FINAL · PASO {step} DE {eliteFour}", { step: run.step + 1, eliteFour: run.campaign.league.eliteFour.length + 2 });

  const reference = partyLevel(run);
  return h("section", { class: "window map" },
    h("div", { class: "sectionTop" }, h("span", { class: "eyebrow" }, status), h("span", { class: "modeTag" }, `${run.campaign.mode === "global" ? "GLOBAL" : "REGIONAL"} · ${run.campaign.name.toUpperCase()} · ${mode}`)),
    h("h2", {}, title.toUpperCase()),
    run.options[0]?.type === "legendary" ? h("div", { class: "legendaryBanner" },
      h("strong", {}, t("¡ENCUENTRO LEGENDARIO!")),
      h("p", {}, t("Conseguiste {length} medallas. Te espera {name}. Si ganás, podrás capturarlo.", { length: run.badges.length, name: data.species[run.options[0].speciesId].name }))) : null,
    routeStrip(ctx),
    h("div", { class: "mapMission" },
      h("strong", {}, inGyms ? t("MISIÓN: GANÁ LA MEDALLA") : t("MISIÓN: CONVERTITE EN CAMPEÓN")),
      h("p", {}, inGyms
        ? t("Elegí una ruta para preparar al equipo. Capturá aliados, cuidá tus PS y llegá al gimnasio.")
        : t("Ya tenés las ocho medallas. Administrá tus recursos: la Liga no ofrece descanso entre rivales."))),
    h("h3", {}, t("ELEGÍ EL SIGUIENTE DESTINO")),
    h("div", { class: "options" }, run.options.map((node, index) => {
      const label = nodeLabels[node.type];
      const meta = nodeMeta[node.type];
      const stage = run.campaign.stages[Math.min(run.stageIndex, 7)];
      const customTitle = node.type === "gym" ? t("GIMNASIO · {leader}", { leader: stage.leader ?? t("LÍDER") }) :
        node.type === "eliteFour" ? t("ALTO MANDO · {leader}", { leader: run.campaign.league.eliteFour[node.index].leader ?? t("MIEMBRO {n}", { n: node.index + 1 }) }) :
        node.type === "champion" ? t("CAMPEÓN · {leader}", { leader: run.campaign.league.champion.leader ?? t("CAMPEÓN") }) :
        node.type === "legendary" ? t("LEGENDARIO · {name}", { name: data.species[node.speciesId].name }) :
        node.type === "villain" ? stage.regionId && data.campaigns.regions[stage.regionId] ? (stage.regionId === "kanto" || stage.regionId === "johto" ? t("JESSIE Y JAMES · TEAM ROCKET") : data.campaigns.regions[stage.regionId].villain) : run.campaign.villain :
        label.title;
      return h("button", {
        class: `option ${node.type}`, onClick: () => {
          const result = chooseNode(run, index);
          if (!result.ok) return ctx.notify(t("No se pudo entrar en este destino."));
          sfx.play("start"); ctx.rerender();
        }
      },
        h("span", { class: "optionRisk" }, meta.risk),
        h("span", { class: "optionIcon" }, nodeIcon(node.type)),
        h("strong", {}, customTitle.toUpperCase()),
        h("span", { class: "optionText" }, node.type === "gym" ? t("{count} rivales · {specialty} · {text}", { count: stage.gym.enemies.length, specialty: (stage.specialty ?? t("MIXTO")).toUpperCase(), text: label.text.split(". ").slice(1).join(". ") }) : label.text),
        enemyLevelLine(run, node, reference),
        h("span", { class: "optionReward" }, `◆ ${meta.reward}`));
    })),
    h("p", { class: "routeAdvice" }, run.options.length === 1
      ? t("ENFRENTAMIENTO OBLIGATORIO · Antes de entrar, revisá tus PS, estados e ítems en el panel de equipo.")
      : t("CONSEJO · Las zonas salvajes favorecen nuevas capturas. Tiendas y campamentos permiten preparar un equipo variado.")));
}
