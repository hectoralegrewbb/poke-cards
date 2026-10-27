// Pantalla de combate (estilo Game Boy / 16 bits).
// Modelo de energía: cada Pokémon "carga" cartas (quedan reservadas en su casillero y se SUMAN).
// Recién se gastan cuando usa una técnica: las primeras pagan el costo, el resto refuerza.
// Las cartas sobrantes vuelven a la mano si el Pokémon no las usa.
// Jugar: arrastrá energía sobre un Pokémon (zona CARGAR) o sobre ESCUDO; arrastrá una técnica sobre un rival.
// Con clic: Pokémon -> cartas (se cargan) -> técnica -> objetivo -> ¡USAR!
import { averageLevel, calculateMoveDamage, endPlayerTurn, getIncomingThreats, getMoveCost, getPowerBonus, getMoveTargets, getValidTargets, isAlive, playMove, playShield, playUtility, pokemonLevel, splitCharge } from "../../src/engine/index.js";
import { levelTag } from "./levelTag.js";
import { attachDrag } from "./dragDrop.js";
import { h } from "./dom.js";
import { icon } from "./pixelIcons.js";
import { attachCardHold, cardImage, hasSprite, showCardName } from "./cardSprite.js";
import { cardEffectIcons, describeCard, describeEffects, errorText, formatEvent, statusInfo, typeColors, typeNames } from "./labels.js";
import { sfx } from "./sfx.js";
import { t } from "../../src/shared/i18n.js";

// Nivel de referencia para colorear a los rivales: el promedio de tu equipo.
const referenceLevel = (state) => averageLevel(state.teams.player.filter(isAlive));

let searchCardUid = null; // carta Buscador abierta (modal con la pila de robo)
const sel = { ref: null, actorUid: null, moveIndex: null, targetUid: null, cardUids: [], mode: "attack", utilityUid: null };
// uid de Pokémon -> uids de cartas de energía cargadas en él
let staged = {};
const logLines = [];
const hpMemory = new Map();
let loggedCount = 0;
// En pantallas chicas la guía arranca plegada: el espacio vertical es lo más escaso.
let helpExpanded = !(typeof matchMedia === "function" && matchMedia("(max-width: 800px)").matches);

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
  logLines.push(state.kind === "normal" ? t("¡Aparecen: {names}!", { names }) : t("¡Te desafían: {names}!", { names }));
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
  if (searchCardUid && !state.deck.hand.some((card) => card.uid === searchCardUid)) searchCardUid = null;
  if (sel.utilityUid && !state.deck.hand.some((card) => card.uid === sel.utilityUid)) {
    sel.utilityUid = null;
    if (sel.mode === "utility") sel.mode = "attack";
  }
}

const handCard = (state, uid) => state.deck.hand.find((card) => card.uid === uid);
const stagedOf = (uid) => staged[uid] ?? [];

// Las cartas cargadas pagan el costo gastando las menos valiosas (ver splitCharge); las demás refuerzan,
// solo si la técnica daña. Así un Comodín no se "desperdicia" pagando cuando sobra otra carta.
function loadFor(state, actor, move) {
  const { cards, balance } = state.data;
  const cost = actor && move ? getMoveCost(state, actor, move) : 0;
  const staged = (actor ? stagedOf(actor.uid) : []).map((uid) => handCard(state, uid)).filter(Boolean);
  if (!move) return { pay: [], boost: [], energy: 0, cost, boostPower: 0 };
  const { pay, boost, energy } = splitCharge(cards, staged, { cost, power: move.power, maxBoostCards: balance.combat.maxBoostCardsPerAttack });
  const boostPower = boost.reduce((total, card) => total + cards[card.cardId].boostMultiplier, 0) * balance.combat.attackBoostPerCard;
  return { pay, boost, energy: Math.min(energy, cost), cost, boostPower };
}

// Cuántas cartas puede tener cargadas un Pokémon: lo que necesita su técnica más cara + el tope de refuerzo.
function stageCap(state, actor) {
  const costs = actor.moves.map((id) => getMoveCost(state, actor, state.data.moves[id]));
  return Math.max(...costs) + state.data.balance.combat.maxBoostCardsPerAttack;
}

// Devuelve un mensaje si no se puede cargar la carta en ese Pokémon (null = ok).
function stageRejection(state, actor) {
  if (!actor || !isAlive(actor)) return t("Ese Pokémon está debilitado.");
  if (actor.actionsLeft <= 0) return t("Ese Pokémon ya actuó este turno.");
  if (stagedOf(actor.uid).length >= stageCap(state, actor)) return t("{name} ya tiene el máximo de cartas cargadas.", { name: actor.name });
  return null;
}

