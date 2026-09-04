import test from "node:test";
import assert from "node:assert/strict";

import { createBattleState, resolveBattleRound } from "../combat/battle-engine.js";
import { collectStats } from "../combat/collect-stats.js";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { sellEquipmentInstance } from "../data/commerce.js";
import { getEquipmentItem } from "../data/equipment.js";
import {
  canEquipInstance,
  equipInstance,
  getEquipmentInstanceDefinition,
  getEquipmentInstanceName,
  grantEquipmentInstance,
  setEquipmentInstanceLocked
} from "../data/equipment-inventory.js";
import {
  addLootEquipment,
  depositEquipmentInWarehouse,
  settleLootBag,
  withdrawEquipmentFromWarehouse
} from "../data/inventory.js";
import { rollBlackChestLoot, rollRedChestLoot } from "../data/loot.js";
import { getWeapon } from "../data/weapons.js";

const storage = new Map();
globalThis.localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); },
  clear() { storage.clear(); }
};
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class CustomEvent {
  constructor(type) { this.type = type; }
};

const { loadGame, writeGame } = await import("../js/save-data.js");

const FROST_WEAPON_IDS = Object.freeze([
  "frostsilver_longsword",
  "icefang_dagger",
  "whitefrost_mace",
  "winterstar_staff"
]);
const FROST_ACCESSORY_IDS = Object.freeze([
  "frost_giant_talisman",
  "snow_hare_charm",
  "white_snow_rosary",
  "ice_crystal_catalyst"
]);

function rng(...values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)] ?? 0;
}

function makeSaveSnapshot(character) {
  return {
    character,
    player: { gridX: 1, gridY: 1, dir: 0 },
    dungeon: { cells: [[{ type: "floor" }]], explored: [[true]] }
  };
}

test.beforeEach(() => storage.clear());

test("B40F to B47F black chests select all frost weapons evenly and never fall back to the stiletto", () => {
  const selected = [0, 0.25, 0.5, 0.75].map(weaponRoll =>
    rollBlackChestLoot(rng(0, weaponRoll, 0), 40));
  assert.deepEqual(selected.map(drop => drop.equipmentId), FROST_WEAPON_IDS);
  assert.deepEqual(selected.map(drop => drop.unidentifiedName), ["？武器", "？武器", "？武器", "？両手杖"]);
  for (let depth = 40; depth <= 47; depth += 1) {
    const drop = rollBlackChestLoot(rng(0.99, 0.999, 0), depth);
    assert.equal(FROST_WEAPON_IDS.includes(drop.equipmentId), true);
    assert.notEqual(drop.equipmentId, "stiletto");
  }
});

test("B48F black chests guarantee the current job weapon", () => {
  assert.deepEqual(
    ["warrior", "thief", "priest", "mage"].map(job =>
      rollBlackChestLoot(rng(0.99, 0), 48, job).equipmentId),
    FROST_WEAPON_IDS
  );
});

test("frost-region black chest weapons always use the existing 70/25/5 enhanced drop rates", () => {
  assert.equal(rollBlackChestLoot(rng(0, 0, 0.699), 40).enhancement, 1);
  assert.equal(rollBlackChestLoot(rng(0, 0, 0.7), 40).enhancement, 2);
  assert.equal(rollBlackChestLoot(rng(0, 0, 0.95), 40).enhancement, 3);
});

test("frost weapons keep physical damage, job restrictions, enhancement stats, and prices", () => {
  const expected = {
    frostsilver_longsword: { job: "warrior", type: "longsword", attack: [15, 16, 17, 19], stat: "str", bonus: [2, 2, 3, 4] },
    icefang_dagger: { job: "thief", type: "dagger", attack: [10, 11, 12, 13], stat: "dex", bonus: [4, 4, 5, 6] },
    whitefrost_mace: { job: "priest", type: "blunt", attack: [13, 14, 15, 17], stat: "luc", bonus: [3, 3, 4, 5] },
    winterstar_staff: { job: "mage", type: "staff", attack: [4, 4, 5, 5], stat: "int", bonus: [6, 7, 8, 9] }
  };
  for (const [id, profile] of Object.entries(expected)) {
    const levels = [0, 1, 2, 3].map(level => getWeapon(id, level));
    assert.deepEqual(levels.map(weapon => weapon.attack), profile.attack);
    assert.deepEqual(levels.map(weapon => weapon.statBonuses[profile.stat]), profile.bonus);
    assert.deepEqual([0, 1, 2, 3].map(enhancement =>
      getEquipmentInstanceDefinition({ equipmentId: id, slot: "rightArmId", enhancement }).sellPrice),
    [2000, 2400, 3000, 4000]);
    assert.equal(levels[0].element, "physical");
    assert.equal(levels[0].type, profile.type);
    assert.deepEqual(levels[0].allowedJobs, [profile.job]);
  }
  assert.equal(getWeapon("winterstar_staff").twoHanded, true);
});

