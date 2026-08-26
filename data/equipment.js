import { getWeapon } from "./weapons.js";

export const EQUIPMENT_SLOTS = Object.freeze([
  "rightArmId",
  "leftArmId",
  "headId",
  "bodyId",
  "footId",
  "accessoryId"
]);

export const ANTI_MAGIC_SET_EQUIPMENT_IDS = Object.freeze([
  "anti_magic_hat",
  "anti_magic_mantle",
  "anti_magic_shoes"
]);
export const ANTI_MAGIC_SET_MAGIC_DAMAGE_REDUCTION = 0.1;

export const EQUIPMENT = Object.freeze({
  musa_crown: item("musa_crown", "ムーサの冠", "accessoryId", { def: 6, temptationResistance: 1 }, {
    sellPrice: 0,
    hiddenStatBonusKeys: Object.freeze(["temptationResistance"]),
    unique: true
  }),
  fireproof_boots: item("fireproof_boots", "耐火ブーツ", "footId", { def: 3, fireDamageReduction: 0.15 }, {
    fireFloorDamageImmunity: true,
    hiddenStatBonusKeys: Object.freeze(["fireDamageReduction"])
  }),
  coldproof_boots: item("coldproof_boots", "防寒ブーツ", "footId", { def: 3, iceDamageReduction: 0.15 }, {
    coldFloorDamageImmunity: true,
    hiddenStatBonusKeys: Object.freeze(["iceDamageReduction"])
  }),
  anti_magic_necklace: item("anti_magic_necklace", "魔除けのネックレス", "accessoryId", {
    magicDamageReduction: 0.05
  }, {
    buyPrice: 1500,
    sellPrice: 750
  }),
  rebellious_choker: item("rebellious_choker", "反骨のチョーカー", "accessoryId", {
    def: 3,
    actionSkipResistance: 0.15
  }, {
    buyPrice: 2000,
    sellPrice: 1000
  }),
  anti_magic_hat: item("anti_magic_hat", "耐魔の帽子", "headId", {
    def: 2, magicDamageReduction: 0.02
  }, antiMagicArmor({
    1: { def: 3, magicDamageReduction: 0.02 },
    2: { def: 3, magicDamageReduction: 0.03 },
    3: { def: 4, magicDamageReduction: 0.04 }
  })),
  anti_magic_mantle: item("anti_magic_mantle", "耐魔の外套", "bodyId", {
    def: 3, magicDamageReduction: 0.03
  }, antiMagicArmor({
    1: { def: 4, magicDamageReduction: 0.03 },
    2: { def: 4, magicDamageReduction: 0.05 },
    3: { def: 5, magicDamageReduction: 0.07 }
  })),
  anti_magic_shoes: item("anti_magic_shoes", "耐魔の靴", "footId", {
    def: 2, magicDamageReduction: 0.02
  }, antiMagicArmor({
    1: { def: 3, magicDamageReduction: 0.02 },
    2: { def: 3, magicDamageReduction: 0.03 },
    3: { def: 4, magicDamageReduction: 0.04 }
  })),
  spell_sealing_talisman: item("spell_sealing_talisman", "魔封じの護符", "accessoryId", {
    def: 2,
    magicDamageReduction: 0.1
  }, {
    buyPrice: 10000,
    sellPrice: 5000,
    shopUnlockDepth: 50,
    statBonusesByEnhancement: Object.freeze({
      1: Object.freeze({ def: 2, magicDamageReduction: 0.15 }),
      2: Object.freeze({ def: 2, magicDamageReduction: 0.2 }),
      3: Object.freeze({ def: 3, magicDamageReduction: 0.25 })
    }),
    sellPriceByEnhancement: Object.freeze({ 0: 5000, 1: 6000, 2: 7500, 3: 10000 })
  }),
  mana_amplifier: item("mana_amplifier", "マナ増幅器", "accessoryId", { attackSpellDamageBonus: 0.05 }, {
    buyPrice: 15000, sellPrice: 7500, shopUnlockDepth: 60,
    statBonusesByEnhancement: Object.freeze({
      1: Object.freeze({ attackSpellDamageBonus: 0.1 }),
      2: Object.freeze({ attackSpellDamageBonus: 0.15 }),
      3: Object.freeze({ int: 3, attackSpellDamageBonus: 0.2 })
    }),
    sellPriceByEnhancement: Object.freeze({ 0: 7500, 1: 9000, 2: 11250, 3: 15000 })
  }),
  masters_necklace: item("masters_necklace", "達人の首飾り", "accessoryId", { passiveInstantDeathRateBonus: 0.01 }, {
    buyPrice: 10000, sellPrice: 5000, shopUnlockDepth: 60,
    statBonusesByEnhancement: Object.freeze({
      1: Object.freeze({ passiveInstantDeathRateBonus: 0.02 }),
      2: Object.freeze({ passiveInstantDeathRateBonus: 0.03 }),
      3: Object.freeze({ luc: 3, passiveInstantDeathRateBonus: 0.04 })
    }),
    sellPriceByEnhancement: Object.freeze({ 0: 5000, 1: 6000, 2: 7500, 3: 10000 })
  }),
  poison_mask: item("poison_mask", "防毒マスク", "accessoryId", { poisonResistance: 0.15 }, {
    buyPrice: 10000, sellPrice: 5000, shopUnlockDepth: 60,
    statBonusesByEnhancement: Object.freeze({
      1: Object.freeze({ poisonResistance: 0.2 }),
      2: Object.freeze({ poisonResistance: 0.25 }),
      3: Object.freeze({ def: 3, poisonResistance: 0.3 })
    }),
    sellPriceByEnhancement: Object.freeze({ 0: 5000, 1: 6000, 2: 7500, 3: 10000 })
  }),
  grain_choker: item("grain_choker", "稲穂のチョーカー", "accessoryId", { healingMiracleBonus: 0.05 }, {
    buyPrice: 10000, sellPrice: 5000, shopUnlockDepth: 60,
    statBonusesByEnhancement: Object.freeze({
      1: Object.freeze({ healingMiracleBonus: 0.1 }),
      2: Object.freeze({ healingMiracleBonus: 0.15 }),
      3: Object.freeze({ luc: 3, healingMiracleBonus: 0.2 })
    }),
    sellPriceByEnhancement: Object.freeze({ 0: 5000, 1: 6000, 2: 7500, 3: 10000 })
  }),
  blacksteel_greatshield: item("blacksteel_greatshield", "黒鋼の大盾", "leftArmId", { def: 8, dex: 4 }, deepArmor("warrior", {
    1: { def: 9, dex: 4 }, 2: { def: 10, dex: 5 }, 3: { def: 11, dex: 6 }
  })),
  blacksteel_helmet: item("blacksteel_helmet", "黒鋼の兜", "headId", { def: 10 }, deepArmor("warrior", {
    1: { def: 11 }, 2: { def: 12 }, 3: { def: 13 }
  })),
  blacksteel_heavy_armor: item("blacksteel_heavy_armor", "黒鋼の重鎧", "bodyId", { def: 9, str: 4 }, deepArmor("warrior", {
    1: { def: 10, str: 4 }, 2: { def: 11, str: 5 }, 3: { def: 12, str: 6 }
  })),
  blacksteel_greaves: item("blacksteel_greaves", "黒鋼の脚甲", "footId", { def: 8, str: 4 }, deepArmor("warrior", {
    1: { def: 9, str: 4 }, 2: { def: 10, str: 5 }, 3: { def: 11, str: 6 }
  })),

  abyss_tiger_buckler: item("abyss_tiger_buckler", "奈落虎のバックラー", "leftArmId", { def: 8 }, deepArmor("thief", {
    1: { def: 9 }, 2: { def: 10 }, 3: { def: 11 }
  })),
  abyss_tiger_hood: item("abyss_tiger_hood", "奈落虎の軽兜", "headId", { def: 7, dex: 4 }, deepArmor("thief", {
    1: { def: 8, dex: 4 }, 2: { def: 9, dex: 5 }, 3: { def: 10, dex: 6 }
  })),
  abyss_tiger_light_armor: item("abyss_tiger_light_armor", "奈落虎の軽鎧", "bodyId", { def: 8, dex: 4 }, deepArmor("thief", {
    1: { def: 9, dex: 4 }, 2: { def: 10, dex: 5 }, 3: { def: 11, dex: 6 }
  })),
  abyss_tiger_boots: item("abyss_tiger_boots", "奈落虎のブーツ", "footId", { def: 6, agi: 6 }, deepArmor("thief", {
    1: { def: 7, agi: 6 }, 2: { def: 8, agi: 7 }, 3: { def: 9, agi: 8 }
  })),

  sacred_tree_shield: item("sacred_tree_shield", "聖樹の盾", "leftArmId", { def: 8 }, deepArmor("priest", {
    1: { def: 9 }, 2: { def: 10 }, 3: { def: 11 }
  })),
  sacred_tree_mitre: item("sacred_tree_mitre", "聖樹のミトラ", "headId", { def: 7, luc: 5 }, deepArmor("priest", {
    1: { def: 8, luc: 5 }, 2: { def: 9, luc: 6 }, 3: { def: 10, luc: 7 }
  })),
  sacred_tree_vestment: item("sacred_tree_vestment", "聖樹の祭服", "bodyId", { def: 8, luc: 4 }, deepArmor("priest", {
    1: { def: 9, luc: 4 }, 2: { def: 10, luc: 5 }, 3: { def: 11, luc: 6 }
  })),
  sacred_tree_shoes: item("sacred_tree_shoes", "聖樹の靴", "footId", { def: 7, agi: 6 }, deepArmor("priest", {
    1: { def: 8, agi: 6 }, 2: { def: 9, agi: 7 }, 3: { def: 10, agi: 8 }
  })),

  abyss_grimoire: item("abyss_grimoire", "深淵の魔導書", "leftArmId", { int: 10 }, deepArmor("mage", {
    1: { int: 11 }, 2: { int: 12 }, 3: { int: 13 }
  })),
  abyss_hat: item("abyss_hat", "深淵の帽子", "headId", { def: 8 }, deepArmor("mage", {
    1: { def: 9 }, 2: { def: 10 }, 3: { def: 11 }
  })),
  abyss_robe: item("abyss_robe", "深淵のローブ", "bodyId", { def: 8, int: 3 }, deepArmor("mage", {
    1: { def: 9, int: 3 }, 2: { def: 10, int: 4 }, 3: { def: 11, int: 5 }
  })),
  abyss_shoes: item("abyss_shoes", "深淵の靴", "footId", { def: 8, agi: 6 }, deepArmor("mage", {
    1: { def: 9, agi: 6 }, 2: { def: 10, agi: 7 }, 3: { def: 11, agi: 8 }
  })),

  amethyst_aegis: item("amethyst_aegis", "紫晶の大盾", "leftArmId", { def: 10, dex: 5, magicDamageReduction: 0.03 }, crystalArmor("warrior", {
    1: { def: 11, dex: 5, magicDamageReduction: 0.03 }, 2: { def: 12, dex: 6, magicDamageReduction: 0.04 }, 3: { def: 13, dex: 7, magicDamageReduction: 0.05 }
  })),
  amethyst_helmet: item("amethyst_helmet", "紫晶の兜", "headId", { def: 12, actionSkipResistance: 0.05 }, crystalArmor("warrior", {
    1: { def: 13, actionSkipResistance: 0.05 }, 2: { def: 14, actionSkipResistance: 0.07 }, 3: { def: 15, actionSkipResistance: 0.1 }
  })),
  amethyst_plate: item("amethyst_plate", "紫晶の重鎧", "bodyId", { def: 12, str: 5, magicDamageReduction: 0.05 }, crystalArmor("warrior", {
    1: { def: 13, str: 5, magicDamageReduction: 0.05 }, 2: { def: 14, str: 6, magicDamageReduction: 0.07 }, 3: { def: 15, str: 7, magicDamageReduction: 0.1 }
  })),
  amethyst_greaves: item("amethyst_greaves", "紫晶の脚甲", "footId", { def: 10, str: 5 }, crystalArmor("warrior", {
    1: { def: 11, str: 5 }, 2: { def: 12, str: 6 }, 3: { def: 13, str: 7 }
  })),

  phantom_crystal_buckler: item("phantom_crystal_buckler", "幻晶のバックラー", "leftArmId", { def: 9, dex: 5 }, crystalArmor("thief", {
    1: { def: 10, dex: 5 }, 2: { def: 11, dex: 6 }, 3: { def: 12, dex: 7 }
  })),
  phantom_crystal_hood: item("phantom_crystal_hood", "幻晶のフード", "headId", { def: 9, dex: 5, actionSkipResistance: 0.04 }, crystalArmor("thief", {
    1: { def: 10, dex: 5, actionSkipResistance: 0.04 }, 2: { def: 11, dex: 6, actionSkipResistance: 0.06 }, 3: { def: 12, dex: 7, actionSkipResistance: 0.08 }
  })),
  phantom_crystal_armor: item("phantom_crystal_armor", "幻晶の軽鎧", "bodyId", { def: 10, dex: 5, magicDamageReduction: 0.04 }, crystalArmor("thief", {
    1: { def: 11, dex: 5, magicDamageReduction: 0.04 }, 2: { def: 12, dex: 6, magicDamageReduction: 0.06 }, 3: { def: 13, dex: 7, magicDamageReduction: 0.08 }
  })),
  phantom_crystal_boots: item("phantom_crystal_boots", "幻晶のブーツ", "footId", { def: 8, agi: 7, surpriseResistance: 0.03 }, crystalArmor("thief", {
    1: { def: 9, agi: 7, surpriseResistance: 0.03 }, 2: { def: 10, agi: 8, surpriseResistance: 0.04 }, 3: { def: 11, agi: 9, surpriseResistance: 0.05 }
  })),

  white_crystal_shield: item("white_crystal_shield", "白晶の聖盾", "leftArmId", { def: 9, magicDamageReduction: 0.04 }, crystalArmor("priest", {
    1: { def: 10, magicDamageReduction: 0.04 }, 2: { def: 11, magicDamageReduction: 0.06 }, 3: { def: 12, magicDamageReduction: 0.08 }
  })),
  white_crystal_mitre: item("white_crystal_mitre", "白晶のミトラ", "headId", { def: 9, luc: 6, maxSp: 8 }, crystalArmor("priest", {
    1: { def: 10, luc: 6, maxSp: 8 }, 2: { def: 11, luc: 7, maxSp: 10 }, 3: { def: 12, luc: 8, maxSp: 12 }
  })),
  white_crystal_vestment: item("white_crystal_vestment", "白晶の祭服", "bodyId", { def: 10, luc: 5, healingMiracleBonus: 0.05 }, crystalArmor("priest", {
    1: { def: 11, luc: 5, healingMiracleBonus: 0.05 }, 2: { def: 12, luc: 6, healingMiracleBonus: 0.07 }, 3: { def: 13, luc: 7, healingMiracleBonus: 0.1 }
  })),
  white_crystal_shoes: item("white_crystal_shoes", "白晶の聖靴", "footId", { def: 8, agi: 7, maxSp: 8 }, crystalArmor("priest", {
    1: { def: 9, agi: 7, maxSp: 8 }, 2: { def: 10, agi: 8, maxSp: 10 }, 3: { def: 11, agi: 9, maxSp: 12 }
  })),

  astral_crystal_grimoire: item("astral_crystal_grimoire", "星晶の魔導書", "leftArmId", { int: 12, maxSp: 16 }, crystalArmor("mage", {
    1: { int: 13, maxSp: 16 }, 2: { int: 14, maxSp: 20 }, 3: { int: 15, maxSp: 24 }
  })),
  astral_crystal_hat: item("astral_crystal_hat", "星晶の帽子", "headId", { def: 9, maxSp: 10 }, crystalArmor("mage", {
    1: { def: 10, maxSp: 10 }, 2: { def: 11, maxSp: 12 }, 3: { def: 12, maxSp: 15 }
  })),
  astral_crystal_robe: item("astral_crystal_robe", "星晶のローブ", "bodyId", { def: 10, int: 4, magicDamageReduction: 0.06 }, crystalArmor("mage", {
    1: { def: 11, int: 4, magicDamageReduction: 0.06 }, 2: { def: 12, int: 5, magicDamageReduction: 0.08 }, 3: { def: 13, int: 6, magicDamageReduction: 0.1 }
  })),
  astral_crystal_shoes: item("astral_crystal_shoes", "星晶の靴", "footId", { def: 8, agi: 7, maxSp: 10 }, crystalArmor("mage", {
    1: { def: 9, agi: 7, maxSp: 10 }, 2: { def: 10, agi: 8, maxSp: 12 }, 3: { def: 11, agi: 9, maxSp: 15 }
  })),
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
  const equippedIds = [];
  for (const slot of EQUIPMENT_SLOTS) {
    const equippedId = slot === "rightArmId"
      ? equipment.rightArmId || equipment.weaponId
      : equipment[slot];
    const equipped = getEquipmentItem(equippedId, slot);
    if (equipped?.id) equippedIds.push(equipped.id);
    for (const [key, value] of Object.entries(equipped?.statBonuses || {})) {
      bonuses[key] = (bonuses[key] || 0) + Number(value || 0);
    }
  }
  applyAntiMagicSetBonus(bonuses, equippedIds);
  return bonuses;
}

export function applyAntiMagicSetBonus(bonuses = {}, equippedIds = []) {
  const equipped = new Set(equippedIds);
  if (ANTI_MAGIC_SET_EQUIPMENT_IDS.every(id => equipped.has(id))) {
    bonuses.magicDamageReduction = (Number(bonuses.magicDamageReduction) || 0)
      + ANTI_MAGIC_SET_MAGIC_DAMAGE_REDUCTION;
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

function antiMagicArmor(statBonusesByEnhancement) {
  return {
    sellPrice: 250,
    statBonusesByEnhancement: Object.freeze(Object.fromEntries(
      Object.entries(statBonusesByEnhancement).map(([level, bonuses]) => [
        level,
        Object.freeze({ ...bonuses })
      ])
    )),
    sellPriceByEnhancement: Object.freeze({ 0: 250, 1: 300, 2: 450, 3: 700 })
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

function deepArmor(job, statBonusesByEnhancement) {
  return {
    allowedJobs: Object.freeze([job]),
    buyPrice: 6000,
    sellPrice: 3000,
    shopUnlockDepth: 50,
    statBonusesByEnhancement: Object.freeze(Object.fromEntries(
      Object.entries(statBonusesByEnhancement).map(([level, bonuses]) => [
        level,
        Object.freeze({ ...bonuses })
      ])
    )),
    sellPriceByEnhancement: Object.freeze({ 0: 3000, 1: 3600, 2: 4500, 3: 6000 })
  };
}

function crystalArmor(job, statBonusesByEnhancement) {
  return {
    allowedJobs: Object.freeze([job]),
    buyPrice: 12000,
    sellPrice: 6000,
    shopUnlockDepth: 80,
    statBonusesByEnhancement: Object.freeze(Object.fromEntries(
      Object.entries(statBonusesByEnhancement).map(([level, bonuses]) => [level, Object.freeze({ ...bonuses })])
    )),
    sellPriceByEnhancement: Object.freeze({ 0: 6000, 1: 7200, 2: 9000, 3: 12000 })
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
