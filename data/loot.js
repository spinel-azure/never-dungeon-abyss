export const ENEMY_DROP_RATES = Object.freeze({ none: 0.4, item: 0.55, redChest: 0.05 });
export const STILETTO_ENHANCEMENT_RATES = Object.freeze([0.75, 0.18, 0.06, 0.01]);
export const BLACK_CHEST_STILETTO_ENHANCEMENT_RATES = Object.freeze([0.45, 0.35, 0.15, 0.05]);
export const MID_RED_CHEST_WEAPON_ENHANCEMENT_RATES = Object.freeze([0.7, 0.25, 0.05]);
export const DEEP_RED_CHEST_ARMOR_ENHANCEMENT_RATES = Object.freeze([0.7, 0.25, 0.05]);
export const MID_BLACK_CHEST_STAFF_ENHANCEMENT_RATES = Object.freeze([0.7, 0.25, 0.05]);
export const GOLD_CHEST_WEAPONS_BY_JOB = Object.freeze({
  warrior: "musashi_blade",
  thief: "the_five_star",
  priest: "sylvan_emera",
  mage: "comet_booster"
});
export const BLACK_CHEST_LOOT_TABLES = Object.freeze([
  Object.freeze({ minDepth: 6, maxDepth: 10, gold: [60, 80, 100], potionId: "healing_potion_medium" }),
  Object.freeze({ minDepth: 11, maxDepth: 19, gold: [100, 140, 180], potionId: "healing_potion_medium" }),
  Object.freeze({ minDepth: 20, maxDepth: Infinity, gold: [180, 240, 300], potionId: "healing_potion_large" })
]);

export function rollEnemyDrop(enemy, rng = Math.random) {
  if (enemy?.noDrop) return { kind: "none" };
  if (enemy?.dropProfile === "goldenBeetle") {
    return normalizedRoll(rng) < 0.01
      ? { kind: "card", cardId: "sr_golden_beetle", amount: 1, unidentifiedName: "？カード", rarity: "SR" }
      : { kind: "none" };
  }
  if (enemy?.dropProfile === "blackChest") return rollBlackChestLoot(rng, enemy.depth);
  const roll = normalizedRoll(rng);
  if (roll < 0.4) return { kind: "none" };
  if (roll < 0.95) {
    if (enemy?.dropItemId) return { kind: "item", itemId: enemy.dropItemId, amount: 1 };
    if (enemy?.dropGold) return { kind: "gold", amount: Math.max(1, Math.floor(Number(enemy.dropGold) || 0)) };
    return { kind: "none" };
  }
  return { kind: "redChest" };
}

export function getGoldChestWeaponId(job) {
  return GOLD_CHEST_WEAPONS_BY_JOB[String(job || "")] || null;
}

export function hasGoldChestWeapon(character) {
  const equipmentId = getGoldChestWeaponId(character?.job);
  if (!equipmentId) return false;
  return [
    ...(character?.equipmentInventory?.instances || []),
    ...(character?.warehouse?.equipmentInstances || []),
    ...(character?.lootBag?.equipmentInstances || [])
  ].some(instance => instance?.equipmentId === equipmentId)
    || Object.values(character?.equipment || {}).includes(equipmentId);
}

export function isGoldChestWeaponEligible(character) {
  return Boolean(getGoldChestWeaponId(character?.job)) && !hasGoldChestWeapon(character);
}

export function rollGoldChestLoot(character) {
  const equipmentId = getGoldChestWeaponId(character?.job);
  if (!equipmentId) return { kind: "none", reason: "unsupportedJob" };
  if (hasGoldChestWeapon(character)) return { kind: "none", reason: "alreadyOwned" };
  return {
    kind: "equipment",
    equipmentId,
    slot: "rightArmId",
    enhancement: 0,
    unidentifiedName: "？武器"
  };
}

