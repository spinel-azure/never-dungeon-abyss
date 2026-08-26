import test from "node:test";
import assert from "node:assert/strict";
import { getGoldChestWeaponId, hasGoldChestWeapon, hasPurpleChestLootTable, rollBlackChestLoot, rollEnemyDrop, rollGoldChestLoot, rollPurpleChestLoot, rollRedChestLoot } from "../data/loot.js";
import { buildBoundaryWallMap, cells } from "../js/dungeon.js";
import { getWeapon } from "../data/weapons.js";
import { getEquipmentItem } from "../data/equipment.js";
import { createInnStableRecovery, getInnStayFee } from "../js/character-services.js";
import { addLootCard, settleLootBag } from "../data/inventory.js";
import { createInitialCharacter } from "../data/classes.js";

const rng = (...values) => {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
};

test("Maikaefer drops the Golden Beetle card at one percent", () => {
  const enemy = { dropProfile: "goldenBeetle" };
  assert.deepEqual(rollEnemyDrop(enemy, () => 0.00999), {
    kind: "card", cardId: "sr_golden_beetle", amount: 1,
    unidentifiedName: "？カード", rarity: "SR"
  });
  assert.deepEqual(rollEnemyDrop(enemy, () => 0.01), { kind: "none" });
});

test("gold chests grant the player job's unique unenhanced romance weapon", () => {
  const expected = {
    warrior: "musashi_blade",
    thief: "the_five_star",
    priest: "sylvan_emera",
    mage: "comet_booster"
  };
  for (const [job, equipmentId] of Object.entries(expected)) {
    const character = createInitialCharacter({ name: "TEST", job });
    assert.equal(getGoldChestWeaponId(job), equipmentId);
    assert.deepEqual(rollGoldChestLoot(character), {
      kind: "equipment", equipmentId, slot: "rightArmId", enhancement: 0,
      unidentifiedName: "？武器"
    });
  }
});

test("gold chest romance weapons cannot be obtained twice across storage locations", () => {
  for (const location of ["equipmentInventory", "warehouse", "lootBag"]) {
    const character = createInitialCharacter({ name: "TEST", job: "mage" });
    const instance = { equipmentId: "comet_booster", slot: "rightArmId" };
    if (location === "equipmentInventory") character.equipmentInventory.instances.push(instance);
    if (location === "warehouse") character.warehouse.equipmentInstances.push(instance);
    if (location === "lootBag") character.lootBag.equipmentInstances.push(instance);
    assert.equal(hasGoldChestWeapon(character), true);
    assert.equal(rollGoldChestLoot(character).reason, "alreadyOwned");
  }
});

test("B50F to B58F replace the black chest with a gold chest on the one-percent roll", () => {
  buildBoundaryWallMap(50, () => 0, { blackChestsUnlocked: true, goldWeaponEligible: true });
  let treasures = cells.flat().map(cell => cell.treasure).filter(Boolean);
  assert.equal(treasures.filter(type => type === "gold").length, 1);
  assert.equal(treasures.includes("black"), false);

  buildBoundaryWallMap(50, () => 0.01, { blackChestsUnlocked: true, goldWeaponEligible: true });
  treasures = cells.flat().map(cell => cell.treasure).filter(Boolean);
  assert.equal(treasures.filter(type => type === "black").length, 1);
  assert.equal(treasures.includes("gold"), false);

  buildBoundaryWallMap(59, () => 0, { blackChestsUnlocked: true, goldWeaponEligible: true });
  treasures = cells.flat().map(cell => cell.treasure).filter(Boolean);
  assert.equal(treasures.includes("black"), false);
  assert.equal(cells.flat().filter(cell => cell.treasure === "gold" && cell.eventTreasureId === "red_rust_key_b59f_chest").length, 1);
});

