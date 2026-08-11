import test from "node:test";
import assert from "node:assert/strict";

import { getAdventureChronicle, getAdventureRecords } from "../data/adventure-records.js";
import { formatPlayTime, getActivePlayTimeDelta, normalizeAdventureStats, PLAY_TIME_ERA } from "../data/adventure-stats.js";
import { createInitialCharacter } from "../data/classes.js";

test("adventure records summarize values already stored in the save", () => {
  const character = createInitialCharacter({ name: "記録係", job: "thief" });
  character.level = 20;
  character.highestDungeonDepthReached = 9;
  character.gold = 1234;
  character.quests.completedQuestIds = ["guild_001_abyss_rat", "guild_002_cave_slime"];
  character.cards.ownedCardCounts = { common_hp_up: 2, common_sp_up: 1 };
  character.cards.ownedCardIds = ["common_hp_up", "common_sp_up"];
  character.warehouse.itemStacks = [{ itemId: "healing_potion", count: 4 }];
  character.warehouse.equipmentInstances = [{ instanceId: "stored-1" }];
  character.eventFlags = {
    boss_strange_knight_statue_b9f_defeated: true,
    lingering_ghost_b2f_defeated_once: true
  };
  character.adventureStats.playTimeSeconds = 12345;

  const values = Object.fromEntries(getAdventureRecords(character).map(entry => [entry.id, entry.value]));
  assert.equal(values.name, "記録係");
  assert.equal(values.job, "盗賊");
  assert.equal(values.level, "LV20");
  assert.equal(values.deepestFloor, "B9F");
  assert.equal(values.completedQuests, "2件");
  assert.equal(values.defeatedBosses, "2体");
  assert.equal(values.cardTypes, "2種類");
  assert.equal(values.totalCards, "3枚");
  assert.equal(values.gold, "1,234G");
  assert.equal(values.warehouse, "5個");
  assert.equal(values.playTime, "0003:25:45");
});

test("adventure statistics include the ten original entries and play time", () => {
  const character = createInitialCharacter({ name: "新人", job: "mage" });
  assert.equal(getAdventureRecords(character).length, 11);
});

test("play time uses an hour counter that can exceed one day", () => {
  assert.equal(formatPlayTime(100 * 3600 + 61), "0100:01:01");
});

test("play time stops for hidden tabs and after five minutes without input", () => {
  const active = { elapsedMs: 1000, hasCharacter: true, visible: true, idleMs: 1000, idleLimitMs: 300000 };
  assert.equal(getActivePlayTimeDelta(active), 1);
  assert.equal(getActivePlayTimeDelta({ ...active, visible: false }), 0);
  assert.equal(getActivePlayTimeDelta({ ...active, idleMs: 300001 }), 0);
  assert.equal(getActivePlayTimeDelta({ ...active, hasCharacter: false }), 0);
});

test("play time preserves MVP saves and safely resets when the era changes", () => {
  assert.equal(normalizeAdventureStats({ playTimeSeconds: 123 }).playTimeSeconds, 123);
  assert.deepEqual(normalizeAdventureStats({ playTimeSeconds: 123, playTimeEra: PLAY_TIME_ERA }), {
    playTimeSeconds: 123,
    playTimeEra: PLAY_TIME_ERA
  });
  assert.deepEqual(normalizeAdventureStats({ playTimeSeconds: 123, playTimeEra: "prototype" }), {
    playTimeSeconds: 0,
    playTimeEra: PLAY_TIME_ERA
  });
});

test("chronicle restores achieved milestones from existing progress flags", () => {
  const character = createInitialCharacter({ name: "年代記", job: "priest" });
  character.highestDungeonDepthReached = 10;
  character.eventFlags.lingering_ghost_b2f_defeated_once = true;
  character.eventFlags.boss_otherworldly_wisdom_b4f_defeated = true;
  character.eventFlags.inn_stable_stayed = true;
  const chronicle = getAdventureChronicle(character);
  assert.deepEqual(chronicle.slice(0, 3).map(entry => entry.id), ["registered", "stable", "b2"]);
  assert.equal(chronicle.find(entry => entry.id === "stable").achieved, true);
  assert.equal(chronicle.find(entry => entry.id === "ghost").achieved, true);
  assert.equal(chronicle.find(entry => entry.id === "otherworldlyWisdom").achieved, true);
  assert.equal(chronicle.find(entry => entry.id === "otherworldlyWisdom").label, "異界の叡智を撃破した");
  assert.equal(chronicle.find(entry => entry.id === "b10").achieved, true);
  assert.equal(chronicle.find(entry => entry.id === "mage").label, "？？？？？？？");
});
