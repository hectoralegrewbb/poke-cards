// Pantalla de combate (estilo Game Boy / 16 bits).
// Modelo de energía: cada Pokémon "carga" cartas (quedan reservadas en su casillero y se SUMAN).
// Recién se gastan cuando usa una técnica: las primeras pagan el costo, el resto refuerza.
// Las cartas sobrantes vuelven a la mano si el Pokémon no las usa.
// Jugar: arrastrá energía sobre un Pokémon (zona CARGAR) o sobre ESCUDO; arrastrá una técnica sobre un rival.
// Con clic: Pokémon -> cartas (se cargan) -> técnica -> objetivo -> ¡USAR!
import { calculateMoveDamage, endPlayerTurn, getMoveCost, getPowerBonus, getMoveTargets, getValidTargets, isAlive, playMove, playShield, playUtility } from "../../src/engine/index.js";
import { attachDrag } from "./dragDrop.js";
import { h } from "./dom.js";
import { icon } from "./pixelIcons.js";
import { describeCard, describeEffects, errorText, formatEvent, typeColors, typeNames } from "./labels.js";
import { sfx } from "./sfx.js";

const sel = { ref: null, actorUid: null, moveIndex: null, targetUid: null, cardUids: [], mode: "attack", utilityUid: null };
// uid de Pokémon -> uids de cartas de energía cargadas en él
let staged = {};
const logLines = [];
const hpMemory = new Map();
let loggedCount = 0;
let helpExpanded = true;

function resetSelection(state) {
  Object.assign(sel, { ref: state, actorUid: null, moveIndex: null, targetUid: null, cardUids: [], mode: "attack", utilityUid: null });
  staged = {};
  logLines.length = 0;
  hpMemory.clear();
  loggedCount = 0;
  // Inicio guiado: se selecciona un aliado, nunca se ejecuta una acción automáticamente.
  const ready = state.teams.player.find((pokemon) => isAlive(pokemon) && pokemon.actionsLeft > 0);
  sel.actorUid = ready?.uid ?? null;
  const names = state.teams.enemy.map((enemy) => enemy.name).join(", ");
  logLines.push(state.kind === "normal" ? `¡Aparecen: ${names}!` : `¡Te desafían: ${names}!`);
}

function clearChoice() {
  Object.assign(sel, { moveIndex: null, targetUid: null, cardUids: [], utilityUid: null });
}

const findPokemon = (state, uid) => [...state.teams.player, ...state.teams.enemy].find((pokemon) => pokemon.uid === uid);
const namesOf = (state) => Object.fromEntries([...state.teams.player, ...state.teams.enemy].map((pokemon) => [pokemon.uid, pokemon.name]));

// Un Pokémon caído o que ya actuó deja de estar seleccionado (y se cierra su menú).
function sanitizeSelection(state) {
  const actor = findPokemon(state, sel.actorUid);
  if (sel.actorUid && (!actor || !isAlive(actor) || actor.actionsLeft <= 0)) {
    sel.actorUid = null;
    clearChoice();
  }
  const target = findPokemon(state, sel.targetUid);
  if (sel.targetUid && (!target || !isAlive(target))) sel.targetUid = null;
  sel.cardUids = sel.cardUids.filter((uid) => state.deck.hand.some((card) => card.uid === uid));
  for (const uid of Object.keys(staged)) {
    const owner = findPokemon(state, uid);
    const usable = owner && isAlive(owner) && owner.actionsLeft > 0;
    staged[uid] = usable ? staged[uid].filter((cardUid) => state.deck.hand.some((card) => card.uid === cardUid)) : [];
    if (staged[uid].length === 0) delete staged[uid];
  }
  if (sel.utilityUid && !state.deck.hand.some((card) => card.uid === sel.utilityUid)) {
    sel.utilityUid = null;
    if (sel.mode === "utility") sel.mode = "attack";
  }
}

const handCard = (state, uid) => state.deck.hand.find((card) => card.uid === uid);
const stagedOf = (uid) => staged[uid] ?? [];

