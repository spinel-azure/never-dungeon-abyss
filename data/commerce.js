import { getItem } from "./items.js";
import { consumeItem, getItemCount, grantItemWithOverflow } from "./inventory.js";
import { getEquipmentInstanceDefinition, grantEquipmentInstance } from "./equipment-inventory.js";
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

export function sellItem(character, itemId, { price, amount = 1 } = {}) {
  if (!character) return { accepted: false, reason: "noCharacter", character };
  const item = getItem(itemId);
  if (!item) return { accepted: false, reason: "unknownItem", character };
  const owned = getItemCount(character.inventory, item.id);
  if (owned <= 0) return { accepted: false, reason: "notOwned", character, item };
  const quantity = Math.min(owned, Math.max(1, Math.floor(Number(amount) || 1)));
  const unitValue = Math.max(0, Math.floor(Number(price ?? item.sellPrice ?? item.buyPrice / 2) || 0));
  if (unitValue <= 0) return { accepted: false, reason: "notSellable", character, item };
  const value = unitValue * quantity;
  return {
    accepted: true,
    reason: "",
    item, quantity, unitValue,
    value,
    character: {
      ...character,
      gold: Math.max(0, Math.floor(Number(character.gold) || 0)) + value,
      inventory: consumeItem(character.inventory, item.id, quantity).inventory
    }
  };
}

export function sellEquipmentInstance(character, instanceId, { price } = {}) {
  if (!character) return { accepted: false, reason: "noCharacter", character };
  const instance = character.equipmentInventory?.instances?.find(entry => entry.instanceId === instanceId);
  if (!instance) return { accepted: false, reason: "notOwned", character };
  if (Object.values(character.equippedInstanceIds || {}).includes(instance.instanceId)) {
    return { accepted: false, reason: "equipped", character, instance };
  }
  const equipment = getEquipmentInstanceDefinition(instance);
  if (!equipment) return { accepted: false, reason: "unknownEquipment", character, instance };
  const value = Math.max(0, Math.floor(Number(price ?? equipment.sellPrice ?? equipment.buyPrice / 2) || 0));
  if (value <= 0) return { accepted: false, reason: "notSellable", character, instance, equipment };
  return {
    accepted: true,
    reason: "",
    instance,
    equipment,
    value,
    character: {
      ...character,
      gold: Math.max(0, Math.floor(Number(character.gold) || 0)) + value,
      equipmentInventory: {
        ...character.equipmentInventory,
        instances: character.equipmentInventory.instances.filter(entry => entry.instanceId !== instance.instanceId)
      }
    }
  };
}
