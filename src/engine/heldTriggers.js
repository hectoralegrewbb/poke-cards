// Disparadores de objetos equipables: combatStart, turnStart, onHit (el portador golpea), onDamaged (el portador recibe daño)
// y onKO (el portador debilita a un rival). Reutilizan el registro de efectos de effects.js.
import { emit, getLiving } from "./combatState.js";
import { applyEffects } from "./effects.js";
import { getHeldItem } from "./heldItems.js";
import { isAlive } from "./pokemon.js";

function triggerAllowed(trigger, holder) {
  const when = trigger.when ?? {};
  if (trigger.once && holder.heldState?.spent) return false;
  if (when.hpBelow !== undefined && !(holder.hp / holder.maxHp < when.hpBelow)) return false;
  if (when.hasStatus && !holder.status) return false;
  return true;
}

// extra: { target, attacker, move, damage }. Devuelve true si algún disparador se ejecutó.
export function runHeldTriggers(state, on, holder, extra = {}) {
  const item = getHeldItem(state.data.heldItems, holder);
  if (!item?.triggers || !isAlive(holder)) return false;
  let fired = false;
  for (const trigger of item.triggers) {
    if (trigger.on !== on || !triggerAllowed(trigger, holder)) continue;
    if (trigger.when?.category && extra.move?.category !== trigger.when.category) continue;
    holder.heldState ??= { spent: false, struck: false };
    emit(state, { type: "heldTriggered", pokemonId: holder.uid, itemId: holder.heldItem, name: item.name });
    applyEffects(state, trigger.effects, { side: holder.side, source: holder, target: extra.target ?? holder, held: extra });
    if (trigger.once) holder.heldState.spent = true;
    fired = true;
  }
  return fired;
}

export function runHeldForTeam(state, on, side = "player") {
  for (const pokemon of getLiving(state, side)) runHeldTriggers(state, on, pokemon);
}
