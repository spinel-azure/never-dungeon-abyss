import test from "node:test";
import assert from "node:assert/strict";
import { getEnemyById } from "../data/enemies.js";
import { scaleBlackChestMimic } from "../data/mimic-scaling.js";

test("black chest mimic scales in ten-floor tiers", () => {
  const base = getEnemyById("mimic");
  const floor9 = scaleBlackChestMimic(base, 9);
  const floor10 = scaleBlackChestMimic(base, 10);
  const floor79 = scaleBlackChestMimic(base, 79);
  assert.equal(floor9.mimicScalingTier, 0);
  assert.equal(floor10.mimicScalingTier, 1);
  assert.ok(floor10.maxHp > floor9.maxHp);
  assert.equal(floor79.def, 44);
  assert.ok(floor79.experienceReward > floor10.experienceReward);
});

test("mimic scaling leaves unrelated enemies untouched", () => {
  const enemy = getEnemyById("abyss_piranha");
  assert.equal(scaleBlackChestMimic(enemy, 79), enemy);
});