// Las primeras cartas cargadas pagan hasta cubrir el costo; las demás refuerzan (solo si la técnica daña).
function loadFor(state, actor, move) {
  const { cards, balance } = state.data;
  const pay = [];
  const boost = [];
  let energy = 0;
  const cost = actor && move ? getMoveCost(state, actor, move) : 0;
  for (const uid of actor ? stagedOf(actor.uid) : []) {
    const card = handCard(state, uid);
    if (!card) continue;
    const def = cards[card.cardId];
    if (move && energy < cost && def.playModes.includes("pay")) {
      pay.push(card);
      energy += def.energyValue;
    } else if (move && move.power > 0 && def.playModes.includes("boostAttack") && boost.length < balance.combat.maxBoostCardsPerAttack) boost.push(card);
  }
  const boostPower = boost.reduce((total, card) => total + cards[card.cardId].boostMultiplier, 0) * balance.combat.attackBoostPerCard;
  return { pay, boost, energy, cost, boostPower };
}

// Cuántas cartas puede tener cargadas un Pokémon: lo que necesita su técnica más cara + el tope de refuerzo.
function stageCap(state, actor) {
  const costs = actor.moves.map((id) => getMoveCost(state, actor, state.data.moves[id]));
  return Math.max(...costs) + state.data.balance.combat.maxBoostCardsPerAttack;
}

// Devuelve un mensaje si no se puede cargar la carta en ese Pokémon (null = ok).
function stageRejection(state, actor) {
  if (!actor || !isAlive(actor)) return "Ese Pokémon está debilitado.";
  if (actor.actionsLeft <= 0) return "Ese Pokémon ya actuó este turno.";
  if (stagedOf(actor.uid).length >= stageCap(state, actor)) return `${actor.name} ya tiene el máximo de cartas cargadas.`;
  return null;
}

function stageCard(actor, cardUid) {
  for (const uid of Object.keys(staged)) staged[uid] = staged[uid].filter((item) => item !== cardUid);
  staged[actor.uid] = [...stagedOf(actor.uid), cardUid];
}

const stagedOwner = (cardUid) => Object.keys(staged).find((uid) => staged[uid].includes(cardUid)) ?? null;

function previewDamage(state, actor, move, target, boostPower) {
  if (move.power <= 0) return null;
  const result = calculateMoveDamage({ attacker: actor, defender: target, move, boostPower: boostPower + getPowerBonus(state, actor, move), isCrit: false, balance: state.data.balance, typeChart: state.data.typeChart, targetCount: getMoveTargets(state, actor, move, target).length });
  return result;
}

function selectedMove(state) {
  const actor = findPokemon(state, sel.actorUid);
  return actor && sel.moveIndex !== null ? state.data.moves[actor.moves[sel.moveIndex]] : null;
}

// ---------- efectos y registro ----------
function pushEvents(ctx, state, events) {
  const names = namesOf(state);
  let time = 0;
  for (const event of events) {
    const line = formatEvent(event, { names, data: state.data });
    if (line) logLines.push(line);
    const actor = event.actorId ? findPokemon(state, event.actorId) : null;
    if (event.type === "moveUsed" && actor) {
      time += 520;
      const used = state.data.moves[event.moveId];
      if (used.power > 0) ctx.fx.push({ projectile: true, fromUid: event.actorId, toUids: event.targetIds ?? [event.targetId], attackType: used.type, delay: time - 520 });
      ctx.fx.push({ uid: actor.uid, cls: actor.side === "player" ? "lungePlayer" : "lungeEnemy", delay: time - 520 });
    }
    if (event.type === "damage") {
      const resisted = event.typeMultiplier > 0 && event.typeMultiplier < 1;
      ctx.fx.push({
        uid: event.targetId, cls: "hit", text: event.amount > 0 ? `-${event.amount}` : "0", floatCls: "dmg", crit: event.isCrit,
        burst: event.isCrit ? "crit" : "hit", sound: event.isCrit ? "crit" : resisted || event.amount === 0 ? "resist" : "hit", delay: time - 250, shake: event.isCrit
      });
    }
    if (event.type === "statusApplied") ctx.fx.push({ uid: event.targetId, cls: `afflicted-${event.status}`, text: event.status === "poison" ? "VENENO" : event.status === "burn" ? "QUEMA" : event.status === "paralysis" ? "PARÁLISIS" : "RETROCESO", floatCls: "statusFx", burst: event.status === "poison" ? "poison" : event.status === "paralysis" ? "electric" : "fire", delay: time });
    if (event.type === "statusDamage") ctx.fx.push({ uid: event.targetId, cls: "hit", text: `-${event.amount}`, floatCls: "statusFx", delay: time });
    if (event.type === "flinched") ctx.fx.push({ uid: event.targetId, cls: "staggered", text: "¡RETROCESO!", floatCls: "statusFx", delay: time });
    if (event.type === "paralyzed") ctx.fx.push({ uid: event.targetId, cls: "afflicted-paralysis", text: "¡PARALIZADO!", floatCls: "statusFx", burst: "electric", delay: time });
    if (event.type === "fainted") ctx.fx.push({ uid: event.pokemonId, cls: "faint", sound: "faint", delay: time - 100 });
    if (event.type === "healed") ctx.fx.push({ uid: event.targetId, cls: "healed", text: `+${event.amount}`, floatCls: "heal", burst: "heal", sound: "heal", delay: time });
    if (event.type === "shieldGained") ctx.fx.push({ uid: event.targetId, cls: "shielded", text: `+${event.amount}`, floatCls: "shieldFx", burst: "shield", sound: "shield", delay: time });
    if (event.type === "cardsDrawn") event.cardUids.forEach((uid, index) => ctx.fx.push({ cardUid: uid, cls: "dealt", delay: 120 * index + time }));
    if (event.type === "modifierAdded") ctx.fx.push({ sound: "shield", delay: time });
    if (event.type === "combatEnded") ctx.fx.push({ sound: event.result === "victory" ? "victory" : "defeat", delay: time + 200 });
  }
  while (logLines.length > 60) logLines.shift();
}