function stageCard(actor, cardUid) {
  for (const uid of Object.keys(staged)) staged[uid] = staged[uid].filter((item) => item !== cardUid);
  staged[actor.uid] = [...stagedOf(actor.uid), cardUid];
}

const stagedOwner = (cardUid) => Object.keys(staged).find((uid) => staged[uid].includes(cardUid)) ?? null;

function previewDamage(state, actor, move, target, boostPower) {
  if (move.power <= 0) return null;
  const result = calculateMoveDamage({ attacker: actor, defender: target, move, boostPower: boostPower + getPowerBonus(state, actor, move), isCrit: false, balance: state.data.balance, typeChart: state.data.typeChart, heldItems: state.data.heldItems, targetCount: getMoveTargets(state, actor, move, target).length });
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
      if (used.power > 0) ctx.fx.push({ projectile: true, fromUid: event.actorId, toUids: event.targetIds ?? [event.targetId], attackType: used.type, sound: `type:${used.type}`, delay: time - 520 });
      ctx.fx.push({ uid: actor.uid, cls: actor.side === "player" ? "lungePlayer" : "lungeEnemy", delay: time - 520 });
    }
    if (event.type === "damage") {
      const resisted = event.typeMultiplier > 0 && event.typeMultiplier < 1;
      const effective = event.typeMultiplier > 1;
      const note = effective ? t("¡MUY EFICAZ!") : resisted ? t("POCO EFICAZ") : event.typeMultiplier === 0 ? t("NO AFECTA") : null;
      ctx.fx.push({
        uid: event.targetId, cls: "hit", text: event.amount > 0 ? `-${event.amount}` : "0", floatCls: "dmg", crit: event.isCrit,
        note, noteCls: effective ? "good" : "weak",
        burst: event.isCrit ? "crit" : "hit", sound: event.isCrit ? "crit" : effective ? "super" : resisted || event.amount === 0 ? "resist" : "hit", delay: time - 250, shake: event.isCrit || effective
      });
    }
    if (event.type === "statusApplied") ctx.fx.push({ uid: event.targetId, cls: `afflicted-${event.status}`, text: event.status === "poison" ? t("VENENO") : event.status === "burn" ? t("QUEMA") : event.status === "paralysis" ? t("PARÁLISIS") : t("RETROCESO"), floatCls: "statusFx", burst: event.status === "poison" ? "poison" : event.status === "paralysis" ? "electric" : "fire", delay: time });
    if (event.type === "statusDamage") ctx.fx.push({ uid: event.targetId, cls: "hit", text: `-${event.amount}`, floatCls: "statusFx", delay: time });
    if (event.type === "flinched") ctx.fx.push({ uid: event.targetId, cls: "staggered", text: t("¡RETROCESO!"), floatCls: "statusFx", delay: time });
    if (event.type === "paralyzed") ctx.fx.push({ uid: event.targetId, cls: "afflicted-paralysis", text: t("¡PARALIZADO!"), floatCls: "statusFx", burst: "electric", delay: time });
    if (event.type === "fainted") ctx.fx.push({ uid: event.pokemonId, cls: "faint", sound: "faint", delay: time - 100 });
    if (event.type === "healed") ctx.fx.push({ uid: event.targetId, cls: "healed", text: `+${event.amount}`, floatCls: "heal", burst: "heal", sound: "heal", delay: time });
    if (event.type === "shieldGained") ctx.fx.push({ uid: event.targetId, cls: "shielded", text: `+${event.amount}`, floatCls: "shieldFx", burst: "shield", sound: "shield", delay: time });
    if (event.type === "cardsDrawn") event.cardUids.forEach((uid, index) => ctx.fx.push({ cardUid: uid, cls: "dealt", delay: 120 * index + time }));
    if (event.type === "modifierAdded") ctx.fx.push({ banner: `${event.label} · ${event.kind === "cost" ? `COSTOS ${event.amount}` : `POD +${event.amount}`}`, sound: "shield", delay: time });
    if (event.type === "luckyCoinGained") ctx.fx.push({ banner: t("¡MONEDA DE LA SUERTE!"), sound: "passive", delay: time });
    if (event.type === "statusCured") ctx.fx.push({ uid: event.targetId, cls: "healed", text: t("CURADO"), floatCls: "heal", burst: "heal", sound: "cure", delay: time });
    if (event.type === "passiveTriggered") ctx.fx.push({ uid: event.pokemonId, cls: "charge", text: `✦ ${event.name}`, floatCls: "passiveFx", burst: "card", sound: "passive", delay: time });
    if (event.type === "revivedInCombat") ctx.fx.push({ uid: event.targetId, cls: "healed", text: t("¡REVIVE!"), floatCls: "heal", burst: "heal", sound: "cure", delay: time });
    if (event.type === "berryReady") ctx.fx.push({ uid: event.targetId, cls: "shielded", text: t("BAYA"), floatCls: "shieldFx", burst: "card", sound: "shield", delay: time });
    if (event.type === "berrySaved") ctx.fx.push({ uid: event.targetId, cls: "shielded", text: t("¡AGUANTÓ!"), floatCls: "shieldFx", burst: "shield", sound: "passive", delay: time, banner: null });
    if (event.type === "cardSearched") ctx.fx.push({ cardUid: event.cardUid, cls: "dealt", delay: time });
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
  sel.mode = "attack"; // tras cualquier acción se vuelve al menú de técnicas (antes quedaba el modo escudo/utilidad pegado)
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
    h("span", { class: "hpLabel" }, t("PS")),
    h("div", { class: "hpTrack" }, h("div", { class: `hpFill ${tone}`, style: `width:${before}%`, "data-to": percent })),
    h("span", { class: "hpNum" }, `${pokemon.hp}/${pokemon.maxHp}`),
    pokemon.shield ? h("span", { class: "shieldTag" }, icon("shield", { scale: 2 }), pokemon.shield) : null);
}