export function rollBlackChestLoot(rng = Math.random, depth = 6) {
  const table = getBlackChestLootTable(depth);
  const roll = normalizedRoll(rng);
  if (Number(depth) >= 50 && Number(depth) <= 69) {
    const weaponIds = ["blacksteel_longsword", "abyss_fang", "sacred_tree_mace", "ancient_tree_staff"];
    const bandFloor = (Math.floor(Number(depth)) - 50) % 10;
    const equipmentId = weaponIds[bandFloor % weaponIds.length];
    return {
      kind: "equipment",
      equipmentId,
      slot: "rightArmId",
      enhancement: rollEnhancement(MID_RED_CHEST_WEAPON_ENHANCEMENT_RATES, rng) + 1,
      unidentifiedName: equipmentId === "ancient_tree_staff" ? "？両手杖" : "？武器"
    };
  }
  if (Number(depth) >= 6 && Number(depth) <= 10) {
    if (roll < 0.43) {
      return { kind: "item", itemId: "healing_potion_medium", amount: 1, unidentifiedName: "？薬" };
    }
    if (roll < 0.73) {
      return { kind: "card", cardId: rollFromList([
        "rare_strength_up_plus",
        "rare_dexterity_lesson_plus",
        "rare_lucky_charm_plus",
        "rare_knowledge_book_plus",
        "rare_gale_feather_plus"
      ], rng), amount: 1, unidentifiedName: "？カード", rarity: "R" };
    }
    if (roll < 0.93) {
      return { kind: "card", cardId: rollFromList(["rare_hp_up", "rare_sp_up"], rng),
        amount: 1, unidentifiedName: "？カード", rarity: "R" };
    }
    return { kind: "card", cardId: "sr_indomitable_spirit", amount: 1,
      unidentifiedName: "？カード", rarity: "SR" };
  }
  if (Number(depth) >= 11 && Number(depth) <= 20) {
    if (roll < 0.2) return {
      kind: "card", cardId: "common_sp_saver", amount: 1,
      unidentifiedName: "？カード", rarity: "C"
    };
    if (roll < 0.4) return {
      kind: "card", cardId: "rare_magic_resistance", amount: 1,
      unidentifiedName: "？カード", rarity: "R"
    };
    return {
      kind: "equipment",
      equipmentId: roll < 0.7 ? "salamander_staff" : "ice_lizard_staff",
      slot: "rightArmId",
      enhancement: rollEnhancement(MID_BLACK_CHEST_STAFF_ENHANCEMENT_RATES, rng) + 1,
      unidentifiedName: "？両手杖"
    };
  }
  if (roll < 0.45) return { kind: "gold", amount: rollBlackChestGold(rng, table) };
  if (roll < 0.65) return { kind: "item", itemId: table.potionId, amount: 1, unidentifiedName: "？薬" };
  if (roll < 0.8) return { kind: "item", itemId: "antidote", amount: 1, unidentifiedName: "？薬" };
  return { kind: "equipment", equipmentId: "stiletto", slot: "rightArmId",
    enhancement: rollEnhancement(BLACK_CHEST_STILETTO_ENHANCEMENT_RATES, rng), unidentifiedName: "？短剣" };
}

export function rollBlackChestGold(rng = Math.random, table = getBlackChestLootTable(6)) {
  const roll = normalizedRoll(rng);
  return roll < 0.5 ? table.gold[0] : roll < 0.85 ? table.gold[1] : table.gold[2];
}

export function getBlackChestLootTable(depth = 6) {
  const floor = Math.max(1, Math.floor(Number(depth) || 1));
  return BLACK_CHEST_LOOT_TABLES.find(table => floor >= table.minDepth && floor <= table.maxDepth)
    || BLACK_CHEST_LOOT_TABLES[0];
}

