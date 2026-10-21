import { movePolicies } from "./enemyAi.js";
import { hasEffect } from "./effects.js";
import { hasTargetingStrategy } from "./targeting.js";

const categories = ["physical", "special", "status"];
const ranges = ["any", "melee"];
const targetModes = ["single", "allEnemies", "targetRow"];
const statuses = ["poison", "burn", "paralysis", "flinch"];
const targetSides = ["enemy", "ally", "self"];
const cardKinds = ["energy", "utility"];
const cardTargets = ["none", "ally"];
const playModes = ["pay", "boostAttack", "boostDefense", "utility"];
const rows = ["front", "back"];
const statNames = ["hp", "atk", "def", "spa", "spd"];

// Devuelve la lista de errores de integridad de los JSON (vacía = datos consistentes).
export function validateGameData(data) {
  const errors = [];
  const check = (condition, message) => {
    if (!condition) errors.push(message);
  };
  const types = Object.keys(data.typeChart);
  const checkEffects = (owner, effects = []) =>
    effects.forEach((effect) => check(hasEffect(effect.type), `${owner}: efecto desconocido "${effect.type}"`));
  const isCount = (value) => Number.isInteger(value) && value >= 0;

  for (const [id, move] of Object.entries(data.moves)) {
    check(types.includes(move.type), `move ${id}: tipo inválido "${move.type}"`);
    check(categories.includes(move.category), `move ${id}: categoría inválida "${move.category}"`);
    check(isCount(move.power), `move ${id}: power inválido`);
    check(isCount(move.cost), `move ${id}: cost inválido`);
    check(isCount(move.cooldown), `move ${id}: cooldown inválido`);
    check(ranges.includes(move.range ?? "any"), `move ${id}: range inválido`);
    check(targetSides.includes(move.targetSide ?? "enemy"), `move ${id}: targetSide inválido`);
    check(targetModes.includes(move.targetMode ?? "single"), `move ${id}: targetMode inválido`);
    check(!move.spreadMultiplier || (move.spreadMultiplier > 0 && move.spreadMultiplier <= 1), `move ${id}: spreadMultiplier inválido`);
    for (const effect of move.effects ?? []) {
      if (effect.type === "status") {
        check(statuses.includes(effect.status), `move ${id}: estado inválido`);
        check(effect.chance === undefined || (effect.chance >= 0 && effect.chance <= 1), `move ${id}: probabilidad inválida`);
      }
    }
    checkEffects(`move ${id}`, move.effects);
  }

  for (const [id, species] of Object.entries(data.species)) {
    check(
      species.types.length >= 1 && species.types.length <= 2 && species.types.every((type) => types.includes(type)),
      `species ${id}: tipos inválidos`
    );
    check(species.moves.length === 4, `species ${id}: debe tener exactamente 4 movimientos`);
    check(species.moves.some((moveId) => data.moves[moveId]?.cost === 0 && data.moves[moveId]?.power > 0 && data.moves[moveId]?.cooldown === 0),
      `species ${id}: falta ataque libre (costo y cooldown 0)`);
    species.moves.forEach((moveId) => check(Object.hasOwn(data.moves, moveId), `species ${id}: movimiento inexistente "${moveId}"`));
    species.types.forEach((type) => check(
      species.moves.some((moveId) => data.moves[moveId]?.type === type && data.moves[moveId]?.power > 0),
      `species ${id}: falta un ataque de daño de tipo ${type}`));
    statNames.forEach((stat) => check(species.stats?.[stat] > 0, `species ${id}: stat "${stat}" inválido`));
    for (const evolution of species.evolutions ?? []) {
      check(Object.hasOwn(data.species, evolution.to), `species ${id}: evolución a especie inexistente "${evolution.to}"`);
      const validMethod =
        evolution.method === "exp" ? evolution.expRequired > 0 : evolution.method === "item" && Boolean(evolution.itemId);
      check(validMethod, `species ${id}: evolución a ${evolution.to} mal definida`);
      if (evolution.method === "exp") check(Number.isInteger(evolution.minBadges ?? 0) && (evolution.minBadges ?? 0) <= 8, `species ${id}: minBadges inválidas`);
    }
    if (species.passive) {
      check(["turnStart", "combatStart", "static"].includes(species.passive.trigger), `species ${id}: trigger de pasiva inválido`);
      check(Boolean(species.passive.name), `species ${id}: la pasiva necesita nombre`);
      checkEffects(`species ${id} (pasiva)`, species.passive.effects);
      (species.passive.static ?? []).forEach((modifier) =>
        check(["cost", "power"].includes(modifier.kind) && Number.isFinite(modifier.amount), `species ${id}: modificador estático inválido`)
      );
    }
  }

  for (const [id, card] of Object.entries(data.cards)) {
    check(cardKinds.includes(card.kind), `card ${id}: kind inválido`);
    check(cardTargets.includes(card.target), `card ${id}: target inválido`);
    check(card.playModes.every((mode) => playModes.includes(mode)), `card ${id}: playModes inválidos`);
    checkEffects(`card ${id}`, card.effects);
  }

  for (const [id, profile] of Object.entries(data.enemyProfiles)) {
    check(movePolicies.includes(profile.movePolicy), `profile ${id}: movePolicy inválida`);
    check(profile.targeting.length > 0, `profile ${id}: sin estrategias de targeting`);
    profile.targeting.forEach((entry) => {
      check(hasTargetingStrategy(entry.strategy), `profile ${id}: estrategia desconocida "${entry.strategy}"`);
      check(entry.weight > 0, `profile ${id}: peso inválido en "${entry.strategy}"`);
    });
  }
  check(Object.hasOwn(data.enemyProfiles, "default"), 'enemyProfiles: falta el perfil "default"');

  for (const [id, encounter] of Object.entries(data.encounters)) {
    const limits = data.balance.encounters[encounter.kind];
    check(Boolean(limits), `encounter ${id}: kind desconocido "${encounter.kind}"`);
    if (limits) {
      check(
        encounter.enemies.length >= limits.min && encounter.enemies.length <= limits.max,
        `encounter ${id}: ${encounter.enemies.length} enemigos fuera del rango ${limits.min}-${limits.max}`
      );
    }
    for (const enemy of encounter.enemies) {
      check(Object.hasOwn(data.species, enemy.speciesId), `encounter ${id}: especie inexistente "${enemy.speciesId}"`);
      check(Object.hasOwn(data.enemyProfiles, enemy.profileId ?? "default"), `encounter ${id}: perfil inexistente "${enemy.profileId}"`);
      check(rows.includes(enemy.row ?? "front"), `encounter ${id}: row inválida`);
    }
  }

  for (const cardId of Object.keys(data.startingDeck)) {
    check(Object.hasOwn(data.cards, cardId), `startingDeck: carta inexistente "${cardId}"`);
  }

  if (data.region) validateRegion(data, check);
  if (data.campaigns) validateCampaigns(data, check);
  return errors;
}