function intentLine(state, enemy) {
  if (!enemy.intent || !isAlive(enemy)) return null;
  const move = state.data.moves[enemy.intent.moveId];
  const target = findPokemon(state, enemy.intent.targetId);
  const area = move.targetMode === "allEnemies" ? t("ÁREA") : move.targetMode === "targetRow" ? t("FILA") : "";
  const where = area ? `${area} (${target?.row === "front" ? t("frente") : t("fondo")})` : (target?.name ?? "?");
  return h("div", { class: `intent ${area ? "areaIntent" : ""}`, title: area ? t("{name}: golpea a {target}", { name: move.name, target: move.targetMode === "allEnemies" ? t("todo tu equipo") : t("toda una fila") }) : move.name },
    icon("sword", { scale: 2 }),
    h("span", {}, `${move.power > 0 ? `≈${enemy.intent.damagePreview}` : move.name} › ${where}`));
}

// Aliado que recibirá daño este turno según las intenciones enemigas (incluye área y fila).
function threatBadge(threat) {
  if (!threat) return null;
  return h("div", { class: "threatBadge", title: threat.hits > 1 ? t("Recibe {hits} golpes anunciados", { hits: threat.hits }) : t("Golpe anunciado") },
    `⚠ ${threat.damage}`, threat.hits > 1 ? h("small", {}, `x${threat.hits}`) : null);
}

function previewBadge(state, target) {
  const actor = findPokemon(state, sel.actorUid);
  const move = selectedMove(state);
  if (!actor || !move || target.side !== "enemy" || move.targetSide !== "enemy") return null;
  const { boostPower } = loadFor(state, actor, move);
  const result = previewDamage(state, actor, move, target, boostPower);
  if (!result) return null;
  const mult = result.typeMultiplier;
  const label = mult === 0 ? t("INMUNE") : mult > 1 ? t("x{mult} ¡EFICAZ!", { mult }) : mult < 1 ? t("x{mult} POCO", { mult }) : "x1";
  return h("div", { class: `preview m${mult === 0 ? "0" : mult > 1 ? "up" : mult < 1 ? "down" : "1"}` }, `≈${result.damage}`, h("small", {}, `${label}${result.isSpread ? " · ÁREA" : ""}${target.shield ? ` · ESC ${target.shield}` : ""}`));
}

// Un rival fuera de alcance: hay una técnica cuerpo a cuerpo elegida y la fila frontal lo protege.
function isOutOfReach(state, pokemon) {
  const actor = findPokemon(state, sel.actorUid);
  const move = selectedMove(state);
  if (!actor || !move || pokemon.side !== "enemy" || move.targetSide === "self" || move.targetSide === "ally") return false;
  return move.range === "melee" && !getValidTargets(state, actor, move).some((candidate) => candidate.uid === pokemon.uid);
}

