import { getItem } from "./items.js";
import { consumeItem, getItemCount, grantItemWithOverflow } from "./inventory.js";
import { grantEquipmentInstance } from "./equipment-inventory.js";
import { getWeapon } from "./weapons.js";

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

export function purchaseEquipment(character, equipmentId) {
  if (!character) return { accepted: false, reason: "noCharacter", character };
  const equipment = getWeapon(equipmentId);
  if (!equipment || equipment.id !== equipmentId || !Number.isFinite(equipment.buyPrice)) {
    return { accepted: false, reason: "unknownEquipment", character };
  }
  const gold = Math.max(0, Math.floor(Number(character.gold) || 0));
  if (gold < equipment.buyPrice) return { accepted: false, reason: "insufficientGold", character, equipment };
  const granted = grantEquipmentInstance(character, equipment.id, "rightArmId");
  if (!granted.accepted) return { ...granted, equipment };
  return {
    accepted: true, reason: "", item: equipment, equipment, cost: equipment.buyPrice,
    character: { ...granted.character, gold: gold - equipment.buyPrice }
  };
}

export function sellItem(character, itemId, { price } = {}) {
  if (!character) return { accepted: false, reason: "noCharacter", character };
  const item = getItem(itemId);
  if (!item) return { accepted: false, reason: "unknownItem", character };
  if (getItemCount(character.inventory, item.id) <= 0) return { accepted: false, reason: "notOwned", character, item };
  const value = Math.max(0, Math.floor(Number(price ?? item.sellPrice ?? item.buyPrice / 2) || 0));
  if (value <= 0) return { accepted: false, reason: "notSellable", character, item };
  return {
    accepted: true,
    reason: "",
    item,
    value,
    character: {
      ...character,
      gold: Math.max(0, Math.floor(Number(character.gold) || 0)) + value,
      inventory: consumeItem(character.inventory, item.id, 1).inventory
    }
  };
}