export function rollRedChestLoot(rng = Math.random, depth = 1) {
  const roll = normalizedRoll(rng);
  const floor = Math.max(1, Math.floor(Number(depth) || 1));
  if (floor >= 11 && floor <= 30) return rollMidRedChestLoot(roll, floor, rng);
  if (floor >= 31 && floor <= 40) return rollDeepRedChestLoot(roll, floor, rng);
  if (floor >= 50 && floor <= 59) return rollForestRedChestLoot(roll, floor, rng);
  if (floor >= 60 && floor <= 69) return rollDesertRedChestLoot(roll, rng);
  const earlyFloor = Number(depth) >= 1 && Number(depth) <= 9;
  if (earlyFloor && roll < 0.4) return { kind: "gold", amount: rollRedChestGold(rng) };
  if (earlyFloor && roll < 0.6) return { kind: "item", itemId: "healing_potion", amount: 1, unidentifiedName: "？薬" };
  if (earlyFloor && roll < 0.73) return { kind: "item", itemId: "antidote", amount: 1, unidentifiedName: "？薬" };
  if (earlyFloor && roll < 0.88) return {
    kind: "card",
    cardId: rollFromList([
      "common_stairs_detection",
      "common_person_detection",
      "common_treasure_detection"
    ], rng),
    amount: 1,
    unidentifiedName: "？カード",
    rarity: "C"
  };
  if (!earlyFloor && roll < 0.55) return { kind: "gold", amount: rollRedChestGold(rng) };
  if (!earlyFloor && roll < 0.75) return { kind: "item", itemId: "healing_potion", amount: 1, unidentifiedName: "？薬" };
  if (!earlyFloor && roll < 0.88) return { kind: "item", itemId: "antidote", amount: 1, unidentifiedName: "？薬" };
  return { kind: "equipment", equipmentId: "stiletto", slot: "rightArmId",
    enhancement: rollEnhancement(STILETTO_ENHANCEMENT_RATES, rng), unidentifiedName: "？短剣" };
}

export const PURPLE_CHEST_LOOT_TABLES = Object.freeze([
  Object.freeze({ minDepth: 1, maxDepth: 9 })
]);

export function hasPurpleChestLootTable(depth = 1) {
  const floor = Math.max(1, Math.floor(Number(depth) || 1));
  return PURPLE_CHEST_LOOT_TABLES.some(table => floor >= table.minDepth && floor <= table.maxDepth);
}

export function rollPurpleChestLoot(rng = Math.random, depth = 1) {
  if (!hasPurpleChestLootTable(depth)) return { kind: "none" };
  const roll = normalizedRoll(rng);
  const cardId = roll < 0.33
    ? "common_stairs_detection"
    : roll < 0.66
      ? "common_person_detection"
      : roll < 0.99
        ? "common_treasure_detection"
        : "sr_silent_steps";
  return {
    kind: "card",
    cardId,
    amount: 1,
    unidentifiedName: "？カード",
    rarity: cardId === "sr_silent_steps" ? "SR" : "C"
  };
}

function rollDeepRedChestLoot(roll, depth, rng) {
  if (roll < 0.1) {
    return { kind: "item", itemId: "healing_potion_large", amount: 1, unidentifiedName: "？薬" };
  }
  if (roll < 0.2) {
    return { kind: "item", itemId: "antidote_medium", amount: 1, unidentifiedName: "？薬" };
  }
  const family = depth <= 33
    ? ["steel_shield", "steel_helmet", "steel_surcoat", "steel_greaves"]
    : depth <= 36
      ? ["silver_buckler", "silver_light_helmet", "silver_light_armor", "silver_boots"]
      : depth <= 38
        ? ["silver_light_shield", "silver_mitre", "silver_vestment", "silver_shoes"]
        : ["intermediate_grimoire", "tudor_hat", "mage_tunic", "leather_poulaines"];
  const slotIndex = roll < 0.4 ? 0 : roll < 0.6 ? 1 : roll < 0.8 ? 2 : 3;
  const slots = ["leftArmId", "headId", "bodyId", "footId"];
  return {
    kind: "equipment",
    equipmentId: family[slotIndex],
    slot: slots[slotIndex],
    enhancement: rollEnhancement(DEEP_RED_CHEST_ARMOR_ENHANCEMENT_RATES, rng) + 1,
    unidentifiedName: slotIndex === 0 && depth >= 39 ? "？魔導書" : "？防具"
  };
}

