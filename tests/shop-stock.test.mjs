import test from "node:test";
import assert from "node:assert/strict";

import { createInitialCharacter } from "../data/classes.js";
import {
  acknowledgeShopStockAnnouncement,
  getShopStockState,
  markShopCategorySeen
} from "../data/shop-stock.js";

function characterAt(depth) {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.highestDungeonDepthReached = depth;
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
