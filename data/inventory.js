import { getItem } from "./items.js";

export function createInitialInventory() {
  return { counts: {} };
}

export function normalizeInventory(inventory) {
  const counts = {};
  for (const [id, rawCount] of Object.entries(inventory?.counts || {})) {
    const item = getItem(id);
    if (!item) continue;
    const count = Math.max(0, Math.min(item.maxOwned, Math.floor(Number(rawCount) || 0)));
    if (count > 0) counts[id] = count;
  }
  return { counts };
}

export function getItemCount(inventory, itemId) {
  return Math.max(0, Math.floor(Number(inventory?.counts?.[itemId]) || 0));
}

export function grantItem(inventory, itemId, amount = 1) {
  const item = getItem(itemId);
  const source = normalizeInventory(inventory);
  if (!item) return { inventory: source, gained: 0, reason: "unknownItem" };
  const current = getItemCount(source, itemId);
  const next = Math.min(item.maxOwned, current + Math.max(0, Math.floor(Number(amount) || 0)));
  return {
    inventory: { counts: { ...source.counts, ...(next > 0 ? { [itemId]: next } : {}) } },
    gained: next - current,
    reason: next === current ? "maxOwned" : ""
  };
}

export function consumeItem(inventory, itemId, amount = 1) {
  const source = normalizeInventory(inventory);
  const current = getItemCount(source, itemId);
  const consumed = Math.min(current, Math.max(0, Math.floor(Number(amount) || 0)));
  const counts = { ...source.counts };
  if (current - consumed > 0) counts[itemId] = current - consumed;
  else delete counts[itemId];
  return { inventory: { counts }, consumed, reason: consumed > 0 ? "" : "notOwned" };
}
