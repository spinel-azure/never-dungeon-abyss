export function hasUncertainLoot(bag, getItemDefinition = () => null) {
  const hasUncertainItem = Object.entries(bag?.items || {}).some(([itemId, count]) => (
    Number(count) > 0 && getItemDefinition(itemId)?.category !== "material"
  ));
  const hasUncertainCard = Object.values(bag?.cards || {}).some(count => Number(count) > 0);
  return hasUncertainItem || hasUncertainCard || (bag?.equipmentInstances || []).length > 0;
}

export function isHighlightedLotCardRarity(rarity) {
  return ["SR", "L", "Z"].includes(String(rarity || "").toUpperCase());
}

export function isHighlightedLotEquipment(instance) {
  return Math.max(0, Math.floor(Number(instance?.enhancement) || 0)) >= 3;
}

export function getLotEquipmentHighlightClass(instance, definition = null) {
  if (definition?.lotBagHighlight === "orange") return "is-special-unique";
  return isHighlightedLotEquipment(instance) ? "is-super-rare" : "";
}
