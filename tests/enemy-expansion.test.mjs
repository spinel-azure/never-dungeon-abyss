import test from "node:test";
import assert from "node:assert/strict";

import { createEnemyCombatant, getEnemyById, getRandomEnemy } from "../data/enemies.js";
import { getItem } from "../data/items.js";
import { rollBlackChestLoot, rollEnemyDrop } from "../data/loot.js";

test("new enemies follow the B3F to B5F encounter progression", () => {
  assert.equal(getRandomEnemy({ depth: 2, rng: () => 0.999 }).id, "poison_slime");
  assert.equal(getRandomEnemy({ depth: 3, rng: () => 0.999 }).id, "vampire_bat");
  assert.equal(getRandomEnemy({ depth: 4, rng: () => 0.999 }).id, "bouncing_coin");
  assert.equal(getRandomEnemy({ depth: 5, rng: () => 0.999 }).id, "viper");
});

test("mimic is excluded from random encounters and uses the black chest reward profile", () => {
  const mimic = getEnemyById("mimic");
  assert.equal(mimic.randomEncounter, false);
  assert.equal(getRandomEnemy({ depth: 999, rng: () => 0.999 }).id, "cassowary");
  assert.equal(createEnemyCombatant(mimic).dropProfile, "blackChest");
  assert.deepEqual(rollEnemyDrop(createEnemyCombatant(mimic), sequence(0, 0)), rollBlackChestLoot(sequence(0, 0)));
});

test("viper and vampire bat materials are sell-only drops and bouncing coin carries 40G", () => {
  const snakeSkin = getItem("snake_skin");
  const batWing = getItem("bat_wing");
  assert.equal(snakeSkin.sellPrice, 30);
  assert.equal(snakeSkin.repurchasable, false);
  assert.equal(batWing.sellPrice, 20);
  assert.equal(batWing.repurchasable, false);
  assert.deepEqual(rollEnemyDrop(createEnemyCombatant(getEnemyById("bouncing_coin")), () => 0.5), {
    kind: "gold",
    amount: 40
  });
});

test("viper has poison and vampire bat reserves its future drain attack id", () => {
  const viper = getEnemyById("viper");
  assert.equal(viper.specialAttack.effects[0].statusId, "poison");
  assert.equal(getEnemyById("vampire_bat").futureSpecialAttackId, "life_drain");
});

test("B11F to B20F enemies replace the early encounter pool and unlock progressively", () => {
  assert.equal(getRandomEnemy({ depth: 10, rng: () => 0.999 }).id, "viper");
  assert.equal(getRandomEnemy({ depth: 11, rng: () => 0.999 }).id, "giant_spider");
  assert.equal(getRandomEnemy({ depth: 13, rng: () => 0.999 }).id, "wasp");
  assert.equal(getRandomEnemy({ depth: 16, rng: () => 0.999 }).id, "poison_toad");
  assert.equal(getRandomEnemy({ depth: 19, rng: () => 0.999 }).id, "banshee");
  assert.equal(getRandomEnemy({ depth: 20, rng: () => 0 }).id, "giant_spider");
});

test("B11F to B20F enemies carry their intended attacks, rewards and materials", () => {
  const spider = getEnemyById("giant_spider");
  const wasp = getEnemyById("wasp");
  const toad = getEnemyById("poison_toad");
  const banshee = getEnemyById("banshee");

  assert.equal(spider.specialAttack.effects[0].statusId, "action_skip");
  assert.equal(wasp.actions[0].action.hitCount, 2);
  assert.equal(wasp.actions[0].action.powerPerHit, 0.75);
  assert.equal(toad.specialAttack.effects[0].statusId, "poison");
  assert.equal(banshee.specialAttack.effects[0].statusId, "action_skip");
  assert.deepEqual([spider.experienceReward, wasp.experienceReward, toad.experienceReward, banshee.experienceReward], [40, 55, 75, 100]);

  for (const [enemy, itemId, sellPrice] of [
    [spider, "spider_silk", 40],
    [wasp, "beeswax", 50],
    [toad, "poison_toad_skin", 60]
  ]) {
    assert.equal(enemy.dropItemId, itemId);
    assert.equal(getItem(itemId).sellPrice, sellPrice);
    assert.equal(getItem(itemId).repurchasable, false);
  }
});

test("B21F to B30F fire enemies unlock progressively and replace the previous pool", () => {
  assert.equal(getRandomEnemy({ depth: 21, rng: () => 0.999 }).id, "fire_spirit");
  assert.equal(getRandomEnemy({ depth: 23, rng: () => 0.999 }).id, "fire_lizard");
  assert.equal(getRandomEnemy({ depth: 26, rng: () => 0.999 }).id, "loren_lava");
  assert.equal(getRandomEnemy({ depth: 29, rng: () => 0.999 }).id, "cassowary");
});

test("B21F to B30F enemies use fire and heavy attacks with balanced rewards", () => {
  const spirit = getEnemyById("fire_spirit");
  const lizard = getEnemyById("fire_lizard");
  const lava = getEnemyById("loren_lava");
  const cassowary = getEnemyById("cassowary");
  assert.equal(spirit.actions[1].action.actionType, "spell");
  assert.equal(spirit.actions[1].action.element, "fire");
  assert.equal(lizard.actions[1].action.element, "fire");
  assert.equal(lava.actions[1].action.powerPerHit, 1.65);
  assert.equal(lava.actions[1].action.speedModifier, -8);
  assert.equal(cassowary.actions[1].action.element, "fire");
  assert.deepEqual([spirit.experienceReward, lizard.experienceReward, lava.experienceReward, cassowary.experienceReward], [140, 170, 210, 260]);
});

function sequence(...values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}
