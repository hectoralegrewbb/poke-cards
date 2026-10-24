// Estados mayores y retroceso. Sin dependencia de UI: todos los cambios emiten eventos.
import { emit, getLiving } from "./combatState.js";

export const statusNames = Object.freeze({ poison: "envenenado", burn: "quemado", paralysis: "paralizado", flinch: "retroceso" });

export function inflictStatus(state, target, status, chance = 1) {
  if (!target || target.fainted || target.hp <= 0) return false;
  if (chance < 1 && state.rng.next() >= chance) return false;
  if (status === "flinch") {
    if (target.staggered) return false;
    target.staggered = true;
  } else {
    if (target.status) return false; // Solo un estado mayor a la vez.
    if (status === "burn" && target.types.includes("fire")) return false;
    if (status === "poison" && (target.types.includes("poison") || target.types.includes("steel"))) return false;
    if (!["burn", "poison", "paralysis"].includes(status)) throw new Error(`Estado inválido: ${status}`);
    target.status = status;
  }
  emit(state, { type: "statusApplied", targetId: target.uid, status });
  return true;
}

export function tickStatusForSide(state, side) {
  for (const pokemon of getLiving(state, side)) {
    if (!pokemon.status || pokemon.status === "paralysis") continue;
    const amount = Math.max(1, Math.ceil(pokemon.maxHp * (pokemon.status === "poison" ? 0.06 : 0.04)));
    // El daño de estado ignora escudos y afecta PS directamente.
    let lost = Math.min(pokemon.hp, amount);
    if (lost >= pokemon.hp && pokemon.berryGuard) {
      lost = pokemon.hp - 1;
      pokemon.berryGuard = false;
      emit(state, { type: "berrySaved", targetId: pokemon.uid });
    }
    pokemon.hp -= lost;
    emit(state, { type: "statusDamage", targetId: pokemon.uid, status: pokemon.status, amount: lost });
    if (pokemon.hp === 0) {
      pokemon.fainted = true;
      pokemon.status = null;
      pokemon.staggered = false;
      emit(state, { type: "fainted", pokemonId: pokemon.uid });
    }
  }
}

export function consumeFlinch(state, pokemon) {
  if (!pokemon.staggered) return false;
  pokemon.staggered = false;
  emit(state, { type: "flinched", targetId: pokemon.uid });
  return true;
}

// Un Pokémon paralizado puede perder su acción; a diferencia de quemadura/veneno,
// no recibe daño automático. La tirada se hace una vez por turno y bando.
export function consumeParalysis(state, pokemon) {
  if (pokemon.status !== "paralysis" || state.rng.next() >= 0.25) return false;
  emit(state, { type: "paralyzed", targetId: pokemon.uid });
  return true;
}