test("B1F to B9F purple chests use the card-only 30/30/30/9/1 table", () => {
  assert.equal(hasPurpleChestLootTable(1), true);
  assert.equal(hasPurpleChestLootTable(9), true);
  assert.equal(hasPurpleChestLootTable(10), false);
  assert.equal(rollPurpleChestLoot(rng(0.299), 1).cardId, "common_stairs_detection");
  assert.equal(rollPurpleChestLoot(rng(0.3), 1).cardId, "common_person_detection");
  assert.equal(rollPurpleChestLoot(rng(0.6), 9).cardId, "common_treasure_detection");
  assert.equal(rollPurpleChestLoot(rng(0.9), 9).cardId, "rare_search_and_destroy");
  assert.equal(rollPurpleChestLoot(rng(0.9), 9).rarity, "R");
  assert.equal(rollPurpleChestLoot(rng(0.99), 9).cardId, "sr_silent_steps");
  assert.equal(rollPurpleChestLoot(rng(0), 10).kind, "none");
});

test("early enemy drops use 40/55/5 percent bands", () => {
  const enemy = { dropItemId: "rat_tail" };
  assert.equal(rollEnemyDrop(enemy, rng(0.399)).kind, "none");
  assert.deepEqual(rollEnemyDrop(enemy, rng(0.4)), { kind: "item", itemId: "rat_tail", amount: 1 });
  assert.equal(rollEnemyDrop(enemy, rng(0.949)).kind, "item");
  assert.equal(rollEnemyDrop(enemy, rng(0.95)).kind, "redChest");
});

test("B1F to B9F red chests use the early reward bands and upgraded gold values", () => {
  assert.equal(rollRedChestLoot(rng(0.1, 0.59), 1).amount, 20);
  assert.equal(rollRedChestLoot(rng(0.1, 0.6), 1).amount, 30);
  assert.equal(rollRedChestLoot(rng(0.1, 0.9), 1).amount, 50);
  assert.equal(rollRedChestLoot(rng(0.4), 9).itemId, "healing_potion");
  assert.equal(rollRedChestLoot(rng(0.6), 9).itemId, "antidote");
  assert.equal(rollRedChestLoot(rng(0.73, 0), 9).cardId, "common_stairs_detection");
  assert.equal(rollRedChestLoot(rng(0.73, 0.34), 9).cardId, "common_person_detection");
  assert.equal(rollRedChestLoot(rng(0.73, 0.67), 9).cardId, "common_treasure_detection");
  assert.equal(rollRedChestLoot(rng(0.88, 0.749), 9).enhancement, 0);
  assert.equal(rollRedChestLoot(rng(0.88, 0.75), 9).enhancement, 1);
  assert.equal(rollRedChestLoot(rng(0.88, 0.93), 9).enhancement, 2);
  assert.equal(rollRedChestLoot(rng(0.88, 0.99), 9).enhancement, 3);
  assert.equal(getWeapon("stiletto", 2).defensePenetration, 0.3);
});

test("later red chest reward categories keep their existing bands", () => {
  assert.equal(rollRedChestLoot(rng(0.54, 0), 41).kind, "gold");
  assert.equal(rollRedChestLoot(rng(0.55), 41).itemId, "healing_potion");
  assert.equal(rollRedChestLoot(rng(0.75), 41).itemId, "antidote");
  assert.equal(rollRedChestLoot(rng(0.88), 41).equipmentId, "stiletto");
});

