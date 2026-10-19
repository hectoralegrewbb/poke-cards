export function getTypeMultiplier(typeChart, attackType, defenderTypes) {
  const row = typeChart[attackType] ?? {};
  return defenderTypes.reduce(
    (multiplier, defenderType) => multiplier * (row[defenderType] ?? 1),
    1
  );
}
