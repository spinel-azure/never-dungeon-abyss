import { getWeapon } from "./weapons.js";

export const EQUIPMENT_SLOTS = Object.freeze([
  "rightArmId",
  "leftArmId",
  "headId",
  "bodyId",
  "footId",
  "accessoryId"
]);

export const EQUIPMENT = Object.freeze({
  iron_buckler: item("iron_buckler", "鉄の小盾", "leftArmId", { def: 2 }, enhancedArmor("warrior", {
    1: { def: 3 }, 2: { def: 4 }, 3: { def: 4, dex: 1 }
  })),
  leather_buckler: item("leather_buckler", "革のバックラー", "leftArmId", { def: 1 }, thiefArmor({
    1: { def: 2 }, 2: { def: 3 }, 3: { def: 4 }
  })),
  wooden_shield: item("wooden_shield", "木の盾", "leftArmId", { def: 1 }),
  beginner_grimoire: item("beginner_grimoire", "初級魔導書", "leftArmId", { int: 1 }),

  iron_helmet: item("iron_helmet", "鉄の兜", "headId", { def: 2, str: 1 }, enhancedArmor("warrior", {
    1: { def: 3 }, 2: { def: 4 }, 3: { def: 5 }
  })),
  leather_cap: item("leather_cap", "革の帽子", "headId", { def: 1, dex: 1 }, thiefArmor({
    1: { def: 2, dex: 1 }, 2: { def: 2, dex: 2 }, 3: { def: 3, dex: 2 }
  })),
  priest_hat: item("priest_hat", "聖職者の帽子", "headId", { def: 1, luc: 1 }),
  mage_hat: item("mage_hat", "魔術師の帽子", "headId", { def: 1, int: 1 }),

  chainmail: item("chainmail", "鎖かたびら", "bodyId", { def: 3 }, enhancedArmor("warrior", {
    1: { def: 3, str: 1 }, 2: { def: 3, str: 2 }, 3: { def: 4, str: 2 }
  })),
  leather_armor: item("leather_armor", "革の鎧", "bodyId", { def: 2 }, thiefArmor({
    1: { def: 2, dex: 1 }, 2: { def: 3, dex: 1 }, 3: { def: 3, dex: 2 }
  })),
  priest_robe: item("priest_robe", "聖職者の法衣", "bodyId", { def: 2 }),
  mage_robe: item("mage_robe", "魔術師のローブ", "bodyId", { def: 1 }),

  iron_greaves: item("iron_greaves", "鉄のすね当て", "footId", { def: 1 }, enhancedArmor("warrior", {
    1: { def: 1, str: 1 }, 2: { def: 2, str: 1 }, 3: { def: 3, str: 1 }
  })),
  leather_boots: item("leather_boots", "革のブーツ", "footId", { def: 1 }, thiefArmor({
    1: { def: 1, agi: 1 }, 2: { def: 2, agi: 2 }, 3: { def: 3, agi: 3 }
  })),
  leather_shoes: item("leather_shoes", "革の靴", "footId", { def: 1 }),
  cloth_shoes: item("cloth_shoes", "布の靴", "footId", { def: 1 })
});

export const INITIAL_EQUIPMENT = Object.freeze({
  warrior: loadout("iron_longsword", "iron_buckler", "iron_helmet", "chainmail", "iron_greaves"),
  thief: loadout("iron_dagger", "leather_buckler", "leather_cap", "leather_armor", "leather_boots"),
  priest: loadout("iron_mace", "wooden_shield", "priest_hat", "priest_robe", "leather_shoes"),
  mage: loadout("oak_staff", "beginner_grimoire", "mage_hat", "mage_robe", "cloth_shoes")
});

export function getInitialEquipment(job) {
  return { ...(INITIAL_EQUIPMENT[job] || INITIAL_EQUIPMENT.warrior) };
}

export function getEquipmentItem(id, slot) {
  if (!id) return null;
  if (slot === "rightArmId") return getWeapon(id);
  const equipment = EQUIPMENT[id] || null;
  return !slot || equipment?.slot === slot ? equipment : null;
}

export function collectEquipmentBonuses(equipment = {}) {
  const bonuses = {};
  for (const slot of EQUIPMENT_SLOTS) {
    const equippedId = slot === "rightArmId"
      ? equipment.rightArmId || equipment.weaponId
      : equipment[slot];
    const equipped = getEquipmentItem(equippedId, slot);
    for (const [key, value] of Object.entries(equipped?.statBonuses || {})) {
      bonuses[key] = (bonuses[key] || 0) + Number(value || 0);
    }
  }
  return bonuses;
}

function item(id, name, slot, statBonuses, options = {}) {
  return Object.freeze({
    id,
    name,
    slot,
    statBonuses: Object.freeze({ ...statBonuses }),
    ...options
  });
}

function thiefArmor(statBonusesByEnhancement) {
  return enhancedArmor("thief", statBonusesByEnhancement);
}

function enhancedArmor(job, statBonusesByEnhancement) {
  return {
    allowedJobs: Object.freeze([job]),
    sellPrice: 25,
    statBonusesByEnhancement: Object.freeze(Object.fromEntries(
      Object.entries(statBonusesByEnhancement).map(([level, bonuses]) => [
        level,
        Object.freeze({ ...bonuses })
      ])
    )),
    buyPriceByEnhancement: Object.freeze({ 1: 100, 2: 500, 3: 1500 }),
    sellPriceByEnhancement: Object.freeze({ 0: 25, 1: 50, 2: 250, 3: 750 })
  };
}

function loadout(rightArmId, leftArmId, headId, bodyId, footId) {
  return Object.freeze({
    weaponId: rightArmId,
    rightArmId,
    leftArmId,
    headId,
    bodyId,
    footId,
    accessoryId: null
  });
}