test("B10F to B19F red chests use the midgame consumable, card and anti-magic armor table", () => {
  assert.equal(rollRedChestLoot(rng(0.1, 0.1, 0.59), 10).amount, 60);
  assert.equal(rollRedChestLoot(rng(0.1, 0.1, 0.6), 10).amount, 90);
  assert.equal(rollRedChestLoot(rng(0.1, 0.1, 0.9), 10).amount, 120);
  assert.equal(rollRedChestLoot(rng(0.1, 0.5), 10).itemId, "healing_potion_medium");
  assert.equal(rollRedChestLoot(rng(0.5, 0, 0), 10).cardId, "common_strength_down");
  assert.equal(rollRedChestLoot(rng(0.5, 0, 0.6), 10).cardId, "common_agility_down");
  assert.equal(rollRedChestLoot(rng(0.5, 0.5), 10).cardId, "rare_spell_resistance");
  assert.equal(rollRedChestLoot(rng(0.5, 0.95), 10).cardId, "sr_scorching_resistance");
  assert.deepEqual(
    [10, 13, 16].map(depth => rollRedChestLoot(rng(0.8, 0), depth).equipmentId),
    ["anti_magic_hat", "anti_magic_mantle", "anti_magic_shoes"]
  );
  assert.equal(rollRedChestLoot(rng(0.8, 0), 10).enhancement, 1);
  assert.equal(rollRedChestLoot(rng(0.8, 0.7), 13).enhancement, 2);
  assert.equal(rollRedChestLoot(rng(0.8, 0.95), 16).enhancement, 3);
  assert.equal(getEquipmentItem("anti_magic_hat", "headId").statBonuses.magicDamageReduction, 0.02);
  assert.equal(getEquipmentItem("anti_magic_mantle", "bodyId").statBonusesByEnhancement[3].magicDamageReduction, 0.07);
  assert.equal(getEquipmentItem("anti_magic_shoes", "footId").allowedJobs, undefined);
});

test("B19F ends the anti-magic armor table and B20F retains the following midgame table", () => {
  assert.equal(rollRedChestLoot(rng(0.95, 0), 19).equipmentId, "anti_magic_shoes");
  const weapon = rollRedChestLoot(rng(0.95, 0), 20);
  assert.equal(weapon.equipmentId, "steel_longsword");
  assert.equal(weapon.enhancement, 1);
});

test("B21F to B30F temporarily reuse the midgame red chest table", () => {
  for (const depth of [21, 25, 29, 30]) {
    assert.equal(rollRedChestLoot(rng(0.1, 0.5), depth).itemId, "healing_potion_medium");
    const weapon = rollRedChestLoot(rng(0.95, 0.999, 0), depth);
    assert.equal(weapon.equipmentId, "steel_longsword");
    assert.equal(weapon.enhancement, 1);
  }
});

test("B21F to B30F split the temporary weapon reward evenly across all three weapons", () => {
  assert.deepEqual(
    [0, 0.34, 0.67].map(weaponRoll => rollRedChestLoot(rng(0.95, weaponRoll, 0), 21).equipmentId),
    ["baselard", "silver_flail", "steel_longsword"]
  );
});

test("B31F to B40F red chests use floor-fixed class armor and 70/25/5 enhancements", () => {
  assert.equal(rollRedChestLoot(rng(0.099), 31).itemId, "healing_potion_large");
  assert.equal(rollRedChestLoot(rng(0.1), 31).itemId, "antidote_medium");
  assert.deepEqual(
    [31, 34, 37, 39].map(depth => rollRedChestLoot(rng(0.2, 0), depth).equipmentId),
    ["steel_shield", "silver_buckler", "silver_light_shield", "intermediate_grimoire"]
  );
  assert.deepEqual(
    [0.2, 0.4, 0.6, 0.8].map(roll => rollRedChestLoot(rng(roll, 0), 40).slot),
    ["leftArmId", "headId", "bodyId", "footId"]
  );
  assert.equal(rollRedChestLoot(rng(0.2, 0.699), 31).enhancement, 1);
  assert.equal(rollRedChestLoot(rng(0.2, 0.7), 31).enhancement, 2);
  assert.equal(rollRedChestLoot(rng(0.2, 0.95), 31).enhancement, 3);
});

