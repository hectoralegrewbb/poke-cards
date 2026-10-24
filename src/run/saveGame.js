// Guardado local versionado sin dependencias de navegador: el motor recibe snapshots JSON.
// Se restauran ambos estados RNG para no alterar la semilla ni las probabilidades tras recargar.
import { createRng } from "../engine/rng.js";

export const saveVersion = 1;

export function serializeRun(run) {
  if (!run?.data || !run.rng) throw new Error("No hay corrida para guardar");
  const { data, rng, combat, ...fields } = run;
  const snapshot = { ...fields, rngState: rng.getState(), combat: null };
  if (combat) {
    const { data: combatData, rng: combatRng, ...combatFields } = combat;
    snapshot.combat = { ...combatFields, rngState: combatRng.getState() };
  }
  return JSON.stringify({ version: saveVersion, savedAt: Date.now(), run: snapshot });
}

export function restoreRun(data, saved) {
  const record = typeof saved === "string" ? JSON.parse(saved) : saved;
  if (!record || record.version !== saveVersion || !record.run) throw new Error("Guardado incompatible");
  const { rngState, combat: combatSnapshot, ...fields } = record.run;
  if (!Number.isInteger(rngState) || !Array.isArray(fields.party) || !Array.isArray(fields.options) ||
      !["map", "combat", "reward", "shop", "camp", "center"].includes(fields.phase) || !Number.isInteger(fields.seed)) {
    throw new Error("Guardado inválido");
  }
  const run = { ...fields, data, rng: createRng(fields.seed, rngState), combat: null,
    campaign: fields.campaign ?? { ...data.region, mode: "legacy", name: "Teselia (v0.3)", legendaries: [] },
    mode: fields.mode ?? "legacy",
    completedLegendaryMilestones: fields.completedLegendaryMilestones ?? [3, 6],
    eventHistory: fields.eventHistory ?? [],
    chestCardIds: fields.chestCardIds ?? [],
    legendariesSeen: fields.legendariesSeen ?? [] };
  if (combatSnapshot) {
    const { rngState: combatRngState, ...combatFields } = combatSnapshot;
    if (!Number.isInteger(combatRngState) || !combatFields.teams?.enemy) throw new Error("Combate guardado inválido");
    run.combat = {
      ...combatFields, data, rng: createRng(combatFields.seed, combatRngState),
      teams: { ...combatFields.teams, player: run.party }
    };
  }
  if (run.phase === "combat" && !run.combat) throw new Error("Falta el combate guardado");
  return run;
}
