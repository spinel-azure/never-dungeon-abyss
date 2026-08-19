import test from "node:test";
import assert from "node:assert/strict";

import { createInitialCharacter } from "../data/classes.js";
import {
  acknowledgeShopStockAnnouncement,
  getShopEquipmentStock,
  getShopStockState,
  markShopCategorySeen
} from "../data/shop-stock.js";

function characterAt(depth) {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.highestDungeonDepthReached = depth;
  if (depth >= 10) character.eventFlags.transfer_portal_b10f_unlocked = true;
  if (depth >= 20) character.eventFlags.shop_stock_b20f_unlocked = true;
  if (depth >= 30) character.eventFlags.shop_stock_b30f_unlocked = true;
  if (depth >= 50) character.eventFlags.transfer_portal_b50f_unlocked = true;
  return character;
}

test("B10F creates one shop announcement and an unseen item badge", () => {
  const character = characterAt(10);
  const before = getShopStockState(character);
  assert.equal(before.announcementPending, true);
  assert.equal(before.newCategories.items, true);
  assert.ok(before.newStockIds.items.length > 0);
  assert.equal(before.newCategories.equipment, false);

  const announced = acknowledgeShopStockAnnouncement(character);
  assert.equal(announced.announced, true);
  assert.equal(acknowledgeShopStockAnnouncement(announced.character).announced, false);
  assert.equal(getShopStockState(announced.character).newCategories.items, true);
});

test("final shop armor requires B30F arrival and the Iron Maiden victory", () => {
  const warrior = characterAt(30);
  assert.equal(getShopEquipmentStock(warrior).some(entry => entry.equipmentId === "steel_shield"), false);
  warrior.eventFlags.boss_iron_maiden_b29f_defeated = true;
  const finalOffers = getShopEquipmentStock(warrior).filter(entry => entry.shopUnlockDepth === 30);
  assert.deepEqual(finalOffers.map(entry => entry.equipmentId), [
    "steel_shield", "steel_helmet", "steel_surcoat", "steel_greaves"
  ]);
  assert.ok(finalOffers.every(entry => entry.enhancement === 0 && entry.buyPrice === 3000));
});

test("B50F shop armor provides one full job-specific set after the transfer portal unlock", () => {
  const expected = {
    warrior: ["blacksteel_greatshield", "blacksteel_helmet", "blacksteel_heavy_armor", "blacksteel_greaves"],
    thief: ["abyss_tiger_buckler", "abyss_tiger_hood", "abyss_tiger_light_armor", "abyss_tiger_boots"],
    priest: ["sacred_tree_shield", "sacred_tree_mitre", "sacred_tree_vestment", "sacred_tree_shoes"],
    mage: ["abyss_grimoire", "abyss_hat", "abyss_robe", "abyss_shoes"]
  };
  const expectedTotals = {
    warrior: { def: 35, dex: 4, str: 8 },
    thief: { def: 29, dex: 8, agi: 6 },
    priest: { def: 30, luc: 9, agi: 6 },
    mage: { int: 13, def: 24, agi: 6 }
  };
  for (const [job, ids] of Object.entries(expected)) {
    const character = createInitialCharacter({ name: "TEST", job });
    character.highestDungeonDepthReached = 50;
    assert.equal(getShopEquipmentStock(character).some(entry => entry.shopUnlockDepth === 50), false);
    character.eventFlags.transfer_portal_b50f_unlocked = true;
    const offers = getShopEquipmentStock(character).filter(entry => entry.shopUnlockDepth === 50);
    assert.deepEqual(offers.map(entry => entry.equipmentId), ids);
    assert.ok(offers.every(entry => entry.buyPrice === 6000 && entry.sellPrice === 3000));
    const totals = offers.reduce((result, entry) => {
      for (const [key, value] of Object.entries(entry.statBonuses)) result[key] = (result[key] || 0) + value;
      return result;
    }, {});
    assert.deepEqual(totals, expectedTotals[job]);
  }
});

test("opening a shop category clears only that category's badge", () => {
  const character = acknowledgeShopStockAnnouncement(characterAt(20)).character;
  assert.equal(getShopStockState(character).newCategories.items, true);
  const viewed = markShopCategorySeen(character, "items");
  assert.equal(getShopStockState(viewed).newCategories.items, false);
  assert.deepEqual(getShopStockState(viewed).newStockIds.items, []);
});

test("legacy B10F saves receive the stock notice once", () => {
  const legacy = characterAt(10);
  delete legacy.eventFlags.shopStockAnnouncementDepth;
  const result = acknowledgeShopStockAnnouncement(legacy);
  assert.equal(result.announced, true);
  assert.equal(result.character.eventFlags.shopStockAnnouncementDepth, 10);
});

test("thief armor category becomes new only after the boss and arrival requirements", () => {
  const thief = createInitialCharacter({ name: "TEST", job: "thief" });
  thief.highestDungeonDepthReached = 10;
  thief.eventFlags.transfer_portal_b10f_unlocked = true;
  assert.equal(getShopStockState(thief).newCategories.equipment, false);
  thief.eventFlags.boss_strange_knight_statue_b9f_defeated = true;
  assert.equal(getShopStockState(thief).newCategories.equipment, true);
  assert.equal(getShopStockState(thief).categoryDepths.equipment, 10);
});