test("B50F to B59F red chests cycle the new class armor with 70/25/5 enhancements", () => {
  assert.equal(rollRedChestLoot(rng(0.099), 50).itemId, "strong_healing_potion_small");
  assert.equal(rollRedChestLoot(rng(0.1), 50).itemId, "strong_antidote");
  assert.deepEqual(
    [50, 51, 52, 53].map(depth => rollRedChestLoot(rng(0.2, 0), depth).equipmentId),
    ["blacksteel_greatshield", "abyss_tiger_buckler", "sacred_tree_shield", "abyss_grimoire"]
  );
  assert.deepEqual(
    [0.2, 0.4, 0.6, 0.8].map(roll => rollRedChestLoot(rng(roll, 0), 57).slot),
    ["leftArmId", "headId", "bodyId", "footId"]
  );
  assert.equal(rollRedChestLoot(rng(0.2, 0.699), 54).enhancement, 1);
  assert.equal(rollRedChestLoot(rng(0.2, 0.7), 54).enhancement, 2);
  assert.equal(rollRedChestLoot(rng(0.2, 0.95), 54).enhancement, 3);
});

test("B60F to B69F red chests feature all five enhanced accessory series", () => {
  assert.equal(rollRedChestLoot(rng(0.099), 60).itemId, "strong_healing_potion_small");
  assert.equal(rollRedChestLoot(rng(0.1), 60).itemId, "strong_antidote");
  assert.equal(rollRedChestLoot(rng(0.2, 0), 60).equipmentId, "spell_sealing_talisman");
  assert.deepEqual(
    [0, 0.2, 0.4, 0.6, 0.8].map(accessoryRoll => rollRedChestLoot(rng(0.2, accessoryRoll, 0), 60).equipmentId),
    ["spell_sealing_talisman", "mana_amplifier", "masters_necklace", "poison_mask", "grain_choker"]
  );
  assert.equal(rollRedChestLoot(rng(0.8, 0), 69).slot, "accessoryId");
  assert.equal(rollRedChestLoot(rng(0.8, 0), 69).unidentifiedName, "？装備");
  assert.equal(rollRedChestLoot(rng(0.2, 0.699), 64).enhancement, 1);
  assert.equal(rollRedChestLoot(rng(0.2, 0.7), 64).enhancement, 2);
  assert.equal(rollRedChestLoot(rng(0.2, 0.95), 64).enhancement, 3);
});

test("B6F to B9F black chests use the potion, R-card and SR-card bands", () => {
  assert.equal(rollBlackChestLoot(rng(0.429), 6).itemId, "healing_potion_medium");
  assert.equal(rollBlackChestLoot(rng(0.43, 0), 6).cardId, "rare_strength_up_plus");
  assert.equal(rollBlackChestLoot(rng(0.43, 0.999), 9).cardId, "rare_gale_feather_plus");
  assert.equal(rollBlackChestLoot(rng(0.73, 0), 8).cardId, "rare_hp_up");
  assert.equal(rollBlackChestLoot(rng(0.73, 0.999), 8).cardId, "rare_sp_up");
  assert.equal(rollBlackChestLoot(rng(0.929, 0.999), 8).cardId, "rare_sp_up");
  assert.deepEqual(rollBlackChestLoot(rng(0.93), 6), {
    kind: "card", cardId: "sr_indomitable_spirit", amount: 1,
    unidentifiedName: "？カード", rarity: "SR"
  });
});

test("B10F to B19F black chests use SP cards, magic resistance, and the moved enhanced weapons", () => {
  assert.equal(rollBlackChestLoot(rng(0.199), 10).cardId, "common_sp_saver");
  assert.equal(rollBlackChestLoot(rng(0.2), 19).cardId, "rare_magic_resistance");
  assert.deepEqual(rollBlackChestLoot(rng(0.4, 0), 15), {
    kind: "equipment", equipmentId: "baselard", slot: "rightArmId",
    enhancement: 1, unidentifiedName: "？武器"
  });
  assert.equal(rollBlackChestLoot(rng(0.6, 0), 15).equipmentId, "silver_flail");
  assert.equal(rollBlackChestLoot(rng(0.8, 0.999), 19).equipmentId, "steel_longsword");
  assert.equal(rollBlackChestLoot(rng(0.8, 0.999), 19).enhancement, 3);
});