function runAction(ctx, state, result) {
  if (!result.ok) {
    sfx.play("deny");
    ctx.notify(errorText[result.error] ?? result.error);
    return false;
  }
  pushEvents(ctx, state, result.events);
  clearChoice();
  ctx.rerender();
  return true;
}

function fireMove(ctx, state) {
  const actor = findPokemon(state, sel.actorUid);
  const move = selectedMove(state);
  if (!actor || !move || !sel.targetUid) return;
  const { pay, boost } = loadFor(state, actor, move);
  return runAction(ctx, state, playMove(state, {
    pokemonUid: actor.uid, moveIndex: sel.moveIndex, targetUid: sel.targetUid,
    payCardUids: pay.map((card) => card.uid), boostCardUids: boost.map((card) => card.uid)
  }));
}

// ---------- piezas visuales ----------
function typeChip(type) {
  return h("span", { class: "chip", style: `background:${typeColors[type]}` }, typeNames[type]);
}

function hpBar(pokemon) {
  const percent = Math.max(0, Math.round((pokemon.hp / pokemon.maxHp) * 100));
  const before = hpMemory.get(pokemon.uid) ?? percent;
  hpMemory.set(pokemon.uid, percent);
  const tone = percent > 50 ? "good" : percent > 25 ? "warn" : "low";
  return h("div", { class: "hp" },
    h("span", { class: "hpLabel" }, "PS"),
    h("div", { class: "hpTrack" }, h("div", { class: `hpFill ${tone}`, style: `width:${before}%`, "data-to": percent })),
    h("span", { class: "hpNum" }, `${pokemon.hp}/${pokemon.maxHp}`),
    pokemon.shield ? h("span", { class: "shieldTag" }, icon("shield", { scale: 2 }), pokemon.shield) : null);
}

function intentLine(state, enemy) {
  if (!enemy.intent || !isAlive(enemy)) return null;
  const move = state.data.moves[enemy.intent.moveId];
  const target = findPokemon(state, enemy.intent.targetId);
  const area = move.targetMode === "allEnemies" ? " · TODOS" : move.targetMode === "targetRow" ? " · FILA" : "";
  return h("div", { class: "intent" }, icon("sword", { scale: 2 }),
    h("span", { title: move.name }, `${move.power > 0 ? `≈${enemy.intent.damagePreview}` : move.name}${area} › ${target?.name ?? "?"}`));
}

function previewBadge(state, target) {
  const actor = findPokemon(state, sel.actorUid);
  const move = selectedMove(state);
  if (!actor || !move || target.side !== "enemy" || move.targetSide !== "enemy") return null;
  const { boostPower } = loadFor(state, actor, move);
  const result = previewDamage(state, actor, move, target, boostPower);
  if (!result) return null;
  const mult = result.typeMultiplier;
  const label = mult === 0 ? "INMUNE" : mult > 1 ? `x${mult} ¡EFICAZ!` : mult < 1 ? `x${mult} POCO` : "x1";
  return h("div", { class: `preview m${mult === 0 ? "0" : mult > 1 ? "up" : mult < 1 ? "down" : "1"}` }, `≈${result.damage}`, h("small", {}, `${label}${result.isSpread ? " · ÁREA" : ""}${target.shield ? ` · ESC ${target.shield}` : ""}`));
}

