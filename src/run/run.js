// Orquestación de la corrida: fases map -> (combat|camp|shop) -> reward -> map ... -> ended.
// Todas las acciones devuelven { ok, events } o { ok: false, error } y nunca lanzan.
import { buildDeckList, createCombat, createRng } from "../engine/index.js";
import { buildEncounter } from "./encounterBuilder.js";
import { advanceStep, generateOptions, getStage } from "./mapGenerator.js";
import { anyAlive, grantVictoryRewards, isRewardSettled, resolveCapture, takeCardReward } from "./rewards.js";
import { addToRoster, emitRun, isOptionalEvent, newPokemon, restoreParty, snapshotParty } from "./runState.js";
import { openShop, useCamp, usePokeCenter } from "./siteNodes.js";
import { getDifficulty } from "./difficulty.js";
import { buildCampaign } from "./campaignBuilder.js";
import { isDeckPlayable } from "./deckManager.js";
import { legendaryCount, secretEligible, storyActive } from "./story.js";

// starterIds: un único inicial (de cualquier región). El resto del equipo se arma capturando.
export function createRun({ data, seed = 1, starterIds = [data.region.start.starterChoices[0].species[0]], difficulty = "trainer", mode = "regional", regionId = "unova", loop = 0 }) {
  const preset = getDifficulty(difficulty);
  const rng = createRng(seed);
  const campaign = buildCampaign(data, rng, { mode, regionId });
  const run = {
    data,
    seed,
    difficulty,
    initialStarterId: starterIds[0],
    mode,
    campaign,
    completedLegendaryMilestones: [],
    eventHistory: [],
    rng,
    phase: "map",
    result: null,
    stageIndex: 0,
    step: 0,
    options: [],
    node: null,
    combat: null,
    pending: null,
    shop: null,
    gold: Math.max(0, campaign.start.gold + preset.goldBonus),
    inventory: { ...campaign.start.items, healBerry: (campaign.start.items.healBerry ?? 0) + preset.berryBonus },
    badges: [],
    party: [],
    box: [],
    deckCardIds: buildDeckList(data.startingDeck),
    chestCardIds: [],
    legendariesSeen: [],
    storySeen: [],
    loop,
    legendaryPeak: 0,
    storyLastAt: null,
    storyEvent: null,
    nodesEntered: 0,
    ending: null,
    nextUid: 1,
    log: []
  };
  for (const speciesId of starterIds) addToRoster(run, newPokemon(run, speciesId));
  run.options = generateOptions(run);
  return run;
}

// Solo el legendario de hito (3 y 6 medallas) reemplaza el paso; los extra son rutas opcionales.
const isMilestoneLegendary = (node) => node?.type === "legendary" && node.milestone !== false;

function returnToMap(run, { advance = !isMilestoneLegendary(run.node) } = {}) {
  if (advance) advanceStep(run);
  run.options = generateOptions(run);
  run.node = null;
  run.combat = null;
  run.pending = null;
  run.shop = null;
  run.eventSnapshot = null;
  run.phase = "map";
}

// Perder un evento opcional no termina la corrida: se conserva el equipo tal como estaba, sin recompensas.
// El legendario huye (el hito se da por cumplido para no bloquear el avance) y el resto no consume el paso.
function retreatFromEvent(run) {
  const node = run.node;
  restoreParty(run, run.eventSnapshot ?? null);
  const events = [emitRun(run, { type: "eventFailed", nodeType: node.type, speciesId: node.speciesId ?? null })];
  if (isMilestoneLegendary(node)) run.completedLegendaryMilestones.push(run.badges.length);
  returnToMap(run, { advance: false });
  return { ok: true, events };
}

const storyBossNodes = ["amelie", "gardevoir"];

function startCombat(run, node) {
  // Para el final secreto cuenta cuántos legendarios llevas a cada pelea (las de Amelie no cuentan).
  if (!storyBossNodes.includes(node.type)) run.legendaryPeak = Math.max(run.legendaryPeak ?? 0, legendaryCount(run));
  const encounter = buildEncounter(run, node);
  run.combat = createCombat({
    data: run.data,
    party: run.party,
    enemies: encounter.enemies,
    deckCardIds: run.deckCardIds,
    seed: run.rng.int(1, 2147483646),
    kind: encounter.kind
  });
  run.phase = "combat";
}

function healParty(run) {
  for (const pokemon of run.party) Object.assign(pokemon, { hp: pokemon.maxHp, fainted: false, status: null, shield: 0, intent: null, staggered: false });
}

function endRun(run, result, ending = null) {
  run.phase = "ended";
  run.result = result;
  run.ending = ending;
  run.combat = null;
  return [emitRun(run, { type: "runEnded", result, ending })];
}