function rollForestRedChestLoot(roll, depth, rng) {
  if (roll < 0.1) {
    return { kind: "item", itemId: "strong_healing_potion_small", amount: 1, unidentifiedName: "？薬" };
  }
  if (roll < 0.2) {
    return { kind: "item", itemId: "strong_antidote", amount: 1, unidentifiedName: "？薬" };
  }
  const families = [
    ["blacksteel_greatshield", "blacksteel_helmet", "blacksteel_heavy_armor", "blacksteel_greaves"],
    ["abyss_tiger_buckler", "abyss_tiger_hood", "abyss_tiger_light_armor", "abyss_tiger_boots"],
    ["sacred_tree_shield", "sacred_tree_mitre", "sacred_tree_vestment", "sacred_tree_shoes"],
    ["abyss_grimoire", "abyss_hat", "abyss_robe", "abyss_shoes"]
  ];
  const family = families[(depth - 50) % families.length];
  const slotIndex = roll < 0.4 ? 0 : roll < 0.6 ? 1 : roll < 0.8 ? 2 : 3;
  const slots = ["leftArmId", "headId", "bodyId", "footId"];
  return {
    kind: "equipment",
    equipmentId: family[slotIndex],
    slot: slots[slotIndex],
    enhancement: rollEnhancement(DEEP_RED_CHEST_ARMOR_ENHANCEMENT_RATES, rng) + 1,
    unidentifiedName: slotIndex === 0 && family === families[3] ? "？魔導書" : "？防具"
  };
}

function rollDesertRedChestLoot(roll, rng) {
  if (roll < 0.1) {
    return { kind: "item", itemId: "strong_healing_potion_small", amount: 1, unidentifiedName: "？薬" };
  }
  if (roll < 0.2) {
    return { kind: "item", itemId: "strong_antidote", amount: 1, unidentifiedName: "？薬" };
  }
  const equipmentId = rollFromList([
    "spell_sealing_talisman", "mana_amplifier", "masters_necklace", "poison_mask"
  ], rng);
  return {
    kind: "equipment",
    equipmentId,
    slot: "accessoryId",
    enhancement: rollEnhancement(DEEP_RED_CHEST_ARMOR_ENHANCEMENT_RATES, rng) + 1,
    unidentifiedName: "？装備"
  };
}

function rollMidRedChestLoot(roll, depth, rng) {
  if (roll < 0.5) {
    if (normalizedRoll(rng) < 0.5) return { kind: "gold", amount: rollMidRedChestGold(rng) };
    return { kind: "item", itemId: "healing_potion_medium", amount: 1, unidentifiedName: "？薬" };
  }
  if (roll < 0.8) {
    const cardRoll = normalizedRoll(rng);
    if (cardRoll < 0.5) return {
      kind: "card", cardId: rollFromList(["common_strength_down", "common_agility_down"], rng),
      amount: 1, unidentifiedName: "？カード", rarity: "C"
    };
    if (cardRoll < 0.9) return {
      kind: "card", cardId: "rare_spell_resistance",
      amount: 1, unidentifiedName: "？カード", rarity: "R"
    };
    return {
      kind: "card", cardId: "sr_scorching_resistance",
      amount: 1, unidentifiedName: "？カード", rarity: "SR"
    };
  }
  const equipmentId = depth >= 21
    ? rollFromList(["baselard", "silver_flail", "steel_longsword"], rng)
    : depth <= 12 ? "baselard" : depth <= 15 ? "silver_flail" : "steel_longsword";
  return {
    kind: "equipment", equipmentId, slot: "rightArmId",
    enhancement: rollEnhancement(MID_RED_CHEST_WEAPON_ENHANCEMENT_RATES, rng) + 1,
    unidentifiedName: "？武器"
  };
}

function rollMidRedChestGold(rng) {
  const roll = normalizedRoll(rng);
  return roll < 0.6 ? 60 : roll < 0.9 ? 90 : 120;
}

export function rollRedChestGold(rng = Math.random) {
  const roll = normalizedRoll(rng);
  return roll < 0.6 ? 20 : roll < 0.9 ? 30 : 50;
}

export function rollEnhancement(rates, rng = Math.random) {
  const roll = normalizedRoll(rng);
  let total = 0;
  for (let level = 0; level < rates.length; level += 1) {
    total += Number(rates[level]) || 0;
    if (roll < total) return level;
  }
  return Math.max(0, rates.length - 1);
}

function normalizedRoll(rng) {
  return Math.max(0, Math.min(0.999999999, Number(rng?.()) || 0));
}

function rollFromList(values, rng) {
  return values[Math.floor(normalizedRoll(rng) * values.length)];
}