test("B41F to B49F red chests use 10/10/80 bands and select all frost accessories evenly", () => {
  assert.equal(rollRedChestLoot(rng(0.099), 41).itemId, "strong_healing_potion_small");
  assert.equal(rollRedChestLoot(rng(0.1), 41).itemId, "strong_antidote");
  const drops = [0, 0.25, 0.5, 0.75].map(accessoryRoll =>
    rollRedChestLoot(rng(0.2, accessoryRoll, 0), 49));
  assert.deepEqual(drops.map(drop => drop.equipmentId), FROST_ACCESSORY_IDS);
  assert.deepEqual(drops.map(drop => drop.slot), ["accessoryId", "accessoryId", "accessoryId", "accessoryId"]);
  assert.deepEqual(drops.map(drop => drop.unidentifiedName), ["？装備", "？装備", "？装備", "？装備"]);
});

test("frost accessories always drop enhanced and expose the requested bonuses at every level", () => {
  assert.equal(rollRedChestLoot(rng(0.2, 0, 0.699), 41).enhancement, 1);
  assert.equal(rollRedChestLoot(rng(0.2, 0, 0.7), 41).enhancement, 2);
  assert.equal(rollRedChestLoot(rng(0.2, 0, 0.95), 41).enhancement, 3);
  const expected = {
    frost_giant_talisman: [
      { def: 3, str: 2, iceDamageReduction: 0.1 },
      { def: 4, str: 2, iceDamageReduction: 0.12 },
      { def: 4, str: 3, iceDamageReduction: 0.15 },
      { def: 5, str: 4, iceDamageReduction: 0.2 }
    ],
    snow_hare_charm: [
      { agi: 3, iceDamageReduction: 0.1 }, { agi: 3, iceDamageReduction: 0.12 },
      { agi: 4, iceDamageReduction: 0.15 }, { agi: 5, iceDamageReduction: 0.2 }
    ],
    white_snow_rosary: [
      { luc: 3, iceDamageReduction: 0.1 }, { luc: 3, iceDamageReduction: 0.12 },
      { luc: 4, iceDamageReduction: 0.15 }, { luc: 5, iceDamageReduction: 0.2 }
    ],
    ice_crystal_catalyst: [
      { int: 3, iceDamageReduction: 0.1 }, { int: 3, iceDamageReduction: 0.12 },
      { int: 4, iceDamageReduction: 0.15 }, { int: 5, iceDamageReduction: 0.2 }
    ]
  };
  for (const [id, bonuses] of Object.entries(expected)) {
    const definition = getEquipmentItem(id, "accessoryId");
    assert.equal(definition.allowedJobs, undefined);
    assert.deepEqual([0, 1, 2, 3].map(enhancement =>
      getEquipmentInstanceDefinition({ equipmentId: id, slot: "accessoryId", enhancement }).statBonuses), bonuses);
    assert.deepEqual([0, 1, 2, 3].map(enhancement =>
      getEquipmentInstanceDefinition({ equipmentId: id, slot: "accessoryId", enhancement }).sellPrice),
    [2000, 2400, 3000, 4000]);
  }
});

test("all four jobs can equip every frost accessory", () => {
  for (const job of ["warrior", "thief", "priest", "mage"]) {
    for (const equipmentId of FROST_ACCESSORY_IDS) {
      const character = createInitialCharacter({ name: "TEST", job });
      const granted = grantEquipmentInstance(character, equipmentId, "accessoryId", { enhancement: 1 });
      assert.equal(granted.accepted, true);
      assert.equal(canEquipInstance(granted.character, granted.instance).accepted, true);
      assert.equal(equipInstance(granted.character, "accessoryId", granted.instance.instanceId).accepted, true);
    }
  }
});

test("B40F keeps its existing armor table while adjacent loot bands remain unchanged", () => {
  assert.equal(rollRedChestLoot(rng(0.2, 0), 40).equipmentId, "intermediate_grimoire");
  assert.equal(rollRedChestLoot(rng(0.2, 0), 39).equipmentId, "intermediate_grimoire");
  assert.equal(rollRedChestLoot(rng(0.2, 0), 50).equipmentId, "blacksteel_greatshield");
  assert.equal(rollBlackChestLoot(rng(0.9, 0), 39).equipmentId, "stiletto");
  assert.equal(rollBlackChestLoot(rng(0, 0), 50).equipmentId, "blacksteel_longsword");
});

