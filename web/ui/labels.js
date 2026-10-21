// Textos y colores de la interfaz. Todo lo visible en español vive acá.
export const typeColors = {
  normal: "#a8a77a", fire: "#ee8130", water: "#6390f0", electric: "#f7d02c", grass: "#7ac74c",
  ice: "#96d9d6", fighting: "#c22e28", poison: "#a33ea1", ground: "#e2bf65", flying: "#a98ff3",
  psychic: "#f95587", bug: "#a6b91a", rock: "#b6a136", ghost: "#735797", dragon: "#6f35fc",
  dark: "#705746", steel: "#b7b7ce"
};

export const typeNames = {
  normal: "Normal", fire: "Fuego", water: "Agua", electric: "Eléctrico", grass: "Planta", ice: "Hielo",
  fighting: "Lucha", poison: "Veneno", ground: "Tierra", flying: "Volador", psychic: "Psíquico", bug: "Bicho",
  rock: "Roca", ghost: "Fantasma", dragon: "Dragón", dark: "Siniestro", steel: "Acero"
};

export const nodeLabels = {
  combat: { title: "Combate", text: "1-3 rivales. Oro y una carta." },
  wild: { title: "Zona salvaje", text: "1-2 salvajes. Podés capturar uno." },
  elite: { title: "Élite", text: "3 rivales fuertes. Más oro y un ítem." },
  camp: { title: "Campamento", text: "Descansar, revivir o entrenar." },
  shop: { title: "Tienda", text: "Gastá tu oro en ítems y cartas." },
  gym: { title: "Gimnasio", text: "Equipo del líder. Medalla, evolución desbloqueable e ítem raro." },
  eliteFour: { title: "Alto Mando", text: "5 rivales. Sin descanso." },
  champion: { title: "Campeón", text: "6 rivales. El combate final." },
  legendary: { title: "Encuentro legendario", text: "Derrotalo para tener una captura garantizada." },
  rival: { title: "Duelo con el rival", text: "Tu rival reaparece con un nuevo equipo." },
  villain: { title: "Conflicto regional", text: "Enfrentate a la organización rival de esta región." }
};

// Estados alterados: etiqueta corta (casillero y panel de equipo) y explicación (tooltip).
export const statusInfo = {
  poison: { short: "VEN", hint: "Envenenado: pierde PS cada turno" },
  burn: { short: "QUE", hint: "Quemado: pierde PS y baja su ataque físico" },
  paralysis: { short: "PAR", hint: "Parálisis: 25% de perder la acción por turno" }
};

export const errorText = {
  notPlayerTurn: "No es tu turno.",
  unknownPokemon: "Pokémon desconocido.",
  pokemonFainted: "Ese Pokémon está debilitado.",
  noActionsLeft: "Ese Pokémon ya actuó este turno.",
  invalidMoveIndex: "Movimiento inválido.",
  moveOnCooldown: "Ese movimiento está en cooldown.",
  invalidTarget: "Objetivo inválido para ese movimiento.",
  cardsNotInHand: "Esas cartas no están en tu mano.",
  cardNotAllowed: "Esa carta no se puede usar así.",
  tooManyBoostCards: "Demasiadas cartas de refuerzo.",
  boostNotApplicable: "Ese movimiento no se puede reforzar.",
  insufficientEnergy: "Falta energía para pagar el movimiento.",
  deckFull: "El mazo está lleno: elegí una carta para descartar.",
  noItem: "No tenés ese ítem.",
  noEffect: "No tendría ningún efecto.",
  notEnoughGold: "No te alcanza el oro.",
  legendaryLimit: "Solo podés tener un legendario activo. Enviá el otro a la caja.",
  invalidStock: "Ya no está disponible."
};

// Ícono de arte para cada tipo de efecto de carta (compartido por la mano y la pantalla de recompensas).
export const cardEffectIcons = Object.freeze({
  drawCards: "cards", heal: "heart", shield: "shield", reduceCooldown: "clock", luckyCoin: "clover",
  addCards: "bolt", powerModifier: "sword", costModifier: "star", cureStatus: "leaf"
});

export function describeCard(card) {
  if (card.kind === "energy") {
    const parts = [`Energía ${card.energyValue}`];
    if (card.boostMultiplier > 1) parts.push(`refuerzo x${card.boostMultiplier}`);
    return parts.join(" · ");
  }
  return card.effects
    .map((effect) => {
      const labels = {
        drawCards: `Robás ${effect.amount}`,
        heal: `Curás ${effect.amount} PS`,
        shield: `Escudo ${effect.amount}`,
        reduceCooldown: `-${effect.amount} cooldown`,
        luckyCoin: "Moneda de la suerte",
        addCards: `Recibís ${effect.amount} energía`,
        powerModifier: `POD +${effect.amount} este turno`,
        costModifier: `Costos ${effect.amount} este turno`,
        cureStatus: "Cura el estado"
      };
      return labels[effect.type] ?? effect.type;
    })
    .join(" · ");
}

