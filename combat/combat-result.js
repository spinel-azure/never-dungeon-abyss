export function createCombatResult(actionType, values = {}) {
  return {
    actionType,
    hits: [],
    totalDamage: 0,
    actionEffects: [],
    ...values
  };
}
