import { EQUIPMENT_SLOTS, applyAntiMagicSetBonus, getEquipmentItem, getInitialEquipment } from "./equipment.js";

export const EQUIPMENT_SLOT_LABELS = Object.freeze({
  rightArmId: "RIGHT ARM",
  leftArmId: "LEFT ARM",
  headId: "HEAD",
  bodyId: "BODY",
  footId: "FOOT",
  accessoryId: "ACCESSORY"
});

export function normalizeEquipmentInventory(source, equipment, equippedInstanceIds, job) {
  const initial = getInitialEquipment(job);
  const rawInstances = Array.isArray(source?.instances) ? source.instances : [];
  const instances = [];
  const usedIds = new Set();
  let nextOrder = 1;
  for (const raw of rawInstances) {
    const definition = findEquipmentDefinition(raw?.equipmentId, raw?.slot);
    if (!definition) continue;
    const instanceId = uniqueInstanceId(raw?.instanceId, usedIds, nextOrder);
    usedIds.add(instanceId);
    const acquiredOrder = Math.max(1, Math.floor(Number(raw?.acquiredOrder) || nextOrder));
    nextOrder = Math.max(nextOrder, acquiredOrder + 1);
    instances.push({
      instanceId,
      equipmentId: definition.id,
      slot: definition.slot,
      acquiredOrder,
      enhancement: Math.max(0, Math.floor(Number(raw?.enhancement) || 0)),
      identified: raw?.identified !== false,
      curseKnown: raw?.curseKnown === true,
      locked: raw?.locked === true
    });
  }

  const slotInstances = {};
  for (const slot of EQUIPMENT_SLOTS) {
    const hasExplicitSlot = Object.prototype.hasOwnProperty.call(equipment || {}, slot);
    const equipmentId = hasExplicitSlot
      ? equipment[slot]
      : ((slot === "rightArmId" ? equipment?.weaponId : null) || initial[slot]);
    if (!equipmentId) { slotInstances[slot] = null; continue; }
    const requestedId = equippedInstanceIds?.[slot];
    let instance = instances.find(entry => entry.instanceId === requestedId && entry.slot === slot);
    if (!instance) instance = instances.find(entry => entry.equipmentId === equipmentId && entry.slot === slot && !Object.values(slotInstances).includes(entry.instanceId));
    if (!instance) {
      const definition = findEquipmentDefinition(equipmentId, slot);
      if (!definition) { slotInstances[slot] = null; continue; }
      const instanceId = uniqueInstanceId(null, usedIds, nextOrder);
      usedIds.add(instanceId);
      instance = { instanceId, equipmentId, slot, acquiredOrder: nextOrder++, enhancement: 0, identified: true, curseKnown: false, locked: false };
      instances.push(instance);
    }
    slotInstances[slot] = instance.instanceId;
  }
  return { equipmentInventory: { instances, nextOrder }, equippedInstanceIds: slotInstances };
}

export function getEquipmentInstanceName(instance) {
  const definition = findEquipmentDefinition(instance?.equipmentId, instance?.slot);
  if (!definition) return "----";
  return `${definition.name}${Number(instance?.enhancement) > 0 ? `＋${instance.enhancement}` : ""}`;
}

export function getEquipmentInstanceDefinition(instance) {
  const definition = findEquipmentDefinition(instance?.equipmentId, instance?.slot);
  if (!definition) return null;
  const enhancement = Math.max(0, Math.min(3, Math.floor(Number(instance?.enhancement) || 0)));
  const penetration = definition.penetrationByEnhancement?.[enhancement];
  const attack = definition.attackByEnhancement?.[enhancement];
  const statBonuses = definition.statBonusesByEnhancement?.[enhancement] || definition.statBonuses;
  const buyPrice = definition.buyPriceByEnhancement?.[enhancement] ?? definition.buyPrice;
  const sellPrice = definition.sellPriceByEnhancement?.[enhancement] ?? definition.sellPrice;
  return {
    ...definition,
    enhancement,
    statBonuses,
    ...(attack == null ? {} : { attack }),
    ...(penetration == null ? {} : { defensePenetration: penetration }),
    ...(buyPrice == null ? {} : { buyPrice }),
    ...(sellPrice == null ? {} : { sellPrice })
  };
}

