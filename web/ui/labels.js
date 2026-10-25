import { t } from "../../src/shared/i18n.js";
// Textos y colores de la interfaz. Todo lo visible en español vive acá.
export const typeColors = {
  normal: "#a8a77a", fire: "#ee8130", water: "#6390f0", electric: "#f7d02c", grass: "#7ac74c",
  ice: "#96d9d6", fighting: "#c22e28", poison: "#a33ea1", ground: "#e2bf65", flying: "#a98ff3",
  psychic: "#f95587", bug: "#a6b91a", rock: "#b6a136", ghost: "#735797", dragon: "#6f35fc",
  dark: "#705746", steel: "#b7b7ce"
};

export const typeNames = {
  normal: t("Normal"), fire: t("Fuego"), water: t("Agua"), electric: t("Eléctrico"), grass: t("Planta"), ice: t("Hielo"),
  fighting: t("Lucha"), poison: t("Veneno"), ground: t("Tierra"), flying: t("Volador"), psychic: t("Psíquico"), bug: t("Bicho"),
  rock: t("Roca"), ghost: t("Fantasma"), dragon: t("Dragón"), dark: t("Siniestro"), steel: t("Acero")
};

export const nodeLabels = {
  combat: { title: t("Combate"), text: t("1-3 rivales. Oro y una carta.") },
  wild: { title: t("Zona salvaje"), text: t("1-2 salvajes. Podés capturar uno.") },
  elite: { title: t("Élite"), text: t("3 rivales fuertes. Más oro y un ítem.") },
  camp: { title: t("Campamento"), text: t("Descansar, revivir o entrenar.") },
  shop: { title: t("Tienda"), text: t("Gastá tu oro en ítems y cartas.") },
  gym: { title: t("Gimnasio"), text: t("Equipo del líder. Medalla, evolución desbloqueable e ítem raro.") },
  eliteFour: { title: t("Alto Mando"), text: t("5 rivales. Sin descanso.") },
  champion: { title: t("Campeón"), text: t("6 rivales. El combate final.") },
  legendary: { title: t("Encuentro legendario"), text: t("Derrotalo para tener una captura garantizada.") },
  rival: { title: t("Duelo con el rival"), text: t("Tu rival reaparece con un nuevo equipo.") },
  villain: { title: t("Conflicto regional"), text: t("Enfrentate a la organización rival de esta región.") },
  pokeCenter: { title: t("Centro Pokémon"), text: t("La enfermera Joy cura y revive a todo tu equipo.") }
};

// Estados alterados: etiqueta corta (casillero y panel de equipo) y explicación (tooltip).
export const statusInfo = {
  poison: { short: t("VEN"), hint: t("Envenenado: pierde PS cada turno") },
  burn: { short: t("QUE"), hint: t("Quemado: pierde PS y baja su ataque físico") },
  paralysis: { short: t("PAR"), hint: t("Parálisis: 25% de perder la acción por turno") }
};

export const errorText = {
  notPlayerTurn: t("No es tu turno."),
  unknownPokemon: t("Pokémon desconocido."),
  pokemonFainted: t("Ese Pokémon está debilitado."),
  noActionsLeft: t("Ese Pokémon ya actuó este turno."),
  invalidMoveIndex: t("Movimiento inválido."),
  moveOnCooldown: t("Ese movimiento está en cooldown."),
  invalidTarget: t("Objetivo inválido para ese movimiento."),
  cardsNotInHand: t("Esas cartas no están en tu mano."),
  cardNotAllowed: t("Esa carta no se puede usar así."),
  tooManyBoostCards: t("Demasiadas cartas de refuerzo."),
  boostNotApplicable: t("Ese movimiento no se puede reforzar."),
  insufficientEnergy: t("Falta energía para pagar el movimiento."),
  deckFull: t("El mazo activo está lleno (máx. 45). Mové una carta al cofre primero."),
  deckInvalid: t("Tu mazo activo debe tener entre 40 y 45 cartas para salir. Abrí MAZO y ajustalo."),
  cardNotInDeck: t("Esa carta no está en el mazo."),
  cardNotInChest: t("Esa carta no está en el cofre."),
  notDuringCombat: t("No se puede editar el mazo en combate."),
  noItem: t("No tenés ese ítem."),
  noEffect: t("No tendría ningún efecto."),
  notEnoughGold: t("No te alcanza el oro."),
  invalidStock: t("Ya no está disponible."),
  copyLimit: t("Ya tenés el máximo de copias de esa carta en el mazo activo (2)."),
  emptyDrawPile: t("No quedan cartas en el mazo para buscar."),
  invalidSearchTarget: t("Elegí una carta de tu mazo."),
  notOwned: t("Todavía no tenés ese objeto."),
  alreadyOwned: t("Ya tenés ese objeto: cada uno es único."),
  notLearnable: t("Ese Pokémon no puede aprender esa técnica."),
  notEnoughStars: t("Te faltan Piezas de estrella."),
  notInCamp: t("El tutor solo está en los campamentos.")
};

