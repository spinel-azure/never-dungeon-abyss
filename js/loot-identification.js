export function hasUncertainLoot(bag, getItemDefinition = () => null) {
  const hasUncertainItem = Object.entries(bag?.items || {}).some(([itemId, count]) => (
    Number(count) > 0 && getItemDefinition(itemId)?.category !== "material"
  ));
  return hasUncertainItem || (bag?.equipmentInstances || []).length > 0;
}