// Referencias cruzadas de data/region.json e items.json.
function validateRegion(data, check) {
  const { region, items } = data;
  const species = (id, owner) => check(Object.hasOwn(data.species, id), `region ${owner}: especie inexistente "${id}"`);
  const encounter = (list, kind, owner) => {
    const limits = data.balance.encounters[kind];
    check(list.length >= limits.min && list.length <= limits.max, `region ${owner}: ${list.length} enemigos fuera de ${limits.min}-${limits.max}`);
    list.forEach((enemy) => {
      species(enemy.speciesId, owner);
      check(Object.hasOwn(data.enemyProfiles, enemy.profileId ?? "default"), `region ${owner}: perfil inexistente "${enemy.profileId}"`);
    });
  };

  region.start.starterChoices.forEach((group) => group.species.forEach((id) => species(id, `start ${group.region}`)));
  Object.keys(region.start.items).forEach((id) => check(Object.hasOwn(items, id), `region start: ítem inexistente "${id}"`));
  Object.keys(region.cardRewards).forEach((id) => check(Object.hasOwn(data.cards, id), `region cardRewards: carta inexistente "${id}"`));
  Object.keys(region.shop.cardPrices).forEach((id) => check(Object.hasOwn(data.cards, id), `region shop: carta inexistente "${id}"`));
  Object.keys(region.cardRewards).forEach((id) => check(Number.isFinite(region.shop.cardPrices[id]), `region shop: falta precio de "${id}"`));
  for (const drop of region.itemDrops ?? []) {
    check(Object.hasOwn(items, drop.id) && drop.weight > 0, `region drop: ítem inválido ${drop.id}`);
  }
  region.shop.items.forEach((id) => check(Object.hasOwn(items, id), `region shop: ítem inexistente "${id}"`));
  region.stepPools.forEach((pool) => pool.forEach((type) => check(Object.hasOwn(region.nodeRules, type) || ["camp", "shop"].includes(type), `region stepPools: nodo desconocido "${type}"`)));

  region.stages.forEach((stage) => {
    stage.wildPool.forEach((id) => species(id, stage.id));
    encounter(stage.gym.enemies, "gym", `${stage.id} gym`);
    check(Object.hasOwn(items, stage.gymItem), `region ${stage.id}: ítem inexistente "${stage.gymItem}"`);
  });
  region.league.eliteFour.forEach((fight, index) => encounter(fight.enemies, "eliteFour", `eliteFour ${index + 1}`));
  encounter(region.league.champion.enemies, "champion", "champion");

  for (const [id, item] of Object.entries(items)) {
    check(["heal", "revive", "exp", "evolve", "cure", "restore"].includes(item.effect), `item ${id}: efecto desconocido "${item.effect}"`);
  }
}


function validateCampaigns(data, check) {
  const expected = ["kanto", "johto", "hoenn", "sinnoh", "unova"];
  for (const regionId of expected) {
    const campaign = data.campaigns.regions?.[regionId];
    check(Boolean(campaign), `campaigns: falta ${regionId}`);
    if (!campaign) continue;
    check(campaign.gyms.length === 8, `${regionId}: deben existir 8 gimnasios`);
    check(campaign.eliteFour.length === 4, `${regionId}: deben existir 4 miembros del Alto Mando`);
    check(Boolean(campaign.champion?.leader), `${regionId}: falta campeón`);
    const checkLeader = (leader, owner) => {
      check(typeof leader.leader === "string" && leader.leader.length > 0, `${owner}: falta líder`);
      check(Boolean(data.species[leader.ace]), `${owner}: falta especie insignia ${leader.ace}`);
      if (leader.type) {
        check(Boolean(data.typeChart[leader.type]), `${owner}: tipo inválido ${leader.type}`);
        check(data.species[leader.ace]?.types.includes(leader.type), `${owner}: insignia incompatible con ${leader.type}`);
      }
    };
    campaign.gyms.forEach((gym, index) => {
      checkLeader(gym, `${regionId} gimnasio ${index + 1}`);
      check(Boolean(gym.badge), `${regionId} gimnasio ${index + 1}: falta medalla`);
    });
    campaign.eliteFour.forEach((member, index) => checkLeader(member, `${regionId} Alto Mando ${index + 1}`));
    checkLeader(campaign.champion, `${regionId} campeón`);
    for (const id of campaign.legendaries) check(Boolean(data.species[id]?.legendary), `${regionId}: legendario inválido ${id}`);
    check(campaign.legendaries.length >= 2, `${regionId}: requiere al menos 2 legendarios`);
  }
}
