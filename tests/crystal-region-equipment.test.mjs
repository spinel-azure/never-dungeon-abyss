import test from "node:test";
import assert from "node:assert/strict";

import { createInitialCharacter } from "../data/classes.js";
import { getEquipmentInstanceDefinition } from "../data/equipment-inventory.js";
import { rollBlackChestLoot, rollRedChestLoot } from "../data/loot.js";
import { CRYSTAL_ARMOR_FAMILIES, getShopEquipmentStock } from "../data/shop-stock.js";
import { getWeapon } from "../data/weapons.js";
import { buildBoundaryWallMap, cells } from "../js/dungeon.js";

const rng = (...values) => {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
};

test("B80F shop unlocks exactly one unenhanced final armor set for each job", () => {
  const jobs = ["warrior", "thief", "priest", "mage"];
  jobs.forEach((job, index) => {
    const character = createInitialCharacter({ name: "TEST", job });
    character.highestDungeonDepthReached = 80;
    assert.equal(getShopEquipmentStock(character).some(offer => offer.shopUnlockDepth === 80), false);
    character.eventFlags.transfer_portal_b80f_unlocked = true;
    const offers = getShopEquipmentStock(character).filter(offer => offer.shopUnlockDepth === 80);
    assert.deepEqual(offers.map(offer => offer.equipmentId), CRYSTAL_ARMOR_FAMILIES[index]);
    assert.ok(offers.every(offer => offer.enhancement === 0 && offer.buyPrice === 12000 && offer.sellPrice === 6000));
  });
});

test("final armor enhancements preserve job identity through plus three", () => {
  assert.deepEqual(
    getEquipmentInstanceDefinition({ equipmentId: "amethyst_plate", slot: "bodyId", enhancement: 3 }).statBonuses,
    { def: 15, str: 7, magicDamageReduction: 0.1 }
  );
  assert.deepEqual(
    getEquipmentInstanceDefinition({ equipmentId: "phantom_crystal_boots", slot: "footId", enhancement: 3 }).statBonuses,
    { def: 11, agi: 9, surpriseResistance: 0.05 }
  );
  assert.deepEqual(
    getEquipmentInstanceDefinition({ equipmentId: "white_crystal_vestment", slot: "bodyId", enhancement: 3 }).statBonuses,
    { def: 13, luc: 7, healingMiracleBonus: 0.1 }
  );
  assert.deepEqual(
    getEquipmentInstanceDefinition({ equipmentId: "astral_crystal_grimoire", slot: "leftArmId", enhancement: 3 }).statBonuses,
    { int: 15, maxSp: 24 }
  );
});

test("B80F to B89F red chests cycle final armor with 70/25/5 enhancements", () => {
  assert.equal(rollRedChestLoot(rng(0.099), 80).itemId, "strong_healing_potion_small");
  assert.equal(rollRedChestLoot(rng(0.1), 80).itemId, "strong_antidote");
  assert.deepEqual(
    [80, 81, 82, 83].map(depth => rollRedChestLoot(rng(0.2, 0), depth).equipmentId),
    ["amethyst_aegis", "phantom_crystal_buckler", "white_crystal_shield", "astral_crystal_grimoire"]
  );
  assert.deepEqual(
    [0.2, 0.4, 0.6, 0.8].map(roll => rollRedChestLoot(rng(roll, 0), 89).slot),
    ["leftArmId", "headId", "bodyId", "footId"]
  );
  assert.equal(rollRedChestLoot(rng(0.2, 0.699), 84).enhancement, 1);
  assert.equal(rollRedChestLoot(rng(0.2, 0.7), 84).enhancement, 2);
  assert.equal(rollRedChestLoot(rng(0.2, 0.95), 84).enhancement, 3);
});

test("B80F black chests use four crystal-breaking weapons and B88F is job-fixed", () => {
  assert.deepEqual(
    [80, 81, 82, 83].map(depth => rollBlackChestLoot(rng(0, 0), depth).equipmentId),
    ["crystal_warhammer", "resonant_katar", "amethyst_flail", "resonance_staff"]
  );
  const fixed = { warrior: "crystal_warhammer", thief: "resonant_katar", priest: "amethyst_flail", mage: "resonance_staff" };
  for (const [job, equipmentId] of Object.entries(fixed)) {
    assert.equal(rollBlackChestLoot(rng(0, 0.95), 88, job).equipmentId, equipmentId);
  }
  assert.equal(rollBlackChestLoot(rng(0, 0.699), 84).enhancement, 1);
  assert.equal(rollBlackChestLoot(rng(0, 0.7), 84).enhancement, 2);
  assert.equal(rollBlackChestLoot(rng(0, 0.95), 84).enhancement, 3);
});

test("crystal weapons retain job mechanics while all deal blunt-type physical damage", () => {
  const expected = {
    crystal_warhammer: ["greatsword", "warrior", true],
    resonant_katar: ["dagger", "thief", false],
    amethyst_flail: ["blunt", "priest", false],
    resonance_staff: ["staff", "mage", true]
  };
  for (const [id, [type, job, twoHanded]] of Object.entries(expected)) {
    const weapon = getWeapon(id, 3);
    assert.deepEqual([weapon.type, weapon.allowedJobs[0], Boolean(weapon.twoHanded), weapon.physicalDamageType], [type, job, twoHanded, "blunt"]);
  }
});

test("B80F to B89F place red chests and keep the B89F boss floor free of black chests", () => {
  for (const depth of [80, 81, 88, 89]) {
    buildBoundaryWallMap(depth, () => 0.5, { blackChestsUnlocked: true });
    const treasures = cells.flat().map(cell => cell.treasure).filter(Boolean);
    assert.equal(treasures.filter(type => type === "red").length, 2);
    assert.equal(treasures.filter(type => type === "black").length, depth === 89 ? 0 : 1);
  }
});