function pokemonTile(ctx, state, pokemon, validSet) {
  const alive = isAlive(pokemon);
  const isPlayer = pokemon.side === "player";
  const classes = ["tile", pokemon.side, alive ? "" : "dead", validSet.has(pokemon.uid) ? "valid" : "", pokemon.uid === sel.actorUid ? "actor" : "", pokemon.uid === sel.targetUid ? "targeted" : "", alive && isPlayer && pokemon.actionsLeft <= 0 ? "acted" : ""];
  const loaded = stagedOf(pokemon.uid);
  const canCharge = alive && isPlayer && pokemon.actionsLeft > 0;
  const tile = h("div", {
    class: classes.join(" "), "data-uid": pokemon.uid, "data-drop": alive ? `${isPlayer ? "ally" : "enemy"}:${pokemon.uid}` : null,
    title: pokemon.passive ? `${pokemon.passive.name}: ${pokemon.passive.description}` : null,
    role: alive ? "button" : null, tabindex: alive ? "0" : null,
    "aria-label": `${pokemon.name}, ${pokemon.hp} de ${pokemon.maxHp} PS`,
    onKeyDown: alive ? (event) => {
      if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onTileClick(ctx, state, pokemon); }
    } : null,
    onClick: alive ? () => onTileClick(ctx, state, pokemon) : null
  },
    isPlayer && alive ? h("div", { class: "zones" },
      h("div", { class: "zone zCharge", "data-drop": canCharge ? `charge:${pokemon.uid}` : null }, icon("bolt", { scale: 3 }), "CARGAR"),
      h("div", { class: "zone zGuard", "data-drop": `guard:${pokemon.uid}` }, icon("shield", { scale: 3 }), "ESCUDO")) : null,
    loaded.length ? h("button", {
      class: "stagedTag", title: "Quitar la carga",
      onClick: (event) => { event.stopPropagation(); delete staged[pokemon.uid]; sfx.play("deny"); ctx.rerender(); }
    }, loaded.map(() => icon("bolt", { scale: 2 }))) : null,
    isPlayer && alive && pokemon.actionsLeft > 0 ? h("div", { class: "readyMark" }, "▼") : null,
    previewBadge(state, pokemon),
    h("div", { class: "spriteBox" }, h("div", { class: "platform" }), ctx.sprites.element(pokemon.speciesId, { facing: isPlayer ? "back" : "front", spriteKey: `${state.seed}:${pokemon.side}:${pokemon.uid}` })),
    h("div", { class: "plate" },
      h("div", { class: "pname" }, pokemon.name, h("small", {}, pokemon.row === "front" ? "F" : "B")),
      pokemon.status ? h("span", { class: `statusTag ${pokemon.status}`, title: pokemon.status === "burn" ? "Quemado: pierde PS y baja su ataque físico" : pokemon.status === "paralysis" ? "Parálisis: 25% de perder la acción por turno" : "Envenenado: pierde PS cada turno" }, pokemon.status === "poison" ? "VEN" : pokemon.status === "paralysis" ? "PAR" : "QUE") : null,
      h("div", { class: "types" }, pokemon.types.map(typeChip)),
      hpBar(pokemon),
      isPlayer ? null : intentLine(state, pokemon)));
  return tile;
}

function cardIcon(def) {
  if (def.kind === "energy") {
    if (def.boostMultiplier > 1) return [icon("star", { scale: 4 })];
    return Array.from({ length: def.energyValue }, () => icon("bolt", { scale: 4 }));
  }
  const first = def.effects[0]?.type;
  const map = { drawCards: "cards", heal: "heart", shield: "shield", reduceCooldown: "clock", luckyCoin: "clover" };
  return [icon(map[first] ?? "star", { scale: 4 })];
}

function cardView(card, def, { role = "", picked = false, armed = false } = {}) {
  const kindClass = def.kind === "utility" ? "utility" : def.boostMultiplier > 1 ? "wild" : "energy";
  return h("div", { class: `card ${kindClass} ${picked ? "picked" : ""} ${armed ? "armed" : ""}`, "data-card": card.uid },
    h("div", { class: "cardTop" }, def.name),
    h("div", { class: "cardArt" }, cardIcon(def)),
    h("div", { class: "cardText" }, describeCard(def)),
    role ? h("div", { class: "cardRole" }, role) : null);
}

