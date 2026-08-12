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
  fireproof_boots: item("fireproof_boots", "耐火ブーツ", "footId", { def: 3 }, {
    fireFloorDamageImmunity: true
  }),
  anti_magic_necklace: item("anti_magic_necklace", "魔除けのネックレス", "accessoryId", {
    magicDamageReduction: 0.15
  }, {
    buyPrice: 1500,
    sellPrice: 750
  }),

  steel_shield: item("steel_shield", "鋼の盾", "leftArmId", { def: 4, dex: 2 }, finalArmor("warrior", {
    1: { def: 5, dex: 2 }, 2: { def: 5, dex: 3 }, 3: { def: 6, dex: 4 }
  })),
  steel_helmet: item("steel_helmet", "鋼の兜", "headId", { def: 6 }, finalArmor("warrior", {
    1: { def: 7 }, 2: { def: 8 }, 3: { def: 10 }
  })),
  steel_surcoat: item("steel_surcoat", "鋼のサーコート", "bodyId", { def: 5, str: 2 }, finalArmor("warrior", {
    1: { def: 6, str: 2 }, 2: { def: 6, str: 3 }, 3: { def: 7, str: 4 }
  })),
  steel_greaves: item("steel_greaves", "鋼のすね当て", "footId", { def: 4, str: 2 }, finalArmor("warrior", {
    1: { def: 5, str: 2 }, 2: { def: 5, str: 3 }, 3: { def: 6, str: 4 }
  })),

  silver_buckler: item("silver_buckler", "銀のバックラー", "leftArmId", { def: 5 }, finalArmor("thief", {
    1: { def: 6 }, 2: { def: 7 }, 3: { def: 8 }
  })),
  silver_light_helmet: item("silver_light_helmet", "銀の軽兜", "headId", { def: 4, dex: 2 }, finalArmor("thief", {
    1: { def: 5, dex: 2 }, 2: { def: 5, dex: 3 }, 3: { def: 6, dex: 4 }
  })),
  silver_light_armor: item("silver_light_armor", "銀の軽鎧", "bodyId", { def: 4, dex: 2 }, finalArmor("thief", {
    1: { def: 5, dex: 2 }, 2: { def: 5, dex: 3 }, 3: { def: 6, dex: 4 }
  })),
  silver_boots: item("silver_boots", "銀のブーツ", "footId", { def: 3, agi: 4 }, finalArmor("thief", {
    1: { def: 4, agi: 4 }, 2: { def: 4, agi: 5 }, 3: { def: 5, agi: 6 }
  })),

  silver_light_shield: item("silver_light_shield", "銀の軽盾", "leftArmId", { def: 5 }, finalArmor("priest", {
    1: { def: 6 }, 2: { def: 7 }, 3: { def: 8 }
  })),
  silver_mitre: item("silver_mitre", "銀のミトラ", "headId", { def: 4, luc: 3 }, finalArmor("priest", {
    1: { def: 5, luc: 3 }, 2: { def: 5, luc: 4 }, 3: { def: 6, luc: 5 }
  })),
  silver_vestment: item("silver_vestment", "銀の祭服", "bodyId", { def: 4, luc: 2 }, finalArmor("priest", {
    1: { def: 5, luc: 2 }, 2: { def: 5, luc: 3 }, 3: { def: 6, luc: 4 }
  })),
  silver_shoes: item("silver_shoes", "銀の靴", "footId", { def: 4, agi: 4 }, finalArmor("priest", {
    1: { def: 5, agi: 4 }, 2: { def: 5, agi: 5 }, 3: { def: 6, agi: 6 }
  })),

  intermediate_grimoire: item("intermediate_grimoire", "中級魔道書", "leftArmId", { int: 5 }, finalArmor("mage", {
    1: { int: 6 }, 2: { int: 7 }, 3: { int: 8 }
  })),
  tudor_hat: item("tudor_hat", "チューダーハット", "headId", { def: 5 }, finalArmor("mage", {
    1: { def: 6 }, 2: { def: 7 }, 3: { def: 8 }
  })),
  mage_tunic: item("mage_tunic", "魔術師のチュニック", "bodyId", { def: 4, int: 1 }, finalArmor("mage", {
    1: { def: 5, int: 1 }, 2: { def: 5, int: 2 }, 3: { def: 6, int: 3 }
  })),
  leather_poulaines: item("leather_poulaines", "革のプーレーヌ", "footId", { def: 4, agi: 4 }, finalArmor("mage", {
    1: { def: 5, agi: 4 }, 2: { def: 5, agi: 5 }, 3: { def: 6, agi: 6 }
  })),

  iron_buckler: item("iron_buckler", "鉄の小盾", "leftArmId", { def: 2 }, enhancedArmor("warrior", {
    1: { def: 3 }, 2: { def: 4 }, 3: { def: 4, dex: 1 }
  })),
  leather_buckler: item("leather_buckler", "革のバックラー", "leftArmId", { def: 1 }, thiefArmor({
    1: { def: 2 }, 2: { def: 3 }, 3: { def: 4 }
  })),
  wooden_shield: item("wooden_shield", "木の盾", "leftArmId", { def: 1 }, enhancedArmor("priest", {
    1: { def: 2 }, 2: { def: 3 }, 3: { def: 4 }
  })),
  beginner_grimoire: item("beginner_grimoire", "初級魔導書", "leftArmId", { int: 1 }, enhancedArmor("mage", {
    1: { int: 2 }, 2: { int: 3 }, 3: { int: 4 }
  })),

  iron_helmet: item("iron_helmet", "鉄の兜", "headId", { def: 2, str: 1 }, enhancedArmor("warrior", {
    1: { def: 3 }, 2: { def: 4 }, 3: { def: 5 }
  })),
  leather_cap: item("leather_cap", "革の帽子", "headId", { def: 1, dex: 1 }, thiefArmor({
    1: { def: 2, dex: 1 }, 2: { def: 2, dex: 2 }, 3: { def: 3, dex: 2 }
  })),
  priest_hat: item("priest_hat", "聖職者の帽子", "headId", { def: 1, luc: 1 }, enhancedArmor("priest", {
    1: { def: 2, luc: 1 }, 2: { def: 3, luc: 1 }, 3: { def: 4, luc: 2 }
  })),
  mage_hat: item("mage_hat", "魔術師の帽子", "headId", { def: 1, int: 1 }, enhancedArmor("mage", {
    1: { def: 2, int: 1 }, 2: { def: 3, int: 1 }, 3: { def: 4, int: 1 }
  })),

  chainmail: item("chainmail", "鎖かたびら", "bodyId", { def: 3 }, enhancedArmor("warrior", {
    1: { def: 3, str: 1 }, 2: { def: 3, str: 2 }, 3: { def: 4, str: 2 }
  })),
  leather_armor: item("leather_armor", "革の鎧", "bodyId", { def: 2 }, thiefArmor({
    1: { def: 2, dex: 1 }, 2: { def: 3, dex: 1 }, 3: { def: 3, dex: 2 }
  })),
  priest_robe: item("priest_robe", "聖職者の法衣", "bodyId", { def: 2 }, enhancedArmor("priest", {
    1: { def: 2, luc: 1 }, 2: { def: 3, luc: 1 }, 3: { def: 4, luc: 1 }
  })),
  mage_robe: item("mage_robe", "魔術師のローブ", "bodyId", { def: 1 }, enhancedArmor("mage", {
    1: { def: 2 }, 2: { def: 3 }, 3: { def: 4 }
  })),

  iron_greaves: item("iron_greaves", "鉄のすね当て", "footId", { def: 1 }, enhancedArmor("warrior", {
    1: { def: 1, str: 1 }, 2: { def: 2, str: 1 }, 3: { def: 3, str: 1 }
  })),
  leather_boots: item("leather_boots", "革のブーツ", "footId", { def: 1 }, thiefArmor({
    1: { def: 1, agi: 1 }, 2: { def: 2, agi: 2 }, 3: { def: 3, agi: 3 }
  })),
  leather_shoes: item("leather_shoes", "革の靴", "footId", { def: 1 }, enhancedArmor("priest", {
    1: { def: 2, agi: 1 }, 2: { def: 2, agi: 2 }, 3: { def: 2, agi: 3 }
  })),
  cloth_shoes: item("cloth_shoes", "布の靴", "footId", { def: 1 }, enhancedArmor("mage", {
    1: { def: 2, agi: 1 }, 2: { def: 2, agi: 2 }, 3: { def: 2, agi: 3 }
  }))
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

function finalArmor(job, statBonusesByEnhancement) {
  return {
    allowedJobs: Object.freeze([job]),
    buyPrice: 3000,
    sellPrice: 1500,
    shopUnlockDepth: 30,
    statBonusesByEnhancement: Object.freeze(Object.fromEntries(
      Object.entries(statBonusesByEnhancement).map(([level, bonuses]) => [
        level,
        Object.freeze({ ...bonuses })
      ])
    )),
    sellPriceByEnhancement: Object.freeze({ 0: 1500, 1: 1800, 2: 2250, 3: 3000 })
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
