export function hasUncertainLoot(bag, getItemDefinition = () => null) {
  const hasUncertainItem = Object.entries(bag?.items || {}).some(([itemId, count]) => (
    Number(count) > 0 && getItemDefinition(itemId)?.category !== "material"
  ));
  const hasUncertainCard = Object.values(bag?.cards || {}).some(count => Number(count) > 0);
  return hasUncertainItem || hasUncertainCard || (bag?.equipmentInstances || []).length > 0;
}
