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
  assert.equal(boss.experienceReward, 500);
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

test("B2 lingering ghost is a repeatable undead event boss with experience only", () => {
  const boss = getBossById("lingering_ghost_b2f");
  assert.equal(boss.name, "未練ある亡霊");
  assert.equal(boss.race, "undead");
  assert.equal(boss.maxHp, 45);
  assert.equal(boss.experienceReward, 20);
  assert.equal(boss.isBoss, true);
  assert.equal(boss.bossKind, "event");
  assert.equal(boss.repeatable, true);
  assert.equal(boss.noDrop, true);
  assert.equal(boss.defeatedFlag, undefined);
  assert.equal(applyBossVictory({ eventFlags: {} }, boss).accepted, false);
});

test("B4 otherworldly wisdom is a one-time superboss with Libra reward", () => {
  const boss = getBossById("otherworldly_wisdom_b4f");
  assert.equal(boss.name, "異界の叡智");
  assert.equal(boss.floor, 4);
  assert.equal(boss.image, "images/bosses/boss_00.avif");
  assert.equal(boss.encounterImageId, "otherworldly_wisdom_event_b4f");
  assert.equal(boss.encounterImage, "images/background/dungeon_event_06.avif");
  assert.equal(boss.maxHp, 3000);
  assert.equal(boss.experienceReward, 100000);
  assert.equal(boss.actions.length, 4);
  assert.equal(boss.actions.find(entry => entry.action.id === "four_world_assault").action.hitCount, 4);
  assert.deepEqual(boss.reward, { type: "card", cardId: "zodiac_libra", amount: 1 });
  assert.equal(boss.isBoss, true);
  assert.equal(boss.noDrop, true);
  const victory = applyBossVictory({ eventFlags: {} }, boss);
  assert.equal(victory.accepted, true);
  assert.equal(isBossDefeated(victory.character, boss), true);
});

test("B19 fallen mage is a one-time magic floor boss with a placeholder reward", () => {
  const boss = getBossById("fallen_mage_b19f");
  assert.equal(boss.name, "堕落した魔術師");
  assert.equal(boss.floor, 19);
  assert.equal(boss.image, "images/bosses/boss_03.avif");
  assert.equal(boss.encounterImage, "images/npc/NPC_event_03.avif");
  assert.equal(boss.defeatedEncounterImage, "images/npc/NPC_event_04.avif");
  assert.equal(boss.maxHp, 380);
  assert.equal(boss.experienceReward, 1500);
  assert.match(boss.event.prompt, /薄汚れたローブ/);
  assert.match(boss.event.start, /呪文を唱えはじめる/);
  assert.match(boss.event.remains, /もう何者の気配も感じない/);
  assert.equal(boss.actions.filter(entry => entry.action.actionType === "spell").length, 3);
  assert.deepEqual(boss.reward, { type: "none" });
  assert.equal(boss.defeatedFlag, "boss_fallen_mage_b19f_defeated");
  assert.equal(boss.room.keyItemId, "red_rust_key_b19f");
  assert.equal(boss.room.unlockFlag, "red_door_b19f_unlocked");
});

test("B29 Iron Maiden is a physical checkpoint boss with a low-HP death bite", () => {
  const boss = getBossById("iron_maiden_b29f");
  assert.equal(boss.name, "鋼鉄の乙女");
  assert.equal(boss.level, 38);
  assert.equal(boss.floor, 29);
  assert.equal(boss.image, "images/bosses/boss_05.avif");
  assert.equal(boss.encounterImage, "images/npc/NPC_event_05.avif");
  assert.equal(boss.defeatedEncounterImage, "images/npc/NPC_event_06.avif");
  assert.equal(boss.maxHp, 720);
  assert.equal(boss.experienceReward, 5000);
  assert.equal(boss.room.keyItemId, "red_rust_key_b29f");
  assert.equal(boss.room.unlockFlag, "red_door_b29f_unlocked");
  const deathBite = boss.actions.find(entry => entry.action.id === "death_bite");
  assert.equal(deathBite.when.hpRateBelow, 0.49);
  assert.ok(deathBite.action.powerPerHit > 1.5);
  assert.match(boss.event.prompt, /眠った乙女/);
  assert.match(boss.event.remains, /朽ちた棺の残骸/);
});

