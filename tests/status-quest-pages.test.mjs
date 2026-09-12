import test from "node:test";
import assert from "node:assert/strict";
import {
  getActiveStatusQuestEntries,
  getInventoryPageSize,
  getStatusPageCount
} from "../js/menu.js";
import {
  FLOOR_SURVEY_QUEST_ID,
  GUILD_TRIAL_QUEST_ID,
  SLIME_EXTERMINATION_QUEST_ID
} from "../data/quests.js";

test("inventory uses fewer rows on phone-sized screens", () => {
  assert.equal(getInventoryPageSize(390), 8);
  assert.equal(getInventoryPageSize(540), 8);
  assert.equal(getInventoryPageSize(541), 10);
  assert.equal(getInventoryPageSize(844, true), 8);
  assert.equal(getInventoryPageSize(1280), 10);
});

test("status quest pages include active and reportable quests but exclude reported quests", () => {
  const character = {
    quests: {
      active: {
        [GUILD_TRIAL_QUEST_ID]: { progress: 2 },
        [SLIME_EXTERMINATION_QUEST_ID]: { progress: 15 }
      },
      completedQuestIds: [FLOOR_SURVEY_QUEST_ID]
    }
  };
  const entries = getActiveStatusQuestEntries(character);
  assert.deepEqual(entries.map(entry => entry.quest.id), [SLIME_EXTERMINATION_QUEST_ID, GUILD_TRIAL_QUEST_ID]);
  assert.equal(entries[0].progress.readyToReport, true);
  assert.equal(entries[1].progress.active, true);
  assert.equal(getStatusPageCount(character), 5);
});

test("status always provides a fourth quest page when no quest is active", () => {
  const character = { quests: { active: {}, completedQuestIds: [GUILD_TRIAL_QUEST_ID] } };
  assert.deepEqual(getActiveStatusQuestEntries(character), []);
  assert.equal(getStatusPageCount(character), 4);
});