// Bot de corrida "razonable" para medir balance (no es parte del juego). Decide como una persona
// atenta: cuida la party, cambia caja/party, arma el mazo con energía fuerte y gasta oro con criterio.
import { isAlive } from "../engine/index.js";
import {
  buyFromShop, chooseAmelieEnding, chooseGardevoirFight, consumeStoryLine, chooseNode, decideCapture, finishCombat, leaveCenter, leaveShop, moveCardToChest, moveCardToDeck, pickCard, playCamp, setRow, swapPartyBox, useItem
} from "../run/index.js";
import { playSmartTurn } from "./smartPlayer.js";

const cardPriority = ["wildcard", "energyDouble", "insight", "recharge", "barrier", "sitrusBerry", "revive", "focus", "remedy", "energyBasic", "potion", "haste", "quickStep", "luckyCoin"];
const statusCure = { poison: "antidote", burn: "burnHeal", paralysis: "paralyzeHeal" };

const power = (run, pokemon) => Object.values(run.data.species[pokemon.speciesId].stats).reduce((sum, value) => sum + value, 0);
const hpFraction = (run) => {
  const members = run.party;
  return members.reduce((sum, pokemon) => sum + (isAlive(pokemon) ? pokemon.hp / pokemon.maxHp : 0), 0) / Math.max(1, members.length);
};

function manageRoster(run) {
  // Mejores en la caja entran si superan claramente al más débil de la party.
  for (const boxed of [...run.box]) {
    const weakest = [...run.party].sort((a, b) => power(run, a) - power(run, b))[0];
    if (weakest && (run.party.length < run.data.balance.party.maxSize || power(run, boxed) > power(run, weakest) + 6)) {
      if (run.party.length < run.data.balance.party.maxSize) {
        run.party.push(run.box.splice(run.box.indexOf(boxed), 1)[0]);
      } else swapPartyBox(run, weakest.uid, boxed.uid);
    }
  }
  // Frente: los más resistentes (melee solo golpea a la fila frontal).
  const sturdy = [...run.party].sort((a, b) => (b.maxHp + b.stats.def + b.stats.spd) - (a.maxHp + a.stats.def + a.stats.spd));
  sturdy.forEach((pokemon, index) => setRow(run, pokemon.uid, index < 3 ? "front" : "back"));
}

function useItems(run) {
  const has = (id) => (run.inventory[id] ?? 0) > 0;
  for (const pokemon of run.party) {
    if (!isAlive(pokemon) && has("revive")) useItem(run, "revive", pokemon.uid);
    if (!isAlive(pokemon) && has("maxRevive")) useItem(run, "maxRevive", pokemon.uid);
  }
  for (const pokemon of run.party) {
    if (pokemon.status) {
      const cure = statusCure[pokemon.status];
      if (cure && has(cure)) useItem(run, cure, pokemon.uid);
      else if (has("fullHeal")) useItem(run, "fullHeal", pokemon.uid);
    }
    if (!isAlive(pokemon)) continue;
    const missing = pokemon.maxHp - pokemon.hp;
    if (missing >= pokemon.maxHp * 0.5) {
      for (const id of ["maxPotion", "fullRestore", "superPotion", "healBerry"]) if (has(id)) { useItem(run, id, pokemon.uid); break; }
    } else if (missing >= 20 && has("healBerry")) useItem(run, "healBerry", pokemon.uid);
  }
  for (const pokemon of run.party) {
    for (const id of ["shinyStone", "linkCable", "duskStone"]) if (has(id)) useItem(run, id, pokemon.uid);
    if (has("rareCandy") && isAlive(pokemon)) useItem(run, "rareCandy", pokemon.uid);
  }
}

function pickOption(run) {
  const health = hpFraction(run);
  const fainted = run.party.some((pokemon) => !isAlive(pokemon));
  const score = (type) => {
    switch (type) {
      case "camp": return health < 0.7 || fainted ? 10 : 2;
      case "pokeCenter": return health < 0.85 || fainted ? 11 : 3;
      case "shop": return run.gold >= 60 ? 6 : 1;
      case "wild": return run.party.length < 4 ? 8 : 5;
      case "combat": return 5;
      case "elite": return health > 0.8 && !fainted ? 7 : 1;
      case "rival": case "villain": return health > 0.7 ? 5 : 2;
      default: return 4;
    }
  };
  return run.options.map((node, index) => ({ index, value: score(node.type) })).sort((a, b) => b.value - a.value)[0].index;
}

