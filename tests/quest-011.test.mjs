import test from "node:test";
import assert from "node:assert/strict";

import { createInitialCharacter } from "../data/classes.js";
import { getBossById } from "../data/bosses.js";
import { getOwnedCardCount } from "../data/deck.js";
import { grantKeyItem, hasKeyItem } from "../data/key-items.js";
import {
  acceptQuest, abandonQuest, getQuestProgress, isQuestAvailable, recordBossDefeat,
  recordThievesClue, reportQuest, SECOND_RED_DOOR_INVESTIGATION_QUEST_ID,
  THIEVES_HIDEOUT_QUEST_ID, THIRD_RED_DOOR_INVESTIGATION_QUEST_ID
} from "../data/quests.js";
import { getQuestRequiredSpecialRoomAccess, getSpecialRoomDefinition } from "../data/special-rooms.js";
import { buildBoundaryWallMap, cells, setStartPosition } from "../js/dungeon.js";

const trialIds = ["guild_001_abyss_rat", "guild_002_cave_slime", "guild_003_b1f_survey"];

function eligible() {
  const character = createInitialCharacter({ name: "TEST", job: "thief" });
  character.quests.completedQuestIds.push(...trialIds, SECOND_RED_DOOR_INVESTIGATION_QUEST_ID);
  return character;
}

test("quest 011 links quest 010 to quest 012 without invalidating legacy quest 012 state", () => {
  let character = createInitialCharacter({ name: "TEST", job: "thief" });
  character.quests.completedQuestIds.push(...trialIds);
  assert.equal(isQuestAvailable(character, THIEVES_HIDEOUT_QUEST_ID), false);
  character.quests.completedQuestIds.push(SECOND_RED_DOOR_INVESTIGATION_QUEST_ID);
  assert.equal(isQuestAvailable(character, THIEVES_HIDEOUT_QUEST_ID), true);
  assert.equal(isQuestAvailable(character, THIRD_RED_DOOR_INVESTIGATION_QUEST_ID), false);
  character.quests.active[THIRD_RED_DOOR_INVESTIGATION_QUEST_ID] = { progress: 2 };
  assert.equal(getQuestProgress(character, THIRD_RED_DOOR_INVESTIGATION_QUEST_ID).active, true);
});

test("three clues progress in any order, survive abandonment, and restore on reacceptance", () => {
  let character = acceptQuest(eligible(), THIEVES_HIDEOUT_QUEST_ID).character;
  for (const flag of ["quest_011_clue_map_found", "quest_011_clue_emblem_found", "quest_011_clue_ledger_found"]) {
    character = recordThievesClue(character, flag);
  }
  assert.equal(getQuestProgress(character, THIEVES_HIDEOUT_QUEST_ID).progress, 3);
  character = abandonQuest(character, THIEVES_HIDEOUT_QUEST_ID).character;
  character = acceptQuest(character, THIEVES_HIDEOUT_QUEST_ID).character;
  assert.equal(getQuestProgress(character, THIEVES_HIDEOUT_QUEST_ID).progress, 3);
});

test("quest clue events are mandatory on B22, B24, and B26 only while needed", () => {
  setStartPosition(0, 0);
  const progress = { activeQuestIds: [THIEVES_HIDEOUT_QUEST_ID], eventFlags: {} };
  for (const depth of [22, 24, 26]) {
    buildBoundaryWallMap(depth, () => 0.5, progress);
    assert.equal(cells.flat().filter(cell => cell.questEvent).length, 1);
  }
  buildBoundaryWallMap(22, () => 0.5, { activeQuestIds: [], eventFlags: {} });
  assert.equal(cells.flat().some(cell => cell.questEvent), false);
});

test("B27 hideout requires an active quest and all three clues", () => {
  const room = getSpecialRoomDefinition(27);
  assert.equal(room.content.bossId, "thief_leader_event_boss");
  assert.equal(getQuestRequiredSpecialRoomAccess(room, { active: true, completed: false, progress: 2 }).blocked, true);
  assert.equal(getQuestRequiredSpecialRoomAccess(room, { active: true, completed: false, progress: 3 }).blocked, false);
});

test("Thief Leader uses the requested art and balanced single-element actions", () => {
  const boss = getBossById("thief_leader_event_boss");
  assert.equal(boss.image, "images/bosses/boss_04.avif");
  assert.equal(boss.encounterImage, "images/background/dungeon_event_03.avif");
  assert.equal(boss.level, 32);
  assert.equal(boss.maxHp, 580);
  assert.equal(boss.experienceReward, 3500);
  assert.deepEqual(boss.actions.map(entry => entry.action.element || "physical"), ["physical", "fire", "ice", "physical"]);
  assert.equal(boss.event.autoStartDelay, 1000);
  assert.equal(boss.event.confirmBeforeStart, true);
  assert.equal(boss.event.fadeBeforeStart, true);
});

test("boss defeat completes quest 011 and reporting grants only missing unique cards plus 2000G", () => {
  let character = acceptQuest(eligible(), THIEVES_HIDEOUT_QUEST_ID).character;
  for (const [flag, keyItemId] of [
    ["quest_011_clue_emblem_found", "thieves_clue_emblem"],
    ["quest_011_clue_ledger_found", "thieves_clue_ledger"],
    ["quest_011_clue_map_found", "thieves_clue_map"]
  ]) {
    character.keyItems = grantKeyItem(character.keyItems, keyItemId).keyItems;
    character = recordThievesClue(character, flag);
    assert.equal(hasKeyItem(character.keyItems, keyItemId), true);
  }
  character = recordBossDefeat(character, "thief_leader_event_boss", 27);
  assert.equal(getQuestProgress(character, THIEVES_HIDEOUT_QUEST_ID).readyToReport, true);
  const report = reportQuest(character, THIEVES_HIDEOUT_QUEST_ID);
  assert.deepEqual(report.rewardCardIds, ["sr_flame_armament", "sr_ice_armament"]);
  assert.equal(getOwnedCardCount(report.character.cards, "sr_flame_armament"), 1);
  assert.equal(getOwnedCardCount(report.character.cards, "sr_ice_armament"), 1);
  assert.equal(report.bonusGold, 2000);
  assert.equal(reportQuest(report.character, THIEVES_HIDEOUT_QUEST_ID).accepted, false);
});
