// Bot que juega una corrida completa (solo simulación/tests): elige nodos, cartas y usa ítems con reglas simples.
import { isAlive } from "../engine/index.js";
import { buyFromShop, chooseNode, decideCapture, finishCombat, leaveShop, pickCard, playCamp, useItem } from "../run/index.js";
import { playGreedyTurn } from "./greedyPlayer.js";

const nodePriority = ["camp", "shop", "combat", "wild", "elite"];

function healWithItems(run) {
  for (const pokemon of run.party) {
    if (!isAlive(pokemon) && run.inventory.revive) useItem(run, "revive", pokemon.uid);
  }
  for (const pokemon of run.party) {
    if (pokemon.status && run.inventory[pokemon.status === "poison" ? "antidote" : pokemon.status === "paralysis" ? "paralyzeHeal" : "burnHeal"]) {
      useItem(run, pokemon.status === "poison" ? "antidote" : pokemon.status === "paralysis" ? "paralyzeHeal" : "burnHeal", pokemon.uid);
    } else if (pokemon.status && run.inventory.fullHeal) useItem(run, "fullHeal", pokemon.uid);
    if (isAlive(pokemon) && pokemon.hp < pokemon.maxHp * 0.5 && run.inventory.healBerry) useItem(run, "healBerry", pokemon.uid);
  }
  for (const pokemon of run.party) {
    if (isAlive(pokemon) && pokemon.hp < pokemon.maxHp * 0.5 && run.inventory.superPotion) useItem(run, "superPotion", pokemon.uid);
    if (isAlive(pokemon) && run.inventory.rareCandy) useItem(run, "rareCandy", pokemon.uid);
    for (const itemId of ["shinyStone", "linkCable"]) {
      if (run.inventory[itemId]) useItem(run, itemId, pokemon.uid);
    }
  }
}

function pickOption(run) {
  const wounded = run.party.some((pokemon) => !isAlive(pokemon) || pokemon.hp < pokemon.maxHp * 0.6);
  const rank = (type) => {
    if (type === "camp" && wounded) return -2;
    if (type === "wild" && run.party.length < 4) return -1;
    const order = nodePriority.indexOf(type);
    return order < 0 ? 100 : order;
  };
  return run.options.map((node, index) => ({ node, index })).sort((a, b) => rank(a.node.type) - rank(b.node.type))[0].index;
}

function playCombat(run) {
  while (!run.combat.result && run.combat.turn <= 60) playGreedyTurn(run.combat);
  if (!run.combat.result) run.combat.result = "defeat"; // timeout
  finishCombat(run);
}

function resolveReward(run) {
  if (run.pending?.capture) decideCapture(run, true);
  if (run.phase === "reward" && run.pending?.cardChoices) {
    pickCard(run, run.pending.cardChoices[0]);
    if (run.phase === "reward") pickCard(run, null);
  }
}

function playSite(run) {
  if (run.phase === "camp") {
    const fainted = run.party.find((pokemon) => !isAlive(pokemon));
    if (fainted) playCamp(run, "revive", fainted.uid);
    else playCamp(run, "rest");
    return;
  }
  const wanted = ["revive", "healBerry", "superPotion", "antidote", "burnHeal", "paralyzeHeal", "fullHeal", "rareCandy", "shinyStone", "linkCable", "duskStone"];
  run.shop.stock.forEach((entry, index) => {
    if (entry.kind === "item" && wanted.includes(entry.id) && run.gold >= entry.price) buyFromShop(run, index);
  });
  leaveShop(run);
}

export function playFullRun(run, { maxSteps = 400 } = {}) {
  let steps = 0;
  while (run.phase !== "ended" && steps < maxSteps) {
    steps += 1;
    healWithItems(run);
    if (run.phase === "map") chooseNode(run, pickOption(run));
    else if (run.phase === "combat") playCombat(run);
    else if (run.phase === "reward") resolveReward(run);
    else playSite(run);
  }
  return run;
}