// Valor de una carta para el bot: más arriba en cardPriority = mejor. Las desconocidas valen poco.
const cardRank = (id) => { const index = cardPriority.indexOf(id); return index === -1 ? cardPriority.length : index; };

// Mantiene el mejor mazo activo: cambia la peor carta del mazo por la mejor del cofre mientras la mejora sea clara.
function optimizeDeck(run) {
  for (let guard = 0; guard < 60; guard += 1) {
    const worst = [...run.deckCardIds].sort((a, b) => cardRank(b) - cardRank(a))[0];
    const best = [...run.chestCardIds].sort((a, b) => cardRank(a) - cardRank(b))[0];
    if (run.deckCardIds.length < run.data.balance.deck.maxSize && best) { moveCardToDeck(run, best); continue; }
    if (!best || !worst || cardRank(best) >= cardRank(worst)) break;
    moveCardToChest(run, worst);
    moveCardToDeck(run, best);
  }
}

function handleReward(run) {
  if (run.pending?.capture) decideCapture(run, true);
  if (run.phase === "reward" && run.pending?.cardChoices) {
    const best = [...run.pending.cardChoices].sort((a, b) => cardRank(a) - cardRank(b))[0];
    pickCard(run, best);
  }
}

function handleCamp(run) {
  const fainted = run.party.find((pokemon) => !isAlive(pokemon));
  if (fainted && hpFraction(run) > 0.5) return playCamp(run, "revive", fainted.uid);
  if (hpFraction(run) < 0.85 || fainted) return playCamp(run, "rest");
  const trainee = [...run.party].filter(isAlive).sort((a, b) => b.exp - a.exp)[0];
  return playCamp(run, "train", trainee.uid);
}

function handleShop(run) {
  const wishlist = [
    ["card", "wildcard"], ["card", "energyDouble"], ["item", "revive"], ["card", "insight"], ["card", "recharge"], ["card", "focus"], ["item", "superPotion"],
    ["item", "maxPotion"], ["item", "shinyStone"], ["item", "linkCable"], ["item", "duskStone"], ["item", "healBerry"], ["card", "barrier"]
  ];
  for (const [kind, id] of wishlist) {
    const index = run.shop.stock.findIndex((entry) => entry.kind === kind && entry.id === id && !entry.sold);
    if (index === -1 || run.gold < run.shop.stock[index].price) continue;
    buyFromShop(run, index);
  }
  leaveShop(run);
}

function describeFight(run) {
  return {
    stage: run.stageIndex, step: run.step, node: run.node.type, kind: run.combat.kind,
    result: run.combat.result, turns: run.combat.turn,
    hpLeft: run.party.reduce((sum, pokemon) => sum + (isAlive(pokemon) ? pokemon.hp : 0), 0),
    hpMax: run.party.reduce((sum, pokemon) => sum + pokemon.maxHp, 0),
    partySize: run.party.length, badges: run.badges.length
  };
}

// Para medir el final secreto: simula a quien dejó sus legendarios sobrantes en la caja.
function qualifyForSecret(run) {
  run.legendaryPeak = 0;
  const isLegendary = (pokemon) => run.data.species[pokemon.speciesId]?.legendary;
  while (run.party.filter(isLegendary).length > 1 && run.party.length > 1) {
    const index = run.party.findLastIndex(isLegendary);
    run.box.push(...run.party.splice(index, 1));
  }
}

export function playSmartRun(run, { maxSteps = 600, onFight = null, qualifySecret = false } = {}) {
  let steps = 0;
  while (run.phase !== "ended" && steps < maxSteps) {
    steps += 1;
    consumeStoryLine(run); // acepta los regalos de Lina como lo haría un jugador
    if (run.phase === "map") {
      manageRoster(run);
      useItems(run);
      optimizeDeck(run);
      chooseNode(run, pickOption(run));
    } else if (run.phase === "combat") {
      while (!run.combat.result && run.combat.turn <= 60) playSmartTurn(run.combat);
      if (!run.combat.result) run.combat.result = "defeat";
      onFight?.(describeFight(run));
      finishCombat(run);
    } else if (run.phase === "reward") handleReward(run);
    else if (run.phase === "center") leaveCenter(run);
    else if (run.phase === "amelieIntro") { if (qualifySecret) qualifyForSecret(run); chooseAmelieEnding(run, "escape"); }
    else if (run.phase === "gardevoirIntro") chooseGardevoirFight(run);
    else if (run.phase === "camp") handleCamp(run);
    else if (run.phase === "shop") handleShop(run);
    else break;
  }
  return run;
}
