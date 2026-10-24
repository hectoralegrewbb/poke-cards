// Instancia de un Pokémon (de la party o enemigo). Los datos de especie se copian al crear/evolucionar.

export function isAlive(pokemon) {
  return !pokemon.fainted && pokemon.hp > 0;
}

export function applySpecies(pokemon, speciesId, data) {
  const species = data.species[speciesId];
  if (!species) throw new Error(`Especie desconocida: ${speciesId}`);
  const { hp: maxHp, ...stats } = species.stats;
  pokemon.speciesId = speciesId;
  pokemon.name = species.name;
  pokemon.types = [...species.types];
  pokemon.maxHp = maxHp;
  pokemon.stats = stats;
  pokemon.moves = [...species.moves];
  pokemon.cooldowns = species.moves.map(() => 0);
  pokemon.passive = species.passive ?? null;
  return pokemon;
}

export function createPokemon({ uid, speciesId, side, row = "front", profileId = "default", shiny = false }, data) {
  const pokemon = {
    uid,
    side,
    row,
    profileId,
    hp: 0,
    shield: 0,
    actionsLeft: 0,
    exp: 0,
    fainted: false,
    status: null,
    staggered: false,
    intent: null
  };
  if (shiny) pokemon.shiny = true; // Solo cosmético: no altera estadísticas.
  applySpecies(pokemon, speciesId, data);
  pokemon.hp = pokemon.maxHp;
  return pokemon;
}

// Estado transitorio de combate. hp, exp y fainted persisten entre combates de la corrida.
export function resetForCombat(pokemon) {
  pokemon.shield = 0;
  pokemon.actionsLeft = 0;
  pokemon.intent = null;
  pokemon.staggered = false; // El retroceso no queda pendiente entre combates.
  pokemon.berryGuard = false; // La Baya Zidra solo dura un combate.
  pokemon.cooldowns = pokemon.moves.map(() => 0);
}

export function tickCooldowns(pokemon) {
  pokemon.cooldowns = pokemon.cooldowns.map((remaining) => Math.max(0, remaining - 1));
}
