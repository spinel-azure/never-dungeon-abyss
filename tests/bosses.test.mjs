import test from "node:test";
import assert from "node:assert/strict";

import {
  applyBossVictory,
  createBossCombatant,
  getBossById,
  isBossDefeated
} from "../data/bosses.js";
import { createInitialCharacter } from "../data/classes.js";
import { getKeyItem, grantKeyItem, hasKeyItem } from "../data/key-items.js";
import {
  buildBoundaryWallMap,
  cells,
  randomizeStartPosition
} from "../js/dungeon.js";

test("B9 strange statue boss data is isolated and balance-adjustable", () => {
  const boss = getBossById("strange_knight_statue_b9f");
  assert.equal(boss.name, "奇妙な彫像");
  assert.equal(boss.maxHp, 140);
  assert.equal(boss.attack, 7);
  assert.equal(boss.def, 8);
  assert.equal(boss.specialAttack, null);
  assert.deepEqual(boss.reward, { type: "none" });
  const combatant = createBossCombatant(boss);
  assert.equal(combatant.isBoss, true);
  assert.equal(combatant.noDrop, true);
  assert.equal(combatant.escapeRate, 0);
});

test("boss victory persists independently from its future reward", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  const result = applyBossVictory(character, "strange_knight_statue_b9f");
  assert.equal(result.accepted, true);
  assert.equal(isBossDefeated(result.character, "strange_knight_statue_b9f"), true);
  assert.equal(result.character.eventFlags.transfer_portal_b10f_unlocked, undefined);
  assert.deepEqual(result.reward, { type: "none" });
});

test("B9 always creates one sealed 1x3 boss room and one trapped key chest", () => {
  for (let iteration = 0; iteration < 50; iteration += 1) {
    randomizeStartPosition();
    buildBoundaryWallMap(9, Math.random, {});
    const flat = cells.flat();
    const room = flat.filter(cell => cell.reserved === "bossRoom");
    assert.equal(room.length, 3);
    assert.equal(room.filter(cell => cell.bossId === "strange_knight_statue_b9f").length, 1);
    assert.equal(room.filter(cell => cell.type === "stairsDown").length, 1);
    const keyChests = flat.filter(cell => cell.eventTreasureId === "red_rust_key_b9f_chest");
    assert.equal(keyChests.length, 1);
    assert.equal(keyChests[0].treasure, "gold");
    assert.ok(keyChests[0].treasureTrapId);
    assert.equal(flat.flatMap(cell => Object.values(cell.doorKinds)).filter(kind => kind === "boss").length, 2);
  }
});

test("opened B9 red door stays red and defeated boss never respawns", () => {
  randomizeStartPosition();
  buildBoundaryWallMap(9, () => .5, { redDoorUnlocked: true, bossDefeated: true });
  const flat = cells.flat();
  assert.equal(flat.some(cell => cell.bossId), false);
  assert.equal(flat.some(cell => cell.eventTreasureId), false);
  assert.equal(flat.flatMap(cell => Object.values(cell.doorKinds)).filter(kind => kind === "bossUnlocked").length, 2);
});

test("the B9 red rust key is a non-sellable key item", () => {
  const item = getKeyItem("red_rust_key_b9f");
  assert.equal(item.name, "赤錆びた鍵");
  assert.equal(item.sellable, false);
  const granted = grantKeyItem(null, item.id, 1);
  assert.equal(granted.gained, true);
  assert.equal(hasKeyItem(granted.keyItems, item.id), true);
});

test("B10 stairs up is marked as the transfer portal", () => {
  randomizeStartPosition();
  buildBoundaryWallMap(10, () => .5, {});
  const stairsUp = cells.flat().find(cell => cell.type === "stairsUp");
  assert.equal(stairsUp.portal, "transfer_b10f");
});