test("B50F to B59F black chests cycle job weapons with 70/25/5 enhancements", () => {
  assert.deepEqual(
    [50, 51, 52, 53].map(depth => rollBlackChestLoot(rng(0, 0), depth).equipmentId),
    ["blacksteel_longsword", "abyss_fang", "sacred_tree_mace", "ancient_tree_staff"]
  );
  assert.equal(rollBlackChestLoot(rng(0, 0.699), 54).enhancement, 1);
  assert.equal(rollBlackChestLoot(rng(0, 0.7), 54).enhancement, 2);
  assert.equal(rollBlackChestLoot(rng(0, 0.95), 54).enhancement, 3);
  assert.equal(rollBlackChestLoot(rng(0, 0), 57).unidentifiedName, "？両手杖");
});

test("B60F to B69F black chests repeat the B50F deep weapon table", () => {
  assert.deepEqual(
    [60, 61, 62, 63].map(depth => rollBlackChestLoot(rng(0, 0), depth).equipmentId),
    ["blacksteel_longsword", "abyss_fang", "sacred_tree_mace", "ancient_tree_staff"]
  );
  assert.equal(rollBlackChestLoot(rng(0, 0.699), 64).enhancement, 1);
  assert.equal(rollBlackChestLoot(rng(0, 0.7), 65).enhancement, 2);
  assert.equal(rollBlackChestLoot(rng(0, 0.95), 68).enhancement, 3);
  assert.equal(rollBlackChestLoot(rng(0, 0), 67).unidentifiedName, "？両手杖");
  assert.deepEqual(
    ["warrior", "thief", "priest", "mage"].map(job =>
      rollBlackChestLoot(rng(0, 0), 68, job).equipmentId),
    ["blacksteel_longsword", "abyss_fang", "sacred_tree_mace", "ancient_tree_staff"]
  );
});

test("unidentified card loot settles into the card collection", () => {
  const character = createInitialCharacter({ name: "TEST", job: "thief" });
  character.lootBag = addLootCard(character.lootBag, "rare_strength_up_plus", 2).lootBag;
  const settled = settleLootBag(character);
  assert.equal(settled.character.cards.ownedCardCounts.rare_strength_up_plus, 2);
  assert.deepEqual(settled.cardResults, [{
    cardId: "rare_strength_up_plus", count: 2, gained: 2, discarded: 0
  }]);
});

test("a duplicate unique C card converts into 100 gold when the loot bag settles", () => {
  let character = createInitialCharacter({ name: "TEST", job: "thief" });
  character.lootBag = addLootCard(character.lootBag, "common_stairs_detection", 1).lootBag;
  character = settleLootBag(character).character;
  const goldBefore = character.gold;
  character.lootBag = addLootCard(character.lootBag, "common_stairs_detection", 1).lootBag;
  const settled = settleLootBag(character);
  assert.equal(settled.character.cards.ownedCardCounts.common_stairs_detection, 1);
  assert.equal(settled.character.gold, goldBefore + 100);
  assert.equal(settled.gold, 100);
  assert.deepEqual(settled.cardResults, [{
    cardId: "common_stairs_detection", count: 1, gained: 0, discarded: 1, convertedGold: 100
  }]);
});

test("a duplicate Search and Destroy card converts into 1000 gold", () => {
  let character = createInitialCharacter({ name: "TEST", job: "thief" });
  character.lootBag = addLootCard(character.lootBag, "rare_search_and_destroy", 1).lootBag;
  character = settleLootBag(character).character;
  const goldBefore = character.gold;
  character.lootBag = addLootCard(character.lootBag, "rare_search_and_destroy", 1).lootBag;
  const settled = settleLootBag(character);
  assert.equal(settled.character.cards.ownedCardCounts.rare_search_and_destroy, 1);
  assert.equal(settled.character.gold, goldBefore + 1000);
  assert.deepEqual(settled.cardResults, [{
    cardId: "rare_search_and_destroy", count: 1, gained: 0, discarded: 1, convertedGold: 1000
  }]);
});

