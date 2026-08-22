import test from "node:test";
import assert from "node:assert/strict";
import { createInitialCharacter, normalizeCharacter } from "../data/classes.js";
import { applyCrystalFloorSpStep, isCrystalFloorDepth } from "../data/crystal-floor.js";

test("only B80F through B89F drain SP through the crystal floor", () => {
  assert.equal(isCrystalFloorDepth(79), false);
  assert.equal(isCrystalFloorDepth(80), true);
  assert.equal(isCrystalFloorDepth(89), true);
  assert.equal(isCrystalFloorDepth(90), false);
});

test("the crystal floor drains one SP every third successful step", () => {
  let character = { ...createInitialCharacter({ name: "TEST", job: "mage" }), sp: 10 };
  let result = applyCrystalFloorSpStep(character, 80);
  assert.equal(result.drained, 0);
  assert.equal(result.character.sp, 10);
  result = applyCrystalFloorSpStep(result.character, 84);
  assert.equal(result.drained, 0);
  result = applyCrystalFloorSpStep(result.character, 89);
  assert.equal(result.drained, 1);
  assert.equal(result.character.sp, 9);
  assert.equal(result.character.crystalFloorStepCount, 0);
});

test("crystal SP drain never goes below zero and resets outside the region", () => {
  const zero = applyCrystalFloorSpStep({ sp: 0, crystalFloorStepCount: 2 }, 80);
  assert.equal(zero.drained, 0);
  assert.equal(zero.character.sp, 0);
  const outside = applyCrystalFloorSpStep({ sp: 5, crystalFloorStepCount: 2 }, 90);
  assert.equal(outside.character.crystalFloorStepCount, 0);
});

test("legacy saves receive a safe crystal step counter", () => {
  const legacy = normalizeCharacter(createInitialCharacter({ name: "OLD", job: "warrior" }));
  assert.equal(legacy.crystalFloorStepCount, 0);
});

test("crystal SP damage is presented beside the SP value", async () => {
  const [html, main] = await Promise.all([
    import("node:fs/promises").then(({ readFile }) => readFile(new URL("../index.html", import.meta.url), "utf8")),
    import("node:fs/promises").then(({ readFile }) => readFile(new URL("../js/main.js", import.meta.url), "utf8"))
  ]);
  assert.match(html, /quick-sp-current[\s\S]*?crystalStepSpDamage/);
  assert.match(main, /getElementById\("crystalStepSpDamage"\)[\s\S]*?SP－/);
});
