// Qué nodos se ofrecen en cada paso. Cada etapa: pasos de elección (2 opciones) y el gimnasio al final.
// Después de la etapa 8: campamento/tienda, 4 del Alto Mando y el campeón.

function pickDistinct(rng, pool, count) {
  return rng.shuffle([...new Set(pool)]).slice(0, count);
}

export function generateOptions(run) {
  const region = run.campaign;
  if ([3, 6].includes(run.badges.length) && !run.completedLegendaryMilestones.includes(run.badges.length)) {
    return [{ type: "legendary", speciesId: region.legendaries[run.badges.length === 3 ? 0 : 1] }];
  }
  if (run.stageIndex < region.stages.length) {
    if (run.step < region.stepPools.length) {
      const nodes = pickDistinct(run.rng, region.stepPools[run.step], 2).map((type) => ({ type }));
      // Una oportunidad narrativa por región y etapa, no un reloj en tiempo real.
      if (region.mode !== "legacy" && run.stageIndex > 0 && run.step === 1 && run.rng.next() < 0.35) {
        const recent = run.eventHistory.slice(-2);
        const options = ["rival", "villain"].filter((type) => !recent.includes(type));
        if (options.length) nodes[1] = { type: run.rng.pick(options) };
      }
      return nodes;
    }
    return [{ type: "gym" }];
  }
  const fights = region.league.eliteFour.length;
  if (run.step === 0) return [{ type: "camp" }, { type: "shop" }];
  if (run.step <= fights) return [{ type: "eliteFour", index: run.step - 1 }];
  return [{ type: "champion" }];
}

export function advanceStep(run) {
  const region = run.campaign;
  const inGymStage = run.stageIndex < region.stages.length;
  if (inGymStage && run.step >= region.stepPools.length) {
    run.stageIndex += 1;
    run.step = 0;
  } else {
    run.step += 1;
  }
}

export function getStage(run) {
  const { stages } = run.campaign;
  return stages[Math.min(run.stageIndex, stages.length - 1)];
}