test("B39 Wicker Man is a fire checkpoint boss with dedicated event art", () => {
  const boss = getBossById("wicker_man_b39f");
  assert.equal(boss.name, "ウィッカーマン");
  assert.equal(boss.level, 48);
  assert.equal(boss.floor, 39);
  assert.equal(boss.image, "images/bosses/boss_07.avif");
  assert.equal(boss.encounterImage, "images/npc/NPC_event_07.avif");
  assert.equal(boss.defeatedEncounterImage, "images/npc/NPC_event_08.avif");
  assert.equal(boss.maxHp, 1100);
  assert.equal(boss.experienceReward, 10000);
  assert.equal(boss.room.keyItemId, "red_rust_key_b39f");
  assert.equal(boss.room.unlockFlag, "red_door_b39f_unlocked");
  assert.equal(boss.elementMultipliers.fire, 0);
  assert.equal(boss.elementMultipliers.ice, 1.5);
  assert.match(boss.event.prompt, /木の枝を編み込んで/);
  assert.match(boss.event.start, /激しく燃え上がり/);
  assert.match(boss.event.remains, /燃え尽き、朽ちた人型/);
});

test("B49 Eiskoenigin is an ice checkpoint boss stronger than Glacies", () => {
  const boss = getBossById("eiskoenigin_b49f");
  const glacies = getBossById("glacies_event_boss");
  assert.equal(boss.name, "エイスケーニギン");
  assert.equal(boss.level, 55);
  assert.equal(boss.floor, 49);
  assert.equal(boss.image, "images/bosses/boss_10.avif");
  assert.equal(boss.encounterImage, "images/npc/NPC_event_09.avif");
  assert.equal(boss.defeatedEncounterImage, "images/npc/NPC_event_10.avif");
  assert.ok(boss.maxHp > glacies.maxHp);
  assert.ok(boss.experienceReward > glacies.experienceReward);
  assert.equal(boss.room.keyItemId, "red_rust_key_b49f");
  assert.equal(boss.room.unlockFlag, "red_door_b49f_unlocked");
  assert.equal(boss.elementMultipliers.fire, 1.5);
  assert.equal(boss.elementMultipliers.ice, 0);
  assert.match(boss.event.prompt, /美しい女性の像/);
  assert.match(boss.event.start, /王笏を振りかざして/);
  assert.match(boss.event.remains, /王笏とティアラ/);
});

test("B16 Jabberwock is a one-time high-difficulty event boss", () => {
  const boss = getBossById("jabberwock_event_boss");
  assert.equal(boss.name, "ジャバウォック");
  assert.equal(boss.floor, 16);
  assert.equal(boss.image, "images/bosses/boss_06.avif");
  assert.equal(boss.isBoss, true);
  assert.equal(boss.bossKind, "event");
  assert.equal(boss.noDrop, true);
  assert.equal(boss.questProgressId, "guild_009");
  assert.deepEqual(boss.reward, { type: "routeCard" });
  assert.equal(boss.event.immediateStart, true);
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
  assert.equal(flat.filter(cell => cell.bossRemainsId === "strange_knight_statue_b9f").length, 1);
  assert.equal(flat.some(cell => cell.eventTreasureId), false);
  assert.equal(flat.flatMap(cell => Object.values(cell.doorKinds)).filter(kind => kind === "bossUnlocked").length, 2);
});

test("B19 creates a reusable 1x3 checkpoint room and leaves remains after victory", () => {
  buildBoundaryWallMap(19, () => .5, {
    bossDefeatedById: { fallen_mage_b19f: false }
  });
  let flat = cells.flat();
  let room = flat.filter(cell => cell.reserved === "bossRoom");
  assert.equal(room.length, 3);
  assert.equal(room.filter(cell => cell.bossId === "fallen_mage_b19f").length, 1);
  assert.equal(room.filter(cell => cell.type === "stairsDown").length, 1);
  assert.equal(flat.flatMap(cell => Object.values(cell.doorKinds)).filter(kind => kind === "boss").length, 2);
  const keyChests = flat.filter(cell => cell.eventTreasureId === "red_rust_key_b19f_chest");
  assert.equal(keyChests.length, 1);
  assert.equal(keyChests[0].treasure, "gold");
  assert.ok(keyChests[0].treasureTrapId);

  buildBoundaryWallMap(19, () => .5, {
    bossDefeatedById: { fallen_mage_b19f: true }
  });
  flat = cells.flat();
  room = flat.filter(cell => cell.reserved === "bossRoom");
  assert.equal(room.some(cell => cell.bossId), false);
  assert.equal(room.filter(cell => cell.bossRemainsId === "fallen_mage_b19f").length, 1);
  assert.equal(room.filter(cell => cell.type === "stairsDown").length, 1);
  assert.equal(flat.some(cell => cell.eventTreasureId === "red_rust_key_b19f_chest"), false);
});