const categoryNames = { physical: "físico", special: "especial" };

// Texto corto de lo que hace una lista de efectos (movimientos de apoyo, pasivas).
export function describeEffects(effects = []) {
  return effects.map((effect) => {
    const who = effect.target === "allAllies" ? " al equipo" : "";
    switch (effect.type) {
      case "status": return `${effect.status === "poison" ? "Envenena" : effect.status === "burn" ? "Quema" : effect.status === "paralysis" ? "Paraliza" : "Retrocede"} ${Math.round((effect.chance ?? 1) * 100)}%`;
      case "heal": return `Cura ${effect.amount} PS${who}`;
      case "shield": return `Escudo ${effect.amount}${who}`;
      case "reduceCooldown": return `-${effect.amount} cooldown${effect.target === "allAllies" ? " a todo el equipo" : ""}`;
      case "drawCards": return `Robás ${effect.amount}`;
      case "luckyCoin": return "Moneda de la suerte";
      case "addCards": return `+${effect.amount} energías a la mano`;
      case "costModifier": return `Técnicas ${effect.amount < 0 ? "-" : "+"}${Math.abs(effect.amount)} costo · ${effect.turns} turnos`;
      case "powerModifier": return `+${effect.amount} poder ${categoryNames[effect.category] ?? ""} · ${effect.turns} turnos`.replace("  ", " ");
      default: return effect.type;
    }
  }).join(" + ");
}

export function describeStatic(modifiers = []) {
  return modifiers.map((modifier) => {
    const scope = [modifier.category ? categoryNames[modifier.category] : null, modifier.maxCost === 0 ? "sin costo" : null, modifier.minCost ? `costo ${modifier.minCost}+` : null].filter(Boolean).join(" ");
    return `${modifier.kind === "cost" ? "Costo" : "Poder"} ${modifier.amount > 0 ? "+" : ""}${modifier.amount}${scope ? ` (${scope})` : ""}`;
  }).join(", ");
}

// Convierte un evento del motor en una línea de log. names: uid -> nombre.
export function formatEvent(event, { names, data }) {
  const name = (uid) => names[uid] ?? uid;
  const move = (id) => data.moves[id]?.name ?? id;
  switch (event.type) {
    case "turnStarted": return null;
    case "moveUsed": return `${name(event.actorId)} usó ${move(event.moveId)}.`;
    case "damage": {
      const notes = [];
      if (event.isCrit) notes.push("¡crítico!");
      if (event.typeMultiplier === 0) notes.push("no afecta");
      else if (event.typeMultiplier !== 1) notes.push(`${event.typeMultiplier > 1 ? "muy eficaz" : "poco eficaz"} x${event.typeMultiplier}`);
      if (event.stab) notes.push("STAB");
      if (event.boostPower > 0) notes.push(`+${event.boostPower} refuerzo`);
      return `${name(event.targetId)} recibe ${event.amount} de daño${notes.length ? ` (${notes.join(", ")})` : ""}.`;
    }
    case "statusApplied": return `${name(event.targetId)}: ${event.status === "burn" ? "¡quemado!" : event.status === "poison" ? "¡envenenado!" : event.status === "paralysis" ? "¡paralizado!" : "¡puede retroceder!"}`;
    case "statusDamage": return `${name(event.targetId)} pierde ${event.amount} PS por ${event.status === "poison" ? "veneno" : "quemadura"}.`;
    case "moveImmune": return `${name(event.targetId)} es inmune a ${move(event.moveId)}.`;
    case "flinched": return `¡${name(event.targetId)} retrocedió y no pudo actuar!`;
    case "paralyzed": return `¡${name(event.targetId)} está paralizado y no puede moverse!`;
    case "fainted": return `${name(event.pokemonId)} se debilitó.`;
    case "healed": return `${name(event.targetId)} recupera ${event.amount} PS.`;
    case "shieldGained": return `${name(event.targetId)} gana ${event.amount} de escudo.`;
    case "cardsDrawn": return event.count > 0 ? (event.source === "effect" ? `Recibís ${event.count} carta(s).` : `Robás ${event.count} carta(s).`) : null;
    case "modifierAdded": return `${event.label}: ${event.kind === "cost" ? `costos ${event.amount}` : `poder +${event.amount}`} por ${event.turns} turnos.`;
    case "modifierExpired": return `${event.label} terminó.`;
    case "cooldownReduced": return `${name(event.targetId)}: -${event.amount} de cooldown.`;
    case "luckyCoinGained": return "Ganás una moneda de la suerte.";
    case "statusCured": return `${name(event.targetId)} se curó del estado.`;
    case "passiveTriggered": return `${name(event.pokemonId)}: ${event.name}.`;
    case "enemySkipped": return `${name(event.actorId)} no puede actuar.`;
    case "expAwarded": return `Tu equipo gana ${event.amount} EXP.`;
    case "combatEnded": return event.result === "victory" ? "¡Victoria!" : "Derrota...";
    default: return null;
  }
}
