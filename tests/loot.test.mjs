import test from "node:test";
import assert from "node:assert/strict";
import { rollEnemyDrop, rollRedChestLoot } from "../data/loot.js";
import { buildBoundaryWallMap, cells } from "../js/dungeon.js";
import { getWeapon } from "../data/weapons.js";
import { getInnStayFee } from "../js/character-services.js";

const rng = (...values) => {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
};

test("early enemy drops use 40/55/5 percent bands", () => {
  const enemy = { dropItemId: "rat_tail" };
  assert.equal(rollEnemyDrop(enemy, rng(0.399)).kind, "none");
  assert.deepEqual(rollEnemyDrop(enemy, rng(0.4)), { kind: "item", itemId: "rat_tail", amount: 1 });
  assert.equal(rollEnemyDrop(enemy, rng(0.949)).kind, "item");
  assert.equal(rollEnemyDrop(enemy, rng(0.95)).kind, "redChest");
});

test("red chest rewards and stiletto qualities follow configured bands", () => {
  assert.equal(rollRedChestLoot(rng(0.1, 0.59)).amount, 10);
  assert.equal(rollRedChestLoot(rng(0.1, 0.6)).amount, 15);
  assert.equal(rollRedChestLoot(rng(0.1, 0.9)).amount, 20);
  assert.equal(rollRedChestLoot(rng(0.7)).itemId, "healing_potion");
  assert.equal(rollRedChestLoot(rng(0.9)).itemId, "antidote");
  assert.equal(rollRedChestLoot(rng(0.99, 0.49)).enhancement, 0);
  assert.equal(rollRedChestLoot(rng(0.99, 0.5)).enhancement, 1);
  assert.equal(rollRedChestLoot(rng(0.99, 0.8)).enhancement, 2);
  assert.equal(rollRedChestLoot(rng(0.99, 0.951)).enhancement, 3);
  assert.equal(getWeapon("stiletto", 2).defensePenetration, 0.3);
});

test("B1F to B4F place one to three red chests and no black or gold", () => {
  for (const [depth, roll, expected] of [[1, 0, 1], [2, 0.4, 2], [4, 0.99, 3]]) {
    buildBoundaryWallMap(depth, () => roll);
    const treasures = cells.flat().map(cell => cell.treasure).filter(Boolean);
    assert.equal(treasures.length, expected);
    assert.ok(treasures.every(type => type === "red"));
  }
  buildBoundaryWallMap(5, () => 0);
  assert.equal(cells.flat().filter(cell => cell.treasure).length, 0);
});

test("inn fee is five gold per level", () => {
  assert.equal(getInnStayFee({ level: 1 }), 5);
  assert.equal(getInnStayFee({ level: 197 }), 985);
});