// ---------- interacción ----------
function validTargetUids(state) {
  const actor = findPokemon(state, sel.actorUid);
  if (sel.mode === "attack" && actor && sel.moveIndex !== null) {
    return new Set(getValidTargets(state, actor, selectedMove(state)).map((pokemon) => pokemon.uid));
  }
  if (sel.mode === "shield" || sel.mode === "utility") return new Set(state.teams.player.filter(isAlive).map((pokemon) => pokemon.uid));
  return new Set();
}

function onTileClick(ctx, state, pokemon) {
  const valid = validTargetUids(state);
  if (sel.mode === "utility" && valid.has(pokemon.uid)) {
    const result = playUtility(state, { cardUid: sel.utilityUid, targetUid: pokemon.uid });
    sel.mode = "attack";
    return runAction(ctx, state, result);
  }
  if (valid.has(pokemon.uid)) {
    sel.targetUid = pokemon.uid;
    sfx.play("select");
    return ctx.rerender();
  }
  if (pokemon.side === "player" && sel.mode === "attack" && pokemon.actionsLeft > 0) {
    sel.actorUid = pokemon.uid;
    clearChoice();
    sfx.play("select");
    ctx.rerender();
  }
}

function selectMove(ctx, state, actor, index) {
  const move = state.data.moves[actor.moves[index]];
  sel.moveIndex = index;
  const targets = getValidTargets(state, actor, move);
  sel.targetUid = move.targetSide === "self" ? actor.uid : targets.length === 1 ? targets[0].uid : null;
  sfx.play("select");
}

function movesMenu(ctx, state) {
  const actor = findPokemon(state, sel.actorUid);
  if (!actor || sel.mode !== "attack") return h("div", { class: "menuHint" }, sel.mode === "shield" ? "Elegí un aliado y cartas de energía." : sel.mode === "utility" ? "Elegí a qué aliado aplicarla." : "Elegí uno de tus Pokémon.");
  const passive = actor.passive;
  return h("div", { class: "movesWrap" }, h("div", { class: "moves" }, actor.moves.map((moveId, index) => {
    const move = state.data.moves[moveId];
    const cooldown = actor.cooldowns[index];
    const disabled = cooldown > 0 || actor.actionsLeft <= 0;
    const isSelected = sel.moveIndex === index;
    const load = loadFor(state, actor, move);
    const cost = load.cost;
    const bonus = move.power > 0 ? getPowerBonus(state, actor, move) : 0;
    const charged = load.energy >= cost && stagedOf(actor.uid).length > 0;
    const row = h("button", {
      class: `move ${isSelected ? "selected" : ""} ${charged ? "charged" : ""}`, disabled, "data-drop": disabled ? null : `move:${index}`,
      title: `${move.name}: ${move.category === "status" ? "apoyo" : `poder ${move.power}`}${move.targetMode ? ` · ${move.targetMode === "allEnemies" ? "TODOS LOS RIVALES" : "FILA RIVAL"}` : ""}${describeEffects(move.effects) ? ` · ${describeEffects(move.effects)}` : ""}`,
      onClick: () => { selectMove(ctx, state, actor, index); ctx.rerender(); }
    },
      h("span", { class: "cursor" }, isSelected ? "▶" : ""),
      h("span", { class: "mname" }, move.name, move.targetMode ? h("small", { class: "areaLabel" }, move.targetMode === "allEnemies" ? " · ÁREA" : " · FILA") : null),
      h("span", { class: "chipSlot" }, typeChip(move.type)),
      h("span", { class: `mstat ${bonus ? "buffed" : ""}` }, move.category === "status" ? "APOYO" : `POD ${move.power + bonus}`),
      h("span", { class: `pips ${cost < move.cost ? "cut" : cost > move.cost ? "up" : ""}`, title: cost !== move.cost ? `Costo base ${move.cost}` : null },
        cost === 0 ? h("small", {}, "LIBRE") : Array.from({ length: cost }, (_, i) => h("i", { class: i < load.energy ? "on" : "" }))),
      h("span", { class: "mcd" }, cooldown > 0 ? `ESPERA ${cooldown}` : `CD ${move.cooldown}`));
    if (!disabled) attachDrag(row, {
      isValid: (drop) => {
        const [kind, uid] = drop.dataset.drop.split(":");
        return (kind === "enemy" || kind === "ally") && getValidTargets(state, actor, move).some((pokemon) => pokemon.uid === uid);
      },
      kind: "technique",
      ghost: () => h("div", { class: "moveGhost", style: `background:${typeColors[move.type]}` }, move.name),
      hint: (drop) => {
        const target = findPokemon(state, drop.dataset.drop.split(":")[1]);
        const shown = previewDamage(state, actor, move, target, load.boostPower);
        const missing = load.energy < cost ? ` · falta energía ${load.energy}/${cost}` : "";
        return (shown ? `${move.name} ≈${shown.damage} x${shown.typeMultiplier}` : move.name) + missing;
      },
      onDrop: (drop) => {
        selectMove(ctx, state, actor, index);
        sel.targetUid = drop.dataset.drop.split(":")[1];
        if (loadFor(state, actor, move).energy < cost) {
          sfx.play("deny");
          ctx.notify(`Falta energía: cargá ${cost} en ${actor.name} (arrastrá cartas sobre él).`);
          return ctx.rerender();
        }
        fireMove(ctx, state);
      }
    });
    return row;
  })), passive ? h("div", { class: "passiveLine", title: passive.description }, icon("star", { scale: 2 }), h("b", {}, passive.name), ` ${passive.description}`) : null);
}

