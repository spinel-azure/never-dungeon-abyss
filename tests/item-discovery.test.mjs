import test from "node:test";
import assert from "node:assert/strict";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { grantItem, consumeItem, addLootItem, settleLootBag } from "../data/inventory.js";
import { grantKeyItem, consumeKeyItem } from "../data/key-items.js";
import { purchaseItem, sellItem } from "../data/commerce.js";
import { ITEM_COMPENDIUM_ENTRIES } from "../data/item-compendium.js";
import { getDiscoveredItemIds, getItemCompendiumDisplayEntries } from "../data/item-discovery.js";
const fresh = () => createInitialCharacter({ name: "TEST", job: "mage" });
const known = character => new Set(getDiscoveredItemIds(character));

test("unobtained catalog entries expose neither names nor detail data", () => {
  const entries = getItemCompendiumDisplayEntries(Object.values(ITEM_COMPENDIUM_ENTRIES), fresh());
  const hidden = entries.find(entry => entry.id === "wing_gift");
  assert.deepEqual(hidden, {id: "wing_gift", category: "消耗品", name: "？？？？？？", locked: true});
  assert.equal(getItemCompendiumDisplayEntries([ITEM_COMPENDIUM_ENTRIES.wing_gift], {
    compendium: {items: {wing_gift: {discovered: true, obtained: false}}}
  })[0].locked, true);
});

test("purchase then sell or consume before a save preserves discovery across reload", () => {
  let character = {...fresh(), gold: 100000};
  const bought = purchaseItem(character, "wing_gift");
  assert.equal(bought.accepted, true);
  character = sellItem(bought.character, "wing_gift").character;
  character.inventory = grantItem(character.inventory, "healing_potion").inventory;
  character.inventory = consumeItem(character.inventory, "healing_potion").inventory;
  character = normalizeCharacter(JSON.parse(JSON.stringify(character)));
  assert.ok(known(character).has("wing_gift"));
  assert.ok(known(character).has("healing_potion"));
  assert.equal(character.compendium.items.wing_gift.obtained, true);
  assert.equal(character.compendium.items.healing_potion.obtained, true);
  assert.ok(!known(fresh()).has("wing_gift"));
});

test("consumed key items stay unlocked and failed grants do not unlock items", () => {
  let character = fresh();
  character.keyItems = grantKeyItem(character.keyItems, "queen_tiara").keyItems;
  character.keyItems = consumeKeyItem(character.keyItems, "queen_tiara").keyItems;
  character.inventory = grantItem(character.inventory, "wing_gift", 0).inventory;
  character = normalizeCharacter(JSON.parse(JSON.stringify(character)));
  assert.equal(character.compendium.keyItems.queen_tiara.obtained, true);
  assert.ok(!known(character).has("wing_gift"));
});

test("legacy saves retain old acquisition history and backfill warehouse and loot", () => {
  const character = fresh();
  character.compendium = {items: {wing_gift: {obtained: true, obtainedCount: 1}}, keyItems: {queen_tiara: {obtained: true}}};
  character.warehouse = {itemStacks: [{itemId: "antidote", count: 1}]};
  character.lootBag = addLootItem(character.lootBag, "healing_potion").lootBag;
  const restored = normalizeCharacter(character);
  for (const id of ["wing_gift", "queen_tiara", "antidote", "healing_potion"]) assert.ok(known(restored).has(id), id);
  const settled = settleLootBag(restored);
  assert.ok(known(settled.character).has("healing_potion"));
});