export function collectEquippedInstanceBonuses(equipmentInventory, equippedInstanceIds) {
  const bonuses = {};
  const equippedIds = [];
  const instances = equipmentInventory?.instances || [];
  for (const instanceId of Object.values(equippedInstanceIds || {})) {
    if (!instanceId) continue;
    const instance = instances.find(entry => entry.instanceId === instanceId);
    const definition = getEquipmentInstanceDefinition(instance);
    if (definition?.id) equippedIds.push(definition.id);
    for (const [key, value] of Object.entries(definition?.statBonuses || {})) {
      bonuses[key] = (bonuses[key] || 0) + Number(value || 0);
    }
  }
  return applyAntiMagicSetBonus(bonuses, equippedIds);
}

export function findEquipmentDefinition(equipmentId, slot) {
  if (!equipmentId) return null;
  if (slot) {
    const found = getEquipmentItem(equipmentId, slot);
    return found?.id === equipmentId ? { ...found, slot } : null;
  }
  for (const candidateSlot of EQUIPMENT_SLOTS) {
    const found = getEquipmentItem(equipmentId, candidateSlot);
    if (found?.id === equipmentId) return { ...found, slot: candidateSlot };
  }
  return null;
}

export function listEquipmentInstances(character) {
  const equipped = character?.equippedInstanceIds || {};
  const slotOrder = new Map(EQUIPMENT_SLOTS.map((slot, index) => [slot, index]));
  return [...(character?.equipmentInventory?.instances || [])].sort((a, b) => {
    const aEquipped = Object.values(equipped).includes(a.instanceId);
    const bEquipped = Object.values(equipped).includes(b.instanceId);
    if (aEquipped !== bEquipped) return aEquipped ? -1 : 1;
    if (aEquipped) return (slotOrder.get(a.slot) ?? 99) - (slotOrder.get(b.slot) ?? 99);
    return Number(a.acquiredOrder) - Number(b.acquiredOrder);
  });
}

export function grantEquipmentInstance(character, equipmentId, slot, options = {}) {
  if (!character) return { accepted: false, character, reason: "noCharacter" };
  const definition = findEquipmentDefinition(equipmentId, slot);
  if (!definition) return { accepted: false, character, reason: "unknownEquipment" };
  if (definition.unique && characterOwnsEquipment(character, definition.id)) {
    return { accepted: false, character, reason: "alreadyOwned" };
  }
  const normalized = normalizeEquipmentInventory(
    character.equipmentInventory,
    character.equipment,
    character.equippedInstanceIds,
    character.job
  );
  const equipmentInventory = structuredClone(normalized.equipmentInventory);
  const used = new Set(equipmentInventory.instances.map(instance => instance.instanceId));
  const acquiredOrder = equipmentInventory.nextOrder;
  const instance = {
    instanceId: uniqueInstanceId(options.instanceId, used, acquiredOrder),
    equipmentId: definition.id,
    slot: definition.slot,
    acquiredOrder,
    enhancement: definition.cursed || definition.unique ? 0 : Math.max(0, Math.floor(Number(options.enhancement) || 0)),
    identified: options.identified !== false,
    curseKnown: options.curseKnown === true,
    locked: options.locked === true
  };
  equipmentInventory.instances.push(instance);
  equipmentInventory.nextOrder += 1;
  return {
    accepted: true,
    reason: "",
    instance,
    character: { ...character, ...normalized, equipmentInventory }
  };
}

function characterOwnsEquipment(character, equipmentId) {
  return [
    ...(character?.equipmentInventory?.instances || []),
    ...(character?.warehouse?.equipmentInstances || []),
    ...(character?.lootBag?.equipmentInstances || [])
  ].some(instance => instance?.equipmentId === equipmentId)
    || Object.values(character?.equipment || {}).includes(equipmentId);
}

