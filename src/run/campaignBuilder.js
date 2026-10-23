// Una campaña es un snapshot determinista: Regional conserva el orden oficial;
// Global mezcla líderes por etapa y crea una Liga Mundial. No muta los datos originales.
import { nationalDex } from "../shared/nationalDex.js";
import { eligiblePool, speciesThreat } from "./wildEligibility.js";

const regions = ["kanto", "johto", "hoenn", "sinnoh", "unova"];

function dexRegion(dex) {
  if (dex <= 151) return "kanto";
  if (dex <= 251) return "johto";
  if (dex <= 386) return "hoenn";
  if (dex <= 493) return "sinnoh";
  return "unova";
}

function availableSpecies(data, { regionId = null, type = null } = {}) {
  return Object.keys(data.species).filter((id) => {
    const species = data.species[id];
    if (species.legendary) return false;
    if (regionId && dexRegion(nationalDex[id]) !== regionId) return false;
    if (type && !species.types.includes(type)) return false;
    return true;
  });
}

function makeWildPool(data, rng, regionId, stageIndex) {
  const regional = eligiblePool(data, availableSpecies(data, { regionId }), stageIndex);
  const global = eligiblePool(data, availableSpecies(data), stageIndex);
  // Aun en Regional aparecen visitantes excepcionales; el encuentro típico es nativo.
  const nativePool = regional.length ? rng.shuffle(regional).slice(0, 22) : [];
  const visitors = rng.shuffle(global.filter((id) => !nativePool.includes(id))).slice(0, regionId ? 4 : 26);
  const pool = regionId ? [...nativePool, ...nativePool, ...visitors] : [...nativePool, ...visitors];
  return pool.length ? pool : global;
}

// Equipos de Liga: salen de entre los más fuertes disponibles (con azar para que no sean siempre los mismos).
// Los gimnasios no lo usan: su fuerza la limita wildEligibility por medalla.
function strongestFirst(data, rng, ids, headSize) {
  const ranked = rng.shuffle([...ids]).sort((a, b) => speciesThreat(data.species[b]) - speciesThreat(data.species[a]));
  return [...rng.shuffle(ranked.slice(0, headSize)), ...ranked.slice(headSize)];
}

function buildTeam(data, rng, { type, ace, regionId }, count, stageIndex, { strong = false } = {}) {
  const prefer = (ids) => (strong ? strongestFirst(data, rng, ids, (count - 1) * 2) : rng.shuffle([...ids]));
  const local = eligiblePool(data, availableSpecies(data, { regionId, type }), stageIndex);
  const matching = eligiblePool(data, availableSpecies(data, { type }), stageIndex);
  const candidates = [...prefer(local), ...prefer(matching)];
  const selected = [];
  for (const id of candidates) {
    if (id !== ace && !selected.includes(id)) selected.push(id);
    if (selected.length >= count - 1) break;
  }
  // Aseguramos que el Pokémon insignia ocupe el último lugar y no se repita.
  selected.push(ace);
  while (selected.length < count) selected.splice(selected.length - 1, 0, ace);
  return selected.map((speciesId, index) => ({
    speciesId, row: index < Math.ceil(count / 2) ? "front" : "back",
    profileId: index === count - 1 ? "threatHunter" : "default"
  }));
}

function stageOf(data, rng, gym, regionId, stageIndex) {
  const base = data.region.stages[stageIndex];
  return {
    id: `stage${stageIndex + 1}`,
    name: `${stageIndex + 1}. ${gym.leader} · ${gym.type.toUpperCase()}`,
    leader: gym.leader,
    specialty: gym.type,
    regionId,
    badge: gym.badge,
    scale: base.scale,
    wildPool: makeWildPool(data, rng, regionId, stageIndex),
    gym: { kind: "gym", enemies: buildTeam(data, rng, { ...gym, regionId }, stageIndex === 0 ? 2 : stageIndex < 4 ? 3 : 4, stageIndex) },
    gymItem: base.gymItem
  };
}

