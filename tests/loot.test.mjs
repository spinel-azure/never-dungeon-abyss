import test from "node:test";
import assert from "node:assert/strict";
import { getGoldChestWeaponId, hasGoldChestWeapon, hasPurpleChestLootTable, rollBlackChestLoot, rollEnemyDrop, rollGoldChestLoot, rollPurpleChestLoot, rollRedChestLoot } from "../data/loot.js";
import { buildBoundaryWallMap, cells } from "../js/dungeon.js";
import { getWeapon } from "../data/weapons.js";
import { createInnStableRecovery, getInnStayFee } from "../js/character-services.js";
import { addLootCard, settleLootBag } from "../data/inventory.js";
import { createInitialCharacter } from "../data/classes.js";

const rng = (...values) => {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
};

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

test("B1F to B9F purple chests use the card-only 33/33/33/1 table", () => {
  assert.equal(hasPurpleChestLootTable(1), true);
  assert.equal(hasPurpleChestLootTable(9), true);
  assert.equal(hasPurpleChestLootTable(10), false);
  assert.equal(rollPurpleChestLoot(rng(0.329), 1).cardId, "common_stairs_detection");
  assert.equal(rollPurpleChestLoot(rng(0.33), 1).cardId, "common_person_detection");
  assert.equal(rollPurpleChestLoot(rng(0.66), 9).cardId, "common_treasure_detection");
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
  assert.equal(rollRedChestLoot(rng(0.54, 0), 10).kind, "gold");
  assert.equal(rollRedChestLoot(rng(0.55), 10).itemId, "healing_potion");
  assert.equal(rollRedChestLoot(rng(0.75), 10).itemId, "antidote");
  assert.equal(rollRedChestLoot(rng(0.88), 10).equipmentId, "stiletto");
});

test("B11F to B20F red chests use the midgame consumable, card and enhanced weapon table", () => {
  assert.equal(rollRedChestLoot(rng(0.1, 0.1, 0.59), 11).amount, 60);
  assert.equal(rollRedChestLoot(rng(0.1, 0.1, 0.6), 11).amount, 90);
  assert.equal(rollRedChestLoot(rng(0.1, 0.1, 0.9), 11).amount, 120);
  assert.equal(rollRedChestLoot(rng(0.1, 0.5), 11).itemId, "healing_potion_medium");
  assert.equal(rollRedChestLoot(rng(0.5, 0, 0), 11).cardId, "common_strength_down");
  assert.equal(rollRedChestLoot(rng(0.5, 0, 0.6), 11).cardId, "common_agility_down");
  assert.equal(rollRedChestLoot(rng(0.5, 0.5), 11).cardId, "rare_spell_resistance");
  assert.equal(rollRedChestLoot(rng(0.5, 0.95), 11).cardId, "sr_scorching_resistance");
  assert.deepEqual(
    [11, 13, 16].map(depth => rollRedChestLoot(rng(0.8, 0), depth).equipmentId),
    ["baselard", "silver_flail", "steel_longsword"]
  );
  assert.equal(rollRedChestLoot(rng(0.8, 0), 11).enhancement, 1);
  assert.equal(rollRedChestLoot(rng(0.8, 0.7), 13).enhancement, 2);
  assert.equal(rollRedChestLoot(rng(0.8, 0.95), 16).enhancement, 3);
});

test("B19F and B20F red chests retain the midgame table and steel longsword band", () => {
  for (const depth of [19, 20]) {
    assert.deepEqual(rollRedChestLoot(rng(0.25, 0.75), depth), {
      kind: "item", itemId: "healing_potion_medium", amount: 1, unidentifiedName: "？薬"
    });
    const weapon = rollRedChestLoot(rng(0.95, 0), depth);
    assert.equal(weapon.equipmentId, "steel_longsword");
    assert.equal(weapon.enhancement, 1);
  }
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

test("B60F to B69F red chests feature all four enhanced accessory series", () => {
  assert.equal(rollRedChestLoot(rng(0.099), 60).itemId, "strong_healing_potion_small");
  assert.equal(rollRedChestLoot(rng(0.1), 60).itemId, "strong_antidote");
  assert.equal(rollRedChestLoot(rng(0.2, 0), 60).equipmentId, "spell_sealing_talisman");
  assert.deepEqual(
    [0, 0.25, 0.5, 0.75].map(accessoryRoll => rollRedChestLoot(rng(0.2, accessoryRoll, 0), 60).equipmentId),
    ["spell_sealing_talisman", "mana_amplifier", "masters_necklace", "poison_mask"]
  );
  assert.equal(rollRedChestLoot(rng(0.8, 0), 69).slot, "accessoryId");
  assert.equal(rollRedChestLoot(rng(0.8, 0), 69).unidentifiedName, "？装備");
  assert.equal(rollRedChestLoot(rng(0.2, 0.699), 64).enhancement, 1);
  assert.equal(rollRedChestLoot(rng(0.2, 0.7), 64).enhancement, 2);
  assert.equal(rollRedChestLoot(rng(0.2, 0.95), 64).enhancement, 3);
});

test("B6F to B10F black chests use the potion, R-card and SR-card bands", () => {
  assert.equal(rollBlackChestLoot(rng(0.429), 6).itemId, "healing_potion_medium");
  assert.equal(rollBlackChestLoot(rng(0.43, 0), 6).cardId, "rare_strength_up_plus");
  assert.equal(rollBlackChestLoot(rng(0.43, 0.999), 10).cardId, "rare_gale_feather_plus");
  assert.equal(rollBlackChestLoot(rng(0.73, 0), 8).cardId, "rare_hp_up");
  assert.equal(rollBlackChestLoot(rng(0.73, 0.999), 8).cardId, "rare_sp_up");
  assert.equal(rollBlackChestLoot(rng(0.929, 0.999), 8).cardId, "rare_sp_up");
  assert.deepEqual(rollBlackChestLoot(rng(0.93), 6), {
    kind: "card", cardId: "sr_indomitable_spirit", amount: 1,
    unidentifiedName: "？カード", rarity: "SR"
  });
});

test("B11F to B20F black chests use SP cards, magic resistance, and enhanced elemental staves", () => {
  assert.equal(rollBlackChestLoot(rng(0.199), 11).cardId, "common_sp_saver");
  assert.equal(rollBlackChestLoot(rng(0.2), 20).cardId, "rare_magic_resistance");
  assert.deepEqual(rollBlackChestLoot(rng(0.4, 0), 15), {
    kind: "equipment", equipmentId: "salamander_staff", slot: "rightArmId",
    enhancement: 1, unidentifiedName: "？両手杖"
  });
  assert.deepEqual(rollBlackChestLoot(rng(0.7, 0.999), 20), {
    kind: "equipment", equipmentId: "ice_lizard_staff", slot: "rightArmId",
    enhancement: 3, unidentifiedName: "？両手杖"
  });
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

test("B11F to B20F place one to three red chests alongside any enabled black chest", () => {
  for (const depth of [11, 18, 19, 20]) {
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
