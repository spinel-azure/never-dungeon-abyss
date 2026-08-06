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
  assert.equal(getRandomEnemy({ depth: 999, rng: () => 0.999 }).id, "viper");
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

function sequence(...values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}
