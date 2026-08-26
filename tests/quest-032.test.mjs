import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { getCardById } from "../data/cards.js";
import { createInitialCharacter } from "../data/classes.js";
import { getOwnedCardCount } from "../data/deck.js";
import { buildBoundaryWallMap, cells } from "../js/dungeon.js";
import { getKeyItem, grantKeyItem } from "../data/key-items.js";
import {
  acceptQuest, completeThirdQueenShadowInvestigation, getQuestById, getQuestProgress,
  isDungeonDepthUnlocked, isQuestAvailable, recordThirdQueenShadowEncounter, reportQuest
} from "../data/quests.js";
import { getQuestRequiredSpecialRoomAccess, getSpecialRoomDefinition } from "../data/special-rooms.js";

const mainSource = fs.readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
const playerSource = fs.readFileSync(new URL("../js/player.js", import.meta.url), "utf8");

function questReadyCharacter() {
  const character = createInitialCharacter({ name: "TEST", job: "mage" });
  character.quests.completedQuestIds.push(
    "guild_001_abyss_rat", "guild_002_cave_slime", "guild_003_b1f_survey", "guild_033"
  );
  return character;
}

test("quest 032 unlocks after quest 033 and preserves an already-owned necklace", () => {
  const locked = createInitialCharacter({ name: "TEST", job: "mage" });
  assert.equal(isQuestAvailable(locked, "guild_032"), false);
  const ready = questReadyCharacter();
  assert.equal(isQuestAvailable(ready, "guild_032"), true);
  ready.keyItems = grantKeyItem(ready.keyItems, "queen_necklace").keyItems;
  const accepted = acceptQuest(ready, "guild_032");
  assert.equal(accepted.accepted, true);
  assert.equal(getQuestProgress(accepted.character, "guild_032").readyToReport, true);
});

test("quest 032 records B90F-B98F in any order and finishes in the B99F event room", () => {
  let character = acceptQuest(questReadyCharacter(), "guild_032").character;
  for (const depth of [98, 90, 94, 91, 97, 92, 96, 93, 95]) {
    character = recordThirdQueenShadowEncounter(character, depth);
  }
  assert.equal(getQuestProgress(character, "guild_032").progress, 9);
  assert.equal(getQuestProgress(character, "guild_032").readyToReport, false);
  const room = getSpecialRoomDefinition(99);
  assert.equal(room.content.type, "thirdQueenShadowFinale");
  assert.equal(getQuestRequiredSpecialRoomAccess(room, getQuestProgress(character, "guild_032")).blocked, false);
  character = completeThirdQueenShadowInvestigation(character);
  assert.equal(getQuestProgress(character, "guild_032").readyToReport, true);
});

test("dark-region floors place only needed queen shadows and never ordinary Mikan", () => {
  const progress = { active: true, completed: false, progress: 0 };
  buildBoundaryWallMap(90, () => 0.5, { thirdQueenShadowQuest: progress, eventFlags: {} });
  assert.equal(cells.flat().filter(cell => cell.npc === "queen_shadow_dark").length, 1);
  buildBoundaryWallMap(90, () => 0.5, {
    thirdQueenShadowQuest: progress,
    eventFlags: { quest_032_shadow_b90f_found: true }
  });
  assert.equal(cells.flat().filter(cell => cell.npc).length, 0);
  buildBoundaryWallMap(99, () => 0.5, { thirdQueenShadowQuest: {}, eventFlags: {} });
  assert.equal(cells.flat().filter(cell => String(cell.npc || "").startsWith("NPC_01")).length, 0);
});

test("quest 032 copy, necklace, finale dialogue, and Vital Surge reward match the specification", () => {
  const quest = getQuestById("guild_032");
  assert.equal(quest.title, "女王の影を追え――その3");
  assert.equal(quest.objectiveLabel, "女王の影を見つける");
  assert.ok(quest.description.every(line => Array.from(line).length <= 23));
  assert.deepEqual(quest.reward, {
    type: "card", label: "デッキカード×1", amount: 1, cardId: "legendary_vital_surge"
  });
  assert.equal(getCardById("legendary_vital_surge").nameJa, "生命躍動");
  assert.equal(getKeyItem("queen_necklace").name, "女王の首飾り");
  assert.match(playerSource, /真っ暗で怖かったにゃあ/);
  assert.match(playerSource, /必ず、真実の杖を取り戻してください/);
  assert.match(playerSource, /「女王の首飾り」を手に入れた！/);

  let character = acceptQuest(questReadyCharacter(), "guild_032").character;
  for (let depth = 90; depth <= 98; depth += 1) character = recordThirdQueenShadowEncounter(character, depth);
  character = completeThirdQueenShadowInvestigation(character);
  const report = reportQuest(character, "guild_032");
  assert.equal(report.rewardCardId, "legendary_vital_surge");
  assert.equal(getOwnedCardCount(report.character.cards, "legendary_vital_surge"), 1);
});

test("B100F requires the defeated B99F boss and all three pieces of queen regalia", () => {
  const character = { eventFlags: { boss_b99f_defeated: true }, keyItems: null };
  assert.equal(isDungeonDepthUnlocked(character, 100), false);
  character.keyItems = grantKeyItem(character.keyItems, "queen_tiara").keyItems;
  character.keyItems = grantKeyItem(character.keyItems, "queen_earring").keyItems;
  assert.equal(isDungeonDepthUnlocked(character, 100), false);
  character.keyItems = grantKeyItem(character.keyItems, "queen_necklace").keyItems;
  assert.equal(isDungeonDepthUnlocked(character, 100), true);
  assert.match(mainSource, /あなたを拒む絶対的な力を感じる。この力に抗うには何かが足りないようだ…/);
});
