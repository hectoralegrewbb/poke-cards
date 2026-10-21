// Recompensas tras ganar un combate: oro, ítems, medalla, elección de carta y oferta de captura.
import { calculateExpReward, evolve, findEvolution, isAlive } from "../engine/index.js";
import { getStage } from "./mapGenerator.js";
import { addCardToDeck, addItem, addToRoster, emitRun, newPokemon } from "./runState.js";

function pickCardChoices(run, count) {
  const entries = Object.entries(run.campaign.cardRewards).map(([cardId, weight]) => ({ cardId, weight }));
  const chosen = [];
  while (chosen.length < Math.min(count, entries.length)) {
    const pick = run.rng.weightedPick(entries.filter((entry) => !chosen.includes(entry.cardId)));
    chosen.push(pick.cardId);
  }
  return chosen;
}

export function evolvePokemonByExp(run, pokemon) {
  const evolution = findEvolution(pokemon, run.data, { badges: run.badges.length });
  if (!evolution) return [];
  const from = pokemon.speciesId;
  evolve(pokemon, evolution, run.data);
  return [emitRun(run, { type: "evolved", uid: pokemon.uid, from, to: pokemon.speciesId })];
}

export function evolvePartyByExp(run) {
  return run.party.flatMap((pokemon) => evolvePokemonByExp(run, pokemon));
}

// Entrega oro/ítems/medalla y deja en run.pending lo que el jugador debe decidir.
export function grantVictoryRewards(run, node, defeatedEnemies) {
  const rule = run.campaign.nodeRules[node.type];
  const events = [];

  const gold = Math.round(calculateExpReward(defeatedEnemies, run.data) * rule.goldPerExp);
  run.gold += gold;
  events.push(emitRun(run, { type: "goldGained", amount: gold }));

  let itemId = null;
  if (node.type === "legendary") {
    run.completedLegendaryMilestones.push(run.badges.length);
    events.push(emitRun(run, { type: "legendaryDefeated", speciesId: node.speciesId }));
  }
  if (node.type === "gym") {
    itemId = getStage(run).gymItem;
    run.badges.push(getStage(run).badge);
    events.push(emitRun(run, { type: "badgeEarned", badge: getStage(run).badge }));
  } else if (rule.itemDrop || (rule.itemDropChance && run.rng.next() < rule.itemDropChance)) {
    itemId = run.rng.weightedPick(run.campaign.itemDrops).id;
  }
  if (itemId) {
    addItem(run, itemId);
    events.push(emitRun(run, { type: "itemGained", itemId }));
  }

  // Un variocolor derrotado siempre se ofrece para capturar (es raro y solo cosmético).
  const shinyEnemy = defeatedEnemies.find((enemy) => enemy.shiny && (rule.captureChance ?? 0) > 0);
  run.pending = {
    cardChoices: rule.cardChoices > 0 ? pickCardChoices(run, rule.cardChoices) : null,
    capture: node.type === "legendary" ? node.speciesId
      : shinyEnemy ? shinyEnemy.speciesId
      : run.rng.next() < (rule.captureChance ?? 0) ? run.rng.pick(defeatedEnemies).speciesId : null,
    captureShiny: Boolean(shinyEnemy) && node.type !== "legendary"
  };
  events.push(...evolvePartyByExp(run));
  return events;
}

export function takeCardReward(run, cardId, removeCardId = null) {
  if (run.phase !== "reward" || !run.pending?.cardChoices) return { ok: false, error: "noCardReward" };
  if (cardId !== null) {
    if (!run.pending.cardChoices.includes(cardId)) return { ok: false, error: "cardNotOffered" };
    const added = addCardToDeck(run, cardId, removeCardId);
    if (!added.ok) return added;
  }
  run.pending.cardChoices = null;
  return { ok: true, events: [emitRun(run, { type: "cardChosen", cardId })] };
}

export function resolveCapture(run, accept) {
  if (run.phase !== "reward" || !run.pending?.capture) return { ok: false, error: "noCapture" };
  const speciesId = run.pending.capture;
  const shiny = Boolean(run.pending.captureShiny);
  run.pending.capture = null;
  run.pending.captureShiny = false;
  if (!accept) return { ok: true, events: [emitRun(run, { type: "captureSkipped", speciesId })] };
  const pokemon = newPokemon(run, speciesId);
  if (shiny) pokemon.shiny = true;
  const placedIn = addToRoster(run, pokemon);
  return { ok: true, events: [emitRun(run, { type: "captured", uid: pokemon.uid, speciesId, placedIn, shiny })] };
}

export function isRewardSettled(run) {
  return !run.pending?.cardChoices && !run.pending?.capture;
}

export function anyAlive(run) {
  return run.party.some(isAlive);
}