test("B29 creates a keyed 1x3 checkpoint room and leaves remains after victory", () => {
  buildBoundaryWallMap(29, () => .5, {
    bossDefeatedById: { iron_maiden_b29f: false }
  });
  let flat = cells.flat();
  let room = flat.filter(cell => cell.reserved === "bossRoom");
  assert.equal(room.length, 3);
  assert.equal(room.filter(cell => cell.bossId === "iron_maiden_b29f").length, 1);
  assert.equal(room.filter(cell => cell.type === "stairsDown").length, 1);
  assert.equal(flat.flatMap(cell => Object.values(cell.doorKinds)).filter(kind => kind === "boss").length, 2);
  const keyChests = flat.filter(cell => cell.eventTreasureId === "red_rust_key_b29f_chest");
  assert.equal(keyChests.length, 1);
  assert.equal(keyChests[0].treasure, "gold");
  assert.ok(keyChests[0].treasureTrapId);

  buildBoundaryWallMap(29, () => .5, {
    bossDefeatedById: { iron_maiden_b29f: true }
  });
  flat = cells.flat();
  room = flat.filter(cell => cell.reserved === "bossRoom");
  assert.equal(room.some(cell => cell.bossId), false);
  assert.equal(room.filter(cell => cell.bossRemainsId === "iron_maiden_b29f").length, 1);
  assert.equal(room.filter(cell => cell.type === "stairsDown").length, 1);
  assert.equal(flat.some(cell => cell.eventTreasureId === "red_rust_key_b29f_chest"), false);
});

test("B39 creates a keyed 1x3 checkpoint room and leaves Wicker Man remains", () => {
  buildBoundaryWallMap(39, () => .5, {
    bossDefeatedById: { wicker_man_b39f: false }
  });
  let flat = cells.flat();
  let room = flat.filter(cell => cell.reserved === "bossRoom");
  assert.equal(room.length, 3);
  assert.equal(room.filter(cell => cell.bossId === "wicker_man_b39f").length, 1);
  assert.equal(room.filter(cell => cell.type === "stairsDown").length, 1);
  const keyChests = flat.filter(cell => cell.eventTreasureId === "red_rust_key_b39f_chest");
  assert.equal(keyChests.length, 1);
  assert.equal(keyChests[0].treasure, "gold");
  assert.ok(keyChests[0].treasureTrapId);

  buildBoundaryWallMap(39, () => .5, {
    bossDefeatedById: { wicker_man_b39f: true }
  });
  flat = cells.flat();
  room = flat.filter(cell => cell.reserved === "bossRoom");
  assert.equal(room.some(cell => cell.bossId), false);
  assert.equal(room.filter(cell => cell.bossRemainsId === "wicker_man_b39f").length, 1);
  assert.equal(flat.some(cell => cell.eventTreasureId === "red_rust_key_b39f_chest"), false);
});

test("B49 creates a keyed 1x3 checkpoint room and leaves Eiskoenigin remains", () => {
  buildBoundaryWallMap(49, () => .5, {
    bossDefeatedById: { eiskoenigin_b49f: false }
  });
  let flat = cells.flat();
  let room = flat.filter(cell => cell.reserved === "bossRoom");
  assert.equal(room.length, 3);
  assert.equal(room.filter(cell => cell.bossId === "eiskoenigin_b49f").length, 1);
  assert.equal(room.filter(cell => cell.type === "stairsDown").length, 1);
  const keyChests = flat.filter(cell => cell.eventTreasureId === "red_rust_key_b49f_chest");
  assert.equal(keyChests.length, 1);
  assert.equal(keyChests[0].treasure, "gold");
  assert.ok(keyChests[0].treasureTrapId);

  buildBoundaryWallMap(49, () => .5, {
    bossDefeatedById: { eiskoenigin_b49f: true }
  });
  flat = cells.flat();
  room = flat.filter(cell => cell.reserved === "bossRoom");
  assert.equal(room.some(cell => cell.bossId), false);
  assert.equal(room.filter(cell => cell.bossRemainsId === "eiskoenigin_b49f").length, 1);
  assert.equal(flat.some(cell => cell.eventTreasureId === "red_rust_key_b49f_chest"), false);
});

