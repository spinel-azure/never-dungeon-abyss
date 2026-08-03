import test from "node:test";
import assert from "node:assert/strict";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { createInitialKeyItemState, normalizeKeyItemState } from "../data/key-items.js";

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
