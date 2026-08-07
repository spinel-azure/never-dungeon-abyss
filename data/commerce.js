import { getItem } from "./items.js";
import { consumeItem, getItemCount, grantItemWithOverflow } from "./inventory.js";
import { findEquipmentDefinition, getEquipmentInstanceDefinition, grantEquipmentInstance } from "./equipment-inventory.js";
import { getWeapon } from "./weapons.js";

export function purchaseItem(character, itemId, { price, amount = 1 } = {}) {
  if (!character) return { accepted: false, reason: "noCharacter", character };
  const item = getItem(itemId);
  if (!item) return { accepted: false, reason: "unknownItem", character };
  const quantity = Math.max(1, Math.floor(Number(amount) || 1));
  const unitCost = Math.max(0, Math.floor(Number(price ?? item.buyPrice) || 0));
  const cost = unitCost * quantity;
  const gold = Math.max(0, Math.floor(Number(character.gold) || 0));
  if (gold < cost) return { accepted: false, reason: "insufficientGold", character, item, cost };

  const granted = grantItemWithOverflow(character, item.id, quantity);

  return {
    accepted: true,
    reason: "",
    item, quantity, unitCost,
    cost,
    stored: granted.stored,
    character: { ...granted.character, gold: gold - cost }
  };
}

export function purchaseEquipment(character, equipmentOrId) {
  if (!character) return { accepted: false, reason: "noCharacter", character };
  const offer = typeof equipmentOrId === "object" ? equipmentOrId : null;
  const equipmentId = offer?.equipmentId || equipmentOrId;
  const slot = offer?.slot || "rightArmId";
  const enhancement = Math.max(0, Math.floor(Number(offer?.enhancement) || 0));
  const equipment = offer || findEquipmentDefinition(equipmentId, slot) || getWeapon(equipmentId);
  const buyPrice = Number(equipment?.buyPrice);
  if (!equipment || !Number.isFinite(buyPrice)) {
    return { accepted: false, reason: "unknownEquipment", character };
  }
  if (equipment.allowedJobs?.length && !equipment.allowedJobs.includes(character.job)) {
    return { accepted: false, reason: "jobRestricted", character, equipment };
  }
  const gold = Math.max(0, Math.floor(Number(character.gold) || 0));
  if (gold < buyPrice) return { accepted: false, reason: "insufficientGold", character, equipment };
  const granted = grantEquipmentInstance(character, equipmentId, slot, { enhancement });
  if (!granted.accepted) return { ...granted, equipment };
  return {
    accepted: true, reason: "", item: equipment, equipment, instance: granted.instance, cost: buyPrice,
    character: { ...granted.character, gold: gold - buyPrice }
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
      },
      equipmentBuyback: [
        ...(Array.isArray(character.equipmentBuyback) ? character.equipmentBuyback : []),
        { instance: structuredClone(instance), price: Math.max(value * 2, Math.floor(Number(equipment.buybackPrice) || 0)) }
      ]
    }
  };
}

export function purchaseBuybackEquipment(character, instanceId) {
  if (!character) return { accepted: false, reason: "noCharacter", character };
  const entries = Array.isArray(character.equipmentBuyback) ? character.equipmentBuyback : [];
  const entry = entries.find(candidate => candidate?.instance?.instanceId === instanceId);
  if (!entry) return { accepted: false, reason: "notFound", character };
  const cost = Math.max(0, Math.floor(Number(entry.price) || 0));
  const gold = Math.max(0, Math.floor(Number(character.gold) || 0));
  if (gold < cost) return { accepted: false, reason: "insufficientGold", character, cost };
  return { accepted: true, reason: "", instance: entry.instance, cost, character: {
    ...character,
    gold: gold - cost,
    equipmentInventory: { ...character.equipmentInventory, instances: [...(character.equipmentInventory?.instances || []), structuredClone(entry.instance)] },
    equipmentBuyback: entries.filter(candidate => candidate !== entry)
  } };
}
