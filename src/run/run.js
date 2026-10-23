// Orquestación de la corrida: fases map -> (combat|camp|shop) -> reward -> map ... -> ended.
// Todas las acciones devuelven { ok, events } o { ok: false, error } y nunca lanzan.
import { buildDeckList, createCombat, createRng } from "../engine/index.js";
import { buildEncounter } from "./encounterBuilder.js";
import { advanceStep, generateOptions } from "./mapGenerator.js";
import { anyAlive, grantVictoryRewards, isRewardSettled, resolveCapture, takeCardReward } from "./rewards.js";
import { addToRoster, emitRun, isOptionalEvent, newPokemon, restoreParty, snapshotParty } from "./runState.js";
import { openShop, useCamp } from "./siteNodes.js";
import { getDifficulty } from "./difficulty.js";
import { buildCampaign } from "./campaignBuilder.js";
import { isDeckPlayable } from "./deckManager.js";

// starterIds: un único inicial (de cualquier región). El resto del equipo se arma capturando.
export function createRun({ data, seed = 1, starterIds = [data.region.start.starterChoices[0].species[0]], difficulty = "trainer", mode = "regional", regionId = "unova" }) {
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
    nextUid: 1,
    log: []
  };
  for (const speciesId of starterIds) addToRoster(run, newPokemon(run, speciesId));
  run.options = generateOptions(run);
  return run;
}

function returnToMap(run, { advance = run.node?.type !== "legendary" } = {}) {
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
  if (node.type === "legendary") run.completedLegendaryMilestones.push(run.badges.length);
  returnToMap(run, { advance: false });
  return { ok: true, events };
}

export function chooseNode(run, optionIndex) {
  if (run.phase !== "map") return { ok: false, error: "notOnMap" };
  const node = run.options[optionIndex];
  if (!node) return { ok: false, error: "invalidOption" };
  if (!isDeckPlayable(run)) return { ok: false, error: "deckInvalid" };
  run.node = node;
  if (["rival", "villain"].includes(node.type)) run.eventHistory.push(node.type);
  const events = [emitRun(run, { type: "nodeEntered", node })];

  if (node.type === "camp") {
    run.phase = "camp";
  } else if (node.type === "shop") {
    openShop(run);
    run.phase = "shop";
  } else {
    run.eventSnapshot = isOptionalEvent(node) ? snapshotParty(run) : null;
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

  const events = grantVictoryRewards(run, run.node, run.combat.teams.enemy);
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