test("loot settlement, identification, equipping, locking, warehouse, sale, and save-load preserve frost gear", () => {
  let character = createInitialCharacter({ name: "TEST", job: "mage" });
  character.lootBag = addLootEquipment(character.lootBag, {
    equipmentId: "winterstar_staff", slot: "rightArmId", enhancement: 3, identified: false
  }).lootBag;
  assert.equal(character.lootBag.equipmentInstances[0].identified, false);
  const settled = settleLootBag(character);
  const staff = settled.equipmentResults[0];
  assert.equal(staff.identified, true);
  assert.equal(getEquipmentInstanceName(staff), "冬星の杖＋3");
  const equipped = equipInstance(settled.character, "rightArmId", staff.instanceId);
  assert.equal(equipped.accepted, true);
  assert.equal(equipped.character.equipment.leftArmId, null);
  assert.equal(writeGame(makeSaveSnapshot(equipped.character), "auto"), true);
  const loaded = normalizeCharacter(loadGame("auto").character);
  const loadedStaff = loaded.equipmentInventory.instances.find(instance => instance.instanceId === staff.instanceId);
  assert.equal(loadedStaff.equipmentId, "winterstar_staff");
  assert.equal(loadedStaff.enhancement, 3);
  assert.equal(loaded.equippedInstanceIds.rightArmId, staff.instanceId);

  const accessoryGrant = grantEquipmentInstance(loaded, "snow_hare_charm", "accessoryId", { enhancement: 3 });
  const locked = setEquipmentInstanceLocked(accessoryGrant.character, accessoryGrant.instance.instanceId, true);
  assert.equal(normalizeCharacter(structuredClone(locked.character)).equipmentInventory.instances
    .find(instance => instance.instanceId === accessoryGrant.instance.instanceId).locked, true);
  const unlocked = setEquipmentInstanceLocked(locked.character, accessoryGrant.instance.instanceId, false);
  const deposited = depositEquipmentInWarehouse(unlocked.character, accessoryGrant.instance.instanceId);
  assert.equal(deposited.accepted, true);
  const restored = withdrawEquipmentFromWarehouse(
    normalizeCharacter(structuredClone(deposited.character)), accessoryGrant.instance.instanceId);
  assert.equal(restored.accepted, true);
  const sold = sellEquipmentInstance(restored.character, accessoryGrant.instance.instanceId);
  assert.equal(sold.accepted, true);
  assert.equal(sold.value, 4000);
});

test("frost accessories reduce actual ice damage and stack with coldproof boots by the existing additive rule", () => {
  let character = createInitialCharacter({ name: "TEST", job: "warrior" });
  const boots = grantEquipmentInstance(character, "coldproof_boots", "footId");
  character = equipInstance(boots.character, "footId", boots.instance.instanceId).character;
  const talisman = grantEquipmentInstance(character, "frost_giant_talisman", "accessoryId", { enhancement: 3 });
  character = equipInstance(talisman.character, "accessoryId", talisman.instance.instanceId).character;
  character = normalizeCharacter(character);
  assert.equal(character.equipmentStatBonuses.iceDamageReduction, 0.35);
  const protectedStats = collectStats({
    job: character.job,
    baseStats: character.baseStats,
    equipmentStatBonuses: character.equipmentStatBonuses
  });
  assert.equal(protectedStats.iceDamageReduction, 0.35);
  const enemy = {
    id: "frost_test_enemy", name: "TEST", hp: 999, maxHp: 999, alive: true,
    attack: 1, def: 0, baseStats: { str: 1, int: 10, agi: 10, dex: 1, luc: 1 },
    statuses: [], experienceReward: 0,
    actions: [{ weight: 1, action: {
      id: "frost_test", name: "TEST", actionType: "spell", element: "ice",
      spellPower: 30, powerMultiplier: 1, unavoidable: true
    } }]
  };
  const takeIceDamage = source => {
    const prepared = { ...source, hp: 1000, maxHp: 1000, alive: true };
    const result = resolveBattleRound({
      battle: createBattleState({ character: prepared, enemy }),
      playerCommand: { type: "wait" },
      rng: () => 0.5
    });
    assert.equal(result.accepted, true);
    return prepared.hp - result.battle.player.hp;
  };
  const normal = normalizeCharacter(createInitialCharacter({ name: "NORMAL", job: "warrior" }));
  const normalDamage = takeIceDamage(normal);
  const protectedDamage = takeIceDamage(character);
  assert.equal(protectedDamage, Math.floor(normalDamage * 0.65));
});
