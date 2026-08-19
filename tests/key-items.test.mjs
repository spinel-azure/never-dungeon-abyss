import test from "node:test";
import assert from "node:assert/strict";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { consumeKeyItem, createInitialKeyItemState, getKeyItem, getKeyItemCount, grantKeyItem, hasKeyItem, listOwnedKeyItems, normalizeKeyItemState } from "../data/key-items.js";

test("new and legacy characters have an independent empty key-item collection", () => {
  assert.deepEqual(createInitialCharacter({ name: "TEST", job: "thief" }).keyItems, createInitialKeyItemState());
  const legacy = createInitialCharacter({ name: "OLD", job: "warrior" });
  delete legacy.keyItems;
  assert.deepEqual(normalizeCharacter(legacy).keyItems, createInitialKeyItemState());
});

test("key-item normalization has no owned-type or stack capacity limit", () => {
  const ids = Array.from({ length: 150 }, (_, index) => `event_item_${index + 1}`);
  const normalized = normalizeKeyItemState({
    owned: Object.fromEntries(ids.map((id, index) => [id, { acquiredAt: index + 1 }])),
    acquisitionOrder: [...ids, ids[0]]
  });
  assert.equal(Object.keys(normalized.owned).length, 150);
  assert.equal(normalized.acquisitionOrder.length, 150);
  assert.deepEqual(normalized.acquisitionOrder, ids);
});

test("the queen's tiara is a permanent unsellable key item", () => {
  const tiara = getKeyItem("queen_tiara");
  assert.equal(tiara.name, "女王のティアラ");
  assert.equal(tiara.sellable, false);
  assert.equal(tiara.consumable, false);
  const granted = grantKeyItem(null, tiara.id, 1);
  assert.equal(granted.gained, true);
  assert.equal(hasKeyItem(granted.keyItems, tiara.id), true);
});

test("special medicine ingredients share one key-item slot and can be consumed together", () => {
  let state = createInitialKeyItemState();
  for (let count = 0; count < 8; count += 1) state = grantKeyItem(state, "special_medicine_ingredient").keyItems;
  assert.equal(getKeyItemCount(state, "special_medicine_ingredient"), 8);
  assert.equal(listOwnedKeyItems(state).filter(item => item.id === "special_medicine_ingredient").length, 1);
  const consumed = consumeKeyItem(state, "special_medicine_ingredient", 8);
  assert.equal(consumed.consumed, true);
  assert.equal(hasKeyItem(consumed.keyItems, "special_medicine_ingredient"), false);
});