function leagueOf(data, rng, eliteFour, champion, championRegion) {
  return {
    scale: data.region.league.scale,
    championScale: data.region.league.championScale,
    eliteFour: eliteFour.map(({ member, regionId }) => ({
      leader: member.leader, regionId, specialty: member.type,
      kind: "eliteFour", enemies: buildTeam(data, rng, { ...member, regionId }, 5, 8, { strong: true })
    })),
    champion: {
      leader: champion.leader, regionId: championRegion,
      kind: "champion", enemies: [
        ...strongestFirst(data, rng, eligiblePool(data, availableSpecies(data, { regionId: championRegion }), 8).filter((id) => id !== champion.ace), 10).slice(0, 5),
        champion.ace
      ].map((speciesId, index) => ({ speciesId, row: index < 3 ? "front" : "back", profileId: index === 5 ? "aggressive" : "default" }))
    }
  };
}

function globalLineup(data, rng) {
  // Repartimos cinco regiones antes de repetir para garantizar un auténtico cruce de regiones.
  const picks = [...rng.shuffle([...regions]), ...rng.shuffle([...regions]).slice(0, 3)];
  return picks.map((regionId, index) => ({ ...data.campaigns.regions[regionId].gyms[index], regionId }));
}

export function buildCampaign(data, rng, { mode = "regional", regionId = "unova" } = {}) {
  if (!["regional", "global"].includes(mode)) throw new Error(`Modo desconocido: ${mode}`);
  const chosen = mode === "global" ? null : regionId === "random" ? rng.pick(regions) : regionId;
  if (chosen && !data.campaigns.regions[chosen]) throw new Error(`Región desconocida: ${chosen}`);
  const gyms = mode === "global"
    ? globalLineup(data, rng)
    : data.campaigns.regions[chosen].gyms.map((gym) => ({ ...gym, regionId: chosen }));
  const leagueMembers = mode === "global"
    ? rng.shuffle([...regions]).slice(0, 4).map((id) => ({ member: rng.pick(data.campaigns.regions[id].eliteFour), regionId: id }))
    : data.campaigns.regions[chosen].eliteFour.map((member) => ({ member, regionId: chosen }));
  const championRegion = mode === "global" ? rng.pick(regions) : chosen;
  const champion = data.campaigns.regions[championRegion].champion;
  // Siempre una copia: barajar el arreglo del catálogo lo alteraría y la misma semilla daría otra corrida.
  const pool = mode === "global" ? regions.flatMap((id) => data.campaigns.regions[id].legendaries) : [...data.campaigns.regions[chosen].legendaries];
  const campaign = {
    ...data.region,
    mode,
    regionId: chosen,
    name: chosen ? data.campaigns.regions[chosen].name : "Liga Mundial",
    villain: chosen ? data.campaigns.regions[chosen].villain : "Organización rival",
    stages: gyms.map((gym, index) => stageOf(data, rng, gym, gym.regionId, index)),
    league: leagueOf(data, rng, leagueMembers, champion, championRegion),
    legendaryOrder: rng.shuffle(pool),
    nodeRules: {
      ...data.region.nodeRules,
      legendary: { goldPerExp: 2, cardChoices: 3, captureChance: 1 },
      rival: { goldPerExp: 2, cardChoices: 3, captureChance: 0.1 },
      villain: { goldPerExp: 2.2, cardChoices: 3, captureChance: 0.25, itemDropChance: 0.6 }
    }
  };
  // Dos legendarios son eventos garantizados (3 y 6 medallas); el resto del pool puede aparecer como ruta opcional.
  campaign.legendaries = campaign.legendaryOrder.slice(0, 2);
  campaign.legendaryPool = campaign.legendaryOrder.slice(2);
  delete campaign.legendaryOrder;
  return campaign;
}

export const gameModes = Object.freeze({
  regional: { label: "REGIONAL", description: "Una región y sus 8 líderes en orden, Alto Mando y campeón de esa Liga." },
  global: { label: "GLOBAL", description: "Gimnasios de las 5 regiones mezclados, Liga Mundial y encuentros cruzados." }
});