export function chooseNode(run, optionIndex) {
  if (run.phase !== "map") return { ok: false, error: "notOnMap" };
  const node = run.options[optionIndex];
  if (!node) return { ok: false, error: "invalidOption" };
  if (!isDeckPlayable(run)) return { ok: false, error: "deckInvalid" };
  run.node = node;
  run.nodesEntered = (run.nodesEntered ?? 0) + 1;
  run.storyEvent = null;
  if (["rival", "villain"].includes(node.type)) run.eventHistory.push(node.type);
  const events = [emitRun(run, { type: "nodeEntered", node })];

  if (node.type === "camp") {
    run.phase = "camp";
  } else if (node.type === "pokeCenter") {
    events.push(...usePokeCenter(run).events);
    run.phase = "center";
  } else if (node.type === "shop") {
    openShop(run);
    run.phase = "shop";
  } else {
    run.eventSnapshot = isOptionalEvent(node) ? snapshotParty(run) : null;
    if (node.type === "legendary" && !(run.legendariesSeen ??= []).includes(node.speciesId)) run.legendariesSeen.push(node.speciesId);
    startCombat(run, node);
  }
  return { ok: true, events };
}

// Se llama cuando run.combat.result ya no es null.
export function finishCombat(run) {
  if (run.phase !== "combat" || !run.combat?.result) return { ok: false, error: "combatNotFinished" };

  const lost = run.combat.result === "defeat" || !anyAlive(run);
  if (lost && isOptionalEvent(run.node)) return retreatFromEvent(run);
  if (lost) {
    run.phase = "ended";
    run.result = "defeat";
    return { ok: true, events: [emitRun(run, { type: "runEnded", result: "defeat" })] };
  }

  if (run.node.type === "gardevoir") return { ok: true, events: endRun(run, "victory", "true") };
  if (run.node.type === "amelie") {
    // Final secreto: solo si llegaste con pocos legendarios; si no, el final de escape normal.
    if (!secretEligible(run)) return { ok: true, events: endRun(run, "victory", "escape") };
    run.phase = "gardevoirIntro";
    run.combat = null;
    return { ok: true, events: [emitRun(run, { type: "gardevoirAppears" })] };
  }
  const events = grantVictoryRewards(run, run.node, run.combat.teams.enemy);
  if (storyActive(run)) rememberStoryEvent(run);
  if (run.node.type === "champion" && storyActive(run)) {
    run.phase = "amelieIntro";
    events.push(emitRun(run, { type: "amelieAppears" }));
    return { ok: true, events };
  }
  if (run.node.type === "champion") {
    run.phase = "ended";
    run.result = "victory";
    events.push(emitRun(run, { type: "runEnded", result: "victory" }));
    return { ok: true, events };
  }
  run.phase = "reward";
  if (isRewardSettled(run)) returnToMap(run);
  return { ok: true, events };
}

// Recuerda qué victoria acaba de ocurrir para que los NPC puedan comentarla en la pantalla siguiente.
function rememberStoryEvent(run) {
  const stage = getStage(run);
  if (run.node.type === "gym") run.storyEvent = { type: "gymWon", leader: stage.leader, badge: stage.badge, regionId: stage.regionId };
  else if (run.node.type === "rival") run.storyEvent = { type: "rivalBeaten" };
}

// Tras decidir carta/captura: si no queda nada pendiente, vuelve al mapa.
function settleReward(run, result) {
  if (result.ok && run.phase === "reward" && isRewardSettled(run)) returnToMap(run);
  return result;
}

// cardId null = saltar la recompensa. Con el mazo lleno la carta va al cofre.
export function pickCard(run, cardId) {
  return settleReward(run, takeCardReward(run, cardId));
}

export function decideCapture(run, accept) {
  return settleReward(run, resolveCapture(run, accept));
}

export function playCamp(run, action, pokemonUid = null) {
  const result = useCamp(run, action, pokemonUid);
  if (result.ok) returnToMap(run);
  return result;
}

export function leaveShop(run) {
  if (run.phase !== "shop") return { ok: false, error: "notInShop" };
  returnToMap(run);
  return { ok: true, events: [] };
}

export function leaveCenter(run) {
  if (run.phase !== "center") return { ok: false, error: "notInCenter" };
  returnToMap(run);
  return { ok: true, events: [] };
}

// Tras vencer al campeón en Poké World: quedarse termina la corrida; escapar lleva al combate contra Amelie.
export function chooseAmelieEnding(run, choice) {
  if (run.phase !== "amelieIntro") return { ok: false, error: "notInAmelieIntro" };
  if (choice === "stay") return { ok: true, events: endRun(run, "victory", "stay") };
  if (choice !== "escape") return { ok: false, error: "invalidChoice" };
  healParty(run); // Amelie no quiere ganar con ventaja: te devuelve a pleno antes de pelear.
  run.node = { type: "amelie" };
  run.eventSnapshot = null;
  startCombat(run, run.node);
  return { ok: true, events: [emitRun(run, { type: "nodeEntered", node: run.node })] };
}

// Lina ayuda: cura y revive al equipo y le da escarcha; después empieza el combate contra Gardevoir.
export function chooseGardevoirFight(run) {
  if (run.phase !== "gardevoirIntro") return { ok: false, error: "notInGardevoirIntro" };
  const aid = run.data.story.gardevoir.aid ?? {};
  if (aid.heal) healParty(run);
  run.node = { type: "gardevoir" };
  run.eventSnapshot = null;
  startCombat(run, run.node);
  for (const pokemon of run.combat.teams.player) pokemon.shield = (pokemon.shield ?? 0) + (aid.shield ?? 0);
  return { ok: true, events: [emitRun(run, { type: "nodeEntered", node: run.node })] };
}
