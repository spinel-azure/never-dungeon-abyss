import test from "node:test";
import assert from "node:assert/strict";

import { createInitialCharacter } from "../data/classes.js";
import { rollTreasureTrap } from "../data/traps.js";
import { getDisarmRate, resolveTreasureTrap } from "../combat/resolve-trap.js";

test("treasure colors use 20, 50, and 80 percent trap rates", () => {
  assert.equal(rollTreasureTrap("red", sequence(0.19, 0)), "falling_stones");
  assert.equal(rollTreasureTrap("red", sequence(0.2, 0)), null);
  assert.equal(rollTreasureTrap("black", sequence(0.49, 0.34)), "crossbow");
  assert.equal(rollTreasureTrap("black", sequence(0.5, 0)), null);
  assert.equal(rollTreasureTrap("gold", sequence(0.79, 0.99)), "poison_needle");
  assert.equal(rollTreasureTrap("gold", sequence(0.8, 0)), null);
});

test("thieves always disarm red treasure traps", () => {
  const thief = createInitialCharacter({ name: "TEST", job: "thief" });
  assert.equal(getDisarmRate(thief, "red"), 1);
  const result = resolveTreasureTrap({
    character: thief,
    treasureType: "red",
    trapId: "poison_needle",
    rng: () => 0.999
  });
  assert.equal(result.disarmed, true);
  assert.equal(result.character.condition, "GOOD");
});

test("falling stones and crossbows deal nonlethal maximum-HP damage", () => {
  const warrior = { ...createInitialCharacter({ name: "TEST", job: "warrior" }), hp: 30 };
  const stones = resolveTreasureTrap({
    character: warrior,
    treasureType: "black",
    trapId: "falling_stones",
    rng: sequence(0.99, 0.99)
  });
  assert.equal(stones.damage, 3);
  assert.equal(stones.character.hp, 27);
  const crossbow = resolveTreasureTrap({
    character: { ...warrior, hp: 2 },
    treasureType: "black",
    trapId: "crossbow",
    rng: sequence(0.99, 0.99)
  });
  assert.equal(crossbow.damage, 1);
  assert.equal(crossbow.character.hp, 1);
});

test("a successful crossbow saving throw halves damage", () => {
  const warrior = { ...createInitialCharacter({ name: "TEST", job: "warrior" }), hp: 30 };
  const result = resolveTreasureTrap({
    character: warrior,
    treasureType: "black",
    trapId: "crossbow",
    rng: sequence(0.99, 0.1)
  });
  assert.equal(result.saved, true);
  assert.equal(result.damage, 3);
});

test("poison needles inflict poison without damage after both checks fail", () => {
  const mage = createInitialCharacter({ name: "TEST", job: "mage" });
  const result = resolveTreasureTrap({
    character: mage,
    treasureType: "gold",
    trapId: "poison_needle",
    rng: sequence(0.99, 0.99)
  });
  assert.equal(result.damage, 0);
  assert.equal(result.character.hp, mage.hp);
  assert.equal(result.character.condition, "POISON");
  assert.equal(result.character.statuses[0].statusId, "poison");
});

function sequence(...values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}
