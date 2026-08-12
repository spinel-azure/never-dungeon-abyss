import test from "node:test";
import assert from "node:assert/strict";

import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { getEquipmentItem } from "../data/equipment.js";
import { grantEquipmentInstance } from "../data/equipment-inventory.js";
import { equipInstance } from "../data/equipment-inventory.js";
import { getFireFloorStepDamage, hasFireFloorImmunity, isFireFloorDepth } from "../data/fire-floor.js";

test("only B30F to B39F are damaging fire floors", () => {
  assert.equal(isFireFloorDepth(29), false);
  assert.equal(isFireFloorDepth(30), true);
  assert.equal(isFireFloorDepth(39), true);
  assert.equal(isFireFloorDepth(40), false);
});

test("fire floors deal one step damage unless fireproof boots are equipped", () => {
  let character = createInitialCharacter({ name: "TEST", job: "mage" });
  assert.equal(getFireFloorStepDamage(character, 30), 1);
  const granted = grantEquipmentInstance(character, "fireproof_boots", "footId");
  character = granted.character;
  character = equipInstance(character, "footId", granted.instance.instanceId).character;
  character = normalizeCharacter(character);
  assert.equal(hasFireFloorImmunity(character), true);
  assert.equal(getFireFloorStepDamage(character, 30), 0);
  assert.equal(getFireFloorStepDamage(character, 40), 0);
});

test("fireproof boots are universal DEF plus three foot equipment", () => {
  const boots = getEquipmentItem("fireproof_boots", "footId");
  assert.equal(boots?.name, "耐火ブーツ");
  assert.deepEqual(boots?.statBonuses, { def: 3 });
  assert.equal(boots?.fireFloorDamageImmunity, true);
  assert.equal(boots?.allowedJobs, undefined);
});
