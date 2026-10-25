import { movePolicies } from "./enemyAi.js";
import { hasEffect } from "./effects.js";
import { hasTargetingStrategy } from "./targeting.js";

const categories = ["physical", "special", "status"];
const ranges = ["any", "melee"];
const targetModes = ["single", "allEnemies", "targetRow"];
const statuses = ["poison", "burn", "paralysis", "flinch"];
const targetSides = ["enemy", "ally", "self"];
const cardKinds = ["energy", "utility"];
const cardTargets = ["none", "ally", "fallenAlly", "drawPile"];
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
  if (data.story) validateStory(data, check);
  if (data.heldItems) validateHeldItems(data, check);
  if (data.balance.tutor) validateTutor(data, check);
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

function validateStory(data, check) {
  const { story } = data;
  const expressions = story.expressions;
  const ids = new Set();
  for (const line of story.lines) {
    check(!ids.has(line.id), `story: línea repetida ${line.id}`);
    ids.add(line.id);
    check(Boolean(story.speakers[line.speaker]), `story ${line.id}: hablante inexistente ${line.speaker}`);
    check(expressions.includes(line.expression), `story ${line.id}: expresión inválida`);
    check(Array.isArray(line.variants) && line.variants.length > 0 && line.variants.every((text) => typeof text === "string" && text.length > 0), `story ${line.id}: faltan variantes`);
    check(!line.gift || Boolean(story.gifts[line.gift]), `story ${line.id}: regalo inexistente ${line.gift}`);
  }
  for (const [tier, pool] of Object.entries(story.gifts)) {
    for (const gift of pool) check(Boolean(gift.item ? data.items[gift.item] : data.cards[gift.card]), `story.gifts.${tier}: id inválido`);
  }
  for (const step of story.final.intro) {
    check(expressions.includes(step.expression), "story.final: expresión inválida");
    check(step.variants?.length > 0, "story.final: faltan variantes");
  }
  check(Boolean(story.final.endings?.escape && story.final.endings?.stay), "story.final: faltan finales");
  check(story.boss.enemies.length >= 1, "story.boss: sin enemigos");
  check(Number.isInteger(story.secret?.maxLegendariesInFight) && Number.isInteger(story.secret?.maxLegendariesAtFinal), "story.secret: reglas inválidas");
  check(story.gardevoir.enemies.length >= 1 && story.gardevoir.intro.length >= 1, "story.gardevoir: incompleto");
  for (const enemy of story.gardevoir.enemies) {
    check(Boolean(data.species[enemy.speciesId]), `story.gardevoir: especie inválida ${enemy.speciesId}`);
    check(Boolean(data.enemyProfiles[enemy.profileId]), `story.gardevoir: perfil inválido ${enemy.profileId}`);
  }
  check(Boolean(story.final.endings.true), "story.final: falta el final verdadero");
  for (const enemy of story.boss.enemies) {
    check(Boolean(data.species[enemy.speciesId]), `story.boss: especie inválida ${enemy.speciesId}`);
    check(Boolean(data.enemyProfiles[enemy.profileId]), `story.boss: perfil inválido ${enemy.profileId}`);
  }
}

const heldTriggerNames = ["combatStart", "turnStart", "onHit", "onDamaged", "onKO"];
const heldModifierKinds = ["damageDealt", "damageTaken", "flatReduction", "critCoins", "expMult", "goldMult"];

function validateTutor(data, check) {
  const { coverage, coverageCap } = data.balance.tutor;
  check(Number.isInteger(coverageCap) && coverageCap >= 1, "balance.tutor: coverageCap inválido");
  for (const type of Object.keys(data.typeChart)) {
    check(Array.isArray(coverage[type]) && coverage[type].length >= coverageCap, `balance.tutor.coverage: faltan tipos de cobertura para ${type}`);
    for (const covered of coverage[type] ?? []) check(Boolean(data.typeChart[covered]) && covered !== type, `balance.tutor.coverage.${type}: tipo inválido ${covered}`);
  }
}

function validateHeldItems(data, check) {
  const entries = Object.entries(data.heldItems);
  check(entries.length >= 20, "heldItems: se requieren al menos 20 objetos equipables");
  const names = new Set();
  for (const [id, item] of entries) {
    check(typeof item.name === "string" && item.name.length > 0 && !names.has(item.name), `heldItem ${id}: nombre faltante o repetido`);
    names.add(item.name);
    check([1, 2, 3].includes(item.tier), `heldItem ${id}: tier inválido`);
    check(Number.isInteger(item.price) && item.price > 0, `heldItem ${id}: precio inválido`);
    check(typeof item.description === "string" && item.description.length > 0, `heldItem ${id}: falta descripción`);
    check(Boolean(item.triggers?.length || item.modifiers?.length), `heldItem ${id}: sin efectos`);
    for (const trigger of item.triggers ?? []) {
      check(heldTriggerNames.includes(trigger.on), `heldItem ${id}: disparador inválido "${trigger.on}"`);
      (trigger.effects ?? []).forEach((effect) => check(hasEffect(effect.type), `heldItem ${id}: efecto desconocido "${effect.type}"`));
    }
    for (const modifier of item.modifiers ?? []) check(heldModifierKinds.includes(modifier.kind), `heldItem ${id}: modificador inválido "${modifier.kind}"`);
  }
}
