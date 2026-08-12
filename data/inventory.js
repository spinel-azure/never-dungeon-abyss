import { getItem } from "./items.js";
import { getCardById } from "./cards.js";
import { grantCard } from "./deck.js";

export function createInitialInventory() {
  return { counts: {} };
}

export function createInitialWarehouse() {
  return { itemStacks: [], equipmentInstances: [] };
}

export function createInitialLootBag() {
  return { items: {}, cards: {}, equipmentInstances: [], gold: 0 };
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

export function normalizeWarehouse(warehouse) {
  const itemStacks = [];
  for (const raw of warehouse?.itemStacks || []) {
    const item = getItem(raw?.itemId);
    const count = Math.max(0, Math.min(99, Math.floor(Number(raw?.count) || 0)));
    if (item && count > 0) itemStacks.push({ itemId: item.id, count });
  }
  return {
    itemStacks,
    equipmentInstances: Array.isArray(warehouse?.equipmentInstances)
      ? structuredClone(warehouse.equipmentInstances)
      : []
  };
}

export function normalizeLootBag(lootBag) {
  const items = {};
  for (const [itemId, rawCount] of Object.entries(lootBag?.items || {})) {
    if (!getItem(itemId)) continue;
    const count = Math.max(0, Math.floor(Number(rawCount) || 0));
    if (count > 0) items[itemId] = count;
  }
  const cards = {};
  for (const [cardId, rawCount] of Object.entries(lootBag?.cards || {})) {
    if (!getCardById(cardId)) continue;
    const count = Math.max(0, Math.floor(Number(rawCount) || 0));
    if (count > 0) cards[cardId] = count;
  }
  return {
    items,
    cards,
    equipmentInstances: Array.isArray(lootBag?.equipmentInstances)
      ? structuredClone(lootBag.equipmentInstances)
      : [],
    gold: Math.max(0, Math.floor(Number(lootBag?.gold) || 0))
  };
}

export function storeItemInWarehouse(warehouse, itemId, amount = 1) {
  const source = normalizeWarehouse(warehouse);
  let remaining = Math.max(0, Math.floor(Number(amount) || 0));
  if (!getItem(itemId) || remaining <= 0) return { warehouse: source, stored: 0 };
  const itemStacks = source.itemStacks.map(stack => ({ ...stack }));
  const requested = remaining;
  for (const stack of itemStacks) {
    if (stack.itemId !== itemId || stack.count >= 99 || remaining <= 0) continue;
    const added = Math.min(99 - stack.count, remaining);
    stack.count += added;
    remaining -= added;
  }
  while (remaining > 0) {
    const count = Math.min(99, remaining);
    itemStacks.push({ itemId, count });
    remaining -= count;
  }
  return { warehouse: { ...source, itemStacks }, stored: requested };
}

export function withdrawItemFromWarehouse(character, itemId, amount = 1) {
  if (!character || !getItem(itemId)) return { accepted: false, reason: "unknownItem", character };
  const warehouse = normalizeWarehouse(character.warehouse);
  const requested = Math.max(1, Math.floor(Number(amount) || 1));
  let remaining = requested;
  const itemStacks = [];
  for (const stack of warehouse.itemStacks) {
    if (stack.itemId !== itemId || remaining <= 0) { itemStacks.push(stack); continue; }
    const taken = Math.min(stack.count, remaining);
    remaining -= taken;
    if (stack.count > taken) itemStacks.push({ ...stack, count: stack.count - taken });
  }
  const taken = requested - remaining;
  if (taken <= 0) return { accepted: false, reason: "notStored", character };
  const granted = grantItem(character.inventory, itemId, taken);
  if (granted.gained < taken) {
    return { accepted: false, reason: "inventoryFull", character };
  }
  return {
    accepted: true, reason: "", amount: taken,
    character: { ...character, inventory: granted.inventory, warehouse: { ...warehouse, itemStacks } }
  };
}

export function depositItemInWarehouse(character, itemId, amount = 1) {
  if (!character || !getItem(itemId)) return { accepted: false, reason: "unknownItem", character };
  const requested = Math.max(1, Math.floor(Number(amount) || 1));
  const consumed = consumeItem(character.inventory, itemId, requested);
  if (consumed.consumed <= 0) return { accepted: false, reason: "notOwned", character };
  const stored = storeItemInWarehouse(character.warehouse, itemId, consumed.consumed);
  return {
    accepted: true, reason: "", amount: stored.stored,
    character: { ...character, inventory: consumed.inventory, warehouse: stored.warehouse }
  };
}

export function grantItemWithOverflow(character, itemId, amount = 1) {
  if (!character) return { character, gained: 0, stored: 0, reason: "noCharacter" };
  const requested = Math.max(0, Math.floor(Number(amount) || 0));
  const granted = grantItem(character.inventory, itemId, requested);
  const overflow = Math.max(0, requested - granted.gained);
  const stored = storeItemInWarehouse(character.warehouse, itemId, overflow);
  return {
    character: { ...character, inventory: granted.inventory, warehouse: stored.warehouse },
    gained: granted.gained,
    stored: stored.stored,
    reason: granted.gained <= 0 && stored.stored <= 0 ? granted.reason : ""
  };
}

export function addLootItem(lootBag, itemId, amount = 1) {
  const source = normalizeLootBag(lootBag);
  if (!getItem(itemId)) return { lootBag: source, gained: 0, reason: "unknownItem" };
  const gained = Math.max(0, Math.floor(Number(amount) || 0));
  return {
    lootBag: { ...source, items: { ...source.items, [itemId]: (source.items[itemId] || 0) + gained } },
    gained,
    reason: ""
  };
}

export function addLootGold(lootBag, amount = 0) {
  const source = normalizeLootBag(lootBag);
  const gained = Math.max(0, Math.floor(Number(amount) || 0));
  return { lootBag: { ...source, gold: source.gold + gained }, gained };
}

export function addLootEquipment(lootBag, equipment) {
  const source = normalizeLootBag(lootBag);
  if (!equipment?.equipmentId) return { lootBag: source, gained: 0 };
  return {
    lootBag: { ...source, equipmentInstances: [...source.equipmentInstances, structuredClone(equipment)] },
    gained: 1
  };
}

export function addLootCard(lootBag, cardId, amount = 1) {
  const source = normalizeLootBag(lootBag);
  if (!getCardById(cardId)) return { lootBag: source, gained: 0, reason: "unknownCard" };
  const gained = Math.max(0, Math.floor(Number(amount) || 0));
  return {
    lootBag: { ...source, cards: { ...source.cards, [cardId]: (source.cards[cardId] || 0) + gained } },
    gained,
    reason: ""
  };
}

export function settleLootBag(character) {
  if (!character) return { character, results: [] };
  let next = { ...character, warehouse: normalizeWarehouse(character.warehouse) };
  const bag = normalizeLootBag(character.lootBag);
  const results = [];
  for (const [itemId, count] of Object.entries(bag.items)) {
    const result = grantItemWithOverflow(next, itemId, count);
    next = result.character;
    results.push({ itemId, count, inventory: result.gained, warehouse: result.stored });
  }
  const cardResults = [];
  let convertedCardGold = 0;
  for (const [cardId, count] of Object.entries(bag.cards)) {
    const result = grantCard(next.cards, cardId, count, next.deckCost);
    next = { ...next, cards: result.cards };
    const discarded = Math.max(0, count - result.gained);
    const convertedGold = discarded * Math.max(0, Math.floor(Number(getCardById(cardId)?.overflowGold) || 0));
    convertedCardGold += convertedGold;
    cardResults.push({
      cardId, count, gained: result.gained, discarded,
      ...(convertedGold > 0 ? { convertedGold } : {})
    });
  }
  const equipmentInventory = structuredClone(next.equipmentInventory || { instances: [], nextOrder: 1 });
  const equipmentResults = [];
  for (const raw of bag.equipmentInstances) {
    const acquiredOrder = Math.max(1, Math.floor(Number(equipmentInventory.nextOrder) || 1));
    const instance = {
      instanceId: `eq-${String(acquiredOrder).padStart(6, "0")}`,
      equipmentId: raw.equipmentId,
      slot: raw.slot || "rightArmId",
      acquiredOrder,
      enhancement: Math.max(0, Math.min(3, Math.floor(Number(raw.enhancement) || 0))),
      identified: true,
      curseKnown: false
    };
    equipmentInventory.instances.push(instance);
    equipmentInventory.nextOrder = acquiredOrder + 1;
    equipmentResults.push(instance);
  }
  next = {
    ...next,
    equipmentInventory,
    gold: Math.max(0, Math.floor(Number(next.gold) || 0)) + bag.gold + convertedCardGold,
    lootBag: createInitialLootBag()
  };
  return { character: next, results, cardResults, equipmentResults, gold: bag.gold + convertedCardGold };
}