export function setEquipmentInstanceLocked(character, instanceId, locked) {
  if (!character) return { accepted: false, character, reason: "noCharacter" };
  const equipmentInventory = structuredClone(character.equipmentInventory || { instances: [], nextOrder: 1 });
  const instance = equipmentInventory.instances.find(entry => entry.instanceId === instanceId);
  if (!instance) return { accepted: false, character, reason: "notOwned" };
  instance.locked = locked === true;
  return { accepted: true, character: { ...character, equipmentInventory }, instance };
}

export function isEquipmentBuybackEligible(instance) {
  const definition = getEquipmentInstanceDefinition(instance);
  return Boolean(definition)
    && (Math.max(0, Math.floor(Number(instance?.enhancement) || 0)) >= 3
      || (definition.buybackPrice != null && Number.isFinite(Number(definition.buybackPrice))));
}

export function canEquipInstance(character, instance) {
  const definition = findEquipmentDefinition(instance?.equipmentId, instance?.slot);
  if (!definition) return { accepted: false, reason: "装備品データが見つかりません。" };
  if (definition.allowedJobs?.length && !definition.allowedJobs.includes(character?.job)) {
    return { accepted: false, reason: "この職業では装備できません。" };
  }
  for (const [stat, required] of Object.entries(definition.requirements || {})) {
    const current = Math.floor(Number(character?.baseStats?.[stat]) || 0);
    if (current < Number(required)) return { accepted: false, reason: `装備条件：${stat.toUpperCase()} ${required}以上（現在値 ${current}）` };
  }
  return { accepted: true, reason: "" };
}

export function equipInstance(character, slot, instanceId) {
  if (!character || !EQUIPMENT_SLOTS.includes(slot)) return { accepted: false, character, reason: "invalidSlot" };
  const currentId = character.equippedInstanceIds?.[slot];
  const current = character.equipmentInventory?.instances?.find(entry => entry.instanceId === currentId);
  const currentDefinition = findEquipmentDefinition(current?.equipmentId, slot);
  if (currentDefinition?.cursed && current?.curseKnown) return { accepted: false, character, reason: "呪われているため外せません。" };
  const instance = instanceId ? character.equipmentInventory?.instances?.find(entry => entry.instanceId === instanceId) : null;
  if (instance && instance.slot !== slot) return { accepted: false, character, reason: "invalidSlot" };
  const eligibility = instance ? canEquipInstance(character, instance) : { accepted: true };
  if (!eligibility.accepted) return { accepted: false, character, reason: eligibility.reason };
  const definition = instance ? findEquipmentDefinition(instance.equipmentId, slot) : null;
  const equippedInstanceIds = { ...(character.equippedInstanceIds || {}), [slot]: instance?.instanceId || null };
  const equipment = { ...(character.equipment || {}), [slot]: definition?.id || null };
  if (slot === "rightArmId") {
    equipment.weaponId = equipment.rightArmId;
    equipment.rightArmEnhancement = Math.max(0, Math.floor(Number(instance?.enhancement) || 0));
  }
  if (definition?.twoHanded) {
    const shieldId = equippedInstanceIds.leftArmId;
    const shield = character.equipmentInventory?.instances?.find(entry => entry.instanceId === shieldId);
    const shieldDefinition = findEquipmentDefinition(shield?.equipmentId, "leftArmId");
    if (shieldDefinition?.cursed && shield?.curseKnown) return { accepted: false, character, reason: "呪われた左手装備があるため装備できません。" };
    equippedInstanceIds.leftArmId = null;
    equipment.leftArmId = null;
  }
  const equipmentInventory = structuredClone(character.equipmentInventory);
  if (definition?.cursed && instance) {
    const stored = equipmentInventory.instances.find(entry => entry.instanceId === instance.instanceId);
    if (stored) stored.curseKnown = true;
  }
  return {
    accepted: true,
    reason: "",
    curseRevealed: Boolean(definition?.cursed && !instance?.curseKnown),
    character: { ...character, equipment, equippedInstanceIds, equipmentInventory }
  };
}

function uniqueInstanceId(raw, used, order) {
  const requested = String(raw || "");
  if (requested && !used.has(requested)) return requested;
  let value = Math.max(1, order);
  while (used.has(`eq-${String(value).padStart(6, "0")}`)) value += 1;
  return `eq-${String(value).padStart(6, "0")}`;
}