function pokemonTile(ctx, state, pokemon, validSet, threats) {
  const alive = isAlive(pokemon);
  const isPlayer = pokemon.side === "player";
  const classes = ["tile", pokemon.side, alive ? "" : "dead", validSet.has(pokemon.uid) ? "valid" : "", pokemon.uid === sel.actorUid ? "actor" : "", pokemon.uid === sel.targetUid ? "targeted" : "", alive && isPlayer && pokemon.actionsLeft <= 0 ? "acted" : "", alive && isOutOfReach(state, pokemon) ? "outOfReach" : "", alive && isPlayer && threats.has(pokemon.uid) ? "threatened" : ""];
  const loaded = stagedOf(pokemon.uid);
  const canCharge = alive && isPlayer && pokemon.actionsLeft > 0;
  const reviveTarget = !alive && isPlayer && validSet.has(pokemon.uid); // carta Revivir armada
  const clickable = alive || reviveTarget;
  const tile = h("div", {
    class: classes.join(" "), "data-uid": pokemon.uid, "data-drop": alive ? `${isPlayer ? "ally" : "enemy"}:${pokemon.uid}` : isPlayer ? `fallen:${pokemon.uid}` : null,
    title: pokemon.passive ? `${pokemon.passive.name}: ${pokemon.passive.description}` : null,
    role: clickable ? "button" : null, tabindex: clickable ? "0" : null,
    "aria-label": t("{name}, {hp} de {maxHp} PS", { name: pokemon.name, hp: pokemon.hp, maxHp: pokemon.maxHp }),
    onKeyDown: clickable ? (event) => {
      if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onTileClick(ctx, state, pokemon); }
    } : null,
    onClick: clickable ? () => onTileClick(ctx, state, pokemon) : null
  },
    isPlayer && alive ? h("div", { class: "zones" },
      h("div", { class: "zone zCharge", "data-drop": canCharge ? `charge:${pokemon.uid}` : null }, icon("bolt", { scale: 3 }), t("CARGAR")),
      h("div", { class: "zone zGuard", "data-drop": `guard:${pokemon.uid}` }, icon("shield", { scale: 3 }), t("ESCUDO"))) : null,
    loaded.length ? h("button", {
      class: "stagedTag", title: t("Quitar la carga"),
      onClick: (event) => { event.stopPropagation(); delete staged[pokemon.uid]; sfx.play("deny"); ctx.rerender(); }
    }, loaded.map(() => icon("bolt", { scale: 2 }))) : null,
    isPlayer && alive && pokemon.actionsLeft > 0 ? h("div", { class: "readyMark" }, "▼") : null,
    previewBadge(state, pokemon),
    isPlayer && alive ? threatBadge(threats.get(pokemon.uid)) : null,
    alive && isOutOfReach(state, pokemon) ? h("div", { class: "reachNote" }, t("FUERA DE ALCANCE")) : null,
    h("div", { class: "spriteBox" }, h("div", { class: "platform" }), ctx.sprites.element(pokemon.speciesId, { facing: isPlayer ? "back" : "front", spriteKey: `${state.seed}:${pokemon.side}:${pokemon.uid}`, shiny: Boolean(pokemon.shiny) }), pokemon.shiny ? h("span", { class: "shinyMark", title: t("Variocolor") }, "✦") : null),
    h("div", { class: "plate" },
      h("div", { class: "pname" }, pokemon.shiny ? "✦ " : "", pokemon.name, h("small", {}, pokemon.row === "front" ? "F" : "B"), levelTag(pokemonLevel(pokemon), isPlayer ? 0 : referenceLevel(state))),
      pokemon.heldItem ? h("span", { class: "statusTag held", title: `${state.data.heldItems[pokemon.heldItem].name}: ${state.data.heldItems[pokemon.heldItem].description}` }, `◆ ${state.data.heldItems[pokemon.heldItem].name}`) : null,
      pokemon.berryGuard ? h("span", { class: "statusTag berry", title: t("Baya Zidra: aguanta un golpe letal con 1 PS") }, t("BAYA")) : null,
      pokemon.status ? h("span", { class: `statusTag ${pokemon.status}`, title: statusInfo[pokemon.status].hint }, statusInfo[pokemon.status].short) : null,
      h("div", { class: "types" }, pokemon.types.map(typeChip)),
      hpBar(pokemon),
      isPlayer ? null : intentLine(state, pokemon)));
  return tile;
}

function cardIcon(def) {
  if (def.kind === "energy") {
    if (def.boostMultiplier > 1) return [icon("wild", { scale: 4 })];
    return Array.from({ length: def.energyValue }, () => icon("bolt", { scale: 4 }));
  }
  return [icon(cardEffectIcons[def.effects[0]?.type] ?? "star", { scale: 4 })];
}