function dialogBox(ctx, state) {
  const actor = findPokemon(state, sel.actorUid);
  const move = selectedMove(state);
  let prompt = "1. Elegí tu Pokémon · 2. Cargá energía · 3. Técnica y objetivo.";
  if (sel.mode === "shield") {
    const amount = sel.cardUids.reduce((total, uid) => {
      const card = state.deck.hand.find((item) => item.uid === uid);
      return total + (card ? state.data.cards[card.cardId].boostMultiplier * state.data.balance.combat.defenseBoostPerCard : 0);
    }, 0);
    prompt = sel.targetUid ? `Escudo +${amount} a ${findPokemon(state, sel.targetUid).name}.` : "Modo escudo: elegí aliado y cartas.";
  } else if (sel.mode === "utility") prompt = "¿A quién aplicás la carta?";
  else if (actor && !move) prompt = `${actor.name} está listo. Elegí una técnica; las de costo LIBRE no necesitan cartas.`;
  else if (actor && move) {
    const load = loadFor(state, actor, move);
    const target = sel.targetUid ? findPokemon(state, sel.targetUid) : null;
    const effect = describeEffects(move.effects) ? ` (${describeEffects(move.effects)})` : "";
    const targetsInfo = move.targetMode ? ` · ${move.targetMode === "allEnemies" ? "TODOS LOS RIVALES" : "FILA COMPLETA"}` : "";
    const shortfall = load.energy < load.cost ? ` · FALTAN ${load.cost - load.energy} ENERGÍA` : "";
    prompt = `${actor.name}: ${move.name}${effect}${targetsInfo} · ${load.energy}/${load.cost} EN${shortfall}${load.boost.length ? ` · +${load.boostPower} POD` : ""}${target ? ` → ${target.name}` : " · ELEGÍ OBJETIVO"}`;
  }

  const fresh = logLines.length - loggedCount;
  loggedCount = logLines.length;
  const lines = logLines.slice(-4).map((line, index, list) => h("div", { class: `line ${index >= list.length - fresh ? "new" : ""}` }, line));

  const fireLoad = actor && move ? loadFor(state, actor, move) : null;
  const canFire = fireLoad && sel.targetUid && fireLoad.energy >= fireLoad.cost;
  const canShield = sel.mode === "shield" && sel.targetUid && sel.cardUids.length > 0;
  return h("div", { class: "window dialog" },
    h("div", { class: "lines" }, lines),
    h("div", { class: "prompt" }, prompt, h("span", { class: "blink" }, "▼")),
    h("div", { class: "dialogButtons" },
      canShield ? h("button", { class: "btn primary", onClick: () => runAction(ctx, state, playShield(state, { targetUid: sel.targetUid, cardUids: sel.cardUids })) }, "APLICAR ESCUDO") : null,
      canFire && sel.mode === "attack" ? h("button", { class: "btn primary", onClick: () => fireMove(ctx, state) }, "¡USAR!") : null));
}

