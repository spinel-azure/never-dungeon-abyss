import { BOSSES } from "./bosses.js";
import { enemies } from "./enemies.js";
import { getItem } from "./items.js";
import { getKeyItem } from "./key-items.js";
import { findEquipmentDefinition } from "./equipment-inventory.js";

const MONSTER_IDS = new Set([
  ...enemies.map(enemy => enemy.id),
  ...Object.values(BOSSES).map(boss => boss.id)
]);

export function createInitialCompendium() {
  return { monsters: {}, items: {}, keyItems: {}, equipment: {} };
}

export function normalizeCompendium(source) {
  const next = createInitialCompendium();
  for (const [id, raw] of Object.entries(source?.monsters || {})) {
    if (!MONSTER_IDS.has(id) || !raw || typeof raw !== "object") continue;
    const defeatCount = Math.max(0, Math.floor(Number(raw.defeatCount) || 0));
    const discoveredDropIds = [...new Set((Array.isArray(raw.discoveredDropIds) ? raw.discoveredDropIds : [])
      .map(String).filter(isKnownCollectibleId))];
    const encountered = raw.encountered === true || raw.defeated === true || defeatCount > 0;
    if (!encountered && discoveredDropIds.length === 0) continue;
    next.monsters[id] = {
      encountered,
      defeated: raw.defeated === true || defeatCount > 0,
      defeatCount,
      discoveredDropIds
    };
  }
  for (const [id, raw] of Object.entries(source?.items || {})) {
    if (!getItem(id) || !raw || typeof raw !== "object") continue;
    const obtainedCount = Math.max(0, Math.floor(Number(raw.obtainedCount) || 0));
    if (raw.discovered !== true && raw.obtained !== true && obtainedCount === 0) continue;
    next.items[id] = {
      discovered: true,
      obtained: raw.obtained === true || obtainedCount > 0,
      obtainedCount
    };
  }
  for (const [id, raw] of Object.entries(source?.keyItems || {})) {
    if (!getKeyItem(id) || !raw || typeof raw !== "object") continue;
    if (raw.discovered !== true && raw.obtained !== true) continue;
    next.keyItems[id] = { discovered: true, obtained: raw.obtained === true };
  }
  for (const [id, raw] of Object.entries(source?.equipment || {})) {
    if (!findEquipmentDefinition(id) || !raw || typeof raw !== "object") continue;
    if (raw.discovered !== true && raw.obtained !== true) continue;
    next.equipment[id] = { discovered: true, obtained: raw.obtained === true };
  }
  return next;
}

export function recordMonsterEncounter(compendium, monsterIds) {
  const next = normalizeCompendium(compendium);
  for (const id of normalizeIds(monsterIds).filter(id => MONSTER_IDS.has(id))) {
    const current = next.monsters[id] || emptyMonsterRecord();
    next.monsters[id] = { ...current, encountered: true };
  }
  return next;
}

export function recordMonsterDefeat(compendium, monsterId, amount = 1) {
  const id = String(monsterId || "");
  if (!MONSTER_IDS.has(id)) return normalizeCompendium(compendium);
  const next = normalizeCompendium(compendium);
  const current = next.monsters[id] || emptyMonsterRecord();
  next.monsters[id] = {
    ...current,
    encountered: true,
    defeated: true,
    defeatCount: current.defeatCount + Math.max(1, Math.floor(Number(amount) || 1))
  };
  return next;
}

export function recordMonsterDrop(compendium, monsterId, dropId) {
  const id = String(monsterId || "");
  const collectibleId = String(dropId || "");
  if (!MONSTER_IDS.has(id) || !isKnownCollectibleId(collectibleId)) return normalizeCompendium(compendium);
  const next = normalizeCompendium(compendium);
  const current = next.monsters[id] || emptyMonsterRecord();
  next.monsters[id] = {
    ...current,
    encountered: true,
    discoveredDropIds: [...new Set([...current.discoveredDropIds, collectibleId])]
  };
  return next;
}

export function recordItemObtained(compendium, itemId, amount = 1) {
  const id = String(itemId || "");
  if (!getItem(id)) return normalizeCompendium(compendium);
  const next = normalizeCompendium(compendium);
  const current = next.items[id] || { discovered: false, obtained: false, obtainedCount: 0 };
  next.items[id] = {
    discovered: true,
    obtained: true,
    obtainedCount: current.obtainedCount + Math.max(1, Math.floor(Number(amount) || 1))
  };
  return next;
}

export function recordKeyItemObtained(compendium, keyItemId) {
  const id = String(keyItemId || "");
  if (!getKeyItem(id)) return normalizeCompendium(compendium);
  const next = normalizeCompendium(compendium);
  next.keyItems[id] = { discovered: true, obtained: true };
  return next;
}

export function recordEquipmentObtained(compendium, equipmentId) {
  const id = String(equipmentId || "");
  if (!findEquipmentDefinition(id)) return normalizeCompendium(compendium);
  const next = normalizeCompendium(compendium);
  next.equipment[id] = { discovered: true, obtained: true };
  return next;
}

export function backfillCompendiumFromCharacter(compendium, character = {}) {
  let next = normalizeCompendium(compendium);
  for (const [itemId, count] of Object.entries(character.inventory?.counts || {})) {
    next = backfillItem(next, itemId, count);
  }
  for (const stack of character.warehouse?.itemStacks || []) {
    next = backfillItem(next, stack?.itemId, stack?.count);
  }
  for (const [itemId, count] of Object.entries(character.lootBag?.items || {})) {
    next = backfillItem(next, itemId, count);
  }
  for (const entry of character.itemBuyback || []) {
    next = backfillItem(next, entry?.itemId, entry?.amount);
  }
  for (const keyItemId of Object.keys(character.keyItems?.owned || {})) {
    next = recordKeyItemObtained(next, keyItemId);
  }
  const equipmentInstances = [
    ...(character.equipmentInventory?.instances || []),
    ...(character.warehouse?.equipmentInstances || []),
    ...(character.lootBag?.equipmentInstances || []),
    ...(character.equipmentBuyback || []).map(entry => entry?.instance).filter(Boolean)
  ];
  for (const instance of equipmentInstances) {
    next = recordEquipmentObtained(next, instance?.equipmentId);
  }
  for (const boss of Object.values(BOSSES)) {
    if (!boss.defeatedFlag || character.eventFlags?.[boss.defeatedFlag] !== true) continue;
    const current = next.monsters[boss.id];
    if (!current?.defeated) next = recordMonsterDefeat(next, boss.id);
  }
  return next;
}

function backfillItem(compendium, itemId, amount) {
  const id = String(itemId || "");
  const count = Math.max(0, Math.floor(Number(amount) || 0));
  if (!getItem(id) || count <= 0) return compendium;
  const next = normalizeCompendium(compendium);
  const current = next.items[id] || { discovered: false, obtained: false, obtainedCount: 0 };
  next.items[id] = {
    discovered: true,
    obtained: true,
    obtainedCount: Math.max(current.obtainedCount, count)
  };
  return next;
}

function emptyMonsterRecord() {
  return { encountered: false, defeated: false, defeatCount: 0, discoveredDropIds: [] };
}

function normalizeIds(value) {
  return (Array.isArray(value) ? value : [value]).map(id => String(id || "")).filter(Boolean);
}

function isKnownCollectibleId(id) {
  return Boolean(getItem(id) || getKeyItem(id) || findEquipmentDefinition(id));
}
