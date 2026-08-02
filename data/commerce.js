import { getItem } from "./items.js";
import { grantItemWithOverflow } from "./inventory.js";

export function purchaseItem(character, itemId, { price } = {}) {
  if (!character) return { accepted: false, reason: "noCharacter", character };
  const item = getItem(itemId);
  if (!item) return { accepted: false, reason: "unknownItem", character };
  const cost = Math.max(0, Math.floor(Number(price ?? item.buyPrice) || 0));
  const gold = Math.max(0, Math.floor(Number(character.gold) || 0));
  if (gold < cost) return { accepted: false, reason: "insufficientGold", character, item, cost };

  const granted = grantItemWithOverflow(character, item.id, 1);

  return {
    accepted: true,
    reason: "",
    item,
    cost,
    stored: granted.stored,
    character: { ...granted.character, gold: gold - cost }
  };
}
