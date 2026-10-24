// Historia de Amelie (solo modo Poké World). Datos en data/story.json; este módulo es puro y sin DOM.
import { isAlive } from "../engine/index.js";

export const storyActive = (run) => Boolean(run?.data?.story) && run.mode === "global" && run.data.story.modes.includes(run.mode);

const inRange = (value, range = {}) => value >= (range.min ?? -Infinity) && value <= (range.max ?? Infinity);

// Fotografía mínima de la corrida que usan las condiciones de los diálogos.
export function storyContext(run) {
  const party = run.party ?? [];
  const maxHp = party.reduce((sum, pokemon) => sum + pokemon.maxHp, 0) || 1;
  const hp = party.reduce((sum, pokemon) => sum + Math.max(0, pokemon.hp), 0);
  return {
    phase: run.phase,
    badges: run.badges?.length ?? 0,
    hpFraction: hp / maxHp,
    anyFainted: party.some((pokemon) => !isAlive(pokemon)),
    capturePending: Boolean(run.pending?.capture),
    turn: run.combat?.turn ?? 0,
    nextNode: run.options?.[0]?.type ?? null
  };
}

export function lineMatches(line, context) {
  const when = line.when ?? {};
  if (when.phase && !when.phase.includes(context.phase)) return false;
  if (when.badges && !inRange(context.badges, when.badges)) return false;
  if (when.hpBelow !== undefined && !(context.hpFraction < when.hpBelow)) return false;
  if (when.anyFainted && !context.anyFainted) return false;
  if (when.capturePending && !context.capturePending) return false;
  if (when.turnMin !== undefined && context.turn < when.turnMin) return false;
  if (when.nextNode && context.nextNode !== when.nextNode) return false;
  return true;
}

// Devuelve la primera línea aplicable que aún no se mostró (cada una se ve una sola vez por partida).
export function pickStoryLine(run) {
  if (!storyActive(run)) return null;
  const seen = run.storySeen ?? [];
  const context = storyContext(run);
  return run.data.story.lines.find((line) => !seen.includes(line.id) && lineMatches(line, context)) ?? null;
}

export function markStorySeen(run, lineId) {
  const seen = (run.storySeen ??= []);
  if (!seen.includes(lineId)) seen.push(lineId);
}

export const finalScene = (run) => run.data.story.final;
