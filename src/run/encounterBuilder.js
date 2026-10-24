// Arma el encuentro (enemigos + escala de dificultad) de un nodo de combate.
import { isAlive } from "../engine/index.js";
import { getStage } from "./mapGenerator.js";
import { getDifficulty } from "./difficulty.js";
import { eligiblePool } from "./wildEligibility.js";
import { rollShiny } from "./shiny.js";

function scaled(base, bonus = 1) {
  return { hp: Math.max(0.1, base.hp * bonus), stats: Math.max(0.1, base.stats * bonus) };
}

function withScale(enemies, scale) {
  return enemies.map((enemy) => ({ ...enemy, scale }));
}

const villainTeams = Object.freeze({
  kanto: ["meowth", "ekans", "koffing", "arbok", "weezing"],
  johto: ["meowth", "zubat", "golbat", "koffing", "weezing"],
  hoenn: ["carvanha", "sharpedo", "numel", "camerupt", "torkoal"],
  sinnoh: ["glameow", "purugly", "croagunk", "toxicroak", "bronzor"],
  unova: ["purrloin", "sandile", "krokorok", "watchog", "liepard"]
});

const starterLineages = Object.freeze({
  bulbasaur: ["bulbasaur", "ivysaur", "venusaur"], charmander: ["charmander", "charmeleon", "charizard"], squirtle: ["squirtle", "wartortle", "blastoise"],
  chikorita: ["chikorita", "bayleef", "meganium"], cyndaquil: ["cyndaquil", "quilava", "typhlosion"], totodile: ["totodile", "croconaw", "feraligatr"],
  treecko: ["treecko", "grovyle", "sceptile"], torchic: ["torchic", "combusken", "blaziken"], mudkip: ["mudkip", "marshtomp", "swampert"],
  turtwig: ["turtwig", "grotle", "torterra"], chimchar: ["chimchar", "monferno", "infernape"], piplup: ["piplup", "prinplup", "empoleon"],
  snivy: ["snivy", "servine", "serperior"], tepig: ["tepig", "pignite", "emboar"], oshawott: ["oshawott", "dewott", "samurott"]
});

function rivalStarter(run) {
  const group = run.data.region.start.starterChoices.find((entry) => entry.species.includes(run.initialStarterId));
  if (!group) return "charmander";
  const starterIndex = group.species.indexOf(run.initialStarterId);
  // grass -> fire, fire -> water, water -> grass.
  const counter = group.species[(starterIndex + 1) % 3];
  const evolutionIndex = run.badges.length >= 5 ? 2 : run.badges.length >= 3 ? 1 : 0;
  return starterLineages[counter]?.[evolutionIndex] ?? counter;
}

export function buildEncounter(run, node) {
  const region = run.campaign;
  const preset = getDifficulty(run.difficulty);
  const applyDifficulty = (base) => ({ hp: base.hp * preset.enemyHp, stats: base.stats * preset.enemyStats });
  const stage = getStage(run);
  // A diferencia del jugador, la IA no paga cartas; su repertorio se limita por medalla.
  // Evita Terremoto/Lanzallamas repetidos a máxima potencia en rutas iniciales.
  const maxWildMoveCost = run.data.balance.wildMoveCostCaps?.[Math.min(run.stageIndex, 7)] ?? 3;
  const rule = region.nodeRules[node.type];
  if (node.type === "amelie") {
    const boss = run.data.story.boss;
    return { kind: "amelie", enemies: withScale(boss.enemies, applyDifficulty(boss.scale)) };
  }
  // Guardados anteriores pueden contener pools generados por la versión sin control de amenaza.
  const safeWild = eligiblePool(run.data, stage.wildPool, run.stageIndex);
  const wildPool = safeWild.length ? safeWild : eligiblePool(run.data, Object.keys(run.data.species), run.stageIndex);

  if (node.type === "legendary") {
    const enemy = { speciesId: node.speciesId, row: "front", profileId: "aggressive" };
    return { kind: "normal", enemies: withScale([enemy], applyDifficulty(scaled(stage.scale, 1.15))) };
  }
  if (node.type === "rival" || node.type === "villain") {
    const themed = villainTeams[stage.regionId] ?? villainTeams.unova;
    const pool = node.type === "rival" ? wildPool : eligiblePool(run.data, themed, run.stageIndex);
    const safePool = pool.length ? pool : wildPool;
    const count = Math.min(3, Math.max(2, run.party.length));
    const ace = node.type === "rival" ? rivalStarter(run) : run.rng.pick(safePool);
    const supporters = run.rng.shuffle(safePool.filter((id) => id !== ace && run.data.species[id] && !run.data.species[id].legendary)).slice(0, count - 1);
    const team = [...supporters, ace];
    return { kind: "normal", enemies: withScale(team.map((speciesId, index) => ({ speciesId, row: index < 2 ? "front" : "back", profileId: "aggressive", maxMoveCost: Math.max(1, maxWildMoveCost) })), applyDifficulty(scaled(stage.scale, 1.02))) };
  }
  if (node.type === "gym") return { kind: "gym", enemies: withScale(stage.gym.enemies, applyDifficulty(stage.scale)) };
  if (node.type === "eliteFour") {
    return { kind: "eliteFour", enemies: withScale(region.league.eliteFour[node.index].enemies, applyDifficulty(region.league.scale)) };
  }
  if (node.type === "champion") {
    return { kind: "champion", enemies: withScale(region.league.champion.enemies, applyDifficulty(region.league.championScale)) };
  }

  // Con la party chica (al inicio) los combates normales llevan pocos rivales.
  const partyAlive = run.party.filter(isAlive).length;
  const count = Math.max(1, Math.min(run.rng.int(rule.minEnemies, rule.maxEnemies), partyAlive + (rule.maxOverParty ?? 3)));
  const scale = applyDifficulty(scaled(stage.scale, rule.scaleBonus ?? 1));
  const enemies = Array.from({ length: count }, (_, index) => ({
    speciesId: run.rng.pick(wildPool),
    row: index < 2 ? "front" : "back",
    profileId: rule.profileId,
    maxMoveCost: maxWildMoveCost,
    scale
  })).map((enemy, index) => (rollShiny(run.seed, run.stageIndex, run.step, index, enemy.speciesId) ? { ...enemy, shiny: true } : enemy));
  return { kind: rule.kind, enemies };
}
