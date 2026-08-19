import test from "node:test";
import assert from "node:assert/strict";

import { getAdventureChronicle, getAdventureRecords } from "../data/adventure-records.js";
import { readFile } from "node:fs/promises";

test("quest history and adventure record descriptions reserve fixed line counts", async () => {
  const css = await readFile(new URL("../css/game-menu.css", import.meta.url), "utf8");
  assert.match(css, /\.quest-history-panel \.inventory-description\{[^}]*height:calc\(4\.5em \+ 16px\)/);
  assert.match(css, /\.adventure-records-panel \.inventory-description\{[^}]*height:calc\(3em \+ 16px\)/);
});

test("rumor history reserves more lines and scrolls long dialogue", async () => {
  const css = await readFile(new URL("../css/game-menu.css", import.meta.url), "utf8");
  assert.match(css, /\.rumor-history-panel \.inventory-description\{[^}]*height:calc\(7\.5em \+ 16px\)[^}]*overflow-y:auto/);
});
import { formatPlayTime, getActivePlayTimeDelta, normalizeAdventureStats, PLAY_TIME_ERA, recordInnStay, recordShopPurchase, recordTempleDonation } from "../data/adventure-stats.js";
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
  character.adventureStats = recordInnStay(character.adventureStats);
  character.adventureStats = recordShopPurchase(character.adventureStats, 1500);
  character.adventureStats = recordTempleDonation(character.adventureStats, 15);

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
  assert.equal(values.innStays, "1回");
  assert.equal(values.shopPurchases, "1回");
  assert.equal(values.shopPurchaseGold, "1,500G");
  assert.equal(values.templeDonations, "1回");
  assert.equal(values.templeDonationGold, "15G");
  assert.equal(values.bestiaryCompletion, "未集計");
});

test("adventure statistics include the original entries and new activity counters", () => {
  const character = createInitialCharacter({ name: "新人", job: "mage" });
  assert.equal(getAdventureRecords(character).length, 17);
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
    playTimeEra: PLAY_TIME_ERA,
    innStayCount: 0,
    shopPurchaseCount: 0,
    shopPurchaseGold: 0,
    templeDonationCount: 0,
    templeDonationGold: 0
  });
  assert.deepEqual(normalizeAdventureStats({ playTimeSeconds: 123, playTimeEra: "prototype" }), {
    playTimeSeconds: 0,
    playTimeEra: PLAY_TIME_ERA,
    innStayCount: 0,
    shopPurchaseCount: 0,
    shopPurchaseGold: 0,
    templeDonationCount: 0,
    templeDonationGold: 0
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
  assert.equal(chronicle.find(entry => entry.id === "stable").label, "馬小屋に宿泊した");
  assert.equal(chronicle.find(entry => entry.id === "mage").label, "？？？？？？？");
  assert.equal(chronicle.find(entry => entry.id === "marathon42").label, "？？？？？？――地上を忘れし旅人");
  character.eventFlags.b1_b42_marathon_completed = true;
  const completed = getAdventureChronicle(character).find(entry => entry.id === "marathon42");
  assert.equal(completed.label, "深淵への大行軍");
  assert.equal(completed.achieved, true);
});

test("unachieved stable and Otherworldly Wisdom milestones show their hints", () => {
  const character = createInitialCharacter({ name: "ヒント", job: "warrior" });
  const chronicle = getAdventureChronicle(character);
  assert.equal(chronicle.find(entry => entry.id === "stable").label, "？？？？？？――朝の目覚め");
  assert.equal(chronicle.find(entry => entry.id === "otherworldlyWisdom").label, "？？？？？？――絶望への挑戦");
});

test("midgame chronicle includes the seven new boss, floor, and survey achievements", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.highestDungeonDepthReached = 40;
  Object.assign(character.eventFlags, {
    boss_jabberwock_event_boss_defeated: true,
    red_door_b29f_unlocked: true,
    boss_iron_maiden_b29f_defeated: true,
    achievement_b35f_100_cells: true,
    boss_brass_bull_event_boss_defeated: true,
    red_door_b39f_unlocked: true,
    boss_wicker_man_b39f_defeated: true
  });
  const chronicle = getAdventureChronicle(character);
  for (const id of ["jabberwock", "ironMaiden", "b30", "b35Survey", "brassBull", "wickerMan", "b40"]) {
    assert.equal(chronicle.find(entry => entry.id === id)?.achieved, true);
  }
});

test("deep cold chronicle includes B45F, both ice bosses, B50F, and the second long march", () => {
  const character = createInitialCharacter({ name: "TEST", job: "warrior" });
  character.highestDungeonDepthReached = 50;
  Object.assign(character.eventFlags, {
    achievement_b45f_100_cells: true,
    boss_glacies_event_boss_defeated: true,
    boss_eiskoenigin_b49f_defeated: true,
    b1_b84_long_march_completed: true
  });
  const chronicle = getAdventureChronicle(character);
  for (const id of ["b45Survey", "glacies", "eiskoenigin", "b50", "longMarch84"]) {
    assert.equal(chronicle.find(entry => entry.id === id)?.achieved, true, id);
  }
  assert.equal(chronicle.find(entry => entry.id === "longMarch84")?.label, "深淵への大行軍再び");
});

test("new deep-cold achievements conceal their names behind hints until achieved", () => {
  const character = createInitialCharacter({ name: "TEST", job: "mage" });
  const chronicle = getAdventureChronicle(character);
  assert.match(chronicle.find(entry => entry.id === "b45Survey")?.label || "", /凍土/);
  assert.match(chronicle.find(entry => entry.id === "glacies")?.label || "", /氷巨人/);
  assert.match(chronicle.find(entry => entry.id === "eiskoenigin")?.label || "", /女王/);
  assert.match(chronicle.find(entry => entry.id === "b50")?.label || "", /極寒/);
  assert.match(chronicle.find(entry => entry.id === "longMarch84")?.label || "", /深淵/);
});

test("priest recovery achievement keeps its hidden hint until quest 016 is reported", () => {
  const character = createInitialCharacter("治療者", "priest");
  let entry = getAdventureChronicle(character).find(candidate => candidate.id === "priestBackRecovery");
  assert.equal(entry.label, "？？？？？？――魔女の一撃");
  character.eventFlags.achievement_priest_back_recovered = true;
  entry = getAdventureChronicle(character).find(candidate => candidate.id === "priestBackRecovery");
  assert.equal(entry.label, "司祭のぎっくり腰を治療した");
});