// Ícono de arte para cada tipo de efecto de carta (compartido por la mano y la pantalla de recompensas).
export const cardEffectIcons = Object.freeze({
  drawCards: "cards", heal: "heart", shield: "shield", reduceCooldown: "clock", luckyCoin: "clover",
  addCards: "bolt", powerModifier: "sword", costModifier: "star", cureStatus: "potion",
  revive: "revive", berryGuard: "sitrusBerry", searchDeck: "lupa"
});

export function describeCard(card) {
  if (card.kind === "energy") {
    const parts = [card.fillsAnyCost ? t("Paga cualquier técnica") : t("Energía {energyValue}", { energyValue: card.energyValue })];
    if (card.boostMultiplier > 1) parts.push(t("refuerzo x{boostMultiplier}", { boostMultiplier: card.boostMultiplier }));
    if (card.maxInDeck) parts.push(t("Máx. {maxInDeck} en el mazo", { maxInDeck: card.maxInDeck }));
    return parts.join(" · ");
  }
  return card.effects
    .map((effect) => {
      const labels = {
        drawCards: t("Robás {amount}", { amount: effect.amount }),
        heal: t("Curás {amount} PS", { amount: effect.amount }),
        shield: t("Escudo {amount}", { amount: effect.amount }),
        reduceCooldown: t("-{amount} cooldown", { amount: effect.amount }),
        luckyCoin: t("Próx. ataque: más chance de crítico"),
        addCards: t("Recibís {amount} energía", { amount: effect.amount }),
        powerModifier: t("POD +{amount} este turno", { amount: effect.amount }),
        costModifier: t("Costos {amount} este turno", { amount: effect.amount }),
        cureStatus: t("Cura el estado"),
        revive: t("Revive a un aliado con {hpFraction}% de PS", { hpFraction: Math.round((effect.hpFraction ?? 0.5) * 100) }),
        berryGuard: t("Si recibe un golpe letal, queda con 1 PS (una vez por combate)"),
        searchDeck: t("Buscás 1 carta de tu mazo y la tomás. Máx. 2 en el mazo")
      };
      return labels[effect.type] ?? effect.type;
    })
    .join(" · ");
}

const categoryNames = { physical: t("físico"), special: "especial" };

// Texto corto de lo que hace una lista de efectos (movimientos de apoyo, pasivas).
export function describeEffects(effects = []) {
  return effects.map((effect) => {
    const who = effect.target === "allAllies" ? t(" al equipo") : "";
    switch (effect.type) {
      case "status": return `${effect.status === "poison" ? "Envenena" : effect.status === "burn" ? "Quema" : effect.status === "paralysis" ? "Paraliza" : "Retrocede"} ${Math.round((effect.chance ?? 1) * 100)}%`;
      case "heal": return t("Cura {amount} PS{who}", { amount: effect.amount, who });
      case "shield": return t("Escudo {amount}{who}", { amount: effect.amount, who });
      case "reduceCooldown": return t("-{amount} cooldown", { amount: effect.amount }) + (effect.target === "allAllies" ? t(" a todo el equipo") : "");
      case "drawCards": return t("Robás {amount}", { amount: effect.amount });
      case "luckyCoin": return t("Tu próximo ataque tiene el doble de chance de crítico");
      case "addCards": return t("+{amount} energías a la mano", { amount: effect.amount });
      case "costModifier": return t("Técnicas {sign}{amount} costo · {turns} turnos", { sign: effect.amount < 0 ? "-" : "+", amount: Math.abs(effect.amount), turns: effect.turns });
      case "powerModifier": return t("+{amount} poder {category} · {turns} turnos", { amount: effect.amount, category: categoryNames[effect.category] ?? "", turns: effect.turns }).replace("  ", " ");
      default: return effect.type;
    }
  }).join(" + ");
}

export function describeStatic(modifiers = []) {
  return modifiers.map((modifier) => {
    const scope = [modifier.category ? categoryNames[modifier.category] : null, modifier.maxCost === 0 ? t("sin costo") : null, modifier.minCost ? t("costo {minCost}+", { minCost: modifier.minCost }) : null].filter(Boolean).join(" ");
    return `${modifier.kind === "cost" ? "Costo" : "Poder"} ${modifier.amount > 0 ? "+" : ""}${modifier.amount}${scope ? ` (${scope})` : ""}`;
  }).join(", ");
}

