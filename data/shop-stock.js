import { getEquipmentInstanceDefinition, getEquipmentInstanceName } from "./equipment-inventory.js";
import { getItem, getShopItemIdsForCharacter } from "./items.js";
import { WEAPONS } from "./weapons.js";

export const SHOP_BASELINE_DEPTH = 1;

const ARMOR_FAMILIES = Object.freeze([
  Object.freeze(["iron_buckler", "iron_helmet", "chainmail", "iron_greaves"]),
  Object.freeze(["leather_buckler", "leather_cap", "leather_armor", "leather_boots"]),
  Object.freeze(["wooden_shield", "priest_hat", "priest_robe", "leather_shoes"]),
  Object.freeze(["beginner_grimoire", "mage_hat", "mage_robe", "cloth_shoes"])
]);

export const FINAL_ARMOR_FAMILIES = Object.freeze([
  Object.freeze(["steel_shield", "steel_helmet", "steel_surcoat", "steel_greaves"]),
  Object.freeze(["silver_buckler", "silver_light_helmet", "silver_light_armor", "silver_boots"]),
  Object.freeze(["silver_light_shield", "silver_mitre", "silver_vestment", "silver_shoes"]),
  Object.freeze(["intermediate_grimoire", "tudor_hat", "mage_tunic", "leather_poulaines"])
]);

export const DEEP_ARMOR_FAMILIES = Object.freeze([
  Object.freeze(["blacksteel_greatshield", "blacksteel_helmet", "blacksteel_heavy_armor", "blacksteel_greaves"]),
  Object.freeze(["abyss_tiger_buckler", "abyss_tiger_hood", "abyss_tiger_light_armor", "abyss_tiger_boots"]),
  Object.freeze(["sacred_tree_shield", "sacred_tree_mitre", "sacred_tree_vestment", "sacred_tree_shoes"]),
  Object.freeze(["abyss_grimoire", "abyss_hat", "abyss_robe", "abyss_shoes"])
]);

export const SHOP_ARMOR_STOCK = Object.freeze([
  ...armorTier(1, 1, []),
  ...armorTier(2, 10, ["transfer_portal_b10f_unlocked", "boss_strange_knight_statue_b9f_defeated"]),
  ...armorTier(3, 20, ["shop_stock_b20f_unlocked", "boss_fallen_mage_b19f_defeated"]),
  ...finalArmorStock(),
  ...deepArmorStock()
]);

export const SHOP_ACCESSORY_STOCK = Object.freeze([
  Object.freeze({
    id: "shop_anti_magic_necklace",
    equipmentId: "anti_magic_necklace",
    enhancement: 0,
    shopUnlockDepth: 10,
    requiredFlags: Object.freeze(["transfer_portal_b10f_unlocked", "boss_strange_knight_statue_b9f_defeated"])
  }),
  Object.freeze({
    id: "shop_rebellious_choker",
    equipmentId: "rebellious_choker",
    enhancement: 0,
    shopUnlockDepth: 20,
    requiredFlags: Object.freeze(["shop_stock_b20f_unlocked"])
  }),
  Object.freeze({
    id: "shop_spell_sealing_talisman",
    equipmentId: "spell_sealing_talisman",
    enhancement: 0,
    shopUnlockDepth: 50,
    requiredFlags: Object.freeze(["transfer_portal_b50f_unlocked", "boss_eiskoenigin_b49f_defeated"])
  }),
  ...["mana_amplifier", "masters_necklace", "poison_mask"].map(equipmentId => Object.freeze({
    id: `shop_${equipmentId}`,
    equipmentId,
    enhancement: 0,
    shopUnlockDepth: 60,
    requiredFlags: Object.freeze(["transfer_portal_b60f_unlocked"])
  }))
]);

export function getShopEquipmentIdsForDepth(depth = 1) {
  const reached = normalizeDepth(depth);
  return Object.values(WEAPONS)
    .filter(item => Number.isFinite(item.buyPrice) && normalizeDepth(item.shopUnlockDepth) <= reached)
    .map(item => item.id);
}

export function getShopEquipmentStock(character) {
  const reached = normalizeDepth(character?.highestDungeonDepthReached);
  const eventFlags = character?.eventFlags || {};
  const job = character?.job;
  const weapons = Object.values(WEAPONS)
    .filter(item => Number.isFinite(item.buyPrice))
    .filter(item => normalizeDepth(item.shopUnlockDepth) <= reached)
    .filter(item => (item.shopRequiredFlags || []).every(flag => eventFlags[flag] === true))
    .filter(item => !item.allowedJobs?.length || item.allowedJobs.includes(job))
    .map(item => ({ ...item, equipmentId: item.id, slot: "rightArmId", enhancement: 0 }));
  const armor = SHOP_ARMOR_STOCK
    .filter(entry => entry.shopUnlockDepth <= reached)
    .filter(entry => entry.requiredFlags.every(flag => eventFlags[flag] === true))
    .map(toEquipmentOffer)
    .filter(entry => !entry.allowedJobs?.length || entry.allowedJobs.includes(job));
  const accessories = SHOP_ACCESSORY_STOCK
    .filter(entry => entry.shopUnlockDepth <= reached)
    .filter(entry => entry.requiredFlags.every(flag => eventFlags[flag] === true))
    .map(toEquipmentOffer);
  return [...weapons, ...armor, ...accessories];
}

