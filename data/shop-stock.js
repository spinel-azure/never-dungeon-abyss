import { getItem, getShopItemIdsForCharacter } from "./items.js";
import { WEAPONS } from "./weapons.js";

export const SHOP_BASELINE_DEPTH = 1;

export function getShopEquipmentIdsForDepth(depth = 1) {
  const reached = normalizeDepth(depth);
  return Object.values(WEAPONS)
    .filter(item => Number.isFinite(item.buyPrice) && normalizeDepth(item.shopUnlockDepth) <= reached)
    .map(item => item.id);
}

export function getShopStockState(character) {
  const reached = normalizeDepth(character?.highestDungeonDepthReached);
  const eventFlags = character?.eventFlags || {};
  const categoryDepths = {
    equipment: latestUnlockDepth(getShopEquipmentIdsForDepth(reached).map(id => WEAPONS[id])),
    items: latestUnlockDepth(getShopItemIdsForCharacter(character).map(getItem))
  };
  const seen = eventFlags.shopStockSeenCategories || {};
  const newCategories = Object.fromEntries(Object.entries(categoryDepths).map(([category, depth]) => [
    category,
    depth > SHOP_BASELINE_DEPTH && depth > normalizeSeenDepth(seen[category])
  ]));
  const latestDepth = Math.max(...Object.values(categoryDepths));
  return {
    reached,
    categoryDepths,
    newCategories,
    latestDepth,
    announcementPending: latestDepth > SHOP_BASELINE_DEPTH
      && latestDepth > normalizeSeenDepth(eventFlags.shopStockAnnouncementDepth)
  };
}

export function acknowledgeShopStockAnnouncement(character) {
  const stock = getShopStockState(character);
  if (!stock.announcementPending) return { character, announced: false, stock };
  return {
    announced: true,
    stock,
    character: withEventFlags(character, {
      shopStockAnnouncementDepth: stock.latestDepth
    })
  };
}

export function markShopCategorySeen(character, category) {
  if (!['equipment', 'items'].includes(category)) return character;
  const stock = getShopStockState(character);
  return withEventFlags(character, {
    shopStockSeenCategories: {
      ...(character?.eventFlags?.shopStockSeenCategories || {}),
      [category]: stock.categoryDepths[category]
    }
  });
}

function latestUnlockDepth(items) {
  return Math.max(SHOP_BASELINE_DEPTH, ...items.map(item => normalizeDepth(item?.shopUnlockDepth)));
}

function normalizeDepth(value) {
  return Math.max(1, Math.floor(Number(value) || 1));
}

function normalizeSeenDepth(value) {
  return Math.max(SHOP_BASELINE_DEPTH, Math.floor(Number(value) || SHOP_BASELINE_DEPTH));
}

function withEventFlags(character, patch) {
  return { ...character, eventFlags: { ...(character?.eventFlags || {}), ...patch } };
}
