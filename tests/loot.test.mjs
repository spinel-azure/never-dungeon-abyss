import test from "node:test";
import assert from "node:assert/strict";
import { rollBlackChestLoot, rollEnemyDrop, rollRedChestLoot } from "../data/loot.js";
import { buildBoundaryWallMap, cells } from "../js/dungeon.js";
import { getWeapon } from "../data/weapons.js";
import { createInnStableRecovery, getInnStayFee } from "../js/character-services.js";
import { addLootCard, settleLootBag } from "../data/inventory.js";
import { createInitialCharacter } from "../data/classes.js";

const rng = (...values) => {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
};

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

test("B1F to B4F place one to three red chests and no black or gold", () => {
  for (const [depth, roll, expected] of [[1, 0, 1], [2, 0.4, 2], [4, 0.99, 3]]) {
    buildBoundaryWallMap(depth, () => roll);
    const treasures = cells.flat().map(cell => cell.treasure).filter(Boolean);
    assert.equal(treasures.length, expected);
    assert.ok(treasures.every(type => type === "red"));
  }
  buildBoundaryWallMap(5, () => 0);
  assert.equal(cells.flat().filter(cell => cell.treasure).length, 0);
});

test("inn fee is two gold per level", () => {
  assert.equal(getInnStayFee({ level: 1 }), 2);
  assert.equal(getInnStayFee({ level: 197 }), 394);
});

test("the inn stable restores thirty percent without exceeding maximums", () => {
  assert.deepEqual(createInnStableRecovery({ hp: 1, maxHp: 47, sp: 0, maxSp: 40 }), { hp: 16, sp: 12 });
  assert.deepEqual(createInnStableRecovery({ hp: 45, maxHp: 47, sp: 39, maxSp: 40 }), { hp: 47, sp: 40 });
});