// Con sprite propio la carta es solo la imagen (marco incluido); sin sprite, el diseño de texto anterior.
function cardView(card, def, { role = "", picked = false, armed = false } = {}) {
  const kindClass = def.kind === "utility" ? "utility" : def.boostMultiplier > 1 ? "wild" : "energy";
  const state = `${picked ? "picked" : ""} ${armed ? "armed" : ""}`;
  if (hasSprite(def)) {
    return h("div", { class: `card sprite ${kindClass} ${state}`, "data-card": card.uid, title: `${def.name}: ${describeCard(def)}` },
      cardImage(def), role ? h("div", { class: "cardRole" }, role) : null);
  }
  return h("div", { class: `card ${kindClass} ${state}`, "data-card": card.uid },
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
  if (sel.mode === "utility") {
    const wantsFallen = state.data.cards[state.deck.hand.find((card) => card.uid === sel.utilityUid)?.cardId]?.target === "fallenAlly";
    return new Set(state.teams.player.filter((pokemon) => isAlive(pokemon) !== wantsFallen).map((pokemon) => pokemon.uid));
  }
  if (sel.mode === "shield") return new Set(state.teams.player.filter(isAlive).map((pokemon) => pokemon.uid));
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
    // En pantallas chicas el menú de técnicas puede quedar fuera de vista: se trae a la vista al elegir.
    requestAnimationFrame(() => document.querySelector(".window.menu")?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
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
  if (!actor || sel.mode !== "attack") {
    const hint = sel.mode === "shield" ? t("Elegí un aliado y cartas de energía.") : sel.mode === "utility" ? t("Elegí a qué aliado aplicarla.") : t("Elegí uno de tus Pokémon.");
    const cancel = sel.mode === "attack" ? null : h("button", { class: "btn mini", onClick: () => { sel.mode = "attack"; sel.utilityUid = null; sel.cardUids = []; sfx.play("deny"); ctx.rerender(); } }, t("◀ VOLVER A TÉCNICAS"));
    return h("div", { class: "menuHint" }, hint, cancel ? h("div", {}, cancel) : null);
  }
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
      h("span", { class: "mname" }, move.name, move.targetMode ? h("small", { class: "areaLabel" }, move.targetMode === "allEnemies" ? t(" · ÁREA") : t(" · FILA")) : null,
        move.range === "melee" ? h("small", { class: "areaLabel meleeLabel", title: t("Cuerpo a cuerpo: solo llega a la fila frontal rival mientras quede alguien en ella") }, t(" · CC")) : null),
      h("span", { class: "chipSlot" }, typeChip(move.type)),
      h("span", { class: `mstat ${bonus ? "buffed" : ""}` }, move.category === "status" ? t("APOYO") : t("POD {bonus}", { bonus: move.power + bonus })),
      h("span", { class: `pips ${cost < move.cost ? "cut" : cost > move.cost ? "up" : ""}`, title: cost !== move.cost ? t("Costo base {cost}", { cost: move.cost }) : null },
        cost === 0 ? h("small", {}, t("LIBRE")) : Array.from({ length: cost }, (_, i) => h("i", { class: i < load.energy ? "on" : "" }))),
      h("span", { class: "mcd" }, cooldown > 0 ? t("ESPERA {cooldown}", { cooldown }) : t("CD {cooldown}", { cooldown: move.cooldown })));
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
        const missing = load.energy < cost ? t(" · falta energía {energy}/{cost}", { energy: load.energy, cost }) : "";
        return (shown ? `${move.name} ≈${shown.damage} x${shown.typeMultiplier}` : move.name) + missing;
      },
      onDrop: (drop) => {
        selectMove(ctx, state, actor, index);
        sel.targetUid = drop.dataset.drop.split(":")[1];
        if (loadFor(state, actor, move).energy < cost) {
          sfx.play("deny");
          ctx.notify(t("Falta energía: cargá {cost} en {name} (arrastrá cartas sobre él).", { cost, name: actor.name }));
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
  let prompt = t("1. Elegí tu Pokémon · 2. Cargá energía · 3. Técnica y objetivo.");
  if (sel.mode === "shield") {
    const amount = sel.cardUids.reduce((total, uid) => {
      const card = state.deck.hand.find((item) => item.uid === uid);
      return total + (card ? state.data.cards[card.cardId].boostMultiplier * state.data.balance.combat.defenseBoostPerCard : 0);
    }, 0);
    prompt = sel.targetUid ? t("Escudo +{amount} a {name}.", { amount, name: findPokemon(state, sel.targetUid).name }) : t("Modo escudo: elegí aliado y cartas.");
  } else if (sel.mode === "utility") prompt = state.data.cards[state.deck.hand.find((card) => card.uid === sel.utilityUid)?.cardId]?.target === "fallenAlly" ? t("¿A quién revivís? Tocá un Pokémon debilitado.") : t("¿A quién aplicás la carta?");
  else if (actor && !move) prompt = t("{name} está listo. Elegí una técnica; las de costo LIBRE no necesitan cartas.", { name: actor.name });
  else if (actor && move) {
    const load = loadFor(state, actor, move);
    const target = sel.targetUid ? findPokemon(state, sel.targetUid) : null;
    const effect = describeEffects(move.effects) ? ` (${describeEffects(move.effects)})` : "";
    const targetsInfo = move.targetMode ? ` · ${move.targetMode === "allEnemies" ? "TODOS LOS RIVALES" : "FILA COMPLETA"}` : "";
    const shortfall = load.energy < load.cost ? t(" · FALTAN {energy} ENERGÍA", { energy: load.cost - load.energy }) : "";
    prompt = [t("{actor}: {move}{effect}{targets} · {energy}/{cost} EN", { actor: actor.name, move: move.name, effect, targets: targetsInfo, energy: load.energy, cost: load.cost }), shortfall,
      load.boost.length ? t(" · +{boostPower} POD", { boostPower: load.boostPower }) : "",
      load.cost === 0 && stagedOf(actor.uid).length ? t(" · LIBRE: no gasta las cartas cargadas") : "",
      target ? ` → ${target.name}` : t(" · ELEGÍ OBJETIVO")].join("");
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
      canShield ? h("button", { class: "btn primary", onClick: () => runAction(ctx, state, playShield(state, { targetUid: sel.targetUid, cardUids: sel.cardUids })) }, t("APLICAR ESCUDO")) : null,
      canFire && sel.mode === "attack" ? h("button", { class: "btn primary", onClick: () => fireMove(ctx, state) }, t("¡USAR!")) : null));
}

function handView(ctx, state) {
  const count = state.deck.hand.length;
  const playable = state.phase === "player" && !state.result;

  return h("div", { class: "hand" }, state.deck.hand.map((card, index) => {
    const def = state.data.cards[card.cardId];
    const picked = sel.cardUids.includes(card.uid);
    const owner = stagedOwner(card.uid);
    const role = owner ? findPokemon(state, owner).name.slice(0, 8).toUpperCase() : picked ? t("ESCUDO") : "";
    const element = cardView(card, def, { role, picked: picked || Boolean(owner), armed: sel.utilityUid === card.uid });
    const offset = index - (count - 1) / 2;
    element.style.setProperty("--rot", `${(offset * Math.min(3, 18 / Math.max(count, 1))).toFixed(1)}deg`);
    element.style.setProperty("--lift", `${Math.abs(offset) * 2}px`);
    if (!playable) return element;

    const onCardClick = () => {
      if (def.kind === "utility") {
        const needsTarget = def.target === "ally" || def.target === "fallenAlly";
        if (def.target === "fallenAlly" && state.teams.player.every(isAlive)) {
          sfx.play("deny");
          return ctx.notify(t("Ningún Pokémon está debilitado."));
        }
        if (def.target === "drawPile") {
          if (state.deck.drawPile.length === 0) { sfx.play("deny"); return ctx.notify(errorText.emptyDrawPile); }
          searchCardUid = card.uid;
          sfx.play("pick");
          return ctx.rerender();
        }
        if (needsTarget && sel.mode === "utility" && sel.utilityUid === card.uid) {
          sel.mode = "attack"; // tocar de nuevo la carta armada la cancela
          sel.utilityUid = null;
          sfx.play("deny");
          return ctx.rerender();
        }
        if (needsTarget) {
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
        return ctx.notify(t("Elegí un Pokémon (o arrastrá la carta sobre él) para cargarla."));
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
    if (hasSprite(def)) {
      attachCardHold(element, def);
      element.addEventListener("click", () => showCardName(element, def));
    }
    element.addEventListener("click", onCardClick);
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onCardClick(); }
    });

    attachDrag(element, {
      kind: def.kind === "utility" ? "utility" : "energy",
      isValid: (drop) => {
        const [kind] = drop.dataset.drop.split(":");
        if (def.kind === "utility") return def.target === "ally" ? kind === "ally" : def.target === "fallenAlly" ? kind === "fallen" : def.target === "drawPile" ? false : kind === "field";
        if (kind === "guard" || kind === "charge") return true;
        return kind === "move" && Boolean(findPokemon(state, sel.actorUid));
      },
      hint: (drop) => {
        const [kind, uid] = drop.dataset.drop.split(":");
        if (def.kind === "utility") return def.name;
        if (kind === "guard") return t("Escudo +{defenseBoostPerCard} a {name}", { defenseBoostPerCard: def.boostMultiplier * state.data.balance.combat.defenseBoostPerCard, name: findPokemon(state, uid).name });
        const actor = kind === "charge" ? findPokemon(state, uid) : findPokemon(state, sel.actorUid);
        return t("Cargar en {name} ({uid}/{actor})", { name: actor.name, uid: stagedOf(actor.uid).length + 1, actor: stageCap(state, actor) });
      },
      onDrop: (drop) => {
        const [kind, uid] = drop.dataset.drop.split(":");
        if (def.kind === "utility") {
          sfx.play("card");
          return runAction(ctx, state, playUtility(state, { cardUid: card.uid, targetUid: def.target === "ally" || def.target === "fallenAlly" ? uid : null }));
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

// Buscador: lista la pila de robo (agrupada por carta) y lleva la elegida a la mano.
function searchModal(ctx, state) {
  const groups = new Map();
  for (const card of state.deck.drawPile) {
    const entry = groups.get(card.cardId) ?? { cardId: card.cardId, uid: card.uid, count: 0 };
    entry.count += 1;
    groups.set(card.cardId, entry);
  }
  const close = () => { searchCardUid = null; sfx.play("deny"); ctx.rerender(); };
  return h("div", { class: "overlay searchOverlay", onClick: (event) => { if (event.target === event.currentTarget) close(); } },
    h("div", { class: "window dialogBig searchWindow", role: "dialog", "aria-label": t("Buscar una carta en el mazo") },
      h("h2", {}, icon("lupa", { scale: 4 }), t(" BUSCADOR")),
      h("p", { class: "muted" }, t("Elegí una carta del mazo ({length} restantes) y pasa a tu mano.", { length: state.deck.drawPile.length })),
      h("div", { class: "searchList" }, [...groups.values()].sort((a, b) => state.data.cards[a.cardId].name.localeCompare(state.data.cards[b.cardId].name)).map((entry) => {
        const def = state.data.cards[entry.cardId];
        return h("button", { class: "searchItem", onClick: () => {
          const cardUid = searchCardUid;
          searchCardUid = null;
          sfx.play("card");
          runAction(ctx, state, playUtility(state, { cardUid, targetUid: null, searchCardUid: entry.uid }));
          ctx.rerender();
        } }, h("span", { class: "searchArt" }, hasSprite(def) ? cardImage(def, "cardImg listImg") : cardIcon(def).slice(0, 1)), h("strong", {}, `${def.name} ×${entry.count}`), h("small", {}, describeCard(def)));
      })),
      h("button", { class: "btn", onClick: close }, t("CANCELAR"))));
}

// Terminar el turno con Pokémon sin actuar pide una segunda pulsación (evita un toque accidental, sobre todo en móvil).
const endTurnWindowMs = 2400;
let endTurnArmedAt = 0;
const endTurnArmed = () => Date.now() - endTurnArmedAt < endTurnWindowMs;

function endTurnClicked(ctx, state, readyCount) {
  if (readyCount > 0 && !endTurnArmed()) {
    endTurnArmedAt = Date.now();
    sfx.play("deny");
    ctx.notify(readyCount === 1 ? t("Todavía hay 1 Pokémon sin actuar. Tocá de nuevo para terminar el turno.") : t("Todavía hay {readyCount} Pokémon sin actuar. Tocá de nuevo para terminar el turno.", { readyCount }));
    return ctx.rerender();
  }
  endTurnArmedAt = 0;
  sfx.play("select");
  runAction(ctx, state, endPlayerTurn(state));
}

const isOptionalEventKind = (run) => ["rival", "villain", "legendary"].includes(run.node?.type);

function pile(label, amount) {
  return h("div", { class: "pile" }, h("div", { class: "pileBack" }, icon("cards", { scale: 3 })), h("small", {}, `${label} ${amount}`));
}

// Pausa antes del cartel de victoria/derrota para que terminen las animaciones del último golpe.
const resultDelayMs = 1800;
const resultSeen = { ref: null, at: 0, timer: null };

function resultOverlayReady(ctx, state) {
  if (!state.result) return false;
  if (resultSeen.ref !== state) {
    Object.assign(resultSeen, { ref: state, at: Date.now() });
    clearTimeout(resultSeen.timer);
    resultSeen.timer = null;
  }
  const remaining = resultDelayMs - (Date.now() - resultSeen.at);
  if (remaining <= 0) return true;
  if (!resultSeen.timer) resultSeen.timer = setTimeout(() => { resultSeen.timer = null; if (ctx.run?.combat === state) ctx.rerender(); }, remaining + 30);
  return false;
}

export function renderCombat(ctx) {
  const { run } = ctx;
  const state = run.combat;
  if (sel.ref !== state) resetSelection(state);
  sanitizeSelection(state);

  const valid = validTargetUids(state);
  const threats = getIncomingThreats(state);
  const row = (side, rowName) => h("div", { class: `row ${side}` }, state.teams[side].filter((pokemon) => pokemon.row === rowName).map((pokemon) => pokemonTile(ctx, state, pokemon, valid, threats)));
  const finished = Boolean(state.result);
  const kindNames = { normal: t("RUTA"), gym: t("GIMNASIO"), eliteFour: t("ALTO MANDO"), champion: t("CAMPEÓN"), amelie: t("AMELIE"), gardevoir: t("GARDEVOIR") };

  const readyCount = state.teams.player.filter((pokemon) => isAlive(pokemon) && pokemon.actionsLeft > 0).length;
  return h("section", { class: "combat" },
    h("div", { class: "combatCoach" },
      h("div", { class: "coachHeader" },
        h("span", {}, icon("star", { scale: 2 }), t(" TURNO TÁCTICO"), h("small", {}, t(" · {readyCount} Pokémon por actuar", { readyCount }))),
        h("button", { class: "btn mini", "aria-expanded": helpExpanded, onClick: () => { helpExpanded = !helpExpanded; ctx.rerender(); } }, helpExpanded ? t("OCULTAR GUÍA −") : t("¿CÓMO JUGAR? +"))),
      helpExpanded ? h("div", { class: "coachSteps" },
        h("span", {}, h("b", {}, "1"), t(" Seleccioná un aliado")),
        h("span", {}, h("b", {}, "2"), t(" Cargá energía (solo si cuesta)")),
        h("span", {}, h("b", {}, "3"), t(" Técnica → objetivo → ¡USAR!")),
        h("small", {}, t("LIBRE no gasta cartas · ÁREA alcanza a todos · FILA golpea a una fila · CC (cuerpo a cuerpo) solo llega a la fila frontal rival · ⚠ marca el daño que recibirá un aliado · VEN y QUE hacen daño por turno, PAR puede anular una acción; se curan con ítems."))) : null),
    h("header", { class: "hud" },
      h("span", {}, t("TURNO {turn}", { turn: state.turn })), h("span", { class: "kind" }, kindNames[state.kind] ?? state.kind),
      h("span", {}, state.luckyCoins ? h("span", { class: "luckyHud", title: t("Cada moneda quita una moneda al próximo tiro de crítico (más chance). Se gasta al atacar.") }, icon("clover", { scale: 2 }), t(" SUERTE x{luckyCoins}", { luckyCoins: state.luckyCoins })) : "")),
    state.modifiers.length ? h("div", { class: "modifiers" }, state.modifiers.map((modifier) =>
      h("span", { class: `modChip ${modifier.kind}`, title: t("{label}: quedan {turnsLeft} turno(s)", { label: modifier.label, turnsLeft: modifier.turnsLeft }) },
        `${modifier.label} ${modifier.kind === "cost" ? modifier.amount : `+${modifier.amount} POD`} · ${modifier.turnsLeft}T`))) : null,
    h("div", { class: "field", "data-drop": "field" },
      h("div", { class: "side enemySide" }, row("enemy", "front"), row("enemy", "back")),
      h("div", { class: "side playerSide" }, row("player", "front"), row("player", "back"))),
    h("div", { class: "bottom" },
      dialogBox(ctx, state),
      h("div", { class: "window menu" }, h("div", { class: "menuTitle" }, t("TÉCNICAS")), movesMenu(ctx, state))),
    h("div", { class: "handRow" },
      pile(t("MAZO"), state.deck.drawPile.length),
      handView(ctx, state),
      h("div", { class: "handSide" },
        pile(t("DESC."), state.deck.discardPile.length),
        h("button", { class: `btn ${sel.mode === "shield" ? "on" : ""}`, onClick: () => { sel.mode = sel.mode === "shield" ? "attack" : "shield"; clearChoice(); sfx.play("select"); ctx.rerender(); } }, t("ESCUDO")),
        h("button", { class: "btn danger", disabled: finished, title: readyCount ? t("{readyCount} Pokémon todavía pueden actuar", { readyCount }) : t("Resolver acciones enemigas"), onClick: () => endTurnClicked(ctx, state, readyCount) },
          readyCount && endTurnArmed() ? t("¿SEGURO? ▶") : readyCount ? t("FIN TURNO ({readyCount}) ▶", { readyCount }) : t("FIN TURNO ▶")))),
    searchCardUid && !finished ? searchModal(ctx, state) : null,
    finished && resultOverlayReady(ctx, state) ? h("div", { class: "overlay" }, h("div", { class: "window dialogBig" },
      h("h2", { class: state.result === "victory" ? "win" : "lose" }, state.result === "victory" ? t("¡VICTORIA!") : isOptionalEventKind(ctx.run) ? t("¡TE RETIRAS!") : t("DERROTA")),
      state.result !== "victory" && isOptionalEventKind(ctx.run) ? h("p", { class: "muted" }, t("Es un evento: no pierdes la partida. Tu equipo vuelve como estaba, sin recompensas.")) : null,
      h("button", { class: "btn primary", onClick: () => ctx.onCombatFinished() }, t("CONTINUAR ▶")))) : null);
}
