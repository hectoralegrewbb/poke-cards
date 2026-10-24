// Jugador automático "razonable" para simulaciones de balance (no es parte del juego).
// A diferencia de greedyPlayer.js usa lo que usaría una persona: refuerza ataques con energía,
// protege con escudos a quien está por caer, juega utilidades y evita tirar cartas útiles.
import {
  calculateMoveDamage, choosePayCards, endPlayerTurn, getIncomingThreats, getLiving, getMoveCost, getMoveTargets, getPowerBonus,
  getValidTargets, isAlive, playMove, playShield, playUtility
} from "../engine/index.js";

const RESERVE_CARDS = 2; // energía que prefiere guardar para el turno siguiente
const MIN_BOOST_GAIN = 2.5; // daño extra mínimo para que un refuerzo valga una carta

const cardsOf = (state) => state.data.cards;
const isEnergy = (state, card) => cardsOf(state)[card.cardId].playModes.includes("pay");

function energyInHand(state) {
  return state.deck.hand.filter((card) => isEnergy(state, card));
}

// uid -> daño anunciado (incluye área y fila).
function incomingDamage(state) {
  return new Map([...getIncomingThreats(state)].map(([uid, entry]) => [uid, entry.damage]));
}

function estimate(state, actor, move, target, boostPower = 0) {
  const hits = getMoveTargets(state, actor, move, target);
  let damage = 0;
  let kills = 0;
  for (const defender of hits) {
    const result = calculateMoveDamage({
      attacker: actor, defender, move, boostPower: boostPower + getPowerBonus(state, actor, move), isCrit: false,
      balance: state.data.balance, typeChart: state.data.typeChart, targetCount: hits.length
    });
    const effective = Math.min(result.damage, defender.hp + defender.shield);
    damage += effective;
    if (result.damage >= defender.hp + defender.shield) kills += 1;
  }
  return { damage, kills };
}

function listOptions(state, actor, spendable) {
  const options = [];
  actor.moves.forEach((moveId, moveIndex) => {
    const move = state.data.moves[moveId];
    if (actor.cooldowns[moveIndex] > 0) return;
    const cost = getMoveCost(state, actor, move);
    if (cost > spendable) return;
    if (move.power > 0) {
      for (const target of getValidTargets(state, actor, move)) {
        const { damage, kills } = estimate(state, actor, move, target);
        options.push({ moveIndex, move, target, cost, damage, kills, score: damage + kills * 8 - cost * 1.2 });
      }
    } else if (move.targetSide === "enemy" && move.effects?.some((effect) => effect.type === "status")) {
      for (const target of getValidTargets(state, actor, move)) {
        if (target.status) continue;
        options.push({ moveIndex, move, target, cost, damage: 0, kills: 0, score: 3 - cost * 1.2 });
      }
    }
  });
  return options.sort((a, b) => b.score - a.score);
}

// Cartas mínimas que cubren el costo (null si la energía en mano no alcanza).
function pickPayCards(state, cost) {
  const { pay, energy } = choosePayCards(cardsOf(state), energyInHand(state), cost);
  return energy >= cost ? pay : null;
}

function playUtilityCards(state) {
  const defs = cardsOf(state);
  const incoming = incomingDamage(state);
  const allies = () => getLiving(state, "player");
  const play = (card, targetUid = null) => playUtility(state, { cardUid: card.uid, targetUid }).ok;
  for (const card of [...state.deck.hand]) {
    const id = card.cardId;
    if (defs[id].kind !== "utility") continue;
    if (id === "insight" && state.deck.hand.length <= 8) play(card);
    else if (id === "luckyCoin" && state.luckyCoins < 2) play(card);
    else if (id === "potion") {
      const target = allies().filter((p) => p.maxHp - p.hp >= 12).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (target && target.hp / target.maxHp <= 0.6) play(card, target.uid);
    } else if (id === "barrier") {
      const target = allies().filter((p) => (incoming.get(p.uid) ?? 0) > 0)
        .sort((a, b) => (incoming.get(b.uid) ?? 0) - (incoming.get(a.uid) ?? 0))[0];
      if (target) play(card, target.uid);
    } else if (id === "recharge" && state.deck.hand.length <= 8) play(card);
    else if (id === "focus" && energyInHand(state).length >= 2 && allies().some((p) => p.actionsLeft > 0)) play(card);
    else if (id === "haste" && energyInHand(state).length >= 3 && allies().some((p) => p.actionsLeft > 0)) play(card);
    else if (id === "remedy") {
      const target = allies().find((p) => p.status);
      if (target) play(card, target.uid);
    } else if (id === "revive") {
      const fallen = state.teams.player.find((p) => !isAlive(p));
      if (fallen) play(card, fallen.uid);
    } else if (id === "sitrusBerry") {
      const target = allies().filter((p) => !p.berryGuard).sort((a, b) => (incoming.get(b.uid) ?? 0) - (incoming.get(a.uid) ?? 0))[0];
      if (target && (incoming.get(target.uid) ?? 0) > 0) play(card, target.uid);
    } else if (id === "quickStep") {
      const target = allies().find((p) => p.actionsLeft > 0 && p.cooldowns.some((c, i) => c > 0 && state.data.moves[p.moves[i]].power >= 7));
      if (target) play(card, target.uid);
    }
  }
}

