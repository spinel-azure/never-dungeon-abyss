import test from "node:test";
import assert from "node:assert/strict";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import {
  canEquipInstance,
  equipInstance,
  grantEquipmentInstance
} from "../data/equipment-inventory.js";
import { WEAPONS } from "../data/weapons.js";

const EXPECTED_TWO_HANDED_WEAPON_IDS = Object.freeze([
  "salamander_staff",
  "ice_lizard_staff",
  "training_greatsword",
  "iron_greatsword",
  "anguish_staff",
  "winterstar_staff",
  "ancient_tree_staff",
  "crystal_warhammer",
  "resonance_staff",
  "musashi_blade",
  "glacies_hammer",
  "sylvan_emera",
  "comet_booster",
  "katzenstab"
]);

function findInstance(character, instanceId) {
  return character.equipmentInventory.instances.find(instance => instance.instanceId === instanceId);
}

test("all two-handed weapons clear the left hand and prevent it from being re-equipped", () => {
  const twoHandedWeapons = Object.values(WEAPONS).filter(weapon => weapon.twoHanded === true);
  assert.deepEqual(twoHandedWeapons.map(weapon => weapon.id), EXPECTED_TWO_HANDED_WEAPON_IDS);

  for (const weapon of twoHandedWeapons) {
    const job = weapon.allowedJobs?.[0] || "warrior";
    const initial = createInitialCharacter({ name: "TEST", job });
    const leftArmInstanceId = initial.equippedInstanceIds.leftArmId;
    const leftArmInstance = findInstance(initial, leftArmInstanceId);
    assert.ok(leftArmInstance, `${weapon.id}: initial left-arm equipment exists`);

    const granted = grantEquipmentInstance(initial, weapon.id, "rightArmId");
    assert.equal(granted.accepted, true, `${weapon.id}: grant accepted`);
    const equipped = equipInstance(granted.character, "rightArmId", granted.instance.instanceId);
    assert.equal(equipped.accepted, true, `${weapon.id}: equip accepted`);
    assert.equal(equipped.character.equippedInstanceIds.leftArmId, null, `${weapon.id}: left instance cleared`);
    assert.equal(equipped.character.equipment.leftArmId, null, `${weapon.id}: left equipment id cleared`);

    const eligibility = canEquipInstance(equipped.character, leftArmInstance);
    assert.deepEqual(eligibility, {
      accepted: false,
      reason: "両手武器の装備中は左手装備を使用できません。"
    }, `${weapon.id}: left arm eligibility rejected`);
    const attempted = equipInstance(equipped.character, "leftArmId", leftArmInstanceId);
    assert.equal(attempted.accepted, false, `${weapon.id}: left arm equip rejected`);
    assert.equal(attempted.character.equippedInstanceIds.leftArmId, null, `${weapon.id}: left arm remains empty`);
  }
});

test("one-handed weapons continue to allow compatible left-arm equipment", () => {
  const initial = createInitialCharacter({ name: "TEST", job: "warrior" });
  const leftArmInstanceId = initial.equippedInstanceIds.leftArmId;
  const leftArmInstance = findInstance(initial, leftArmInstanceId);
  const removed = equipInstance(initial, "leftArmId", null);
  assert.equal(removed.accepted, true);
  assert.equal(canEquipInstance(removed.character, leftArmInstance).accepted, true);
  const restored = equipInstance(removed.character, "leftArmId", leftArmInstanceId);
  assert.equal(restored.accepted, true);
  assert.equal(restored.character.equippedInstanceIds.leftArmId, leftArmInstanceId);
});

test("normalization repairs saved two-handed and left-arm equipment conflicts", () => {
  const initial = createInitialCharacter({ name: "TEST", job: "priest" });
  const leftArmInstanceId = initial.equippedInstanceIds.leftArmId;
  const granted = grantEquipmentInstance(initial, "sylvan_emera", "rightArmId");
  const equipped = equipInstance(granted.character, "rightArmId", granted.instance.instanceId);
  const clean = normalizeCharacter(equipped.character);
  const invalidSave = {
    ...clean,
    equipment: { ...clean.equipment, leftArmId: "wooden_shield" },
    equippedInstanceIds: { ...clean.equippedInstanceIds, leftArmId: leftArmInstanceId }
  };

  const normalized = normalizeCharacter(invalidSave);
  assert.equal(normalized.equipment.rightArmId, "sylvan_emera");
  assert.equal(normalized.equipment.leftArmId, null);
  assert.equal(normalized.equippedInstanceIds.leftArmId, null);
  assert.deepEqual(normalized.equipmentStatBonuses, clean.equipmentStatBonuses);
});
