export function getEffectiveSpCost(skill = {}, character = {}) {
  const baseCost = Math.max(0, Math.floor(Number(skill?.spCost) || 0));
  if (baseCost === 0) return 0;
  const reduction = Math.max(0, Math.floor(
    Number(character?.spCostReduction)
      || Number(character?.cardStatBonuses?.spCostReduction)
      || 0
  ));
  return Math.max(1, baseCost - reduction);
}
