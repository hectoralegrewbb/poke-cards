// Modificadores del jugador: temporales (Espacio raro, Danza espada...) y estáticos (pasivas "static").
// kind "cost": suma al costo de energía de las técnicas. kind "power": suma poder a los ataques.
// Filtros opcionales: minCost, maxCost (sobre el costo base) y category ("physical" | "special").
import { emit } from "./combatState.js";

export function addModifier(state, modifier) {
  state.modifierSeq = (state.modifierSeq ?? 0) + 1;
  const entry = { id: state.modifierSeq, ...modifier };
  state.modifiers.push(entry);
  emit(state, { type: "modifierAdded", kind: entry.kind, amount: entry.amount, label: entry.label, turns: entry.turnsLeft });
  return entry;
}

// Se llama al inicio de cada turno del jugador (a partir del 2): resta un turno y retira los vencidos.
export function tickModifiers(state) {
  for (const modifier of state.modifiers) modifier.turnsLeft -= 1;
  const expired = state.modifiers.filter((modifier) => modifier.turnsLeft <= 0);
  state.modifiers = state.modifiers.filter((modifier) => modifier.turnsLeft > 0);
  for (const modifier of expired) emit(state, { type: "modifierExpired", label: modifier.label });
}

function matches(modifier, move) {
  if (modifier.minCost !== undefined && move.cost < modifier.minCost) return false;
  if (modifier.maxCost !== undefined && move.cost > modifier.maxCost) return false;
  if (modifier.category && move.category !== modifier.category) return false;
  if (modifier.kind === "power" && move.power <= 0) return false;
  return true;
}

function activeFor(state, actor, kind, move) {
  if (actor.side !== "player") return [];
  const temporary = state.modifiers.filter((modifier) => modifier.kind === kind);
  const fixed = (actor.passive?.static ?? []).filter((modifier) => modifier.kind === kind);
  return [...temporary, ...fixed].filter((modifier) => matches(modifier, move));
}

export function getMoveCost(state, actor, move) {
  const delta = activeFor(state, actor, "cost", move).reduce((total, modifier) => total + modifier.amount, 0);
  return Math.max(0, move.cost + delta);
}

export function getPowerBonus(state, actor, move) {
  return activeFor(state, actor, "power", move).reduce((total, modifier) => total + modifier.amount, 0);
}