export function getShopEquipmentOffer(character, stockId) {
  return getShopEquipmentStock(character).find(entry => entry.id === stockId) || null;
}

export function getShopStockState(character) {
  const reached = normalizeDepth(character?.highestDungeonDepthReached);
  const eventFlags = character?.eventFlags || {};
  const categoryDepths = {
    equipment: latestUnlockDepth(getShopEquipmentStock(character)),
    items: latestUnlockDepth(getShopItemIdsForCharacter(character).map(getItem))
  };
  const seen = eventFlags.shopStockSeenCategories || {};
  const newCategories = Object.fromEntries(Object.entries(categoryDepths).map(([category, depth]) => [
    category,
    depth > SHOP_BASELINE_DEPTH && depth > normalizeSeenDepth(seen[category])
  ]));
  const newStockIds = {
    equipment: getShopEquipmentStock(character)
      .filter(item => normalizeDepth(item.shopUnlockDepth) > normalizeSeenDepth(seen.equipment))
      .map(item => item.id),
    items: getShopItemIdsForCharacter(character)
      .map(getItem)
      .filter(Boolean)
      .filter(item => normalizeDepth(item.shopUnlockDepth) > normalizeSeenDepth(seen.items))
      .map(item => item.id)
  };
  const latestDepth = Math.max(...Object.values(categoryDepths));
  return {
    reached,
    categoryDepths,
    newCategories,
    newStockIds,
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
    character: withEventFlags(character, { shopStockAnnouncementDepth: stock.latestDepth })
  };
}

export function markShopCategorySeen(character, category) {
  if (!["equipment", "items"].includes(category)) return character;
  const stock = getShopStockState(character);
  return withEventFlags(character, {
    shopStockSeenCategories: {
      ...(character?.eventFlags?.shopStockSeenCategories || {}),
      [category]: stock.categoryDepths[category]
    }
  });
}

function armorTier(enhancement, shopUnlockDepth, requiredFlags) {
  return ARMOR_FAMILIES.flatMap(family => family).map(equipmentId => Object.freeze({
    id: `shop_${equipmentId}_plus_${enhancement}`,
    equipmentId,
    enhancement,
    shopUnlockDepth,
    requiredFlags: Object.freeze([...requiredFlags])
  }));
}

function finalArmorStock() {
  return FINAL_ARMOR_FAMILIES.flatMap(family => family).map(equipmentId => Object.freeze({
    id: `shop_${equipmentId}`,
    equipmentId,
    enhancement: 0,
    shopUnlockDepth: 30,
    requiredFlags: Object.freeze(["shop_stock_b30f_unlocked", "boss_iron_maiden_b29f_defeated"])
  }));
}

function deepArmorStock() {
  return DEEP_ARMOR_FAMILIES.flatMap(family => family).map(equipmentId => Object.freeze({
    id: `shop_${equipmentId}`,
    equipmentId,
    enhancement: 0,
    shopUnlockDepth: 50,
    requiredFlags: Object.freeze(["transfer_portal_b50f_unlocked"])
  }));
}

function toEquipmentOffer(entry) {
  const instance = { equipmentId: entry.equipmentId, enhancement: entry.enhancement };
  const definition = getEquipmentInstanceDefinition(instance);
  return {
    ...definition,
    ...entry,
    name: getEquipmentInstanceName(instance),
    buyPrice: definition?.buyPrice,
    sellPrice: definition?.sellPrice,
    description: describeBonuses(definition?.statBonuses)
  };
}

function describeBonuses(bonuses = {}) {
  return Object.entries(bonuses)
    .map(([key, value]) => key === "magicDamageReduction"
      ? `呪文耐性+${Math.round(Number(value) * 100)}%`
      : key === "actionSkipResistance"
        ? `行動不能耐性+${Math.round(Number(value) * 100)}%`
      : key === "attackSpellDamageBonus"
        ? `攻撃呪文威力+${Math.round(Number(value) * 100)}%`
      : key === "passiveInstantDeathRateBonus"
        ? `一閃・暗殺術+${Math.round(Number(value) * 100)}%`
      : key === "poisonResistance"
        ? `毒・猛毒耐性+${Math.round(Number(value) * 100)}%`
      : `${key === "def" ? "DEF" : key.toUpperCase()}+${value}`)
    .join(" / ");
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