function handView(ctx, state) {
  const count = state.deck.hand.length;
  const playable = state.phase === "player" && !state.result;

  return h("div", { class: "hand" }, state.deck.hand.map((card, index) => {
    const def = state.data.cards[card.cardId];
    const picked = sel.cardUids.includes(card.uid);
    const owner = stagedOwner(card.uid);
    const role = owner ? findPokemon(state, owner).name.slice(0, 8).toUpperCase() : picked ? "ESCUDO" : "";
    const element = cardView(card, def, { role, picked: picked || Boolean(owner), armed: sel.utilityUid === card.uid });
    const offset = index - (count - 1) / 2;
    element.style.setProperty("--rot", `${(offset * Math.min(3, 18 / Math.max(count, 1))).toFixed(1)}deg`);
    element.style.setProperty("--lift", `${Math.abs(offset) * 2}px`);
    if (!playable) return element;

    const onCardClick = () => {
      if (def.kind === "utility") {
        if (def.target === "ally") {
          sel.mode = "utility";
          sel.utilityUid = card.uid;
          sfx.play("pick");
          return ctx.rerender();
        }
        sfx.play("card");
        return runAction(ctx, state, playUtility(state, { cardUid: card.uid, targetUid: null }));
      }
      if (sel.mode === "shield") {
        sel.cardUids = picked ? sel.cardUids.filter((uid) => uid !== card.uid) : [...sel.cardUids, card.uid];
        sfx.play("pick");
        return ctx.rerender();
      }
      const actor = findPokemon(state, sel.actorUid);
      if (owner && owner === sel.actorUid) {
        staged[owner] = staged[owner].filter((uid) => uid !== card.uid);
        sfx.play("pick");
        return ctx.rerender();
      }
      if (!actor) {
        sfx.play("deny");
        return ctx.notify("Elegí un Pokémon (o arrastrá la carta sobre él) para cargarla.");
      }
      const rejection = stageRejection(state, actor);
      if (rejection) {
        sfx.play("deny");
        return ctx.notify(rejection);
      }
      stageCard(actor, card.uid);
      sfx.play("pick");
      ctx.rerender();
    };
    element.setAttribute("role", "button");
    element.setAttribute("tabindex", "0");
    element.setAttribute("aria-label", `${def.name}: ${describeCard(def)}`);
    element.addEventListener("click", onCardClick);
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onCardClick(); }
    });

    attachDrag(element, {
      kind: def.kind === "utility" ? "utility" : "energy",
      isValid: (drop) => {
        const [kind] = drop.dataset.drop.split(":");
        if (def.kind === "utility") return def.target === "ally" ? kind === "ally" : kind === "field";
        if (kind === "guard" || kind === "charge") return true;
        return kind === "move" && Boolean(findPokemon(state, sel.actorUid));
      },
      hint: (drop) => {
        const [kind, uid] = drop.dataset.drop.split(":");
        if (def.kind === "utility") return def.name;
        if (kind === "guard") return `Escudo +${def.boostMultiplier * state.data.balance.combat.defenseBoostPerCard} a ${findPokemon(state, uid).name}`;
        const actor = kind === "charge" ? findPokemon(state, uid) : findPokemon(state, sel.actorUid);
        return `Cargar en ${actor.name} (${stagedOf(actor.uid).length + 1}/${stageCap(state, actor)})`;
      },
      onDrop: (drop) => {
        const [kind, uid] = drop.dataset.drop.split(":");
        if (def.kind === "utility") {
          sfx.play("card");
          return runAction(ctx, state, playUtility(state, { cardUid: card.uid, targetUid: def.target === "ally" ? uid : null }));
        }
        if (kind === "guard") return runAction(ctx, state, playShield(state, { targetUid: uid, cardUids: [card.uid] }));
        const actor = kind === "charge" ? findPokemon(state, uid) : findPokemon(state, sel.actorUid);
        if (stagedOwner(card.uid) !== actor.uid) {
          const rejection = stageRejection(state, actor);
          if (rejection) {
            sfx.play("deny");
            ctx.notify(rejection);
            return ctx.rerender();
          }
          stageCard(actor, card.uid);
        }
        if (sel.actorUid !== actor.uid) {
          sel.actorUid = actor.uid;
          clearChoice();
        }
        if (kind === "move") selectMove(ctx, state, actor, Number(uid));
        ctx.fx.push({ uid: actor.uid, cls: "charge", burst: "card", sound: "card" });
        ctx.rerender();
      }
    });
    return element;
  }));
}

