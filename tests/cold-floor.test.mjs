import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createInitialCharacter } from "../data/classes.js";
import { getColdFloorStepDamage, isColdFloorDepth } from "../data/cold-floor.js";
import { getEquipmentItem } from "../data/equipment.js";
import { grantEquipmentInstance } from "../data/equipment-inventory.js";

test("only B40F to B49F are damaging cold floors", () => {
  assert.equal(isColdFloorDepth(39), false);
  assert.equal(isColdFloorDepth(40), true);
  assert.equal(isColdFloorDepth(49), true);
  assert.equal(isColdFloorDepth(50), false);
});

test("cold floors deal one step damage and use the shared nonlethal path", async () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  assert.equal(getColdFloorStepDamage(character, 40), 1);
  assert.equal(getColdFloorStepDamage(character, 49), 1);
  assert.equal(getColdFloorStepDamage(character, 50), 0);
  const source = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
  assert.match(source, /getColdFloorStepDamage/);
  assert.match(source, /applyColdFloorStep\(\)/);
  assert.match(source, /getNonlethalPoisonDamage\(character\.hp, requested\)/);
});

test("coldproof boots negate cold floor damage and hide their ice resistance", () => {
  let character = createInitialCharacter({ name: "TEST", job: "warrior" });
  const granted = grantEquipmentInstance(character, "coldproof_boots", "footId");
  character = {
    ...granted.character,
    equipment: { ...granted.character.equipment, footId: "coldproof_boots" },
    equippedInstanceIds: { ...granted.character.equippedInstanceIds, footId: granted.instance.instanceId }
  };
  assert.equal(getColdFloorStepDamage(character, 45), 0);
  const boots = getEquipmentItem("coldproof_boots", "footId");
  assert.equal(boots?.statBonuses?.def, 3);
  assert.equal(boots?.statBonuses?.iceDamageReduction, 0.15);
  assert.equal(boots?.coldFloorDamageImmunity, true);
  assert.deepEqual(boots?.hiddenStatBonusKeys, ["iceDamageReduction"]);
});

test("cold area uses a dedicated blue mist palette", async () => {
  const [main, renderer, menu] = await Promise.all([
    readFile(new URL("../js/main.js", import.meta.url), "utf8"),
    readFile(new URL("../js/renderer.js", import.meta.url), "utf8"),
    readFile(new URL("../js/menu.js", import.meta.url), "utf8")
  ]);
  assert.match(main, /isColdFloorDepth\(currentDepth\) \? "blue"/);
  assert.match(renderer, /blue: \{ main: \[35, 69, 112\]/);
  assert.match(menu, /\["green", "frost", "blue", "poison", "red"\]/);
});