test("B1F to B4F keep one to three red chests alongside eligible purple special-room chests", () => {
  for (const [depth, roll, expected] of [[1, 0, 1], [2, 0.4, 2], [4, 0.99, 3]]) {
    buildBoundaryWallMap(depth, () => roll);
    const treasures = cells.flat().map(cell => cell.treasure).filter(Boolean);
    assert.equal(treasures.filter(type => type === "red").length, expected);
    assert.equal(treasures.filter(type => type === "purple").length, depth === 1 ? 1 : 0);
    assert.ok(treasures.every(type => type === "red" || type === "purple"));
  }
  buildBoundaryWallMap(5, () => 0);
  assert.deepEqual(cells.flat().map(cell => cell.treasure).filter(Boolean), ["purple"]);
});

test("B10F to B20F place one to three red chests alongside any enabled black chest", () => {
  for (const depth of [10, 18, 19, 20]) {
    buildBoundaryWallMap(depth, () => 0.5, { blackChestsUnlocked: true });
    const treasures = cells.flat().map(cell => cell.treasure).filter(Boolean);
    assert.equal(treasures.filter(type => type === "red").length, 2);
    assert.equal(treasures.filter(type => type === "black").length, depth === 19 ? 0 : 1);
  }
});

test("B21F to B30F place one to three red chests with the temporary midgame table", () => {
  for (const depth of [21, 25, 29, 30]) {
    buildBoundaryWallMap(depth, () => 0.5, { blackChestsUnlocked: true });
    const treasures = cells.flat().map(cell => cell.treasure).filter(Boolean);
    assert.equal(treasures.filter(type => type === "red").length, 2);
    assert.equal(treasures.filter(type => type === "black").length, depth === 29 ? 0 : 1);
  }
});

test("B31F to B40F place red chests and keep B39F free of black chests", () => {
  for (const depth of [31, 38, 39, 40]) {
    buildBoundaryWallMap(depth, () => 0.5, { blackChestsUnlocked: true });
    const treasures = cells.flat().map(cell => cell.treasure).filter(Boolean);
    assert.equal(treasures.filter(type => type === "red").length, 2);
    assert.equal(treasures.filter(type => type === "black").length, depth === 39 ? 0 : 1);
  }
});

test("B50F to B59F place one to three red chests and keep B59F free of black chests", () => {
  for (const depth of [50, 51, 58, 59]) {
    buildBoundaryWallMap(depth, () => 0.5, { blackChestsUnlocked: true });
    const treasures = cells.flat().map(cell => cell.treasure).filter(Boolean);
    assert.equal(treasures.filter(type => type === "red").length, 2);
    assert.equal(treasures.filter(type => type === "black").length, depth === 59 ? 0 : 1);
  }
});

test("B60F to B69F place one to three red chests", () => {
  for (const depth of [60, 61, 68, 69]) {
    buildBoundaryWallMap(depth, () => 0.5, { blackChestsUnlocked: true });
    const treasures = cells.flat().map(cell => cell.treasure).filter(Boolean);
    assert.equal(treasures.filter(type => type === "red").length, 2);
    assert.equal(treasures.filter(type => type === "black").length, depth === 69 ? 0 : 1);
  }
});

test("inn fee is two gold per level", () => {
  assert.equal(getInnStayFee({ level: 1 }), 2);
  assert.equal(getInnStayFee({ level: 197 }), 394);
});

test("the inn stable restores thirty percent without exceeding maximums", () => {
  assert.deepEqual(createInnStableRecovery({ hp: 1, maxHp: 47, sp: 0, maxSp: 40 }), { hp: 16, sp: 12 });
  assert.deepEqual(createInnStableRecovery({ hp: 45, maxHp: 47, sp: 39, maxSp: 40 }), { hp: 47, sp: 40 });
});
