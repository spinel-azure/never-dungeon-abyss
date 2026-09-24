// Acquisition helpers remain independent of the catalog and UI.
export function mergeItemDiscovery(...lists) {
  return [...new Set(lists.flat().filter(id => typeof id === "string" && /^[a-z0-9_]+$/.test(id)))];
}

export function getDiscoveredItemIds(character = {}) {
  const obtainedIds = records => Object.entries(records || {})
    .filter(([, record]) => record?.obtained === true || record?.obtainedCount > 0)
    .map(([id]) => id);
  return mergeItemDiscovery(
    obtainedIds(character.compendium?.items),
    obtainedIds(character.compendium?.keyItems),
    character.inventory?.discoveredItemIds || [],
    character.keyItems?.discoveredItemIds || [],
    Object.keys(character.inventory?.counts || {}).filter(id => character.inventory.counts[id] > 0),
    Object.keys(character.keyItems?.owned || {}),
    (character.warehouse?.itemStacks || []).filter(stack => stack.count > 0).map(stack => stack.itemId),
    Object.keys(character.lootBag?.items || {}).filter(id => character.lootBag.items[id] > 0),
    (character.itemBuyback || []).filter(entry => entry.amount > 0).map(entry => entry.itemId)
  );
}

export function getItemCompendiumDisplayEntries(entries, character) {
  const known = new Set(getDiscoveredItemIds(character || {}));
  return entries.map(entry => known.has(entry.id) ? entry : {
    id: entry.id, category: entry.category, name: "？？？？？？", locked: true
  });
}
