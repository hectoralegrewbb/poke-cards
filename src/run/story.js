// Historia de Amelie (solo modo Poké World). Datos en data/story.json; este módulo es puro y sin DOM.
// Las variantes y las tiradas se eligen con un hash de la semilla (nunca con el RNG de la corrida),
// así la historia no altera el determinismo de combates, mapas ni recompensas.
import { isAlive } from "../engine/index.js";
import { t } from "../shared/i18n.js";
import { addCardToCollection } from "./deckManager.js";
import { getStage, pokeCenterStep } from "./mapGenerator.js";
import { addItem, emitRun } from "./runState.js";
import { logStoryLine } from "./storyLog.js";

export const storyActive = (run) => Boolean(run?.data?.story) && run.mode === "global" && run.data.story.modes.includes(run.mode);

const inRange = (value, range = {}) => value >= (range.min ?? -Infinity) && value <= (range.max ?? Infinity);

// FNV-1a de 32 bits: estable entre plataformas.
export function hashString(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

const roll = (run, key) => hashString(`${run.seed}|${key}`) / 4294967296;
const pickIndex = (run, key, length) => hashString(`${run.seed}|${key}`) % length;

// Fotografía mínima de la corrida que usan las condiciones de los diálogos.
export function storyContext(run) {
  const party = run.party ?? [];
  const maxHp = party.reduce((sum, pokemon) => sum + pokemon.maxHp, 0) || 1;
  const hp = party.reduce((sum, pokemon) => sum + Math.max(0, pokemon.hp), 0);
  const stage = run.campaign?.stages ? getStage(run) : null;
  const optionTypes = (run.options ?? []).map((option) => option.type);
  const inGyms = run.stageIndex < (run.campaign?.stages?.length ?? 0);
  return {
    phase: run.phase,
    badges: run.badges?.length ?? 0,
    hpFraction: hp / maxHp,
    anyFainted: party.some((pokemon) => !isAlive(pokemon)),
    capturePending: Boolean(run.pending?.capture),
    turn: run.combat?.turn ?? 0,
    nextNode: optionTypes[0] ?? null,
    optionTypes,
    nodeType: run.node?.type ?? null,
    event: run.storyEvent?.type ?? null,
    leader: run.storyEvent?.leader ?? stage?.leader ?? null,
    badge: run.storyEvent?.badge ?? stage?.badge ?? null,
    regionId: stage?.regionId ?? null,
    centerAhead: inGyms && (run.step ?? 0) < pokeCenterStep(run),
    loop: run.loop ?? 0
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
  if (when.nodeType && !when.nodeType.includes(context.nodeType)) return false;
  if (when.event && context.event !== when.event) return false;
  if (when.region && !when.region.includes(context.regionId)) return false;
  if (when.leader && context.leader !== when.leader) return false;
  if (when.optionHas && !context.optionTypes.includes(when.optionHas)) return false;
  if (when.centerAhead && !context.centerAhead) return false;
  if (when.loop && !inRange(context.loop, when.loop)) return false;
  return true;
}

// Clave de "ya mostrado": por partida, por ruta (gimnasio) o por nodo visitado.
export function seenKey(run, line) {
  if (line.oncePer === "stage") return `${line.id}@s${run.stageIndex}`;
  if (line.oncePer === "node") return `${line.id}@n${run.nodesEntered ?? 0}`;
  return line.id;
}

// Separación mínima entre globos (en nodos visitados) según la prioridad de la línea.
function gapAllows(run, line) {
  const gap = run.data.story.gaps?.[String(line.priority ?? 1)] ?? 0;
  const last = run.storyLastAt ?? -Infinity;
  return gap === 0 || (run.nodesEntered ?? 0) - last >= gap;
}

// Un personaje no habla hasta haberse presentado: sus líneas dependen (requires) de su línea de presentación.
const requirementsMet = (line, seen) => !line.requires || seen.includes(line.requires);

// Devuelve la primera línea aplicable que aún no se mostró. No modifica la corrida.
export function pickStoryLine(run) {
  if (!storyActive(run)) return null;
  // En combate los diálogos respetan el turno: solo salen al empezar la fase del jugador, nunca a mitad de la resolución.
  if (run.phase === "combat" && (run.combat?.phase !== "player" || run.combat?.result)) return null;
  const seen = run.storySeen ?? [];
  const context = storyContext(run);
  return run.data.story.lines.find((line) =>
    !seen.includes(seenKey(run, line)) && requirementsMet(line, seen) && lineMatches(line, context) && gapAllows(run, line) &&
    (line.chance === undefined || roll(run, `${line.id}|c|${run.stageIndex}|${run.nodesEntered ?? 0}`) < line.chance)) ?? null;
}

export function markStorySeen(run, lineId) {
  const seen = (run.storySeen ??= []);
  if (!seen.includes(lineId)) seen.push(lineId);
}

const fill = (text, context) => text.replace(/\{(\w+)\}/g, (_, key) => context[key] ?? "");

function applyGift(run, tier, salt) {
  const pool = run.data.story.gifts?.[tier];
  if (!pool?.length) return null;
  const gift = pool[pickIndex(run, `gift|${tier}|${salt}`, pool.length)];
  if (gift.item) {
    addItem(run, gift.item, gift.amount ?? 1);
    emitRun(run, { type: "storyGift", itemId: gift.item, amount: gift.amount ?? 1 });
    return { label: `${run.data.items[gift.item]?.name ?? gift.item}${(gift.amount ?? 1) > 1 ? ` ×${gift.amount}` : ""}` };
  }
  const result = addCardToCollection(run, gift.card);
  emitRun(run, { type: "storyGift", cardId: gift.card });
  return { label: `${run.data.cards[gift.card]?.name ?? gift.card}${result.to === "chest" ? ` ${t("(al cofre)")}` : ""}` };
}

// Elige la línea, la marca como vista, aplica su regalo y devuelve lo que la interfaz debe mostrar.
export function consumeStoryLine(run) {
  const line = pickStoryLine(run);
  if (!line) return null;
  const context = storyContext(run);
  markStorySeen(run, seenKey(run, line));
  run.storyLastAt = run.nodesEntered ?? 0;
  const speaker = run.data.story.speakers[line.speaker] ?? { name: line.speaker.toUpperCase() };
  const variant = line.variants[pickIndex(run, `${line.id}|v|${run.stageIndex}`, line.variants.length)];
  const gift = line.gift ? applyGift(run, line.gift, `${line.id}|${run.stageIndex}`) : null;
  const shown = {
    id: line.id, speaker: line.speaker, expression: line.expression ?? "neutral",
    name: fill(line.name ?? speaker.name, context), text: fill(variant, context), gift
  };
  const entry = logStoryLine(run, shown);
  return { ...shown, seq: entry.seq };
}

// Escena final con la variante de cada paso ya elegida.
export function finalScene(run) {
  const { final } = run.data.story;
  return {
    ...final,
    intro: final.intro.map((step, index) => ({
      expression: step.expression,
      text: step.variants[pickIndex(run, `final|${index}`, step.variants.length)]
    }))
  };
}

// Cantidad de legendarios en el equipo activo.
export const legendaryCount = (run) => run.party.filter((pokemon) => run.data.species[pokemon.speciesId]?.legendary).length;

// Final secreto: nunca más de 2 legendarios en una pelea previa y como máximo 1 al llegar a Amelie.
export function secretEligible(run) {
  const rule = run.data.story?.secret;
  if (!storyActive(run) || !rule || !run.data.story.gardevoir) return false;
  return (run.legendaryPeak ?? 0) <= rule.maxLegendariesInFight && legendaryCount(run) <= rule.maxLegendariesAtFinal;
}
