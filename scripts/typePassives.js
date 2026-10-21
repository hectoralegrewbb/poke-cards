// Pasivas por tipo para especies finales (sin evolución siguiente). Solo usan efectos que ya existen
// en el motor, así que validan sin código nuevo. Las pasivas curadas a mano nunca se sobrescriben.
const shield = (amount, target = "self") => ({ type: "shield", amount, target });

export const typePassives = Object.freeze({
  normal: { name: "Adaptable", description: "Roba 1 carta extra al empezar el combate.", trigger: "combatStart", effects: [{ type: "drawCards", amount: 1 }] },
  fire: { name: "Llama viva", description: "Sus técnicas especiales ganan +2 de poder.", trigger: "static", effects: [], static: [{ kind: "power", amount: 2, category: "special" }] },
  water: { name: "Torrente", description: "Empieza el combate con 6 de escudo.", trigger: "combatStart", effects: [shield(6)] },
  grass: { name: "Espesura", description: "Al inicio de cada turno se cura 3 PS.", trigger: "turnStart", effects: [{ type: "heal", amount: 3, target: "self" }] },
  electric: { name: "Estática", description: "Al inicio de cada turno reduce 1 el cooldown de sus técnicas.", trigger: "turnStart", effects: [{ type: "reduceCooldown", amount: 1, target: "self" }] },
  ice: { name: "Escarcha", description: "Empieza el combate con 3 de escudo para todo el equipo.", trigger: "combatStart", effects: [shield(3, "allAllies")] },
  fighting: { name: "Impulso", description: "Sus técnicas físicas de costo 2 o más cuestan 1 menos.", trigger: "static", effects: [], static: [{ kind: "cost", amount: -1, minCost: 2, category: "physical" }] },
  poison: { name: "Toxina vital", description: "Al inicio de cada turno se cura 2 PS.", trigger: "turnStart", effects: [{ type: "heal", amount: 2, target: "self" }] },
  ground: { name: "Coraza de fango", description: "Al inicio de cada turno gana 3 de escudo.", trigger: "turnStart", effects: [shield(3)] },
  flying: { name: "Viento a favor", description: "Empieza el combate con una moneda de la suerte.", trigger: "combatStart", effects: [{ type: "luckyCoin", amount: 1 }] },
  psychic: { name: "Mente clara", description: "Roba 2 cartas al empezar el combate.", trigger: "combatStart", effects: [{ type: "drawCards", amount: 2 }] },
  bug: { name: "Enjambre", description: "Sus técnicas sin costo ganan +2 de poder.", trigger: "static", effects: [], static: [{ kind: "power", amount: 2, maxCost: 0 }] },
  rock: { name: "Roca firme", description: "Gana 4 de escudo al inicio de cada turno.", trigger: "turnStart", effects: [shield(4)] },
  ghost: { name: "Velo espectral", description: "Sus técnicas especiales de costo 2 o más cuestan 1 menos.", trigger: "static", effects: [], static: [{ kind: "cost", amount: -1, minCost: 2, category: "special" }] },
  dragon: { name: "Escamas", description: "Sus técnicas de costo 2 o más ganan +2 de poder.", trigger: "static", effects: [], static: [{ kind: "power", amount: 2, minCost: 2 }] },
  dark: { name: "Astucia", description: "Empieza el combate con 2 cartas de energía extra.", trigger: "combatStart", effects: [{ type: "addCards", cardId: "energyBasic", amount: 2 }] },
  steel: { name: "Armadura", description: "Empieza el combate con 8 de escudo.", trigger: "combatStart", effects: [shield(8)] }
});

const minThreat = 50;

// Devuelve una copia del catálogo con pasivas asignadas (idempotente).
export function assignTypePassives(species) {
  const result = structuredClone(species);
  for (const entry of Object.values(result)) {
    if (entry.passive || entry.evolutions?.length || entry.legendary) continue;
    const threat = Object.values(entry.stats).reduce((sum, value) => sum + value, 0);
    const template = typePassives[entry.types[0]];
    if (threat >= minThreat && template) entry.passive = structuredClone(template);
  }
  return result;
}
