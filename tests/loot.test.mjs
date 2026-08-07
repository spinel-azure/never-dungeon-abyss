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

test("red chest rewards and stiletto qualities follow configured bands", () => {
  assert.equal(rollRedChestLoot(rng(0.1, 0.59)).amount, 10);
  assert.equal(rollRedChestLoot(rng(0.1, 0.6)).amount, 15);
  assert.equal(rollRedChestLoot(rng(0.1, 0.9)).amount, 20);
  assert.equal(rollRedChestLoot(rng(0.55)).itemId, "healing_potion");
  assert.equal(rollRedChestLoot(rng(0.75)).itemId, "antidote");
  assert.equal(rollRedChestLoot(rng(0.88, 0.749)).enhancement, 0);
  assert.equal(rollRedChestLoot(rng(0.88, 0.75)).enhancement, 1);
  assert.equal(rollRedChestLoot(rng(0.88, 0.93)).enhancement, 2);
  assert.equal(rollRedChestLoot(rng(0.88, 0.99)).enhancement, 3);
  assert.equal(getWeapon("stiletto", 2).defensePenetration, 0.3);
});

test("B6F to B10F black chests use the potion, R-card and SR-card bands", () => {
  assert.equal(rollBlackChestLoot(rng(0.399), 6).itemId, "healing_potion_medium");
  assert.equal(rollBlackChestLoot(rng(0.4, 0), 6).cardId, "rare_strength_up_plus");
  assert.equal(rollBlackChestLoot(rng(0.4, 0.999), 10).cardId, "rare_gale_feather_plus");
  assert.equal(rollBlackChestLoot(rng(0.7, 0), 8).cardId, "rare_hp_up");
  assert.equal(rollBlackChestLoot(rng(0.7, 0.999), 8).cardId, "rare_sp_up");
  assert.deepEqual(rollBlackChestLoot(rng(0.9), 6), {
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