// Convierte un evento del motor en una línea de log. names: uid -> nombre.
export function formatEvent(event, { names, data }) {
  const name = (uid) => names[uid] ?? uid;
  const move = (id) => data.moves[id]?.name ?? id;
  switch (event.type) {
    case "turnStarted": return null;
    case "moveUsed": return t("{actorId} usó {moveId}.", { actorId: name(event.actorId), moveId: move(event.moveId) });
    case "damage": {
      const notes = [];
      if (event.isCrit) notes.push(t("¡crítico!"));
      if (event.typeMultiplier === 0) notes.push(t("no afecta"));
      else if (event.typeMultiplier !== 1) notes.push((event.typeMultiplier > 1 ? t("muy eficaz x{mult}", { mult: event.typeMultiplier }) : t("poco eficaz x{mult}", { mult: event.typeMultiplier })));
      if (event.stab) notes.push(t("STAB"));
      if (event.boostPower > 0) notes.push(t("+{boostPower} refuerzo", { boostPower: event.boostPower }));
      return (notes.length ? t("{target} recibe {amount} de daño ({notes}).", { target: name(event.targetId), amount: event.amount, notes: notes.join(", ") }) : t("{target} recibe {amount} de daño.", { target: name(event.targetId), amount: event.amount }));
    }
    case "statusApplied": return t("{target}: {state}", { target: name(event.targetId), state: event.status === "burn" ? t("¡quemado!") : event.status === "poison" ? t("¡envenenado!") : event.status === "paralysis" ? t("¡paralizado!") : t("¡puede retroceder!") });
    case "statusDamage": return t("{target} pierde {amount} PS por {cause}.", { target: name(event.targetId), amount: event.amount, cause: event.status === "poison" ? t("veneno") : t("quemadura") });
    case "moveImmune": return t("{targetId} es inmune a {moveId}.", { targetId: name(event.targetId), moveId: move(event.moveId) });
    case "flinched": return t("¡{targetId} retrocedió y no pudo actuar!", { targetId: name(event.targetId) });
    case "paralyzed": return t("¡{targetId} está paralizado y no puede moverse!", { targetId: name(event.targetId) });
    case "fainted": return t("{pokemonId} se debilitó.", { pokemonId: name(event.pokemonId) });
    case "healed": return t("{targetId} recupera {amount} PS.", { targetId: name(event.targetId), amount: event.amount });
    case "shieldGained": return t("{targetId} gana {amount} de escudo.", { targetId: name(event.targetId), amount: event.amount });
    case "cardsDrawn": return event.count > 0 ? (event.source === "effect" ? t("Recibís {count} carta(s).", { count: event.count }) : t("Robás {count} carta(s).", { count: event.count })) : null;
    case "modifierAdded": return (event.kind === "cost" ? t("{label}: costos {amount} por {turns} turnos.", { label: event.label, amount: event.amount, turns: event.turns }) : t("{label}: poder +{amount} por {turns} turnos.", { label: event.label, amount: event.amount, turns: event.turns }));
    case "modifierExpired": return t("{label} terminó.", { label: event.label });
    case "cooldownReduced": return t("{targetId}: -{amount} de cooldown.", { targetId: name(event.targetId), amount: event.amount });
    case "luckyCoinGained": return t("Ganás una moneda de la suerte: tu próximo ataque crítica con más chance.");
    case "statusCured": return t("{targetId} se curó del estado.", { targetId: name(event.targetId) });
    case "revivedInCombat": return t("¡{targetId} volvió a la batalla con {hp} PS!", { targetId: name(event.targetId), hp: event.hp });
    case "berryReady": return t("{targetId} se aferra a una Baya Zidra.", { targetId: name(event.targetId) });
    case "berrySaved": return (event.by === "sash" ? t("¡{target} aguantó con la Banda Focus y quedó con 1 PS!", { target: name(event.targetId) }) : t("¡{target} aguantó con la Baya Zidra y quedó con 1 PS!", { target: name(event.targetId) }));
    case "heldTriggered": return `${name(event.pokemonId)}: ${event.name}.`;
    case "recoil": return t("{targetId} pierde {amount} PS.", { targetId: name(event.targetId), amount: event.amount });
    case "cardSearched": return t("Buscás en tu mazo: {cardId} a la mano.", { cardId: data.cards[event.cardId]?.name ?? event.cardId });
    case "passiveTriggered": return `${name(event.pokemonId)}: ${event.name}.`;
    case "enemySkipped": return t("{actorId} no puede actuar.", { actorId: name(event.actorId) });
    case "expAwarded": return t("Tu equipo gana {amount} EXP.", { amount: event.amount });
    case "combatEnded": return event.result === "victory" ? t("¡Victoria!") : t("Derrota...");
    default: return null;
  }
}
