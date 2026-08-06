import test from "node:test";
import assert from "node:assert/strict";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { equipInstance, getEquipmentInstanceDefinition, getEquipmentInstanceName, grantEquipmentInstance, listEquipmentInstances } from "../data/equipment-inventory.js";
import { depositItemInWarehouse, grantItemWithOverflow, settleLootBag, storeItemInWarehouse, withdrawItemFromWarehouse } from "../data/inventory.js";

test("legacy equipment migrates to stable individual instances", () => {
  const character = normalizeCharacter({
    name: "TEST", job: "warrior", level: 1, hp: 30, sp: 15,
    equipment: { rightArmId: "iron_longsword", leftArmId: "iron_buckler", headId: "iron_helmet", bodyId: "chainmail", footId: "iron_greaves", accessoryId: null }
  });
  assert.equal(character.equipmentInventory.instances.length, 5);
  assert.equal(new Set(Object.values(character.equippedInstanceIds).filter(Boolean)).size, 5);
  assert.ok(listEquipmentInstances(character).slice(0, 5).every(instance => Object.values(character.equippedInstanceIds).includes(instance.instanceId)));
});

test("equipment preview can be normalized without mutating current HP", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.hp = 12;
  const result = equipInstance(character, "headId", null);
  assert.equal(result.accepted, true);
  const preview = normalizeCharacter(result.character);
  assert.equal(character.equipment.headId, "iron_helmet");
  assert.equal(character.hp, 12);
  assert.equal(preview.hp, Math.min(12, preview.maxHp));
  assert.equal(preview.equipment.headId, null);
});

test("identical equipment is kept as independent acquisition-ordered instances", () => {
  let character = createInitialCharacter({ name: "TEST", job: "warrior" });
  const first = grantEquipmentInstance(character, "iron_buckler", "leftArmId");
  character = first.character;
  const second = grantEquipmentInstance(character, "iron_buckler", "leftArmId", { enhancement: 1 });
  const copies = second.character.equipmentInventory.instances.filter(instance => instance.equipmentId === "iron_buckler");
  assert.equal(copies.length, 3);
  assert.equal(new Set(copies.map(instance => instance.instanceId)).size, 3);
  assert.deepEqual(copies.map(instance => instance.enhancement), [0, 0, 1]);
  assert.ok(copies[0].acquiredOrder < copies[1].acquiredOrder && copies[1].acquiredOrder < copies[2].acquiredOrder);
});

test("enhanced equipped weapons retain their individual display name and effects", () => {
  let character = createInitialCharacter({ name: "TEST", job: "thief" });
  const granted = grantEquipmentInstance(character, "stiletto", "rightArmId", { enhancement: 1 });
  character = granted.character;
  const equipped = equipInstance(character, "rightArmId", granted.instance.instanceId);
  const instanceId = equipped.character.equippedInstanceIds.rightArmId;
  const instance = equipped.character.equipmentInventory.instances.find(entry => entry.instanceId === instanceId);

  assert.equal(getEquipmentInstanceName(instance), "スティレット＋1");
  assert.equal(getEquipmentInstanceDefinition(instance).defensePenetration, 0.25);
});

test("warehouse fills partial consumable stacks before creating another", () => {
  const result = storeItemInWarehouse({ itemStacks: [{ itemId: "healing_potion", count: 80 }] }, "healing_potion", 30);
  assert.deepEqual(result.warehouse.itemStacks, [
    { itemId: "healing_potion", count: 99 },
    { itemId: "healing_potion", count: 11 }
  ]);
});

test("shop warehouse deposits and withdraws one carried item", () => {
  let character = createInitialCharacter({ name: "TEST", job: "thief" });
  character = grantItemWithOverflow(character, "healing_potion", 2).character;
  character = depositItemInWarehouse(character, "healing_potion", 1).character;
  assert.equal(character.inventory.counts.healing_potion, 1);
  assert.equal(character.warehouse.itemStacks[0].count, 1);
  character = withdrawItemFromWarehouse(character, "healing_potion", 1).character;
  assert.equal(character.inventory.counts.healing_potion, 2);
  assert.equal(character.warehouse.itemStacks.length, 0);
});

test("shop warehouse deposits a selected quantity from a stack", () => {
  let character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character = grantItemWithOverflow(character, "healing_potion", 12).character;
  const result = depositItemInWarehouse(character, "healing_potion", 7);
  assert.equal(result.accepted, true);
  assert.equal(result.amount, 7);
  assert.equal(result.character.inventory.counts.healing_potion, 5);
  assert.deepEqual(result.character.warehouse.itemStacks, [{ itemId: "healing_potion", count: 7 }]);
});

test("inventory overflow and loot settlement retain every acquired item", () => {
  let character = createInitialCharacter({ name: "TEST", job: "thief" });
  character = grantItemWithOverflow(character, "antidote", 105).character;
  assert.equal(character.inventory.counts.antidote, 99);
  assert.deepEqual(character.warehouse.itemStacks, [{ itemId: "antidote", count: 6 }]);
  character.lootBag = { items: { antidote: 3, healing_potion: 2 }, equipmentInstances: [], gold: 120 };
  const settled = settleLootBag(character);
  assert.equal(settled.character.inventory.counts.healing_potion, 2);
  assert.equal(settled.character.warehouse.itemStacks.find(stack => stack.itemId === "antidote").count, 9);
  assert.equal(settled.character.gold, 120);
  assert.deepEqual(settled.character.lootBag.items, {});
});

test("unidentified stiletto quality is retained when the loot bag is settled", () => {
  const character = createInitialCharacter({ name: "TEST", job: "thief" });
  character.lootBag = {
    items: {}, gold: 0,
    equipmentInstances: [{ equipmentId: "stiletto", slot: "rightArmId", enhancement: 3, identified: false }]
  };
  const settled = settleLootBag(character);
  assert.equal(settled.equipmentResults[0].equipmentId, "stiletto");
  assert.equal(settled.equipmentResults[0].enhancement, 3);
  assert.equal(settled.equipmentResults[0].identified, true);
});
