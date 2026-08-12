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
  return character;
}

test("B10F creates one shop announcement and an unseen item badge", () => {
  const character = characterAt(10);
  const before = getShopStockState(character);
  assert.equal(before.announcementPending, true);
  assert.equal(before.newCategories.items, true);
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

test("opening a shop category clears only that category's badge", () => {
  const character = acknowledgeShopStockAnnouncement(characterAt(20)).character;
  assert.equal(getShopStockState(character).newCategories.items, true);
  const viewed = markShopCategorySeen(character, "items");
  assert.equal(getShopStockState(viewed).newCategories.items, false);
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