test("the B9 red rust key is a non-sellable key item", () => {
  const item = getKeyItem("red_rust_key_b9f");
  assert.equal(item.name, "赤錆びた鍵");
  assert.equal(item.sellable, false);
  const granted = grantKeyItem(null, item.id, 1);
  assert.equal(granted.gained, true);
  assert.equal(hasKeyItem(granted.keyItems, item.id), true);
});

test("B9 through B49 red rust keys share a display name but keep separate IDs", () => {
  const b9 = getKeyItem("red_rust_key_b9f");
  const b19 = getKeyItem("red_rust_key_b19f");
  const b29 = getKeyItem("red_rust_key_b29f");
  const b39 = getKeyItem("red_rust_key_b39f");
  const b49 = getKeyItem("red_rust_key_b49f");
  assert.equal(b9.name, "赤錆びた鍵");
  assert.equal(b19.name, "赤錆びた鍵");
  assert.equal(b29.name, "赤錆びた鍵");
  assert.equal(b39.name, "赤錆びた鍵");
  assert.equal(b49.name, "赤錆びた鍵");
  assert.notEqual(b9.id, b19.id);
  assert.notEqual(b19.id, b29.id);
  assert.notEqual(b29.id, b39.id);
  assert.notEqual(b39.id, b49.id);
  const b19State = grantKeyItem(null, b19.id, 1).keyItems;
  assert.equal(hasKeyItem(b19State, b19.id), true);
  assert.equal(hasKeyItem(b19State, b9.id), false);
});

test("B10 stairs up is marked as the transfer portal", () => {
  randomizeStartPosition();
  buildBoundaryWallMap(10, () => .5, {});
  const stairsUp = cells.flat().find(cell => cell.type === "stairsUp");
  assert.equal(stairsUp.portal, "transfer_b10f");
});

test("B20 stairs up is marked as the second transfer portal", () => {
  buildBoundaryWallMap(20, () => 0.5);
  const stairsUp = cells.flat().find(cell => cell.type === "stairsUp");
  assert.equal(stairsUp.portal, "transfer_b20f");
});

test("B30 stairs up is marked as the third transfer portal", () => {
  buildBoundaryWallMap(30, () => 0.5);
  const stairsUp = cells.flat().find(cell => cell.type === "stairsUp");
  assert.equal(stairsUp.portal, "transfer_b30f");
});

test("every tenth floor through B100F contains a transfer portal", () => {
  for (const floor of [40, 50, 60, 70, 80, 90, 100]) {
    buildBoundaryWallMap(floor, () => 0.5);
    const stairsUp = cells.flat().find(cell => cell.type === "stairsUp");
    assert.equal(stairsUp.portal, `transfer_b${floor}f`);
  }
});

test("Brass Bull is a B36F quest event boss with a guaranteed unique material reward", () => {
  const boss = getBossById("brass_bull_event_boss");
  assert.equal(boss.bossKind, "event");
  assert.equal(boss.floor, 36);
  assert.equal(boss.level, 35);
  assert.equal(boss.experienceReward, 5000);
  assert.equal(boss.encounterImage, "images/background/dungeon_event_04.avif");
  assert.deepEqual(boss.reward, { type: "item", itemId: "molten_brass", amount: 1 });
  assert.deepEqual(boss.actions.map(entry => entry.action.name), ["雄牛の咆哮", "雄牛の突進", "火炎吐き"]);
  assert.equal(boss.event.autoStartDelay, 1000);
  assert.equal(boss.event.fadeBeforeStart, true);
  assert.match(boss.event.prompt, /＊Aボタン：次へ/);
  assert.equal(createBossCombatant(boss).isBoss, true);
});

test("Glacies is the B46F quest event boss with a warrior hammer reward", () => {
  const boss = getBossById("glacies_event_boss");
  assert.equal(boss.bossKind, "event");
  assert.equal(boss.floor, 46);
  assert.equal(boss.level, 42);
  assert.equal(boss.experienceReward, 6500);
  assert.equal(boss.encounterImage, "images/background/dungeon_event_05.avif");
  assert.deepEqual(boss.reward, { type: "equipment", equipmentId: "glacies_hammer", slot: "rightArmId" });
  assert.deepEqual(boss.actions.map(entry => entry.action.name), ["ぶん回し", "振り下ろし", "巨人の突進"]);
  assert.equal(boss.event.confirmBeforeStart, true);
  assert.equal(boss.event.autoStartDelay, 2000);
});