function shieldThreatened(state, force) {
  const defs = cardsOf(state);
  const incoming = incomingDamage(state);
  const perCard = state.data.balance.combat.defenseBoostPerCard;
  const targets = getLiving(state, "player")
    .map((pokemon) => ({ pokemon, need: (incoming.get(pokemon.uid) ?? 0) - (pokemon.hp + pokemon.shield) + 1 }))
    .filter((entry) => entry.need > 0 || (force && (incoming.get(entry.pokemon.uid) ?? 0) > entry.pokemon.hp * 0.5))
    .sort((a, b) => b.need - a.need);
  for (const { pokemon, need } of targets) {
    const available = energyInHand(state).sort((a, b) => defs[b.cardId].boostMultiplier - defs[a.cardId].boostMultiplier);
    const chosen = [];
    let amount = 0;
    const target = Math.max(need, perCard);
    for (const card of available) {
      if (amount >= target || chosen.length >= 3) break;
      chosen.push(card.uid);
      amount += defs[card.cardId].boostMultiplier * perCard;
    }
    // Solo vale la pena si el escudo evita realmente la caída.
    if (chosen.length && (need <= 0 || amount >= need)) playShield(state, { targetUid: pokemon.uid, cardUids: chosen });
  }
}

export function playSmartTurn(state) {
  if (state.phase !== "player") return;
  playUtilityCards(state);

  const incoming = incomingDamage(state);
  const totalIncoming = [...incoming.values()].reduce((sum, value) => sum + value, 0);
  const partyHp = getLiving(state, "player").reduce((sum, pokemon) => sum + pokemon.hp + pokemon.shield, 0);
  const pressed = totalIncoming >= partyHp * 0.5;
  const reserve = pressed || state.deck.hand.length >= 8 ? 0 : RESERVE_CARDS;
  const defs = cardsOf(state);

  const acted = new Set();
  let progress = true;
  while (progress && state.phase === "player") {
    progress = false;
    const spendable = Math.max(0, energyInHand(state).length - reserve);
    let best = null;
    for (const actor of getLiving(state, "player")) {
      if (actor.actionsLeft <= 0 || acted.has(actor.uid)) continue;
      const options = listOptions(state, actor, Math.max(spendable, 0));
      if (options[0] && (!best || options[0].score > best.option.score)) best = { actor, option: options[0] };
    }
    if (!best) {
      // Sin opciones dentro de la reserva: gasta lo que haga falta si nadie puede actuar de otra forma.
      for (const actor of getLiving(state, "player")) {
        if (actor.actionsLeft <= 0 || acted.has(actor.uid)) continue;
        const options = listOptions(state, actor, energyInHand(state).length);
        if (options[0] && options[0].score > 0 && (!best || options[0].score > best.option.score)) best = { actor, option: options[0] };
      }
    }
    if (!best) break;

    const { actor, option } = best;
    const pay = pickPayCards(state, option.cost);
    if (!pay) { acted.add(actor.uid); progress = true; continue; }
    const payUids = new Set(pay.map((card) => card.uid));

    // Refuerzo: cada carta adicional suma poder si el golpe lo justifica.
    const boost = [];
    if (option.move.power > 0) {
      const spareBudget = Math.max(0, energyInHand(state).length - pay.length - reserve);
      const candidates = energyInHand(state).filter((card) => !payUids.has(card.uid))
        .sort((a, b) => defs[b.cardId].boostMultiplier - defs[a.cardId].boostMultiplier);
      let boostPower = 0;
      let current = estimate(state, actor, option.move, option.target, 0);
      for (const card of candidates) {
        if (boost.length >= Math.min(spareBudget, state.data.balance.combat.maxBoostCardsPerAttack)) break;
        const next = boostPower + defs[card.cardId].boostMultiplier * state.data.balance.combat.attackBoostPerCard;
        const after = estimate(state, actor, option.move, option.target, next);
        if (after.damage - current.damage >= MIN_BOOST_GAIN || after.kills > current.kills) {
          boost.push(card);
          boostPower = next;
          current = after;
        }
      }
    }

    const result = playMove(state, {
      pokemonUid: actor.uid, moveIndex: option.moveIndex, targetUid: option.target.uid,
      payCardUids: pay.map((card) => card.uid), boostCardUids: boost.map((card) => card.uid)
    });
    acted.add(actor.uid);
    if (result.ok) progress = true;
  }

  if (state.phase === "player") {
    shieldThreatened(state, pressed);
    // Quien puede actuar y no tiene mejor opción usa cualquier técnica gratuita para no perder el turno.
    for (const actor of getLiving(state, "player")) {
      if (state.phase !== "player") return;
      if (actor.actionsLeft <= 0) continue;
      const options = listOptions(state, actor, 0);
      if (options[0]) playMove(state, { pokemonUid: actor.uid, moveIndex: options[0].moveIndex, targetUid: options[0].target.uid, payCardUids: [], boostCardUids: [] });
    }
  }
  if (state.phase === "player") endPlayerTurn(state);
}

