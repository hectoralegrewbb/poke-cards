import { createDeck } from "./deck.js";
import { checkCombatEnd, drawForPlayer, emit, getLiving, getTeam } from "./combatState.js";
import { applyEffects } from "./effects.js";
import { planEnemyIntent, resolveEnemyIntent } from "./enemyAi.js";
import { tickModifiers } from "./modifiers.js";
import { createPokemon, isAlive, resetForCombat, tickCooldowns } from "./pokemon.js";
import { createRng } from "./rng.js";
import { consumeFlinch, consumeParalysis, tickStatusForSide } from "./status.js";

// party: instancias de Pokémon de la corrida (persisten). enemies: [{ speciesId, row, profileId }].
export function createCombat({ data, party, enemies, deckCardIds, seed = 1, kind = "normal" }) {
  const limits = data.balance.encounters[kind];
  if (!limits) throw new Error(`Tipo de encuentro desconocido: ${kind}`);
  if (enemies.length < limits.min || enemies.length > limits.max) {
    throw new Error(`Un encuentro "${kind}" admite ${limits.min}-${limits.max} enemigos, recibió ${enemies.length}`);
  }
  if (party.length === 0 || party.length > data.balance.party.maxSize) {
    throw new Error(`La party debe tener entre 1 y ${data.balance.party.maxSize} Pokémon`);
  }
  if (!party.some(isAlive)) throw new Error("La party no tiene Pokémon en pie");

  const rng = createRng(seed);
  party.forEach(resetForCombat);
  const enemyTeam = enemies.map((enemy, index) => {
    const { scale, maxMoveCost, ...spec } = enemy;
    const pokemon = createPokemon({ uid: `e${index + 1}`, side: "enemy", ...spec }, data);
    if (Number.isInteger(maxMoveCost)) pokemon.maxMoveCost = maxMoveCost;
    return applyEnemyScale(pokemon, scale);
  });

  const state = {
    data,
    kind,
    seed,
    rng,
    turn: 0,
    phase: "setup",
    result: null,
    luckyCoins: 0,
    modifiers: [],
    modifierSeq: 0,
    teams: { player: party, enemy: enemyTeam },
    deck: createDeck(deckCardIds, rng),
    log: []
  };
  emit(state, { type: "combatStarted", kind });
  startPlayerTurn(state);
  runPassives(state, "combatStart");
  return state;
}

// scale opcional { hp, stats }: multiplica vida y stats del enemigo (dificultad por etapa de la corrida).
function applyEnemyScale(pokemon, scale) {
  if (!scale) return pokemon;
  const hpScale = scale.hp ?? 1;
  const statScale = scale.stats ?? 1;
  pokemon.maxHp = Math.max(1, Math.round(pokemon.maxHp * hpScale));
  pokemon.hp = pokemon.maxHp;
  for (const stat of Object.keys(pokemon.stats)) {
    pokemon.stats[stat] = Math.max(1, Math.round(pokemon.stats[stat] * statScale));
  }
  return pokemon;
}

// Mano inicial de 6 en el turno 1; luego drawPerTurn (1) más lo que den cartas y pasivas.
function startPlayerTurn(state) {
  const { balance } = state.data;
  state.turn += 1;
  state.phase = "player";
  emit(state, { type: "turnStarted" });

  for (const pokemon of getLiving(state, "player")) {
    tickCooldowns(pokemon);
    pokemon.shield = 0;
    pokemon.actionsLeft = consumeFlinch(state, pokemon) || consumeParalysis(state, pokemon) ? 0 : balance.combat.actionsPerPokemonPerTurn;
  }

  drawForPlayer(state, state.turn === 1 ? balance.hand.initialSize : balance.hand.drawPerTurn);
  if (state.turn > 1) {
    tickModifiers(state);
    runPassives(state, "turnStart");
  }

  for (const enemy of getLiving(state, "enemy")) {
    tickCooldowns(enemy);
    planEnemyIntent(state, enemy);
  }
}

// Pasivas "turnStart" (desde el turno 2, para que el turno 1 sea exactamente la mano inicial) y
// "combatStart" (una vez, al empezar). Las "static" no se disparan: las lee modifiers.js.
function runPassives(state, trigger) {
  for (const pokemon of getLiving(state, "player")) {
    if (pokemon.passive?.trigger !== trigger) continue;
    emit(state, { type: "passiveTriggered", pokemonId: pokemon.uid, name: pokemon.passive.name });
    applyEffects(state, pokemon.passive.effects, { side: "player", source: pokemon, target: pokemon });
  }
}

// Termina el turno del jugador, resuelve las intenciones enemigas y arranca la siguiente ronda.
export function endPlayerTurn(state) {
  if (state.phase !== "player" || state.result) return { ok: false, error: "notPlayerTurn" };

  const startIndex = state.log.length;
  state.phase = "enemy";
  emit(state, { type: "enemyPhaseStarted" });
  tickStatusForSide(state, "player");
  if (checkCombatEnd(state)) return { ok: true, events: state.log.slice(startIndex) };

  for (const enemy of getTeam(state, "enemy")) enemy.shield = 0;
  for (const enemy of getTeam(state, "enemy")) {
    if (!isAlive(enemy)) continue;
    resolveEnemyIntent(state, enemy);
    if (checkCombatEnd(state)) break;
  }

  if (!state.result) {
    tickStatusForSide(state, "enemy");
    checkCombatEnd(state);
  }
  if (!state.result) startPlayerTurn(state);
  return { ok: true, events: state.log.slice(startIndex) };
}