function pile(label, amount) {
  return h("div", { class: "pile" }, h("div", { class: "pileBack" }, icon("cards", { scale: 3 })), h("small", {}, `${label} ${amount}`));
}

export function renderCombat(ctx) {
  const { run } = ctx;
  const state = run.combat;
  if (sel.ref !== state) resetSelection(state);
  sanitizeSelection(state);

  const valid = validTargetUids(state);
  const row = (side, rowName) => h("div", { class: `row ${side}` }, state.teams[side].filter((pokemon) => pokemon.row === rowName).map((pokemon) => pokemonTile(ctx, state, pokemon, valid)));
  const finished = Boolean(state.result);
  const kindNames = { normal: "RUTA", gym: "GIMNASIO", eliteFour: "ALTO MANDO", champion: "CAMPEÓN" };

  const readyCount = state.teams.player.filter((pokemon) => isAlive(pokemon) && pokemon.actionsLeft > 0).length;
  return h("section", { class: "combat" },
    h("div", { class: "combatCoach" },
      h("div", { class: "coachHeader" },
        h("span", {}, icon("star", { scale: 2 }), " TURNO TÁCTICO", h("small", {}, ` · ${readyCount} Pokémon por actuar`)),
        h("button", { class: "btn mini", "aria-expanded": helpExpanded, onClick: () => { helpExpanded = !helpExpanded; ctx.rerender(); } }, helpExpanded ? "OCULTAR GUÍA −" : "¿CÓMO JUGAR? +")),
      helpExpanded ? h("div", { class: "coachSteps" },
        h("span", {}, h("b", {}, "1"), " Seleccioná un aliado"),
        h("span", {}, h("b", {}, "2"), " Cargá energía (solo si cuesta)"),
        h("span", {}, h("b", {}, "3"), " Técnica → objetivo → ¡USAR!"),
        h("small", {}, "LIBRE no gasta cartas · ÁREA alcanza a todos · FILA golpea a una fila · VEN y QUE hacen daño por turno y se curan con ítems.")) : null),
    h("header", { class: "hud" },
      h("span", {}, `TURNO ${state.turn}`), h("span", { class: "kind" }, kindNames[state.kind] ?? state.kind),
      h("span", {}, state.luckyCoins ? [icon("clover", { scale: 2 }), ` x${state.luckyCoins}`] : "")),
    state.modifiers.length ? h("div", { class: "modifiers" }, state.modifiers.map((modifier) =>
      h("span", { class: `modChip ${modifier.kind}`, title: `${modifier.label}: quedan ${modifier.turnsLeft} turno(s)` },
        `${modifier.label} ${modifier.kind === "cost" ? modifier.amount : `+${modifier.amount} POD`} · ${modifier.turnsLeft}T`))) : null,
    h("div", { class: "field", "data-drop": "field" },
      h("div", { class: "side playerSide" }, row("player", "front"), row("player", "back")),
      h("div", { class: "side enemySide" }, row("enemy", "front"), row("enemy", "back"))),
    h("div", { class: "bottom" },
      dialogBox(ctx, state),
      h("div", { class: "window menu" }, h("div", { class: "menuTitle" }, "TÉCNICAS"), movesMenu(ctx, state))),
    h("div", { class: "handRow" },
      pile("MAZO", state.deck.drawPile.length),
      handView(ctx, state),
      h("div", { class: "handSide" },
        pile("DESC.", state.deck.discardPile.length),
        h("button", { class: `btn ${sel.mode === "shield" ? "on" : ""}`, onClick: () => { sel.mode = sel.mode === "shield" ? "attack" : "shield"; clearChoice(); sfx.play("select"); ctx.rerender(); } }, "ESCUDO"),
        h("button", { class: "btn danger", disabled: finished, title: readyCount ? `${readyCount} Pokémon todavía pueden actuar` : "Resolver acciones enemigas", onClick: () => { sfx.play("select"); runAction(ctx, state, endPlayerTurn(state)); } }, readyCount ? `FIN TURNO (${readyCount}) ▶` : "FIN TURNO ▶"))),
    finished ? h("div", { class: "overlay" }, h("div", { class: "window dialogBig" },
      h("h2", { class: state.result === "victory" ? "win" : "lose" }, state.result === "victory" ? "¡VICTORIA!" : "DERROTA"),
      h("button", { class: "btn primary", onClick: () => ctx.onCombatFinished() }, "CONTINUAR ▶"))) : null);
}
